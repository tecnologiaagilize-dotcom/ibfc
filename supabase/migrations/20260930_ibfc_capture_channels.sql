-- Aplicar após 20260929_ibfc_leads_crm.sql. Não importa listas de telefone.
alter table public.ibfc_leads add column if not exists locality text;
alter table public.ibfc_leads add column if not exists campaign text;
create index if not exists ibfc_leads_source_campaign_idx on public.ibfc_leads(source,campaign,created_at);
create or replace function public.ibfc_capture_signup() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare meta jsonb; source_value text;
begin
  select raw_user_meta_data into meta from auth.users where id=new.id;
  source_value := meta->>'ibfc_source';
  if coalesce(source_value,'') not in ('portal_ibfc','instagram_ibfc','whatsapp_ibfc','indicacao_ibfc') then return new; end if;
  insert into public.ibfc_leads(member_id,source,interest,locality,campaign,whatsapp_opt_in,updates_opt_in,consent_version,consent_at)
  values(new.id,source_value,coalesce(nullif(left(meta->>'ibfc_interest',50),''),'conhecer'),
    nullif(left(trim(meta->>'ibfc_locality'),100),''),nullif(left(trim(meta->>'ibfc_campaign'),64),''),
    coalesce(meta->>'ibfc_whatsapp_opt_in'='true',false),coalesce(meta->>'ibfc_updates_opt_in'='true',false),
    left(meta->>'ibfc_consent_version',30),now())
  on conflict(member_id) do nothing;
  return new;
end; $$;
revoke all on function public.ibfc_capture_signup() from public,anon,authenticated;
