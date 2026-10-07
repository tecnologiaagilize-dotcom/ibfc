begin;
create or replace function public.ibfc_science_current(p_old jsonb,p_new jsonb,p_scope text,p_filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare output jsonb;
begin
 if p_scope not in('country','state','municipality','zone','location','section') or p_old->>'uf'<>p_new->>'uf' or p_old->>'office'<>p_new->>'office' or p_old->>'turn'<>p_new->>'turn' or p_old->>'year'<>p_new->>'year' or p_new->>'year' not in('2022','2026') then raise exception 'Comparação incompatível'; end if;
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
revoke all on function public.ibfc_science_current(jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.ibfc_science_current(jsonb,jsonb,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
