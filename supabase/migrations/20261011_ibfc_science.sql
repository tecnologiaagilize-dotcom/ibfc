-- Aplicar DEPOIS de 20261009 e 20261010. Preserva a carga publicada.
begin;
alter table public.ibfc_electoral_sync_jobs add column if not exists national boolean not null default false;
grant select(national) on public.ibfc_electoral_sync_jobs to authenticated;
alter table public.ibfc_electoral_sync_jobs drop constraint if exists ibfc_electoral_sync_jobs_scopes_check;
alter table public.ibfc_electoral_locations drop constraint if exists ibfc_electoral_locations_check;
alter table public.ibfc_electoral_locations add constraint ibfc_electoral_locations_check check ((latitude is null and longitude is null) or (latitude between -34 and 6 and longitude between -74 and -32));
alter table public.ibfc_electoral_sync_jobs add constraint ibfc_electoral_sync_jobs_scopes_check check(cardinality(scopes)>0 and scopes <@ array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']::text[]);
create or replace function public.ibfc_electoral_sync_request(p_action text,p_year integer default null,p_scopes text[] default null,p_job uuid default null) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare j public.ibfc_electoral_sync_jobs;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 perform pg_advisory_xact_lock(20261008);
 if p_action in('cancel','dispatch_failed') then
  update public.ibfc_electoral_sync_jobs set status=case when p_action='cancel' then 'cancelled' else 'failed' end,message=case when p_action='cancel' then 'Cancelado pelo administrador' else 'GitHub recusou o início. Confira workflow, branch e token Actions.' end,updated_at=now(),finished_at=now()
  where id=p_job and (status='queued' or (p_action='cancel' and status='running')) returning * into j;
  if not found then return jsonb_build_object('unchanged',true); end if;
  update public.ibfc_electoral_imports set status='failed',error=j.message,finished_at=now() where sync_job=j.id and status='running';
  return jsonb_build_object('id',j.id,'status',j.status);
 end if;
 if p_action<>'start' or p_year not in(2022,2026) or p_scopes is null or cardinality(p_scopes)=0 or not p_scopes <@ array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']::text[] then raise exception 'Ano ou cobertura inválidos'; end if;
 -- Dead workers cannot hold the queue forever. Download/parse sends a heartbeat every 20 seconds.
 update public.ibfc_electoral_sync_jobs set status='failed',message='Processamento interrompido: sem atualização há mais de 30 minutos. Inicie uma nova carga.',finished_at=now(),updated_at=now()
 where status in('queued','running') and updated_at<now()-interval '30 minutes';
 update public.ibfc_electoral_imports i set status='failed',error='Sincronização interrompida',finished_at=now() where i.status='running' and exists(select 1 from public.ibfc_electoral_sync_jobs sj where sj.id=i.sync_job and sj.status='failed');
 select * into j from public.ibfc_electoral_sync_jobs where status in('queued','running') limit 1;
 if found then return jsonb_build_object('id',j.id,'existing',true); end if;
 insert into public.ibfc_electoral_sync_jobs(year,scopes,created_by) values(p_year,p_scopes,auth.uid()) returning * into j;
 return jsonb_build_object('id',j.id,'existing',false);
end $$;
create or replace function public.ibfc_electoral_sync_schedule(p_owner uuid,p_scopes text[] default array['DF','GO']) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare j public.ibfc_electoral_sync_jobs;
begin
 if not exists(select 1 from public.admin_profiles where id=p_owner and role='admin') then raise exception 'Configure o UUID de um administrador ativo'; end if;
 if p_scopes is null or cardinality(p_scopes)=0 or not p_scopes <@ array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']::text[] then raise exception 'Cobertura inválida'; end if;
 perform pg_advisory_xact_lock(20261008);
 update public.ibfc_electoral_sync_jobs set status='failed',message='Agendamento: tarefa sem atualização há mais de 30 minutos',finished_at=now(),updated_at=now()
 where status in('queued','running') and updated_at<now()-interval '30 minutes';
 update public.ibfc_electoral_imports i set status='failed',error='Sincronização interrompida',finished_at=now() where i.status='running' and exists(select 1 from public.ibfc_electoral_sync_jobs sj where sj.id=i.sync_job and sj.status='failed');
 select * into j from public.ibfc_electoral_sync_jobs where status in('queued','running') limit 1;
 if found then return jsonb_build_object('existing',true); end if;
 insert into public.ibfc_electoral_sync_jobs(year,scopes,created_by,message) values(2026,p_scopes,p_owner,'Atualização diária automática de 2026') returning * into j;
 return jsonb_build_object('id',j.id,'existing',false);
end $$;
create or replace function public.ibfc_electoral_sync_worker(p_action text,p_job uuid,p_token text default null,p_data jsonb default '{}'::jsonb) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare j public.ibfc_electoral_sync_jobs; imp uuid; old_claim text; n integer;
begin
 select * into j from public.ibfc_electoral_sync_jobs where id=p_job for update;
 if not found then raise exception 'Tarefa inexistente'; end if;
 if p_action='claim' then
  if j.status<>'queued' then return null; end if;
  update public.ibfc_electoral_sync_jobs set status='running',worker_token=replace(gen_random_uuid()::text,'-',''),message='Consultando catálogo oficial do TSE',updated_at=now() where id=j.id returning * into j;
  return jsonb_build_object('id',j.id,'year',j.year,'scopes',j.scopes,'national',j.national,'token',j.worker_token);
 end if;
 if j.status<>'running' or p_token is null or j.worker_token<>p_token then raise exception 'Tarefa encerrada ou worker não autorizado'; end if;
 old_claim:=current_setting('request.jwt.claim.sub',true);
 perform set_config('request.jwt.claim.sub',j.created_by::text,true);
 if p_action='progress' then
  update public.ibfc_electoral_sync_jobs set message=left(coalesce(p_data->>'message',message),1000),
   files_total=coalesce((p_data->>'files_total')::integer,files_total),rows_processed=coalesce((p_data->>'rows_processed')::bigint,rows_processed),bytes_downloaded=coalesce((p_data->>'bytes_downloaded')::bigint,bytes_downloaded),updated_at=now() where id=j.id;
 elsif p_action='start_import' then
  if p_data->>'kind' not in('votes','locations') or coalesce(p_data->>'source_url','') !~ '^https://cdn\.tse\.jus\.br/' then raise exception 'Recurso oficial inválido'; end if;
  insert into public.ibfc_electoral_imports(year,kind,filename,source_url,created_by,sync_job) values(j.year,p_data->>'kind',p_data->>'filename',p_data->>'source_url',j.created_by,j.id) returning id into imp;
 elsif p_action in('batch','ready') then
  imp:=(p_data->>'import_id')::uuid;
  if not exists(select 1 from public.ibfc_electoral_imports where id=imp and sync_job=j.id and status='running') then raise exception 'Importação não pertence à tarefa'; end if;
  if p_action='batch' then
   if exists(select 1 from jsonb_array_elements(p_data->'rows') r where not (r->>'uf'=any(j.scopes))) then raise exception 'UF fora da tarefa'; end if;
   n:=public.ibfc_electoral_batch(imp,p_data->'rows');
  elsif not exists(select 1 from public.ibfc_electoral_imports where id=imp and sync_ready) then
   perform public.ibfc_electoral_finish(imp,null);
   -- Prepared resources stay invisible until the whole job reaches publication.
   update public.ibfc_electoral_imports set status='running',sync_ready=true,finished_at=null where id=imp;
   update public.ibfc_electoral_sync_jobs set files_done=files_done+1 where id=j.id;
  end if;
 elsif p_action='finish' then
  if exists(select 1 from public.ibfc_electoral_imports where sync_job=j.id and status='running' and not sync_ready) then raise exception 'Há arquivos incompletos'; end if;
  if j.files_done<>j.files_total then raise exception 'Quantidade de arquivos incompleta'; end if;
  update public.ibfc_electoral_imports set status='completed',finished_at=now() where sync_job=j.id and sync_ready and status='running';
  update public.ibfc_electoral_sync_jobs set status=case when j.files_total=0 then 'waiting' when coalesce((p_data->>'partial')::boolean,false) then 'partial' else 'completed' end,finished_at=now(),message=left(coalesce(p_data->>'message','Bases atualizadas'),1000) where id=j.id;
 elsif p_action='fail' then
  update public.ibfc_electoral_imports set status='failed',error=left(p_data->>'message',1000),finished_at=now() where sync_job=j.id and status='running';
  update public.ibfc_electoral_sync_jobs set status='failed',message=left(coalesce(p_data->>'message','Falha no processamento'),1000),finished_at=now() where id=j.id;
 else raise exception 'Ação desconhecida'; end if;
 update public.ibfc_electoral_sync_jobs set updated_at=now() where id=j.id;
 perform set_config('request.jwt.claim.sub',coalesce(old_claim,''),true);
 return jsonb_build_object('ok',true,'import_id',imp,'saved',n);
end $$;
create or replace function public.ibfc_electoral_batch(p_import uuid,p_rows jsonb) returns integer
 language plpgsql security invoker set search_path=public as $$
declare job public.ibfc_electoral_imports; count_rows integer;
begin
 select * into job from public.ibfc_electoral_imports where id=p_import and status='running' and created_by=auth.uid() for update;
 if not found then raise exception 'Importação inexistente, encerrada ou não autorizada'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Lote inválido'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'year')::integer<>job.year) then raise exception 'Ano divergente'; end if;
 if not exists(select 1 from public.ibfc_electoral_sync_jobs s where s.id=job.sync_job and s.national) and exists(select 1 from jsonb_array_elements(p_rows) r where not exists(select 1 from public.ibfc_electoral_region_names g where g.uf=r->>'uf' and g.name=r->>'municipality_name')) then raise exception 'Município fora da cobertura regional'; end if;
 if job.kind='locations' then
  insert into public.ibfc_electoral_locations(import_id,year,uf,municipality_name,municipality,zone,local,name,address,latitude,longitude)
  select distinct on(uf,municipality,zone,local) p_import,year,uf,municipality_name,municipality,zone,local,name,coalesce(address,''),latitude,longitude
  from jsonb_to_recordset(p_rows) as r(year integer,uf text,municipality_name text,municipality integer,zone integer,local integer,name text,address text,latitude double precision,longitude double precision)
  order by uf,municipality,zone,local
  on conflict(import_id,uf,municipality,zone,local) do update set name=excluded.name,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude;
 else
  insert into public.ibfc_electoral_votes(import_id,year,uf,municipality_name,election,turn,municipality,zone,section,local,office,number,name,office_name,votes,local_name,local_address)
  select p_import,year,uf,municipality_name,election,turn,municipality,zone,section,local,office,number,name,office_name,votes,coalesce(local_name,''),coalesce(local_address,'')
  from jsonb_to_recordset(p_rows) as r(year integer,uf text,municipality_name text,election integer,turn integer,municipality integer,zone integer,section integer,local integer,office integer,number text,name text,office_name text,votes bigint,local_name text,local_address text)
  on conflict(import_id,uf,election,turn,municipality,zone,section,office,number) do update set votes=excluded.votes,local=excluded.local,name=excluded.name,office_name=excluded.office_name,local_name=excluded.local_name,local_address=excluded.local_address;
  insert into public.ibfc_electoral_candidates(import_id,year,election,turn,office,uf,number,name,office_name)
  select distinct on(election,turn,office,uf,number) p_import,year,election,turn,office,uf,number,name,office_name
  from jsonb_to_recordset(p_rows) as r(year integer,uf text,municipality_name text,election integer,turn integer,office integer,number text,name text,office_name text)
  where number not in ('95','96','97','98','99') and length(number)=case office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end
  order by election,turn,office,uf,number
  on conflict(import_id,uf,election,turn,office,number) do update set name=excluded.name,office_name=excluded.office_name;
 end if;
 count_rows:=jsonb_array_length(p_rows);
 update public.ibfc_electoral_imports set rows_saved=rows_saved+count_rows where id=p_import;
 return count_rows;
end $$;
create or replace function public.ibfc_science_set_coverage(p_job uuid,p_national boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 update public.ibfc_electoral_sync_jobs set national=p_national where id=p_job and created_by=auth.uid() and status='queued';
 if not found then raise exception 'Tarefa não disponível para configurar'; end if;
end $$;
revoke all on function public.ibfc_science_set_coverage(uuid,boolean) from public,anon;
grant execute on function public.ibfc_science_set_coverage(uuid,boolean) to authenticated;

create or replace function public.ibfc_science_catalogue(p_uf text) returns jsonb language sql stable security invoker set search_path=public as $$
 with c as(select c.* from public.ibfc_electoral_candidates c join public.ibfc_electoral_latest_partitions p using(import_id,year,election,turn,office,uf) where c.uf=p_uf or (p_uf='BR' and c.office=1)),
 candidates as(select year,election,turn,office,case when p_uf='BR' then 'BR' else uf end uf,number,max(name) name,max(office_name) office_name from c group by year,election,turn,office,case when p_uf='BR' then 'BR' else uf end,number),
 parties as(select distinct year,election,turn,office,uf,left(number,2) number,'Partido '||left(number,2) name,office_name,'party' kind from candidates),
 territories as(select distinct t.uf,t.municipality,t.municipality_name,t.zone,t.local from public.ibfc_electoral_section_totals t join public.ibfc_electoral_latest_partitions p using(import_id,year,election,turn,office,uf) where t.uf=p_uf)
 select jsonb_build_object('candidates',coalesce((select jsonb_agg(to_jsonb(c) order by year desc,office,name) from candidates c),'[]'),
 'parties',coalesce((select jsonb_agg(to_jsonb(c) order by year desc,office,name) from parties c),'[]'),
 'municipalities',coalesce((select jsonb_agg(to_jsonb(c)) from(select distinct uf,municipality,municipality_name name from territories) c),'[]'),
 'zones',coalesce((select jsonb_agg(to_jsonb(c)) from(select distinct municipality,zone from territories) c),'[]'),
 'locations',coalesce((select jsonb_agg(to_jsonb(c)) from(select distinct municipality,zone,local,'Local '||local name from territories) c),'[]'),
 'coverage',coalesce((select jsonb_agg(to_jsonb(c)) from(select distinct uf,year,turn,office from public.ibfc_electoral_latest_partitions) c),'[]'));
$$;
create or replace function public.ibfc_science_compare(p_old jsonb,p_new jsonb,p_scope text,p_filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare output jsonb;
begin
 if p_scope not in('country','state','municipality','zone','location','section') or p_old->>'uf'<>p_new->>'uf' or p_old->>'office'<>p_new->>'office' or p_old->>'turn'<>p_new->>'turn' or p_old->>'year'<>'2022' or p_new->>'year'<>'2026' then raise exception 'Comparação incompatível'; end if;
 if (p_new->>'uf'='BR' or p_scope='country') and (p_new->>'office'<>'1' or p_new->>'uf'<>'BR' or p_scope<>'country') then raise exception 'Brasil compara presidente por UF'; end if;

 with old_p as (select * from public.ibfc_electoral_latest_partitions where year=2022 and (uf=p_old->>'uf' or (p_old->>'uf'='BR' and office=1)) and election=(p_old->>'election')::integer and turn=(p_old->>'turn')::integer and office=(p_old->>'office')::integer),
 new_p as (select * from public.ibfc_electoral_latest_partitions where year=2026 and (uf=p_new->>'uf' or (p_new->>'uf'='BR' and office=1)) and election=(p_new->>'election')::integer and turn=(p_new->>'turn')::integer and office=(p_new->>'office')::integer),
 old_s as (select t.*,coalesce(v.votes,0) as candidate_votes from public.ibfc_electoral_section_totals t join old_p p using(import_id,year,election,turn,office,uf)
  left join lateral (select sum(w.votes) votes from public.ibfc_electoral_votes w
   where (w.import_id,w.uf,w.election,w.turn,w.office,w.municipality,w.zone,w.section)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section)
   and case when p_old->>'kind' in('party','group') then w.number not in('95','96','97','98','99') and left(w.number,2) in(select jsonb_array_elements_text(case when p_old->>'kind'='group' then p_old->'numbers' else jsonb_build_array(p_old->>'number') end))
    and (length(w.number)=case w.office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end or (w.office in(6,7,8) and length(w.number)=2))
    else w.number=p_old->>'number' end) v on true where ((p_filters->>'municipality') is null or t.municipality=(p_filters->>'municipality')::integer) and ((p_filters->>'zone') is null or t.zone=(p_filters->>'zone')::integer)),
 new_s as (select t.*,coalesce(v.votes,0) as candidate_votes from public.ibfc_electoral_section_totals t join new_p p using(import_id,year,election,turn,office,uf)
  left join lateral (select sum(w.votes) votes from public.ibfc_electoral_votes w
   where (w.import_id,w.uf,w.election,w.turn,w.office,w.municipality,w.zone,w.section)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section)
   and case when p_new->>'kind' in('party','group') then w.number not in('95','96','97','98','99') and left(w.number,2) in(select jsonb_array_elements_text(case when p_new->>'kind'='group' then p_new->'numbers' else jsonb_build_array(p_new->>'number') end))
    and (length(w.number)=case w.office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end or (w.office in(6,7,8) and length(w.number)=2))
    else w.number=p_new->>'number' end) v on true where ((p_filters->>'municipality') is null or t.municipality=(p_filters->>'municipality')::integer) and ((p_filters->>'zone') is null or t.zone=(p_filters->>'zone')::integer)),
 loc as (select distinct on(l.year,l.uf,l.municipality,l.zone,l.local) l.* from public.ibfc_electoral_locations l join public.ibfc_electoral_imports i on i.id=l.import_id and i.status='completed'
  order by l.year,l.uf,l.municipality,l.zone,l.local,i.created_at desc,i.id desc),
 result as (select coalesce(n.uf,o.uf) uf,coalesce(n.municipality_name,o.municipality_name) municipality_name,coalesce(n.municipality,o.municipality) municipality,coalesce(n.zone,o.zone) zone,coalesce(n.section,o.section) section,
  o.candidate_votes old_votes,n.candidate_votes new_votes,o.valid old_valid,n.valid new_valid,o.local old_local,n.local new_local,
  coalesce(ol.name,nullif(o.local_name,'')) old_name,coalesce(nl.name,nullif(n.local_name,'')) new_name,
  case when n.local is not null then nl.latitude else ol.latitude end latitude,
  case when n.local is not null then nl.longitude else ol.longitude end longitude,
  case when n.local is not null then coalesce(nl.address,nullif(n.local_address,'')) else coalesce(ol.address,nullif(o.local_address,'')) end address,
  case when n.local is not null and nl.latitude is not null then 2026 when n.local is null and ol.latitude is not null then 2022 else null end coordinate_year
  from old_s o full join new_s n using(uf,municipality,zone,section)
  left join loc ol on ol.year=2022 and ol.uf=o.uf and ol.municipality=o.municipality and ol.zone=o.zone and ol.local=o.local
  left join loc nl on nl.year=2026 and nl.uf=n.uf and nl.municipality=n.municipality and nl.zone=n.zone and nl.local=n.local),
 filtered as(select * from result where (not coalesce((p_filters->>'common_only')::boolean,false) or (old_valid is not null and new_valid is not null)) and ((p_filters->>'local') is null or coalesce(new_local,old_local)=(p_filters->>'local')::integer) and ((p_filters->>'section') is null or section=(p_filters->>'section')::integer)),
 keyed as(select *,case p_scope when 'country' then uf when 'state' then uf||':'||municipality when 'municipality' then uf||':'||municipality||':'||zone else uf||':'||municipality||':'||zone||':'||coalesce(new_local,old_local,0)||case when p_scope in('location','section') then ':'||section else '' end end key from filtered),
 grouped as(select key,max(uf) uf,max(municipality_name) municipality_name,min(municipality) municipality,min(zone) zone,min(section) section,
 case p_scope when 'country' then max(uf) when 'state' then max(municipality_name) when 'municipality' then 'Zona '||min(zone) else coalesce(max(new_name),max(old_name),'Local '||max(coalesce(new_local,old_local)))||case when p_scope in('location','section') then ' · Seção '||min(section) else '' end end name,
 sum(old_votes) old_votes,sum(new_votes) new_votes,sum(old_valid) old_valid,sum(new_valid) new_valid,
 min(old_local) old_local,min(new_local) new_local,min(coalesce(new_local,old_local)) local,max(old_name) old_name,max(new_name) new_name,
 avg(latitude) latitude,avg(longitude) longitude,max(address) address,max(coordinate_year) coordinate_year,
 count(*) section_count,count(old_valid) old_sections,count(new_valid) new_sections,count(*) filter(where old_valid is not null and new_valid is not null) common_sections,
 count(*) filter(where old_local<>new_local) moved_sections from keyed group by key)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from(select * from grouped order by key limit 5000) r),'[]'),
 'total_rows',(select count(*) from grouped),'truncated',(select count(*)>5000 from grouped),'generated_at',now(),
 'totals',(select jsonb_build_object('old_votes',sum(old_votes),'new_votes',sum(new_votes),'old_valid',sum(old_valid),'new_valid',sum(new_valid),'old_sections',count(old_valid),'new_sections',count(new_valid),'common_sections',count(*) filter(where old_valid is not null and new_valid is not null),'moved_sections',count(*) filter(where old_local<>new_local)) from filtered),
 'coverage',coalesce((select jsonb_agg(distinct uf) from new_p),'[]'),
 'sources',coalesce((select jsonb_agg(to_jsonb(x)) from(select i.id,i.year,i.filename,i.source_url,i.finished_at from public.ibfc_electoral_imports i where i.id in(select import_id from old_p union select import_id from new_p)) x),'[]')) into output;
 return output;
end $$;
revoke all on function public.ibfc_science_catalogue(text), public.ibfc_science_compare(jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.ibfc_science_catalogue(text), public.ibfc_science_compare(jsonb,jsonb,text,jsonb) to authenticated;

create table if not exists public.ibfc_science_investigations(
 id uuid primary key default gen_random_uuid(),protocol text not null unique,title text not null,status text not null default 'review' check(status in('insufficient','review','explained','confirmed','followup','closed')),
 payload jsonb not null default '{}',revision integer not null default 1,created_by uuid references auth.users(id) default auth.uid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.ibfc_science_versions(id bigint generated always as identity primary key,investigation_id uuid not null references public.ibfc_science_investigations(id),snapshot jsonb not null,actor uuid references auth.users(id) default auth.uid(),created_at timestamptz not null default now());
alter table public.ibfc_science_investigations enable row level security;
alter table public.ibfc_science_versions enable row level security;
drop policy if exists science_staff on public.ibfc_science_investigations;
create policy science_staff on public.ibfc_science_investigations for all to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor'))) with check(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists science_versions_read on public.ibfc_science_versions;
create policy science_versions_read on public.ibfc_science_versions for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
grant select,insert,update on public.ibfc_science_investigations to authenticated;
grant select on public.ibfc_science_versions to authenticated;
create or replace function public.ibfc_science_version() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.ibfc_science_versions(investigation_id,snapshot) values(old.id,to_jsonb(old));
 new.revision=old.revision+1;new.updated_at=now();return new;
end $$;
drop trigger if exists science_version on public.ibfc_science_investigations;
create trigger science_version before update on public.ibfc_science_investigations for each row execute function public.ibfc_science_version();
insert into public.ibfc_science_investigations(protocol,title,payload) values('INV-2026-001','Relato de interrupção da divulgação presidencial em 04/10/2026',jsonb_build_object('hypothesis','Relato fornecido pelo solicitante; não verificado em fonte oficial.','method','Obter arquivos oficiais e horários documentados; reproduzir os totais e considerar diferenças de cobertura.','alternatives','Indisponibilidade do portal, cache, rede, ritmo de totalização e mudança de composição geográfica.','conclusion','Sem conclusão: requer evidência oficial e revisão independente.','sources','https://resultados.tse.jus.br/')) on conflict(protocol) do nothing;
create table if not exists public.ibfc_science_analyses(id uuid primary key default gen_random_uuid(),created_by uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now(),method_version text not null,parameters jsonb not null,sources jsonb not null,totals jsonb not null,result_sha256 text not null check(result_sha256 ~ '^[0-9a-f]{64}$'));
alter table public.ibfc_science_analyses enable row level security;
drop policy if exists science_analyses_read on public.ibfc_science_analyses;
create policy science_analyses_read on public.ibfc_science_analyses for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists science_analyses_insert on public.ibfc_science_analyses;
create policy science_analyses_insert on public.ibfc_science_analyses for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
grant select,insert on public.ibfc_science_analyses to authenticated;
revoke update,delete on public.ibfc_science_analyses from authenticated;
notify pgrst,'reload schema';
commit;
