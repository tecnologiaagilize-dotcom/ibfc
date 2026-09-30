create table if not exists public.candidate_profile_templates (
  template_key text primary key check (template_key = 'global'),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.candidate_profile_templates enable row level security;
grant select on public.candidate_profile_templates to anon, authenticated;
grant insert, update on public.candidate_profile_templates to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='candidate_profile_templates' and policyname='public read global candidate template') then
    create policy "public read global candidate template" on public.candidate_profile_templates for select to anon,authenticated using (template_key='global');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='candidate_profile_templates' and policyname='admins edit global candidate template') then
    create policy "admins edit global candidate template" on public.candidate_profile_templates for all to authenticated
      using (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role='admin'))
      with check (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
end $$;
