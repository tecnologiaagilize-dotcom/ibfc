-- Aplicar apenas no banco separado do IBFC, após supabase/schema.sql.
-- Não altera nem importa candidatos, apoiamentos ou contatos do MFB.
drop policy if exists "ibfc staff read own profile" on public.admin_profiles;
create policy "ibfc staff read own profile" on public.admin_profiles for select to authenticated using(id=auth.uid());
grant select on public.admin_profiles to authenticated;
create table if not exists public.ibfc_leads (
  member_id uuid primary key references public.member_profiles(id) on delete cascade,
  source text not null default 'portal_ibfc',
  interest text not null default 'conhecer',
  whatsapp_opt_in boolean not null default false,
  updates_opt_in boolean not null default false,
  consent_version text,
  consent_at timestamptz,
  status text not null default 'received' check (status in ('received','bot_active','human_requested','human_active','closed')),
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists ibfc_leads_status_created_idx on public.ibfc_leads(status, created_at);
alter table public.ibfc_leads enable row level security;
grant select, update on public.ibfc_leads to authenticated;
create policy "ibfc members read own lead" on public.ibfc_leads for select to authenticated using(member_id = (select auth.uid()));
create policy "ibfc staff read leads" on public.ibfc_leads for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=(select auth.uid())));
create policy "ibfc staff update leads" on public.ibfc_leads for update to authenticated using(exists(select 1 from public.admin_profiles a where a.id=(select auth.uid()))) with check(exists(select 1 from public.admin_profiles a where a.id=(select auth.uid())));

create table if not exists public.ibfc_lead_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.ibfc_leads(member_id) on delete cascade,
  status text not null,
  source text not null check (source in ('crm','admin')),
  occurred_at timestamptz not null default now()
);
create index if not exists ibfc_lead_events_member_idx on public.ibfc_lead_events(member_id, occurred_at desc);
alter table public.ibfc_lead_events enable row level security;
grant select on public.ibfc_lead_events to authenticated;
create policy "ibfc members read own events" on public.ibfc_lead_events for select to authenticated using(member_id=(select auth.uid()));
create policy "ibfc staff read events" on public.ibfc_lead_events for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=(select auth.uid())));

create or replace function public.ibfc_capture_signup() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare meta jsonb;
begin
  select raw_user_meta_data into meta from auth.users where id = new.id;
  if coalesce(meta->>'ibfc_source','') not in ('portal_ibfc','instagram_ibfc') then return new; end if;
  insert into public.ibfc_leads(member_id,source,interest,whatsapp_opt_in,updates_opt_in,consent_version,consent_at)
  values(new.id,meta->>'ibfc_source',coalesce(nullif(meta->>'ibfc_interest',''),'conhecer'),
    coalesce(meta->>'ibfc_whatsapp_opt_in'='true',false),
    coalesce(meta->>'ibfc_updates_opt_in'='true',false),
    meta->>'ibfc_consent_version',now())
  on conflict (member_id) do nothing;
  return new;
end; $$;
revoke all on function public.ibfc_capture_signup() from public, anon, authenticated;
drop trigger if exists ibfc_member_signup on public.member_profiles;
create trigger ibfc_member_signup after insert on public.member_profiles for each row execute function public.ibfc_capture_signup();
