begin;
create table if not exists public.ibfc_community_demands (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.ibfc_community_organizations(id) on delete set null,
 title text not null check(length(trim(title)) between 3 and 160), description text not null check(length(trim(description)) between 5 and 2000),
 category text not null check(category in('saude','educacao','seguranca','infraestrutura','assistencia','ambiente','esporte','outros')),
 priority text not null default 'normal' check(priority in('normal','alta','urgente')), responsible text not null default '' check(length(responsible)<=160),
 due_on date, status text not null default 'aberta' check(status in('aberta','em_atendimento','aguardando','resolvida','cancelada')),
 resolution text not null default '' check(length(resolution)<=2000), version integer not null default 1,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status not in('resolvida','cancelada') or length(trim(resolution))>=5)
);
create table if not exists public.ibfc_community_demand_events (
 id uuid primary key default gen_random_uuid(), demand_id uuid not null references public.ibfc_community_demands(id) on delete cascade,
 old_status text, new_status text not null, note text not null, actor uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index if not exists ibfc_demands_queue on public.ibfc_community_demands(status,due_on,created_at desc);
create index if not exists ibfc_demand_events_history on public.ibfc_community_demand_events(demand_id,created_at);
alter table public.ibfc_community_demands enable row level security;
alter table public.ibfc_community_demand_events enable row level security;
revoke all on public.ibfc_community_demands,public.ibfc_community_demand_events from anon,authenticated;
grant select on public.ibfc_community_demands,public.ibfc_community_demand_events to authenticated;
drop policy if exists demand_staff_read on public.ibfc_community_demands;
create policy demand_staff_read on public.ibfc_community_demands for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists demand_event_staff_read on public.ibfc_community_demand_events;
create policy demand_event_staff_read on public.ibfc_community_demand_events for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create or replace function public.ibfc_community_demand_save(p_data jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.ibfc_community_demands; result uuid; note text;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if p_data->>'action'='create' then
  insert into public.ibfc_community_demands(organization_id,title,description,category,priority,responsible,due_on,created_by)
   values(nullif(p_data->>'organization_id','')::uuid,trim(p_data->>'title'),trim(p_data->>'description'),p_data->>'category',p_data->>'priority',trim(coalesce(p_data->>'responsible','')),nullif(p_data->>'due_on','')::date,auth.uid()) returning id into result;
  insert into public.ibfc_community_demand_events(demand_id,new_status,note,actor) values(result,'aberta','Demanda registrada.',auth.uid());
 elsif p_data->>'action'='update' then
  select * into d from public.ibfc_community_demands where id=(p_data->>'id')::uuid for update;
  if not found then raise exception 'Demanda não encontrada'; end if;
  if (p_data->>'version')::integer is distinct from d.version then raise exception 'Registro alterado por outra pessoa. Atualize a página'; end if;
  note=trim(coalesce(p_data->>'note',''));
  if length(note)<5 or length(note)>2000 then raise exception 'Informe o registro do atendimento'; end if;
  update public.ibfc_community_demands set status=p_data->>'status',responsible=trim(coalesce(p_data->>'responsible','')),due_on=nullif(p_data->>'due_on','')::date,
   resolution=case when p_data->>'status' in('resolvida','cancelada') then note else '' end,version=version+1,updated_at=now() where id=d.id;
  insert into public.ibfc_community_demand_events(demand_id,old_status,new_status,note,actor) values(d.id,d.status,p_data->>'status',note,auth.uid());result=d.id;
 else raise exception 'Ação inválida'; end if;
 return result;
end;$$;
revoke all on function public.ibfc_community_demand_save(jsonb) from public,anon;
grant execute on function public.ibfc_community_demand_save(jsonb) to authenticated;
create or replace function public.ibfc_community_demand_summary() returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 select jsonb_build_object('total',count(*),'open',count(*) filter(where status not in('resolvida','cancelada')),
 'resolved',count(*) filter(where status='resolvida'),'overdue',count(*) filter(where status not in('resolvida','cancelada') and due_on<(now() at time zone 'America/Sao_Paulo')::date)) into result from public.ibfc_community_demands;
 result=result || jsonb_build_object(
 'first_response_hours',(select round(avg(extract(epoch from(first_event-created_at))/3600)::numeric,1) from(
 select d.created_at,(select min(e.created_at) from public.ibfc_community_demand_events e where e.demand_id=d.id and e.old_status is not null) first_event from public.ibfc_community_demands d) q where first_event is not null),
 'resolution_hours',(select round(avg(extract(epoch from(updated_at-created_at))/3600)::numeric,1) from public.ibfc_community_demands where status='resolvida')
 );
 return result;
end;$$;
revoke all on function public.ibfc_community_demand_summary() from public,anon;
grant execute on function public.ibfc_community_demand_summary() to authenticated;
comment on table public.ibfc_community_demands is 'Solicitações comunitárias e acompanhamento administrativo. Não associa dados pessoais a votos ou preferências políticas.';
commit;
