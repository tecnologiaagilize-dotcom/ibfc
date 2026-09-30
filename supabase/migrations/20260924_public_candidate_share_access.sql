-- Os robôs do WhatsApp e de outras redes não enviam cookies de login.
-- Autoriza a leitura pública somente dos candidatos publicados.
alter table public.candidates enable row level security;

grant select on public.candidates to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and policyname = 'anon read published candidates for sharing'
  ) then
    create policy "anon read published candidates for sharing"
      on public.candidates for select to anon
      using (status = 'published');
  end if;
end $$;
