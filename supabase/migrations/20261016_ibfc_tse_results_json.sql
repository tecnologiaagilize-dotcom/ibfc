begin;
create table if not exists public.ibfc_science_zone_files(
 import_id uuid not null references public.ibfc_electoral_imports(id) on delete cascade,
 year integer not null check(year in(2022,2026)),uf text not null,municipality integer not null,zone integer not null check(zone>0),election integer not null,turn integer not null check(turn in(1,2)),office integer not null check(office in(1,3,5,6,7,8)),body jsonb not null,
 primary key(import_id,uf,municipality,zone,election,turn,office));
alter table public.ibfc_science_zone_files enable row level security;
grant select on public.ibfc_science_zone_files to authenticated;
revoke insert,update,delete on public.ibfc_science_zone_files from authenticated;
drop policy if exists zone_read on public.ibfc_science_zone_files;
create policy zone_read on public.ibfc_science_zone_files for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create or replace view public.ibfc_science_latest_zones with(security_invoker=true) as
select distinct on(z.year,z.uf,z.municipality,z.zone,z.election,z.turn,z.office) z.*,i.finished_at
from public.ibfc_science_zone_files z join public.ibfc_electoral_imports i on i.id=z.import_id and i.status='completed'
order by z.year,z.uf,z.municipality,z.zone,z.election,z.turn,z.office,i.created_at desc,i.id desc;
grant select on public.ibfc_science_latest_zones to authenticated;
do $$ begin
 if to_regprocedure('public.ibfc_science_zip_worker(text,uuid,text,jsonb)') is null then alter function public.ibfc_electoral_sync_worker(text,uuid,text,jsonb) rename to ibfc_science_zip_worker; end if;
 if to_regprocedure('public.ibfc_science_roster_catalogue(text)') is null then alter function public.ibfc_science_catalogue(text) rename to ibfc_science_roster_catalogue; end if;
end $$;
create or replace function public.ibfc_electoral_sync_worker(p_action text,p_job uuid,p_token text default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare j public.ibfc_electoral_sync_jobs; imp uuid; n integer;
begin
 if p_action not in('start_zone','zone_batch','ready_zone') then return public.ibfc_science_zip_worker(p_action,p_job,p_token,p_data); end if;
 select * into j from public.ibfc_electoral_sync_jobs where id=p_job for update;
 if j.status<>'running' or p_token is null or j.worker_token is distinct from p_token then raise exception 'Worker não autorizado'; end if;
 if p_action='start_zone' then
  if coalesce(p_data->>'source_url','') !~ '^https://resultados\.tse\.jus\.br/oficial/' then raise exception 'Fonte de resultados inválida'; end if;
  insert into public.ibfc_electoral_imports(year,kind,filename,source_url,created_by,sync_job) values(j.year,'votes',p_data->>'filename',p_data->>'source_url',j.created_by,j.id) returning id into imp;
 else
  imp:=(p_data->>'import_id')::uuid;
  if not exists(select 1 from public.ibfc_electoral_imports where id=imp and sync_job=j.id and status='running' and source_url like 'https://resultados.tse.jus.br/oficial/%') then raise exception 'Carga de zonas não pertence à tarefa'; end if;
  if p_action='zone_batch' then
   if jsonb_typeof(p_data->'rows')<>'array' or jsonb_array_length(p_data->'rows') not between 1 and 50 then raise exception 'Lote de zonas inválido'; end if;
   if exists(select 1 from jsonb_array_elements(p_data->'rows') r where (r->>'year')::integer<>j.year or not(r->>'uf'=any(j.scopes)) or r->>'source_url' !~ '^https://resultados\.tse\.jus\.br/oficial/' or (r->>'valid')::bigint<0) then raise exception 'Recorte de zona inválido'; end if;
   insert into public.ibfc_science_zone_files(import_id,year,uf,municipality,zone,election,turn,office,body)
   select imp,(r->>'year')::integer,r->>'uf',(r->>'municipality')::integer,(r->>'zone')::integer,(r->>'election')::integer,(r->>'turn')::integer,(r->>'office')::integer,r from jsonb_array_elements(p_data->'rows') r
   on conflict(import_id,uf,municipality,zone,election,turn,office) do update set body=excluded.body;
   select count(*) into n from public.ibfc_science_zone_files where import_id=imp;
   update public.ibfc_electoral_imports set rows_saved=n where id=imp;
  else
   select count(*) into n from public.ibfc_science_zone_files where import_id=imp;
   if n<1 or n is distinct from (p_data->>'expected_files')::integer then raise exception 'Resultados por zona incompletos'; end if;
   if not exists(select 1 from public.ibfc_electoral_imports where id=imp and sync_ready) then
    update public.ibfc_electoral_imports set sync_ready=true where id=imp;
    update public.ibfc_electoral_sync_jobs set files_done=files_done+1 where id=j.id;
   end if;
  end if;
 end if;
 update public.ibfc_electoral_sync_jobs set updated_at=now() where id=j.id;
 return jsonb_build_object('ok',true,'import_id',imp,'saved',n);
end $$;
revoke all on function public.ibfc_electoral_sync_worker(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ibfc_electoral_sync_worker(text,uuid,text,jsonb) to service_role;
create or replace function public.ibfc_science_catalogue(p_uf text) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare b jsonb; cc jsonb; pp jsonb; mm jsonb; zz jsonb;
begin
 b:=public.ibfc_science_roster_catalogue(p_uf);
 with z as(select * from public.ibfc_science_latest_zones where uf=p_uf or(p_uf='BR' and office=1)),
 vals as(select distinct jsonb_build_object('year',z.year,'uf',p_uf,'election',z.election,'turn',z.turn,'office',z.office,'office_name',z.body->>'office_name','number',c->>'number','candidate_id',c->>'candidate_id','name',c->>'name','party',c->>'party','status',c->>'status','destination',c->>'destination','results_available',true,'result_granularity','zone') x from z cross join lateral jsonb_array_elements(z.body->'candidates') c),
 keep as(select x from jsonb_array_elements(b->'candidates') x where not exists(select 1 from vals v where (x->>'year',x->>'election',x->>'turn',x->>'office',x->>'number')=(v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number'))),
 combined as(select x from keep union all select v.x from vals v where not exists(select 1 from jsonb_array_elements(b->'candidates') c where c->>'results_available'='true' and (c->>'year',c->>'election',c->>'turn',c->>'office',c->>'number')=(v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number')) union all select c from jsonb_array_elements(b->'candidates') c where c->>'results_available'='true' and exists(select 1 from vals v where (c->>'year',c->>'election',c->>'turn',c->>'office',c->>'number')=(v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number')))
 select coalesce(jsonb_agg(x order by x->>'name'),'[]') into cc from combined;
 with z as(select * from public.ibfc_science_latest_zones where uf=p_uf or(p_uf='BR' and office=1)),
 vals as(select distinct jsonb_build_object('year',z.year,'uf',p_uf,'election',z.election,'turn',z.turn,'office',z.office,'office_name',z.body->>'office_name','number',c->>'number','name',c->>'name','kind','party','results_available',true,'result_granularity','zone') x from z cross join lateral jsonb_array_elements(z.body->'parties') c),
 combined as(select c x from jsonb_array_elements(b->'parties') c where c->>'results_available'='true' or not exists(select 1 from vals v where (c->>'year',c->>'election',c->>'turn',c->>'office',c->>'number')=(v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number')) union all select v.x from vals v where not exists(select 1 from jsonb_array_elements(b->'parties') c where c->>'results_available'='true' and (c->>'year',c->>'election',c->>'turn',c->>'office',c->>'number')=(v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number')))
 select coalesce(jsonb_agg(x order by x->>'name'),'[]') into pp from combined;
 select coalesce(jsonb_agg(x),'[]') into mm from(select distinct x from(select x from jsonb_array_elements(b->'municipalities') x union all select jsonb_build_object('uf',uf,'municipality',municipality,'name',body->>'municipality_name') from public.ibfc_science_latest_zones where uf=p_uf) t) v;
 select coalesce(jsonb_agg(x),'[]') into zz from(select distinct x from(select x from jsonb_array_elements(b->'zones') x union all select jsonb_build_object('municipality',municipality,'zone',zone) from public.ibfc_science_latest_zones where uf=p_uf) t) v;
 return b||jsonb_build_object('candidates',cc,'parties',pp,'municipalities',mm,'zones',zz);
end $$;
create or replace function public.ibfc_science_zone_side(p_target jsonb) returns table(uf text,municipality integer,municipality_name text,zone integer,votes bigint,valid bigint,sections bigint) language sql stable security invoker set search_path=public as $$
 with z as(select * from public.ibfc_science_latest_zones z where z.year=(p_target->>'year')::integer and z.election=(p_target->>'election')::integer and z.turn=(p_target->>'turn')::integer and z.office=(p_target->>'office')::integer and(z.uf=p_target->>'uf' or(p_target->>'uf'='BR' and z.office=1))),
 part as(select * from public.ibfc_electoral_latest_partitions p where p.year=(p_target->>'year')::integer and p.election=(p_target->>'election')::integer and p.turn=(p_target->>'turn')::integer and p.office=(p_target->>'office')::integer and(p.uf=p_target->>'uf' or(p_target->>'uf'='BR' and p.office=1))),
 sectional as(select t.*,coalesce((select sum(v.votes) from public.ibfc_electoral_votes v where (v.import_id,v.uf,v.election,v.turn,v.office,v.municipality,v.zone,v.section)=(t.import_id,t.uf,t.election,t.turn,t.office,t.municipality,t.zone,t.section) and case when p_target->>'kind' in('party','group') then v.number not in('95','96','97','98','99') and left(v.number,2) in(select jsonb_array_elements_text(case when p_target->>'kind'='group' then p_target->'numbers' else jsonb_build_array(p_target->>'number') end)) and(length(v.number)=case v.office when 1 then 2 when 3 then 2 when 5 then 3 when 6 then 4 else 5 end or(v.office in(6,7,8) and length(v.number)=2)) else v.number=p_target->>'number' end),0) selected from public.ibfc_electoral_section_totals t join part using(import_id,year,election,turn,office,uf))
 select z.uf,z.municipality,z.body->>'municipality_name',z.zone,coalesce((select sum((c->>'votes')::bigint) from jsonb_array_elements(case when p_target->>'kind' in('party','group') then z.body->'parties' else z.body->'candidates' end) c where case when p_target->>'kind'='group' then c->>'number' in(select jsonb_array_elements_text(p_target->'numbers')) else c->>'number'=p_target->>'number' end and (p_target->>'kind' in('party','group') or p_target->>'candidate_id' is null or c->>'candidate_id'=p_target->>'candidate_id')),0)::bigint,(z.body->>'valid')::bigint,(z.body->>'sections')::bigint from z where p_target->>'result_granularity'='zone'
 union all select s.uf,s.municipality,max(s.municipality_name),s.zone,sum(s.selected)::bigint,sum(s.valid)::bigint,count(*) from sectional s where coalesce(p_target->>'result_granularity','section')<>'zone' group by s.uf,s.municipality,s.zone;
$$;
create or replace function public.ibfc_science_zone_analysis(p_old jsonb,p_new jsonb,p_scope text,p_filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare output jsonb; single boolean:=p_old=p_new;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if p_scope not in('country','state','municipality','zone') or p_filters ? 'local' or p_filters ? 'section' or coalesce((p_filters->>'common_only')::boolean,false) then raise exception 'JSON por zona permite Brasil, UF, município e zona; não permite seção comum, local ou urna'; end if;
 if p_old->>'uf'<>p_new->>'uf' or p_old->>'office'<>p_new->>'office' or p_old->>'turn'<>p_new->>'turn' or(not single and(p_old->>'year'<>'2022' or p_new->>'year'<>'2026')) then raise exception 'Comparação de zonas incompatível'; end if;
 if(p_scope='country' or p_new->>'uf'='BR') and(p_scope<>'country' or p_new->>'uf'<>'BR' or p_new->>'office'<>'1') then raise exception 'Brasil permite presidente'; end if;
 with o as(select * from public.ibfc_science_zone_side(p_old) where not single), n as(select * from public.ibfc_science_zone_side(p_new)),
 latestloc as(select distinct on(l.uf,l.municipality,l.zone,l.local) l.* from public.ibfc_electoral_locations l join public.ibfc_electoral_imports i on i.id=l.import_id and i.status='completed' order by l.uf,l.municipality,l.zone,l.local,l.year desc,i.created_at desc),
 coords as(select uf,municipality,zone,avg(latitude) latitude,avg(longitude) longitude,max(year) coordinate_year from latestloc group by uf,municipality,zone),
 joined as(select coalesce(n.uf,o.uf) uf,coalesce(n.municipality,o.municipality) municipality,coalesce(n.municipality_name,o.municipality_name) municipality_name,coalesce(n.zone,o.zone) zone,o.votes old_votes,n.votes new_votes,o.valid old_valid,n.valid new_valid,o.sections old_sections,n.sections new_sections from o full join n using(uf,municipality,zone)),
 filtered as(select j.*,c.latitude,c.longitude,c.coordinate_year from joined j left join coords c using(uf,municipality,zone) where(p_filters->>'municipality' is null or j.municipality=(p_filters->>'municipality')::integer) and(p_filters->>'zone' is null or j.zone=(p_filters->>'zone')::integer)),
 keyed as(select *,case p_scope when 'country' then uf when 'state' then uf||':'||municipality else uf||':'||municipality||':'||zone end key from filtered),
 grouped as(select key,max(uf) uf,min(municipality) municipality,max(municipality_name) municipality_name,min(zone) zone,0 section,null::integer local,null::integer old_local,null::integer new_local,null::text old_name,null::text new_name,null::text address,
 case p_scope when 'country' then max(uf) when 'state' then max(municipality_name) else 'Zona '||min(zone) end name,sum(old_votes) old_votes,sum(new_votes) new_votes,sum(old_valid) old_valid,sum(new_valid) new_valid,sum(old_sections) old_sections,sum(new_sections) new_sections,sum(coalesce(new_sections,old_sections)) section_count,null::bigint common_sections,null::bigint moved_sections,avg(latitude) latitude,avg(longitude) longitude,max(coordinate_year) coordinate_year from keyed group by key)
 select jsonb_build_object('granularity','zone','notice','Resultados agregados por zona. Coordenadas são referências médias dos locais importados, não limites oficiais. Não há comparação de chaves de seção nem votos por urna nesta fonte.',
 'rows',coalesce((select jsonb_agg(to_jsonb(x)) from(select * from grouped order by key limit 5000) x),'[]'),'total_rows',(select count(*) from grouped),'truncated',(select count(*)>5000 from grouped),'generated_at',now(),
 'totals',(select jsonb_build_object('old_votes',sum(old_votes),'new_votes',sum(new_votes),'old_valid',sum(old_valid),'new_valid',sum(new_valid),'old_sections',sum(old_sections),'new_sections',sum(new_sections),'common_sections',null,'moved_sections',null) from filtered),
 'coverage',coalesce((select jsonb_agg(distinct uf) from n),'[]'),
 'sources',coalesce((select jsonb_agg(to_jsonb(x)) from(select distinct z.year,z.body->>'source_url' source_url,'EA20 · Zona '||z.zone||' · '||(z.body->>'municipality_name') filename,z.finished_at from public.ibfc_science_latest_zones z where z.import_id in(select import_id from public.ibfc_science_latest_zones where year in((p_old->>'year')::integer,(p_new->>'year')::integer) and(uf=p_new->>'uf' or p_new->>'uf'='BR')) and z.office=(p_new->>'office')::integer and z.election in((p_old->>'election')::integer,(p_new->>'election')::integer) and z.turn=(p_new->>'turn')::integer and(p_filters->>'municipality' is null or z.municipality=(p_filters->>'municipality')::integer) and(p_filters->>'zone' is null or z.zone=(p_filters->>'zone')::integer)
 union select i.year,i.source_url,i.filename,i.finished_at from public.ibfc_electoral_imports i join public.ibfc_electoral_latest_partitions p on p.import_id=i.id where p.year=(p_old->>'year')::integer and p.election=(p_old->>'election')::integer and p.office=(p_old->>'office')::integer and p.turn=(p_old->>'turn')::integer and(p.uf=p_old->>'uf' or p_old->>'uf'='BR')) x),'[]')) into output;
 return output;
end $$;
revoke all on function public.ibfc_science_catalogue(text),public.ibfc_science_zone_side(jsonb),public.ibfc_science_zone_analysis(jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.ibfc_science_catalogue(text),public.ibfc_science_zone_side(jsonb),public.ibfc_science_zone_analysis(jsonb,jsonb,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
