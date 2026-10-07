begin;
create table if not exists public.ibfc_community_organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 160),
 uf text not null check(uf ~ '^[A-Z]{2}$'), municipality text not null check(length(trim(municipality)) between 2 and 160),
 territory text not null default '' check(length(territory)<=160), purpose text not null default '' check(length(purpose)<=500),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.ibfc_community_participation (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.ibfc_community_organizations(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 160), activity text not null check(length(trim(activity)) between 2 and 160),
 participated_on date not null, consent_evidence text not null check(length(trim(consent_evidence)) between 5 and 500),
 consent_at timestamptz not null default now(), withdrawn_at timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create index if not exists ibfc_community_participation_org on public.ibfc_community_participation(organization_id);
alter table public.ibfc_community_organizations enable row level security;
alter table public.ibfc_community_participation enable row level security;
revoke all on public.ibfc_community_organizations,public.ibfc_community_participation from anon;
grant select,insert,update,delete on public.ibfc_community_organizations,public.ibfc_community_participation to authenticated;
drop policy if exists community_staff on public.ibfc_community_organizations;
create policy community_staff on public.ibfc_community_organizations to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor'))) with check(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists community_staff on public.ibfc_community_participation;
create policy community_staff on public.ibfc_community_participation to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor'))) with check(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
comment on table public.ibfc_community_participation is 'Participação voluntária em atividades. Não indica intenção de voto, não vincula pessoa a candidato ou seção eleitoral. Evidência de autorização registrada pela equipe.';
commit;
