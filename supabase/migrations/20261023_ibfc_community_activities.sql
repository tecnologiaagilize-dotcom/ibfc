begin;
create table if not exists public.ibfc_community_activities (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.ibfc_community_organizations(id),
 title text not null check(length(trim(title)) between 3 and 160),objective text not null check(length(trim(objective)) between 5 and 1000),
 start_on date not null,end_on date not null,venue text not null check(length(trim(venue)) between 3 and 300),
 responsible text not null default '' check(length(responsible)<=160),capacity integer check(capacity between 1 and 100000),
 status text not null default 'planejada' check(status in('planejada','em_andamento','concluida','cancelada')),version integer not null default 1,
 status_note text not null default '',created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_on>=start_on)
);
alter table public.ibfc_community_activities enable row level security;
revoke all on public.ibfc_community_activities from anon,authenticated;
grant select on public.ibfc_community_activities to authenticated;
drop policy if exists community_activities_staff on public.ibfc_community_activities;
create policy community_activities_staff on public.ibfc_community_activities for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
alter table public.ibfc_community_participation add column if not exists activity_id uuid references public.ibfc_community_activities(id);
create index if not exists ibfc_community_attendance_activity on public.ibfc_community_participation(activity_id);
create or replace function public.ibfc_validate_activity_participation() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.ibfc_community_activities;
begin
 if new.activity_id is not null then
  if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
  select * into a from public.ibfc_community_activities where id=new.activity_id for share;
  if not found or a.organization_id<>new.organization_id then raise exception 'Atividade incompatível com a organização'; end if;
  if a.status='cancelada' then raise exception 'Atividade cancelada'; end if;
  if new.participated_on<a.start_on or new.participated_on>a.end_on or new.participated_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data de presença incompatível'; end if;
  new.activity=a.title;
 end if;
 return new;
end;$$;
drop trigger if exists ibfc_activity_participation_guard on public.ibfc_community_participation;
create trigger ibfc_activity_participation_guard before insert or update of activity_id,organization_id,participated_on on public.ibfc_community_participation for each row execute function public.ibfc_validate_activity_participation();
create or replace function public.ibfc_community_activity_save(p_data jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.ibfc_community_activities;result uuid;s text;n text;today date=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if p_data->>'action'='create' then
  insert into public.ibfc_community_activities(organization_id,title,objective,start_on,end_on,venue,responsible,capacity,created_by)
  values((p_data->>'organization_id')::uuid,trim(p_data->>'title'),trim(p_data->>'objective'),(p_data->>'start_on')::date,(p_data->>'end_on')::date,trim(p_data->>'venue'),trim(coalesce(p_data->>'responsible','')),nullif(p_data->>'capacity','')::integer,auth.uid()) returning id into result;
 elsif p_data->>'action'='status' then
  select * into a from public.ibfc_community_activities where id=(p_data->>'id')::uuid for update;
  if not found then raise exception 'Atividade não encontrada'; end if;
  if a.version is distinct from (p_data->>'version')::integer then raise exception 'Registro alterado por outra pessoa'; end if;
  s=p_data->>'status';n=trim(coalesce(p_data->>'note',''));
  if length(n)<5 or length(n)>1000 then raise exception 'Informe justificativa'; end if;
  if s='em_andamento' and a.start_on>today then raise exception 'Atividade ainda não iniciada'; end if;
  if s='concluida' and a.end_on>today then raise exception 'Atividade ainda não terminou'; end if;
  update public.ibfc_community_activities set status=s,status_note=n,version=version+1,updated_at=now() where id=a.id;result=a.id;
 else raise exception 'Ação inválida'; end if;
 return result;
end;$$;
revoke all on function public.ibfc_community_activity_save(jsonb) from public,anon;
grant execute on function public.ibfc_community_activity_save(jsonb) to authenticated;
create or replace function public.ibfc_community_activity_list() returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 with counts as(select activity_id,count(*) attendance_total,count(*) filter(where withdrawn_at is null) authorized_records from public.ibfc_community_participation where activity_id is not null group by activity_id),
 limited as(select a.*,o.name organization_name,o.uf,o.municipality,coalesce(c.attendance_total,0) attendance_total,coalesce(c.authorized_records,0) authorized_records
 from public.ibfc_community_activities a join public.ibfc_community_organizations o on o.id=a.organization_id left join counts c on c.activity_id=a.id order by a.start_on desc,a.id limit 500)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(limited) order by start_on desc,id) from limited),'[]'::jsonb),'total',(select count(*) from public.ibfc_community_activities),'truncated',(select count(*)>500 from public.ibfc_community_activities)) into result;return result;
end;$$;
revoke all on function public.ibfc_community_activity_list() from public,anon;
grant execute on function public.ibfc_community_activity_list() to authenticated;
commit;
