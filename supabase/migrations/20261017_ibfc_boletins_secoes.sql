-- Apply after migrations 20261009 through 20261016. Repeatable.
begin;
create table if not exists public.ibfc_science_bu_sections (
 import_id uuid not null references public.ibfc_electoral_imports(id) on delete cascade,
 uf text not null, year integer not null, election integer not null, turn integer not null,
 office integer not null, municipality integer not null, zone integer not null,
 section integer not null, local integer not null, metadata jsonb not null,
 primary key(import_id,uf,election,turn,office,municipality,zone,section)
);
alter table public.ibfc_science_bu_sections enable row level security;
drop policy if exists bu_staff on public.ibfc_science_bu_sections;
create policy bu_staff on public.ibfc_science_bu_sections to authenticated
 using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in ('admin','editor')))
 with check(exists(select 1 from public.admin_profiles where id=auth.uid() and role in ('admin','editor')));
grant select,insert,update on public.ibfc_science_bu_sections to authenticated;
grant all on public.ibfc_science_bu_sections to service_role;
do $$ begin
 if to_regprocedure('public.ibfc_electoral_batch_without_bu(uuid,jsonb)') is null then
  alter function public.ibfc_electoral_batch(uuid,jsonb) rename to ibfc_electoral_batch_without_bu;
 end if;
end $$;
create or replace function public.ibfc_electoral_batch(p_import uuid,p_rows jsonb) returns integer
 language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 -- Original function checks import ownership, status, coverage, year and batch limit.
 n:=public.ibfc_electoral_batch_without_bu(p_import,p_rows);
 if exists(select 1 from jsonb_array_elements(p_rows) r
  join public.ibfc_science_bu_sections b on b.import_id=p_import and b.uf=r->>'uf'
   and b.election=(r->>'election')::integer and b.turn=(r->>'turn')::integer
   and b.office=(r->>'office')::integer and b.municipality=(r->>'municipality')::integer
   and b.zone=(r->>'zone')::integer and b.section=(r->>'section')::integer
  where r ? 'bu_metadata' and (b.metadata<>r->'bu_metadata' or b.local<>(r->>'local')::integer))
 then raise exception 'Metadados BU divergentes para a mesma seção'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where r ? 'bu_metadata'
  group by r->>'uf',r->>'election',r->>'turn',r->>'office',r->>'municipality',r->>'zone',r->>'section'
  having count(distinct (r->'bu_metadata'))>1 or count(distinct r->>'local')>1)
 then raise exception 'Metadados BU divergentes dentro do lote'; end if;
 insert into public.ibfc_science_bu_sections(import_id,uf,year,election,turn,office,municipality,zone,section,local,metadata)
 select distinct p_import,r->>'uf',(r->>'year')::integer,(r->>'election')::integer,
  (r->>'turn')::integer,(r->>'office')::integer,(r->>'municipality')::integer,
  (r->>'zone')::integer,(r->>'section')::integer,(r->>'local')::integer,r->'bu_metadata'
 from jsonb_array_elements(p_rows) r where r ? 'bu_metadata'
 on conflict do nothing;
 return n;
end $$;
revoke all on function public.ibfc_electoral_batch(uuid,jsonb) from public,anon;
grant execute on function public.ibfc_electoral_batch(uuid,jsonb) to authenticated,service_role;

-- Metadata is limited to latest completed partition, selected office and filters.
-- Electorate is recorded once per section, never once per candidate row.
create or replace function public.ibfc_science_bu_details(p_target jsonb,p_filters jsonb default '{}')
 returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in ('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 with sections as (
  select b.* from public.ibfc_science_bu_sections b
  join public.ibfc_electoral_latest_partitions p using(import_id,year,election,turn,office,uf)
  where b.year=(p_target->>'year')::integer and b.election=(p_target->>'election')::integer
   and b.office=(p_target->>'office')::integer and b.turn=(p_target->>'turn')::integer
   and (p_target->>'uf'='BR' or b.uf=p_target->>'uf')
   and (not(p_filters?'municipality') or b.municipality=(p_filters->>'municipality')::integer)
   and (not(p_filters?'zone') or b.zone=(p_filters->>'zone')::integer)
   and (not(p_filters?'local') or b.local=(p_filters->>'local')::integer)
   and (not(p_filters?'section') or b.section=(p_filters->>'section')::integer)
 ), limited as (select * from sections order by uf,municipality,zone,local,section limit 5000)
 select jsonb_build_object('total_rows',(select count(*) from sections),'truncated',(select count(*)>5000 from sections),
  'totals',(select jsonb_build_object('aptos',sum((metadata->>'aptos')::bigint),
   'comparecimento',sum((metadata->>'comparecimento')::bigint),'abstencoes',sum((metadata->>'abstencoes')::bigint),'secoes',count(*)) from sections),
  'rows',coalesce((select jsonb_agg(jsonb_build_object('uf',s.uf,'municipality',s.municipality,'zone',s.zone,'local',s.local,'section',s.section,
    'metadata',s.metadata,'votes',coalesce(v.selected_votes,0),'nominal_legenda',coalesce(v.nominal_legenda,0),'brancos',coalesce(v.brancos,0),'nulos',coalesce(v.nulos,0),'legenda',coalesce(v.legenda,0)))
   from limited s left join lateral(select
    sum(votes) filter(where number not in('95','96','97','98','99')) nominal_legenda,
    sum(votes) filter(where case when p_target->>'kind' in('party','group') then number not in('95','96','97','98','99') and left(number,2) in(select jsonb_array_elements_text(case when p_target->>'kind'='group' then p_target->'numbers' else jsonb_build_array(p_target->>'number') end)) else number=p_target->>'number' end) selected_votes,
    sum(votes) filter(where number='95') brancos,
    sum(votes) filter(where number='96') nulos,
    sum(votes) filter(where length(number)=2 and number not in('95','96','97','98','99') and s.office in(6,7,8)) legenda
    from public.ibfc_electoral_votes v where v.import_id=s.import_id and v.uf=s.uf and v.election=s.election
     and v.turn=s.turn and v.office=s.office and v.municipality=s.municipality and v.zone=s.zone and v.section=s.section) v on true),'[]')) into result;
 return result;
end $$;
revoke all on function public.ibfc_science_bu_details(jsonb,jsonb) from public,anon;
grant execute on function public.ibfc_science_bu_details(jsonb,jsonb) to authenticated;

-- Older matching location codes may be used as labelled map references, never as proof of continuity.
create or replace function public.ibfc_science_geocode_rows(p_rows jsonb,p_year integer,p_scope text)
 returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>5000 then raise exception 'Linhas inválidas'; end if;
 if p_scope not in('zone','location','section') then return jsonb_build_object('rows',p_rows,'sources','[]'::jsonb); end if;
 with latest as (
  select distinct on(l.uf,l.municipality,l.zone,l.local) l.*,i.filename,i.source_url,i.finished_at
  from public.ibfc_electoral_locations l join public.ibfc_electoral_imports i on i.id=l.import_id and i.status='completed'
  where l.year<=p_year and l.latitude is not null and l.longitude is not null
  order by l.uf,l.municipality,l.zone,l.local,l.year desc,i.created_at desc,i.id desc
 ), matched as (
  select r.row,r.ordinality,l.* from jsonb_array_elements(p_rows) with ordinality r(row,ordinality)
  left join latest l on l.uf=r.row->>'uf' and l.municipality=(r.row->>'municipality')::integer
   and l.zone=(r.row->>'zone')::integer and l.local=(r.row->>'local')::integer
   and (r.row->>'latitude') is null and (r.row->>'longitude') is null
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(
   case when latitude is null then row else row||jsonb_build_object('latitude',latitude,'longitude',longitude,
    'coordinate_year',year,'address',address,'location_reference',year<>p_year,
    'name',case when coalesce(row->>'name','') like 'Local %' then
     'Local '||local||' · '||name||case when year<>p_year then ' (referência '||year||')' else '' end||
     case when p_scope in('location','section') then ' · Seção '||(row->>'section') else '' end
     else row->>'name' end) end order by ordinality) from matched),'[]'),
  'sources',coalesce((select jsonb_agg(to_jsonb(x)) from(select distinct year,filename,source_url,finished_at from matched where latitude is not null) x),'[]')) into result;
 return result;
end $$;
revoke all on function public.ibfc_science_geocode_rows(jsonb,integer,text) from public,anon;
grant execute on function public.ibfc_science_geocode_rows(jsonb,integer,text) to authenticated;

notify pgrst,'reload schema';
commit;
