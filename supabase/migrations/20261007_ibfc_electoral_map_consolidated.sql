-- IBFC — instalação e atualização consolidada DF + Entorno.
-- Execute no Supabase do IBFC; requer auth.users e admin_profiles da base do portal.
-- Preserva registros existentes; não modifica cadastros de afiliados.
begin;
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
  left join public.ibfc_electoral_votes v on (v.import_id,v.uf,v.election,v.turn,v.office,v.municipality,v.zone,v.section,v.number)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section,p_old->>'number')),
 new_s as (select t.*,coalesce(v.votes,0) as candidate_votes from public.ibfc_electoral_section_totals t join new_p p using(import_id,year,election,turn,office,uf)
  left join public.ibfc_electoral_votes v on (v.import_id,v.uf,v.election,v.turn,v.office,v.municipality,v.zone,v.section,v.number)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section,p_new->>'number')),
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

commit;
