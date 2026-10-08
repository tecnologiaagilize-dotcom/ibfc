-- Aplicar após 20261025. Preserva coletas manuais e registros já salvos.
begin;
alter table public.ibfc_legislative_runs add column if not exists execution_mode text not null default 'manual' check(execution_mode in('manual','background'));
alter table public.ibfc_legislative_runs add column if not exists queue_status text not null default 'idle' check(queue_status in('idle','queued','processing','paused','failed','done'));
alter table public.ibfc_legislative_runs add column if not exists worker_token text;
alter table public.ibfc_legislative_runs add column if not exists lease_until timestamptz;
alter table public.ibfc_legislative_runs add column if not exists heartbeat_at timestamptz;
alter table public.ibfc_legislative_runs add column if not exists background_owner_id uuid references auth.users(id);
update public.ibfc_legislative_runs set background_owner_id=created_by where execution_mode='background' and background_owner_id is null;
create table if not exists public.ibfc_legislative_schedules(
 id uuid primary key default gen_random_uuid(),candidate_id uuid not null references public.candidates(id),provider text not null check(provider in('camara','senado')),external_id text not null check(external_id~'^[0-9]{1,10}$'),official_name text not null,
 category text not null check(category in('committees','propositions','votes','events')),interval_days integer not null check(interval_days in(1,7)),lookback_days integer not null check(lookback_days between 1 and 90),enabled boolean not null default false,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),next_run_at timestamptz not null default now(),last_run_id uuid references public.ibfc_legislative_runs(id),last_error text,
 unique(candidate_id,provider,external_id,category),check(provider<>'senado' or category<>'events')
);
alter table public.ibfc_legislative_runs add column if not exists schedule_id uuid references public.ibfc_legislative_schedules(id);
create index if not exists ibfc_legislative_queue_idx on public.ibfc_legislative_runs(queue_status,updated_at) where execution_mode='background';
alter table public.ibfc_legislative_schedules enable row level security;
drop policy if exists legislative_staff_read on public.ibfc_legislative_schedules;
create policy legislative_staff_read on public.ibfc_legislative_schedules for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
revoke all on public.ibfc_legislative_schedules from anon,authenticated;
grant select on public.ibfc_legislative_schedules to authenticated;
-- A chave de lease nunca deve aparecer no portal ou no REST autenticado.
revoke select on public.ibfc_legislative_runs from authenticated;
grant select(id,candidate_id,provider,external_id,official_name,category,start_on,end_on,page,version,status,saved,error,created_by,created_at,updated_at,execution_mode,queue_status,lease_until,heartbeat_at,schedule_id,background_owner_id) on public.ibfc_legislative_runs to authenticated;
grant all on public.ibfc_legislative_runs,public.ibfc_legislative_records,public.ibfc_legislative_batches,public.ibfc_legislative_schedules to service_role;
do $$begin
 if to_regprocedure('public.ibfc_legislative_run_save_core(jsonb)') is null then alter function public.ibfc_legislative_run_save(jsonb) rename to ibfc_legislative_run_save_core;end if;
end$$;
revoke all on function public.ibfc_legislative_run_save_core(jsonb) from public,anon,authenticated,service_role;
create or replace function public.ibfc_legislative_run_save(p_data jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.ibfc_legislative_runs;result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_data->>'action'<>'start' then
  select * into r from public.ibfc_legislative_runs where id=(p_data->>'id')::uuid for update;
  if r.execution_mode='background' then raise exception 'Use os controles da fila para esta coleta em segundo plano';end if;
 end if;
 result:=public.ibfc_legislative_run_save_core(p_data);
 return result-'worker_token';
end$$;
create or replace function public.ibfc_legislative_background_control(p_data jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.ibfc_legislative_runs;s public.ibfc_legislative_schedules;action text:=p_data->>'action';
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if action='toggle_schedule' then
  if jsonb_typeof(p_data->'enabled') is distinct from 'boolean' then raise exception 'Agenda inválida';end if;
  update public.ibfc_legislative_schedules set enabled=(p_data->>'enabled')::boolean,updated_at=now(),next_run_at=case when (p_data->>'enabled')::boolean then now() else next_run_at end where id=(p_data->>'id')::uuid returning * into s;
  if not found then raise exception 'Agenda inexistente';end if;return to_jsonb(s);
 end if;
 select * into r from public.ibfc_legislative_runs where id=(p_data->>'id')::uuid for update;
 if not found then raise exception 'Coleta não encontrada';end if;
 if action='schedule' then
  if (p_data->>'interval_days')::integer not in(1,7) or (p_data->>'lookback_days')::integer not between 1 and 90 or jsonb_typeof(p_data->'enabled') is distinct from 'boolean' then raise exception 'Configuração de agenda inválida';end if;
  insert into public.ibfc_legislative_schedules(candidate_id,provider,external_id,official_name,category,interval_days,lookback_days,enabled,created_by,last_run_id,next_run_at)
   values(r.candidate_id,r.provider,r.external_id,r.official_name,r.category,(p_data->>'interval_days')::integer,(p_data->>'lookback_days')::integer,(p_data->>'enabled')::boolean,auth.uid(),r.id,((date_trunc('day',now() at time zone 'America/Sao_Paulo')+make_interval(days=>(p_data->>'interval_days')::integer)) at time zone 'America/Sao_Paulo'))
   on conflict(candidate_id,provider,external_id,category) do update set interval_days=excluded.interval_days,lookback_days=excluded.lookback_days,enabled=excluded.enabled,created_by=excluded.created_by,last_run_id=r.id,next_run_at=excluded.next_run_at,updated_at=now(),last_error=null returning * into s;
  update public.ibfc_legislative_runs set schedule_id=s.id where id=r.id;return to_jsonb(s);
 end if;
 if action='pause' then
  if r.execution_mode<>'background' or r.queue_status='done' then raise exception 'Esta coleta não está na fila';end if;
  update public.ibfc_legislative_runs set queue_status='paused',worker_token=null,lease_until=null,version=version+1,updated_at=now() where id=r.id returning * into r;
 elsif action in('enqueue','dispatch_failed') then
  if r.status in('completed','partial') then raise exception 'Coleta encerrada';end if;
  if r.execution_mode='background' and r.queue_status='processing' and r.lease_until>now() then raise exception 'Worker ativo. Pause primeiro ou aguarde o processamento';end if;
  update public.ibfc_legislative_runs set background_owner_id=auth.uid(),execution_mode='background',queue_status=case when action='enqueue' then 'queued' else 'failed' end,worker_token=null,lease_until=null,status=case when action='enqueue' then case when page=1 then 'ready' else 'running' end else 'failed' end,error=case when action='enqueue' then null else 'GitHub recusou o início. Confira workflow, branch e token Actions' end,version=version+1,updated_at=now() where id=r.id returning * into r;
 else raise exception 'Ação inválida';end if;
 return to_jsonb(r)-'worker_token';
end$$;
create or replace function public.ibfc_legislative_schedule_due() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.ibfc_legislative_schedules;r public.ibfc_legislative_runs;start_day date;end_day date:=(now() at time zone 'America/Sao_Paulo')::date;n integer:=0;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker necessário';end if;
 for s in select * from public.ibfc_legislative_schedules where enabled and next_run_at<=now() order by next_run_at limit 100 for update skip locked loop
  if not exists(select 1 from public.admin_profiles where id=s.created_by and role in('admin','editor')) then
   update public.ibfc_legislative_schedules set last_error='Responsável sem acesso administrativo ativo',next_run_at=now()+interval '1 day',updated_at=now() where id=s.id;continue;
  end if;
  select * into r from public.ibfc_legislative_runs where schedule_id=s.id and status not in('completed','partial') order by created_at desc limit 1 for update;
  if found then
   if r.queue_status='paused' then update public.ibfc_legislative_schedules set last_error='Coleta pausada: retome pelo portal',next_run_at=now()+interval '1 day',updated_at=now() where id=s.id;continue;end if;
   if r.queue_status='processing' and r.lease_until>now() then continue;end if;
   update public.ibfc_legislative_runs set background_owner_id=s.created_by,execution_mode='background',queue_status='queued',worker_token=null,lease_until=null,error=null,version=version+1,updated_at=now() where id=r.id;
  else
   start_day:=end_day-s.lookback_days+1;
   if s.provider='camara' and s.category='votes' then start_day:=greatest(start_day,make_date(extract(year from end_day)::integer,1,1));end if;
   insert into public.ibfc_legislative_runs(candidate_id,provider,external_id,official_name,category,start_on,end_on,created_by,execution_mode,queue_status,schedule_id,background_owner_id)
    values(s.candidate_id,s.provider,s.external_id,s.official_name,s.category,start_day,end_day,s.created_by,'background','queued',s.id,s.created_by) returning * into r;
  end if;
  update public.ibfc_legislative_schedules set last_run_id=r.id,last_error=null,next_run_at=((date_trunc('day',now() at time zone 'America/Sao_Paulo')+make_interval(days=>s.interval_days)) at time zone 'America/Sao_Paulo'),updated_at=now() where id=s.id;n:=n+1;
 end loop;
 return jsonb_build_object('queued',n);
end$$;
create or replace function public.ibfc_legislative_worker(p_action text,p_id uuid default null,p_token text default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.ibfc_legislative_runs;result jsonb;old_sub text;old_role text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker necessário';end if;
 if p_action='claim' then
  select * into r from public.ibfc_legislative_runs where execution_mode='background' and (p_id is null or id=p_id) and status not in('completed','partial') and (queue_status='queued' or (queue_status='processing' and coalesce(lease_until,'-infinity')<now())) order by updated_at limit 1 for update skip locked;
  if not found then return null;end if;
  if not exists(select 1 from public.admin_profiles where id=coalesce(r.background_owner_id,r.created_by) and role in('admin','editor')) then
   update public.ibfc_legislative_runs set queue_status='failed',status='failed',error='Responsável sem acesso administrativo ativo',worker_token=null,lease_until=null,updated_at=now() where id=r.id;return jsonb_build_object('blocked',true,'id',r.id);
  end if;
  update public.ibfc_legislative_runs set queue_status='processing',worker_token=replace(gen_random_uuid()::text,'-',''),lease_until=now()+interval '10 minutes',heartbeat_at=now(),version=version+1,error=null,updated_at=now() where id=r.id returning * into r;
  return to_jsonb(r);
 end if;
 select * into r from public.ibfc_legislative_runs where id=p_id for update;
 if not found or p_token is null or r.worker_token is distinct from p_token or r.lease_until is null or r.lease_until<=now() or not exists(select 1 from public.admin_profiles where id=coalesce(r.background_owner_id,r.created_by) and role in('admin','editor')) then raise exception 'Lease inválido, encerrado ou responsável inativo';end if;
 -- Repetição do commit após perda da resposta HTTP não duplica lotes.
 if p_action='commit' and r.version=(p_data->>'version')::integer+1 and r.page=(p_data->>'page')::integer+1 and exists(select 1 from public.ibfc_legislative_batches where run_id=r.id and page=(p_data->>'page')::integer) then return to_jsonb(r)-'worker_token';end if;
 if r.queue_status<>'processing' then raise exception 'Coleta pausada ou encerrada';end if;
 if p_action='heartbeat' then update public.ibfc_legislative_runs set heartbeat_at=now(),lease_until=now()+interval '10 minutes',updated_at=now() where id=r.id returning * into r;
 elsif p_action='release' then update public.ibfc_legislative_runs set queue_status='queued',worker_token=null,lease_until=null,version=version+1,updated_at=now() where id=r.id returning * into r;
 elsif p_action in('commit','fail') then
  if p_action='commit' and r.page is distinct from (p_data->>'page')::integer then raise exception 'Página inválida';end if;
  old_sub:=current_setting('request.jwt.claim.sub',true);old_role:=current_setting('request.jwt.claims',true);
  perform set_config('request.jwt.claim.sub',coalesce(r.background_owner_id,r.created_by)::text,true);
  -- auth.uid() também usa request.jwt.claims em versões atuais do Supabase.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',coalesce(r.background_owner_id,r.created_by),'role','service_role')::text,true);
  result:=public.ibfc_legislative_run_save_core(p_data||jsonb_build_object('action',case when p_action='commit' then 'commit' else 'fail' end,'id',r.id));
  perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);perform set_config('request.jwt.claims',coalesce(old_role,''),true);
  update public.ibfc_legislative_runs set queue_status=case when p_action='fail' then 'failed' when status in('completed','partial') then 'done' else 'processing' end,heartbeat_at=now(),lease_until=now()+interval '10 minutes' where id=r.id returning * into r;
 else raise exception 'Ação inválida';end if;
 return to_jsonb(r)-'worker_token';
end$$;
revoke all on function public.ibfc_legislative_background_control(jsonb),public.ibfc_legislative_run_save(jsonb) from public,anon;
grant execute on function public.ibfc_legislative_background_control(jsonb),public.ibfc_legislative_run_save(jsonb) to authenticated;
revoke all on function public.ibfc_legislative_worker(text,uuid,text,jsonb),public.ibfc_legislative_schedule_due() from public,anon,authenticated;
grant execute on function public.ibfc_legislative_worker(text,uuid,text,jsonb),public.ibfc_legislative_schedule_due() to service_role;
notify pgrst,'reload schema';
commit;
