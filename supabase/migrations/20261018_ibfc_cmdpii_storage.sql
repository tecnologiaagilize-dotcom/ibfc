-- Executar APÓS 20261018_ibfc_cmdpii_observatory.sql.
-- Bucket privado, sem acesso público anônimo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ibfc-cmdpii-evidencias','ibfc-cmdpii-evidencias',false,10485760,
  array['application/pdf','image/jpeg','image/png','text/plain'])
on conflict (id) do update set public=false, file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;

-- Acesso aos arquivos limitado aos administradores e editores autenticados.
create policy "cmdpii_evidencias_insert" on storage.objects for insert to authenticated
with check (bucket_id='ibfc-cmdpii-evidencias' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')));
create policy "cmdpii_evidencias_select" on storage.objects for select to authenticated
using (bucket_id='ibfc-cmdpii-evidencias'
 and exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')));
create policy "cmdpii_evidencias_delete" on storage.objects for delete to authenticated
using (bucket_id='ibfc-cmdpii-evidencias' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')));
