-- IBFC Academy - acesso administrativo ao esquema academy_*.
-- Revisar e aplicar manualmente no SQL Editor após backup.
-- Pressupõe public.admin_profiles(id uuid, role text).
-- Políticas de publicação continuam restritas; nenhuma tabela legada é alterada.
begin;
do $$
declare t text;
begin
 foreach t in array array['academy_courses','academy_modules','academy_lessons','academy_resources'] loop
  execute format('drop policy if exists academy_staff_select on public.%I', t);
  execute format('drop policy if exists academy_staff_insert on public.%I', t);
  execute format('drop policy if exists academy_staff_update on public.%I', t);
  execute format('drop policy if exists academy_staff_delete on public.%I', t);
  execute format('create policy academy_staff_select on public.%I for select to authenticated using (exists (select 1 from public.admin_profiles ap where ap.id=(select auth.uid()) and ap.role in (''admin'',''editor'')))',t);
  execute format('create policy academy_staff_insert on public.%I for insert to authenticated with check (exists (select 1 from public.admin_profiles ap where ap.id=(select auth.uid()) and ap.role in (''admin'',''editor'')))',t);
  execute format('create policy academy_staff_update on public.%I for update to authenticated using (exists (select 1 from public.admin_profiles ap where ap.id=(select auth.uid()) and ap.role in (''admin'',''editor''))) with check (exists (select 1 from public.admin_profiles ap where ap.id=(select auth.uid()) and ap.role in (''admin'',''editor'')))',t);
  execute format('create policy academy_staff_delete on public.%I for delete to authenticated using (exists (select 1 from public.admin_profiles ap where ap.id=(select auth.uid()) and ap.role = ''admin''))',t);
 end loop;
end $$;
commit;
