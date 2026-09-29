-- Executar no banco IBFC após schema.sql e 20260929_ibfc_leads_crm.sql.
-- Este controle interno NÃO substitui o SAPF nem confirma oficialmente o apoiamento.
create table if not exists public.ibfc_sapf_campaign (
  id boolean primary key default true check(id),
  party_name text not null,
  party_cnpj text not null,
  enabled boolean not null default false
);
alter table public.ibfc_sapf_campaign enable row level security;
create policy "members see sapf campaign" on public.ibfc_sapf_campaign for select to authenticated using(true);
grant select on public.ibfc_sapf_campaign to authenticated;
create table if not exists public.ibfc_sapf_queue (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.member_profiles(id) on delete cascade,
  electoral_title text check(electoral_title is null or electoral_title ~ '^[0-9]{12}$'),
  consented_at timestamptz not null default now(),
  status text not null default 'waiting' check(status in ('waiting','called','code_received','submitted','rejected','cancelled')),
  operator_id uuid references public.admin_profiles(id),
  code text,
  code_expires_at timestamptz,
  requested_at timestamptz not null default now(),
  called_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  check (code is null or (status='code_received' and code_expires_at is not null))
);
create index if not exists ibfc_sapf_waiting_idx on public.ibfc_sapf_queue(status, requested_at);
alter table public.ibfc_sapf_queue enable row level security;
drop policy if exists "ibfc staff read own profile" on public.admin_profiles;
create policy "ibfc staff read own profile" on public.admin_profiles for select to authenticated using(id=auth.uid());
grant select on public.admin_profiles to authenticated;
grant select on public.ibfc_sapf_queue to authenticated;
create policy "member sees own sapf status" on public.ibfc_sapf_queue for select to authenticated using(member_id=auth.uid());
create policy "staff sees sapf queue" on public.ibfc_sapf_queue for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
-- Mutações apenas via funções: a transição e o descarte do código são atômicos.
create or replace function public.ibfc_sapf_join(p_title text,p_unaffiliated boolean,p_consent boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not exists(select 1 from public.ibfc_leads where member_id=auth.uid()) then raise exception 'Cadastro IBFC necessário'; end if;
  if not exists(select 1 from public.ibfc_sapf_campaign where id=true and enabled=true and length(trim(party_name))>2 and length(regexp_replace(party_cnpj,'[^0-9]','','g'))=14) then raise exception 'Campanha não habilitada'; end if;
  if p_title !~ '^[0-9]{12}$' or p_unaffiliated is distinct from true or p_consent is distinct from true then raise exception 'Dados ou declaração incompletos'; end if;
  insert into public.ibfc_sapf_queue(member_id,electoral_title) values(auth.uid(),p_title)
  on conflict(member_id) do update set status='waiting',operator_id=null,code=null,code_expires_at=null,
    electoral_title=p_title,consented_at=now(),requested_at=now(),called_at=null,finished_at=null,updated_at=now()
  where ibfc_sapf_queue.status in ('rejected','cancelled');
end; $$;
create or replace function public.ibfc_sapf_claim(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.admin_profiles where id=auth.uid()) then raise exception 'Acesso negado'; end if;
  update public.ibfc_sapf_queue set status='called',operator_id=auth.uid(),called_at=now(),updated_at=now()
  where id=p_id and status='waiting';
  if not found then raise exception 'Atendimento já iniciado'; end if;
end; $$;
create or replace function public.ibfc_sapf_send_code(p_code text) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or p_code !~ '^[0-9]{4,12}$' then raise exception 'Código numérico inválido'; end if;
  update public.ibfc_sapf_queue set status='code_received',code=p_code,code_expires_at=now()+interval '60 seconds',updated_at=now()
  where member_id=auth.uid() and operator_id is not null and status in ('called','code_received');
  if not found then raise exception 'Aguarde a atendente chamar você'; end if;
end; $$;
create or replace function public.ibfc_sapf_finish(p_id uuid,p_result text) returns void language plpgsql security definer set search_path=public as $$
begin
  if p_result not in ('submitted','rejected','waiting') then raise exception 'Resultado inválido'; end if;
  update public.ibfc_sapf_queue set status=p_result,operator_id=case when p_result='waiting' then null else operator_id end,
    electoral_title=case when p_result='waiting' then electoral_title else null end,
    code=null,code_expires_at=null,finished_at=case when p_result='waiting' then null else now() end,
    requested_at=case when p_result='waiting' then now() else requested_at end,updated_at=now()
  where id=p_id and operator_id=auth.uid() and status in ('called','code_received')
    and (p_result <> 'submitted' or (status='code_received' and code_expires_at>now()))
    and exists(select 1 from public.admin_profiles where id=auth.uid());
  if not found then raise exception 'Atendimento não encontrado ou sem permissão'; end if;
end; $$;
create or replace function public.ibfc_sapf_cancel() returns void language plpgsql security definer set search_path=public as $$
begin
 update public.ibfc_sapf_queue set status='cancelled',operator_id=null,electoral_title=null,code=null,code_expires_at=null,finished_at=now(),updated_at=now()
 where member_id=auth.uid() and status in ('waiting','called','code_received');
end; $$;
create or replace function public.ibfc_sapf_expire_codes() returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Acesso negado'; end if;
 update public.ibfc_sapf_queue set status='called',code=null,code_expires_at=null,updated_at=now()
 where status='code_received' and code_expires_at<=now();
end; $$;
revoke all on function public.ibfc_sapf_join(text,boolean,boolean) from public,anon;
revoke all on function public.ibfc_sapf_claim(uuid) from public,anon;
revoke all on function public.ibfc_sapf_send_code(text) from public,anon;
revoke all on function public.ibfc_sapf_finish(uuid,text) from public,anon;
revoke all on function public.ibfc_sapf_cancel() from public,anon;
revoke all on function public.ibfc_sapf_expire_codes() from public,anon;
grant execute on function public.ibfc_sapf_join(text,boolean,boolean),public.ibfc_sapf_claim(uuid),public.ibfc_sapf_send_code(text),public.ibfc_sapf_finish(uuid,text),public.ibfc_sapf_cancel(),public.ibfc_sapf_expire_codes() to authenticated;
