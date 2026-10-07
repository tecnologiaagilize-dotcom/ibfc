begin;
create table if not exists public.ibfc_community_enrollments (
 id uuid primary key default gen_random_uuid(),activity_id uuid not null references public.ibfc_community_activities(id),
 name text not null check(length(trim(name)) between 2 and 160),email text not null check(length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 status text not null check(status in('confirmada','espera','cancelada')),consent_evidence text not null check(length(trim(consent_evidence)) between 5 and 500),
 consent_at timestamptz not null default now(),withdrawn_at timestamptz,created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default now()
);
create unique index if not exists ibfc_enrollment_unique_email on public.ibfc_community_enrollments(activity_id,lower(trim(email)));
create index if not exists ibfc_enrollment_queue on public.ibfc_community_enrollments(activity_id,status,created_at,id);
alter table public.ibfc_community_enrollments enable row level security;
revoke all on public.ibfc_community_enrollments from anon,authenticated;
grant select on public.ibfc_community_enrollments to authenticated;
drop policy if exists enrollment_staff_read on public.ibfc_community_enrollments;
create policy enrollment_staff_read on public.ibfc_community_enrollments for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create or replace function public.ibfc_community_enrollment_save(p_data jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.ibfc_community_activities;e public.ibfc_community_enrollments;result uuid;promoted uuid;state text;quantity integer;mail text;today date=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 select * into a from public.ibfc_community_activities where id=(p_data->>'activity_id')::uuid for update;
 if not found then raise exception 'Atividade não encontrada'; end if;
 if p_data->>'action'='register' then
  if a.status in('concluida','cancelada') or a.end_on<today then raise exception 'Inscrições encerradas'; end if;
  if p_data->'authorized' is distinct from 'true'::jsonb then raise exception 'Autorização necessária'; end if;
  mail=lower(trim(p_data->>'email'));
  select * into e from public.ibfc_community_enrollments where activity_id=a.id and lower(trim(email))=mail;
  if found and e.status<>'cancelada' then raise exception 'Inscrição já existe'; end if;
  select count(*) into quantity from public.ibfc_community_enrollments where activity_id=a.id and status='confirmada';
  state=case when a.capacity is null or quantity<a.capacity then 'confirmada' else 'espera' end;
  if e.id is not null then
   update public.ibfc_community_enrollments set name=trim(p_data->>'name'),email=mail,status=state,consent_evidence=trim(p_data->>'consent_evidence'),consent_at=now(),withdrawn_at=null,created_at=clock_timestamp(),created_by=auth.uid(),updated_at=now() where id=e.id;result=e.id;
  else
   insert into public.ibfc_community_enrollments(activity_id,name,email,status,consent_evidence,created_by) values(a.id,trim(p_data->>'name'),mail,state,trim(p_data->>'consent_evidence'),auth.uid()) returning id into result;
  end if;
 elsif p_data->>'action' in('cancel','delete') then
  select * into e from public.ibfc_community_enrollments where id=(p_data->>'id')::uuid and activity_id=a.id for update;
  if not found then raise exception 'Inscrição não encontrada'; end if;
  if p_data->>'action'='delete' then delete from public.ibfc_community_enrollments where id=e.id;
  else update public.ibfc_community_enrollments set status='cancelada',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now() where id=e.id;end if;
  result=e.id;state='cancelada';
  if e.status='confirmada' and a.status not in('concluida','cancelada') and a.end_on>=today then
   select count(*) into quantity from public.ibfc_community_enrollments where activity_id=a.id and status='confirmada';
   if a.capacity is null or quantity<a.capacity then
    select id into promoted from public.ibfc_community_enrollments where activity_id=a.id and status='espera' and withdrawn_at is null order by created_at,id limit 1 for update;
    if promoted is not null then update public.ibfc_community_enrollments set status='confirmada',updated_at=now() where id=promoted;end if;
   end if;
  end if;
 else raise exception 'Ação inválida';end if;
 return jsonb_build_object('id',result,'status',state,'promoted_id',promoted);
end;$$;
revoke all on function public.ibfc_community_enrollment_save(jsonb) from public,anon;
grant execute on function public.ibfc_community_enrollment_save(jsonb) to authenticated;
create or replace function public.ibfc_community_enrollment_list(p_activity uuid) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 with queue as(select id,row_number() over(order by created_at,id) position from public.ibfc_community_enrollments where activity_id=p_activity and status='espera'),
 records as(select e.id,e.name,e.email,e.status,e.created_at,e.withdrawn_at,q.position queue_position from public.ibfc_community_enrollments e left join queue q on q.id=e.id where e.activity_id=p_activity),
 limited as(select * from records order by created_at,id limit 500)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(limited) order by created_at,id) from limited),'[]'::jsonb),'total',count(*),'truncated',count(*)>500,
 'confirmed',count(*) filter(where status='confirmada'),'waiting',count(*) filter(where status='espera'),'cancelled',count(*) filter(where status='cancelada')) into result from records;
 return result;
end;$$;
revoke all on function public.ibfc_community_enrollment_list(uuid) from public,anon;
grant execute on function public.ibfc_community_enrollment_list(uuid) to authenticated;
commit;
