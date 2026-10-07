begin;
create table if not exists public.ibfc_legislative_runs(
 id uuid primary key default gen_random_uuid(),candidate_id uuid not null references public.candidates(id),provider text not null check(provider in('camara','senado')),external_id text not null check(external_id~'^[0-9]{1,10}$'),official_name text not null,
 category text not null check(category in('committees','propositions','votes','events')),start_on date not null,end_on date not null check(end_on>=start_on and end_on-start_on<=365),
 page integer not null default 1,version integer not null default 1,status text not null default 'ready' check(status in('ready','running','failed','completed','partial')),saved integer not null default 0,error text,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.ibfc_legislative_records(
 id uuid primary key default gen_random_uuid(),candidate_id uuid not null references public.candidates(id),provider text not null,category text not null,external_id text not null,external_key text not null,
 title text not null,summary text,occurred_on date,source_url text not null,source_hash text not null,payload jsonb not null,vote_value text,fetched_at timestamptz not null default now(),run_id uuid not null references public.ibfc_legislative_runs(id),
 unique(candidate_id,provider,category,external_id,external_key)
);
create index if not exists ibfc_legislative_records_lookup on public.ibfc_legislative_records(candidate_id,provider,category,occurred_on desc);
create table if not exists public.ibfc_legislative_batches(
 run_id uuid not null references public.ibfc_legislative_runs(id),page integer not null,source_url text not null,records_count integer not null,fetched_at timestamptz not null default now(),primary key(run_id,page)
);
do $$declare t text;begin foreach t in array array['ibfc_legislative_runs','ibfc_legislative_records','ibfc_legislative_batches'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);
 execute format('drop policy if exists legislative_staff_read on public.%I',t);execute format('create policy legislative_staff_read on public.%I for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in(''admin'',''editor'')))',t);
 end loop;end$$;
create or replace function public.ibfc_legislative_run_save(p_data jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.ibfc_legislative_runs;x jsonb;n integer;next_status text;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_data->>'action'='start' then
  if p_data->'confirmed' is distinct from 'true'::jsonb then raise exception 'Confirme o vínculo oficial';end if;
  if (p_data->>'provider')='senado' and (p_data->>'category')='events' then raise exception 'Categoria indisponível';end if;
  insert into public.ibfc_legislative_runs(candidate_id,provider,external_id,official_name,category,start_on,end_on,created_by) values((p_data->>'candidate_id')::uuid,p_data->>'provider',p_data->>'external_id',p_data->>'official_name',p_data->>'category',(p_data->>'start_on')::date,(p_data->>'end_on')::date,auth.uid()) returning * into r;
 else
  select * into r from public.ibfc_legislative_runs where id=(p_data->>'id')::uuid for update;
  if not found then raise exception 'Coleta não encontrada';end if;
  if r.version is distinct from (p_data->>'version')::integer then raise exception 'Coleta alterada por outra sessão';end if;
  if r.status in('completed','partial') then raise exception 'Coleta encerrada';end if;
  if p_data->>'action'='fail' then
   update public.ibfc_legislative_runs set status='failed',error=left(p_data->>'error',1000),version=version+1,updated_at=now() where id=r.id returning * into r;
  elsif p_data->>'action'='commit' then
   if jsonb_typeof(p_data->'records') is distinct from 'array' or jsonb_array_length(p_data->'records')>2000 then raise exception 'Lote inválido';end if;
   n=jsonb_array_length(p_data->'records');
   for x in select value from jsonb_array_elements(p_data->'records') loop
    if length(x->>'external_key')>500 or (x->>'source_hash')!~'^[a-f0-9]{64}$' or (x->>'source_url')!~'^https://(dadosabertos[.]camara[.]leg[.]br|legis[.]senado[.]leg[.]br)/' then raise exception 'Registro inválido';end if;
    insert into public.ibfc_legislative_records(candidate_id,provider,category,external_id,external_key,title,summary,occurred_on,source_url,source_hash,payload,vote_value,run_id)
    values(r.candidate_id,r.provider,r.category,r.external_id,x->>'external_key',x->>'title',x->>'summary',(x->>'occurred_on')::date,x->>'source_url',x->>'source_hash',x->'payload',x->>'vote_value',r.id)
    on conflict(candidate_id,provider,category,external_id,external_key) do update set title=excluded.title,summary=excluded.summary,occurred_on=excluded.occurred_on,source_url=excluded.source_url,source_hash=excluded.source_hash,payload=excluded.payload,vote_value=excluded.vote_value,run_id=excluded.run_id,fetched_at=now();
   end loop;
   insert into public.ibfc_legislative_batches(run_id,page,source_url,records_count) values(r.id,r.page,p_data->>'source',n);
   next_status=case when p_data->'has_more'='true'::jsonb then case when r.page>=1000 then 'partial' else 'running' end else 'completed' end;
   update public.ibfc_legislative_runs set page=page+1,version=version+1,status=next_status,saved=saved+n,error=null,updated_at=now() where id=r.id returning * into r;
  else raise exception 'Ação inválida';end if;
 end if;
 return to_jsonb(r);
end;$$;
revoke all on function public.ibfc_legislative_run_save(jsonb) from public,anon;
grant execute on function public.ibfc_legislative_run_save(jsonb) to authenticated;
commit;
