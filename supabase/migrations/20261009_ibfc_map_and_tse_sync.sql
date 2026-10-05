-- IBFC — instalação/atualização consolidada: mapa DF/Entorno e sincronização TSE.
-- Requer auth.users e admin_profiles da base do portal. Preserva resultados anteriores.
begin;
-- IBFC — instalação e atualização consolidada DF + Entorno.
-- Execute no Supabase do IBFC; requer auth.users e admin_profiles da base do portal.
-- Preserva registros existentes; não modifica cadastros de afiliados.
-- IBFC: resultados públicos agregados. Nenhum vínculo com member_profiles/ibfc_leads.
create table if not exists public.ibfc_electoral_imports (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('votes','locations')),
 year integer not null check (year in (2022,2026)),
 filename text not null check (length(filename) between 1 and 250),
 source_url text not null check (length(source_url) between 1 and 1000),
 status text not null default 'running' check (status in ('running','completed','failed')),
 rows_saved bigint not null default 0,
 created_at timestamptz not null default now(), finished_at timestamptz,
 created_by uuid not null references auth.users(id), error text
);
create table if not exists public.ibfc_electoral_locations (
 import_id uuid not null references public.ibfc_electoral_imports(id) on delete cascade,
 year integer not null check (year in (2022,2026)),
 municipality integer not null, zone integer not null check (zone>0), local integer not null check (local>0),
 name text not null, address text not null default '', latitude double precision, longitude double precision,
 primary key(import_id,municipality,zone,local),
 check ((latitude is null and longitude is null) or (latitude between -16.1 and -15.3 and longitude between -48.4 and -47.2))
);
create table if not exists public.ibfc_electoral_votes (
 import_id uuid not null references public.ibfc_electoral_imports(id) on delete cascade,
 year integer not null check (year in (2022,2026)), election integer not null, turn integer not null check (turn in (1,2)),
 municipality integer not null, zone integer not null check(zone>0), section integer not null check(section>0), local integer not null check(local>0),
 office integer not null check(office in(1,3,5,6,7,8)), number text not null check(number ~ '^[0-9]{1,5}$'),
 name text not null, office_name text not null, votes bigint not null check(votes>=0), local_name text not null default '', local_address text not null default '',
 primary key(import_id,election,turn,municipality,zone,section,office,number)
);
create index if not exists ibfc_votes_candidate_idx on public.ibfc_electoral_votes(import_id,election,turn,office,number);
create table if not exists public.ibfc_electoral_candidates (
 import_id uuid not null references public.ibfc_electoral_imports(id) on delete cascade,
 year integer not null, election integer not null, turn integer not null, office integer not null,
 number text not null, name text not null, office_name text not null,
 primary key(import_id,election,turn,office,number)
);
create table if not exists public.ibfc_electoral_section_totals (
 import_id uuid not null references public.ibfc_electoral_imports(id) on delete cascade,
 year integer not null, election integer not null, turn integer not null, office integer not null,
 municipality integer not null, zone integer not null, section integer not null, local integer not null,
 valid bigint not null, local_name text not null default '', local_address text not null default '',
 primary key(import_id,election,turn,office,municipality,zone,section)
);

do $$ declare t text; begin
 foreach t in array array['ibfc_electoral_imports','ibfc_electoral_locations','ibfc_electoral_votes','ibfc_electoral_candidates','ibfc_electoral_section_totals'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='electoral_staff') then
   execute format('create policy electoral_staff on public.%I for all to authenticated using(exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in (''admin'',''editor''))) with check(exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in (''admin'',''editor'')))',t);
  end if;
 end loop;
end $$;

create table if not exists public.ibfc_electoral_region_names(uf text not null,name text not null,primary key(uf,name));
revoke all on public.ibfc_electoral_region_names from anon;
grant select on public.ibfc_electoral_region_names to authenticated;
insert into public.ibfc_electoral_region_names(uf,name) values
('DF','Brasília'),
('GO','Abadiânia'),
('GO','Água Fria de Goiás'),
('GO','Águas Lindas de Goiás'),
('GO','Alexânia'),
('GO','Alto Paraíso de Goiás'),
('GO','Alvorada do Norte'),
('GO','Barro Alto'),
('GO','Cabeceiras'),
('GO','Cavalcante'),
('GO','Cidade Ocidental'),
('GO','Cocalzinho de Goiás'),
('GO','Corumbá de Goiás'),
('GO','Cristalina'),
('GO','Flores de Goiás'),
('GO','Formosa'),
('GO','Goianésia'),
('GO','Luziânia'),
('GO','Mimoso de Goiás'),
('GO','Niquelândia'),
('GO','Novo Gama'),
('GO','Padre Bernardo'),
('GO','Pirenópolis'),
('GO','Planaltina'),
('GO','Santo Antônio do Descoberto'),
('GO','São João d’Aliança'),
('GO','Simolândia'),
('GO','Valparaíso de Goiás'),
('GO','Vila Boa'),
('GO','Vila Propício'),
('MG','Arinos'),
('MG','Buritis'),
('MG','Cabeceira Grande'),
('MG','Unaí')
on conflict do nothing;
alter table public.ibfc_electoral_locations add column if not exists uf text not null default 'DF';
alter table public.ibfc_electoral_locations add column if not exists municipality_name text not null default 'Brasília';
alter table public.ibfc_electoral_locations drop constraint if exists ibfc_electoral_locations_pkey;
alter table public.ibfc_electoral_locations add primary key(import_id,uf,municipality,zone,local);
alter table public.ibfc_electoral_votes add column if not exists uf text not null default 'DF';
alter table public.ibfc_electoral_votes add column if not exists municipality_name text not null default 'Brasília';
alter table public.ibfc_electoral_votes drop constraint if exists ibfc_electoral_votes_pkey;
alter table public.ibfc_electoral_votes add primary key(import_id,uf,election,turn,municipality,zone,section,office,number);
alter table public.ibfc_electoral_section_totals add column if not exists uf text not null default 'DF';
alter table public.ibfc_electoral_section_totals add column if not exists municipality_name text not null default 'Brasília';
alter table public.ibfc_electoral_section_totals drop constraint if exists ibfc_electoral_section_totals_pkey;
alter table public.ibfc_electoral_section_totals add primary key(import_id,uf,election,turn,office,municipality,zone,section);
alter table public.ibfc_electoral_candidates add column if not exists uf text not null default 'DF';
alter table public.ibfc_electoral_candidates drop constraint if exists ibfc_electoral_candidates_pkey;
alter table public.ibfc_electoral_candidates add primary key(import_id,uf,election,turn,office,number);
-- Broader RIDE coordinate envelope; missing/invalid coordinates remain NULL.
alter table public.ibfc_electoral_locations drop constraint if exists ibfc_electoral_locations_check;
alter table public.ibfc_electoral_locations add constraint ibfc_electoral_locations_check check ((latitude is null and longitude is null) or (latitude between -18.5 and -13.0 and longitude between -50.5 and -45.0));
-- Snapshots in progress or interrupted are never used in maps/reports.
create or replace view public.ibfc_electoral_latest_partitions with (security_invoker=true) as
 select distinct on(c.year,c.election,c.turn,c.office,c.uf) c.year,c.election,c.turn,c.office,c.import_id,c.uf
 from public.ibfc_electoral_candidates c join public.ibfc_electoral_imports i on i.id=c.import_id and i.status='completed'
 order by c.year,c.election,c.turn,c.office,c.uf,i.created_at desc,i.id desc;
grant select on public.ibfc_electoral_latest_partitions to authenticated;

create or replace function public.ibfc_electoral_batch(p_import uuid,p_rows jsonb) returns integer
 language plpgsql security invoker set search_path=public as $$
declare job public.ibfc_electoral_imports; count_rows integer;
begin
 select * into job from public.ibfc_electoral_imports where id=p_import and status='running' and created_by=auth.uid() for update;
 if not found then raise exception 'Importação inexistente, encerrada ou não autorizada'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Lote inválido'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'year')::integer<>job.year) then raise exception 'Ano divergente'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where not exists(select 1 from public.ibfc_electoral_region_names g where g.uf=r->>'uf' and g.name=r->>'municipality_name')) then raise exception 'Município fora da cobertura regional'; end if;
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

create or replace function public.ibfc_electoral_finish(p_import uuid,p_error text default null) returns void
 language plpgsql security invoker set search_path=public as $$
declare job public.ibfc_electoral_imports;
begin
 select * into job from public.ibfc_electoral_imports where id=p_import and status='running' and created_by=auth.uid() for update;
 if not found then raise exception 'Importação não autorizada ou já encerrada'; end if;
 if p_error is not null then
  update public.ibfc_electoral_imports set status='failed',error=left(p_error,1000),finished_at=now() where id=p_import;
  return;
 end if;
 if job.rows_saved=0 then raise exception 'Nenhum registro do DF ou Entorno foi importado'; end if;
 if job.kind='votes' then
  insert into public.ibfc_electoral_section_totals(import_id,year,election,turn,office,uf,municipality_name,municipality,zone,section,local,valid,local_name,local_address)
  select import_id,year,election,turn,office,uf,municipality_name,municipality,zone,section,max(local),
   coalesce(sum(votes) filter(where number not in ('95','96','97','98','99')),0),max(local_name),max(local_address)
  from public.ibfc_electoral_votes where import_id=p_import
  group by import_id,year,election,turn,office,uf,municipality_name,municipality,zone,section;
 end if;
 update public.ibfc_electoral_imports set status='completed',finished_at=now() where id=p_import;
end $$;

create or replace function public.ibfc_electoral_catalogue() returns jsonb
 language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('candidates',coalesce((select jsonb_agg(to_jsonb(x) order by x.year desc,x.office,x.name)
  from (select c.year,c.election,c.turn,c.office,c.uf,c.number,c.name,c.office_name
   from public.ibfc_electoral_candidates c join public.ibfc_electoral_latest_partitions p using(import_id,year,election,turn,office,uf)) x),'[]'::jsonb),
  'parties',coalesce((select jsonb_agg(to_jsonb(x) order by x.year desc,x.office,x.number) from
   (select v.year,v.election,v.turn,v.office,v.uf,left(v.number,2) number,
    coalesce(max(v.name) filter(where length(v.number)=2 and v.office in(6,7,8)), 'Partido '||left(v.number,2)) name,
    max(v.office_name) office_name,'party'::text kind
    from public.ibfc_electoral_votes v join public.ibfc_electoral_latest_partitions p using(import_id,year,election,turn,office,uf)
    where v.number not in('95','96','97','98','99') and
    (length(v.number)=case v.office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end or (v.office in(6,7,8) and length(v.number)=2))
    group by v.year,v.election,v.turn,v.office,v.uf,left(v.number,2)) x),'[]'::jsonb),
  'imports',coalesce((select jsonb_agg(to_jsonb(x)) from
   (select id,kind,year,filename,status,rows_saved,created_at,error from public.ibfc_electoral_imports order by created_at desc limit 20) x),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(to_jsonb(x)) from
   (select distinct on(l.uf,l.municipality,l.zone,l.local) l.uf,l.municipality_name,l.municipality,l.zone,l.local,l.name,l.address,l.latitude,l.longitude
    from public.ibfc_electoral_locations l join public.ibfc_electoral_imports i on i.id=l.import_id and i.status='completed'
    where l.year=2026 order by l.uf,l.municipality,l.zone,l.local,i.created_at desc,i.id desc) x),'[]'::jsonb));
$$;

create or replace function public.ibfc_electoral_compare(p_old jsonb,p_new jsonb) returns jsonb
 language sql stable security invoker set search_path=public as $$
 with old_p as (select * from public.ibfc_electoral_latest_partitions where year=2022 and uf=p_old->>'uf' and election=(p_old->>'election')::integer and turn=(p_old->>'turn')::integer and office=(p_old->>'office')::integer),
 new_p as (select * from public.ibfc_electoral_latest_partitions where year=2026 and uf=p_new->>'uf' and election=(p_new->>'election')::integer and turn=(p_new->>'turn')::integer and office=(p_new->>'office')::integer),
 old_s as (select t.*,coalesce(v.votes,0) as candidate_votes from public.ibfc_electoral_section_totals t join old_p p using(import_id,year,election,turn,office,uf)
  left join lateral (select sum(w.votes) votes from public.ibfc_electoral_votes w
   where (w.import_id,w.uf,w.election,w.turn,w.office,w.municipality,w.zone,w.section)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section)
   and case when p_old->>'kind'='party' then w.number not in('95','96','97','98','99') and left(w.number,2)=p_old->>'number'
    and (length(w.number)=case w.office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end or (w.office in(6,7,8) and length(w.number)=2))
    else w.number=p_old->>'number' end) v on true),
 new_s as (select t.*,coalesce(v.votes,0) as candidate_votes from public.ibfc_electoral_section_totals t join new_p p using(import_id,year,election,turn,office,uf)
  left join lateral (select sum(w.votes) votes from public.ibfc_electoral_votes w
   where (w.import_id,w.uf,w.election,w.turn,w.office,w.municipality,w.zone,w.section)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section)
   and case when p_new->>'kind'='party' then w.number not in('95','96','97','98','99') and left(w.number,2)=p_new->>'number'
    and (length(w.number)=case w.office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end or (w.office in(6,7,8) and length(w.number)=2))
    else w.number=p_new->>'number' end) v on true),
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
  left join loc nl on nl.year=2026 and nl.uf=n.uf and nl.municipality=n.municipality and nl.zone=n.zone and nl.local=n.local)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.zone,r.section) from result r),'[]'::jsonb),'generated_at',now(),
  'sources',coalesce((select jsonb_agg(to_jsonb(x)) from (select i.year,i.filename,i.source_url,i.finished_at from public.ibfc_electoral_imports i
    where i.id in(select import_id from old_p union select import_id from new_p)) x),'[]'::jsonb));
$$;

revoke all on function public.ibfc_electoral_batch(uuid,jsonb),public.ibfc_electoral_finish(uuid,text),public.ibfc_electoral_catalogue(),public.ibfc_electoral_compare(jsonb,jsonb) from public,anon;
grant execute on function public.ibfc_electoral_batch(uuid,jsonb),public.ibfc_electoral_finish(uuid,text),public.ibfc_electoral_catalogue(),public.ibfc_electoral_compare(jsonb,jsonb) to authenticated;


-- Execute após 20261007_ibfc_electoral_map_consolidated.sql.
create table if not exists public.ibfc_electoral_sync_jobs (
 id uuid primary key default gen_random_uuid(), year integer not null check(year in(2022,2026)),
 scopes text[] not null check(cardinality(scopes)>0 and scopes <@ array['DF','GO','MG']::text[]),
 created_by uuid not null references auth.users(id),
 status text not null default 'queued' check(status in('queued','running','completed','partial','waiting','failed','cancelled')),
 message text not null default 'Aguardando processamento', files_total integer not null default 0, files_done integer not null default 0,
 rows_processed bigint not null default 0, bytes_downloaded bigint not null default 0,
 worker_token text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), finished_at timestamptz
);
create unique index if not exists ibfc_electoral_one_sync on public.ibfc_electoral_sync_jobs((true)) where status in('queued','running');
alter table public.ibfc_electoral_sync_jobs enable row level security;
revoke all on public.ibfc_electoral_sync_jobs from public,anon,authenticated;
grant select(id,year,scopes,created_by,status,message,files_total,files_done,rows_processed,bytes_downloaded,created_at,updated_at,finished_at) on public.ibfc_electoral_sync_jobs to authenticated;
drop policy if exists electoral_sync_staff on public.ibfc_electoral_sync_jobs;
create policy electoral_sync_staff on public.ibfc_electoral_sync_jobs for select to authenticated using(exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in('admin','editor')));
alter table public.ibfc_electoral_imports add column if not exists sync_job uuid references public.ibfc_electoral_sync_jobs(id);
alter table public.ibfc_electoral_imports add column if not exists sync_ready boolean not null default false;

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
 if p_action<>'start' or p_year not in(2022,2026) or p_scopes is null or cardinality(p_scopes)=0 or not p_scopes <@ array['DF','GO','MG']::text[] then raise exception 'Ano ou cobertura inválidos'; end if;
 -- Dead workers cannot hold the queue forever. Download/parse sends a heartbeat every 20 seconds.
 update public.ibfc_electoral_sync_jobs set status='failed',message='Processamento interrompido: sem atualização há mais de 30 minutos. Inicie uma nova carga.',finished_at=now(),updated_at=now()
 where status in('queued','running') and updated_at<now()-interval '30 minutes';
 update public.ibfc_electoral_imports i set status='failed',error='Sincronização interrompida',finished_at=now() where i.status='running' and exists(select 1 from public.ibfc_electoral_sync_jobs sj where sj.id=i.sync_job and sj.status='failed');
 select * into j from public.ibfc_electoral_sync_jobs where status in('queued','running') limit 1;
 if found then return jsonb_build_object('id',j.id,'existing',true); end if;
 insert into public.ibfc_electoral_sync_jobs(year,scopes,created_by) values(p_year,p_scopes,auth.uid()) returning * into j;
 return jsonb_build_object('id',j.id,'existing',false);
end $$;

-- Only the background worker with a service-role credential can invoke this RPC.
-- Browser users cannot obtain or read its claim token.
create or replace function public.ibfc_electoral_sync_worker(p_action text,p_job uuid,p_token text default null,p_data jsonb default '{}'::jsonb) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare j public.ibfc_electoral_sync_jobs; imp uuid; old_claim text; n integer;
begin
 select * into j from public.ibfc_electoral_sync_jobs where id=p_job for update;
 if not found then raise exception 'Tarefa inexistente'; end if;
 if p_action='claim' then
  if j.status<>'queued' then return null; end if;
  update public.ibfc_electoral_sync_jobs set status='running',worker_token=replace(gen_random_uuid()::text,'-',''),message='Consultando catálogo oficial do TSE',updated_at=now() where id=j.id returning * into j;
  return jsonb_build_object('id',j.id,'year',j.year,'scopes',j.scopes,'token',j.worker_token);
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
revoke all on function public.ibfc_electoral_sync_request(text,integer,text[],uuid),public.ibfc_electoral_sync_worker(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ibfc_electoral_sync_request(text,integer,text[],uuid) to authenticated;
grant execute on function public.ibfc_electoral_sync_worker(text,uuid,text,jsonb) to service_role;

-- Executável somente pelo worker. Atribuição a um administrador ativo explícito.
create or replace function public.ibfc_electoral_sync_schedule(p_owner uuid,p_scopes text[] default array['DF','GO']) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare j public.ibfc_electoral_sync_jobs;
begin
 if not exists(select 1 from public.admin_profiles where id=p_owner and role='admin') then raise exception 'Configure o UUID de um administrador ativo'; end if;
 if p_scopes is null or cardinality(p_scopes)=0 or not p_scopes <@ array['DF','GO','MG']::text[] then raise exception 'Cobertura inválida'; end if;
 perform pg_advisory_xact_lock(20261008);
 update public.ibfc_electoral_sync_jobs set status='failed',message='Agendamento: tarefa sem atualização há mais de 30 minutos',finished_at=now(),updated_at=now()
 where status in('queued','running') and updated_at<now()-interval '30 minutes';
 update public.ibfc_electoral_imports i set status='failed',error='Sincronização interrompida',finished_at=now() where i.status='running' and exists(select 1 from public.ibfc_electoral_sync_jobs sj where sj.id=i.sync_job and sj.status='failed');
 select * into j from public.ibfc_electoral_sync_jobs where status in('queued','running') limit 1;
 if found then return jsonb_build_object('existing',true); end if;
 insert into public.ibfc_electoral_sync_jobs(year,scopes,created_by,message) values(2026,p_scopes,p_owner,'Atualização diária automática de 2026') returning * into j;
 return jsonb_build_object('id',j.id,'existing',false);
end $$;
revoke all on function public.ibfc_electoral_sync_schedule(uuid,text[]) from public,anon,authenticated;
grant execute on function public.ibfc_electoral_sync_schedule(uuid,text[]) to service_role;

notify pgrst,'reload schema';

commit;
