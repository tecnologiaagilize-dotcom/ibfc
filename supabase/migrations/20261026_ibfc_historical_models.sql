-- Aplicar após 20261017. Não altera o agendamento diário de 2026.
begin;
alter table public.ibfc_electoral_imports drop constraint if exists ibfc_electoral_imports_year_check;
alter table public.ibfc_electoral_imports add constraint ibfc_electoral_imports_year_check check(year in(2014,2018,2022,2026));
alter table public.ibfc_electoral_locations drop constraint if exists ibfc_electoral_locations_year_check;
alter table public.ibfc_electoral_locations add constraint ibfc_electoral_locations_year_check check(year in(2014,2018,2022,2026));
alter table public.ibfc_electoral_votes drop constraint if exists ibfc_electoral_votes_year_check;
alter table public.ibfc_electoral_votes add constraint ibfc_electoral_votes_year_check check(year in(2014,2018,2022,2026));
alter table public.ibfc_electoral_sync_jobs drop constraint if exists ibfc_electoral_sync_jobs_year_check;
alter table public.ibfc_electoral_sync_jobs add constraint ibfc_electoral_sync_jobs_year_check check(year in(2014,2018,2022,2026));
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
 if p_action<>'start' or p_year not in(2014,2018,2022,2026) or p_scopes is null or cardinality(p_scopes)=0 or not p_scopes <@ array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']::text[] then raise exception 'Ano ou cobertura inválidos'; end if;
 -- Dead workers cannot hold the queue forever. Download/parse sends a heartbeat every 20 seconds.
 update public.ibfc_electoral_sync_jobs set status='failed',message='Processamento interrompido: sem atualização há mais de 30 minutos. Inicie uma nova carga.',finished_at=now(),updated_at=now()
 where status in('queued','running') and updated_at<now()-interval '30 minutes';
 update public.ibfc_electoral_imports i set status='failed',error='Sincronização interrompida',finished_at=now() where i.status='running' and exists(select 1 from public.ibfc_electoral_sync_jobs sj where sj.id=i.sync_job and sj.status='failed');
 select * into j from public.ibfc_electoral_sync_jobs where status in('queued','running') limit 1;
 if found then return jsonb_build_object('id',j.id,'existing',true); end if;
 insert into public.ibfc_electoral_sync_jobs(year,scopes,created_by) values(p_year,p_scopes,auth.uid()) returning * into j;
 return jsonb_build_object('id',j.id,'existing',false);
end $$;
create or replace function public.ibfc_science_current(p_old jsonb,p_new jsonb,p_scope text,p_filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare output jsonb;
begin
 if p_scope not in('country','state','municipality','zone','location','section') or p_old->>'uf'<>p_new->>'uf' or p_old->>'office'<>p_new->>'office' or p_old->>'turn'<>p_new->>'turn' or p_old->>'year'<>p_new->>'year' or p_new->>'year' not in('2014','2018','2022','2026') then raise exception 'Comparação incompatível'; end if;
 if (p_new->>'uf'='BR' or p_scope='country') and (p_new->>'office'<>'1' or p_new->>'uf'<>'BR' or p_scope<>'country') then raise exception 'Brasil compara presidente por UF'; end if;

 with old_p as (select * from public.ibfc_electoral_latest_partitions where year=(p_new->>'year')::integer and (uf=p_old->>'uf' or (p_old->>'uf'='BR' and office=1)) and election=(p_old->>'election')::integer and turn=(p_old->>'turn')::integer and office=(p_old->>'office')::integer),
 new_p as (select * from public.ibfc_electoral_latest_partitions where year=(p_new->>'year')::integer and (uf=p_new->>'uf' or (p_new->>'uf'='BR' and office=1)) and election=(p_new->>'election')::integer and turn=(p_new->>'turn')::integer and office=(p_new->>'office')::integer),
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
  case when n.local is not null and nl.latitude is not null then (p_new->>'year')::integer when n.local is null and ol.latitude is not null then (p_new->>'year')::integer else null end coordinate_year
  from old_s o full join new_s n using(uf,municipality,zone,section)
  left join loc ol on ol.year=(p_new->>'year')::integer and ol.uf=o.uf and ol.municipality=o.municipality and ol.zone=o.zone and ol.local=o.local
  left join loc nl on nl.year=(p_new->>'year')::integer and nl.uf=n.uf and nl.municipality=n.municipality and nl.zone=n.zone and nl.local=n.local),
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
 output:=jsonb_set(output,'{rows}',coalesce((select jsonb_agg(x || jsonb_build_object('old_votes',null,'old_valid',null,'old_sections',0,'common_sections',0,'moved_sections',0)) from jsonb_array_elements(output->'rows') x),'[]'));
 output:=jsonb_set(output,'{totals}',output->'totals'||jsonb_build_object('old_votes',null,'old_valid',null,'old_sections',0,'common_sections',0,'moved_sections',0));
 return output;
end $$;

-- Uma única chamada mantém todos os anos no mesmo snapshot do banco.
create or replace function public.ibfc_science_temporal(p_targets jsonb,p_scope text,p_filters jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare t jsonb; first_t jsonb; result jsonb; output jsonb:='[]'; previous_year integer; n integer;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if jsonb_typeof(p_targets) is distinct from 'array' or jsonb_array_length(p_targets) not between 3 and 4 or (p_scope is null or p_scope not in('state','municipality')) then raise exception 'Selecione três ou quatro eleições e recorte por municípios ou zonas'; end if;
 if p_filters is null or jsonb_typeof(p_filters)<>'object' or exists(select 1 from jsonb_object_keys(p_filters) k where k<>'municipality') then raise exception 'Filtro territorial inválido'; end if;
 first_t:=p_targets->0;
 if first_t->>'uf'='BR' then raise exception 'Escolha uma UF'; end if;
 if p_scope='municipality' and coalesce(p_filters->>'municipality','')='' then raise exception 'Escolha o município para analisar zonas'; end if;
 for t in select value from jsonb_array_elements(p_targets) order by (value->>'year')::integer loop
  n:=(t->>'year')::integer;
  if n is null or n not in(2014,2018,2022,2026) or (previous_year is not null and n<>previous_year+4)
    or t->>'uf' is distinct from first_t->>'uf' or t->>'office' is distinct from first_t->>'office'
    or t->>'turn' is distinct from first_t->>'turn' or t->>'kind' is distinct from first_t->>'kind'
    or coalesce(t->>'kind','') not in('candidate','party') then raise exception 'Os recortes devem ter mesma UF, cargo, turno e tipo, em eleições consecutivas'; end if;
  if t->>'result_granularity'='zone' then raise exception 'A série temporal inicial exige resultados por seção publicados'; end if;
  if not exists(select 1 from public.ibfc_electoral_candidates c join public.ibfc_electoral_latest_partitions p using(import_id,year,election,turn,office)
    where c.year=n and p.uf=t->>'uf' and c.election=(t->>'election')::integer and c.office=(t->>'office')::integer and c.turn=(t->>'turn')::integer
    and case when t->>'kind'='party' then left(c.number,2)=t->>'number' else c.number=t->>'number' end) then raise exception 'Seleção sem votos publicados no catálogo do ano %',n; end if;
  result:=public.ibfc_science_current(t,t,p_scope,p_filters);
  if coalesce((result->>'truncated')::boolean,true) then raise exception 'Recorte excede 5.000 territórios. Reduza a cobertura'; end if;
  if jsonb_array_length(result->'rows')=0 then raise exception 'Sem resultados por seção para o ano %',n; end if;
  output:=output||jsonb_build_array(jsonb_build_object('target',t,'data',result));
  previous_year:=n;
 end loop;
 return jsonb_build_object('series',output,'generated_at',now());
end $$;
revoke all on function public.ibfc_science_temporal(jsonb,text,jsonb) from public,anon;
grant execute on function public.ibfc_science_temporal(jsonb,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
