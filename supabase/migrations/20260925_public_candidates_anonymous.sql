-- Execute no SQL Editor do Supabase do MFB para permitir leitura sem login.
-- A politica de SELECT expoe somente registros publicados.
alter table public.candidates enable row level security;

grant usage on schema public to anon;
grant select on public.candidates to anon, authenticated;

drop policy if exists "anon read published candidates for sharing" on public.candidates;
drop policy if exists "public can read published candidates" on public.candidates;

create policy "public can read published candidates"
  on public.candidates for select to anon, authenticated
  using (status = 'published');

-- A view publica respeita as mesmas regras de RLS da tabela subjacente.
do $$
begin
  if to_regclass('public.candidates_public') is not null then
    execute 'alter view public.candidates_public set (security_invoker = true)';
    execute 'grant select on public.candidates_public to anon, authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';
