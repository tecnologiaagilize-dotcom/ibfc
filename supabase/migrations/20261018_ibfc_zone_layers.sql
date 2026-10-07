begin;
create or replace function public.ibfc_science_zone_layers(p_uf text,p_year integer,p_turn integer,p_office integer,p_target jsonb default null,p_filters jsonb default '{}')
 returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if p_year not in(2022,2026) or p_turn not in(1,2) or p_office not in(1,3,5,6,7,8) then raise exception 'Recorte inválido'; end if;
 with locations as(
  select distinct on(l.uf,l.municipality,l.zone,l.local) l.*
  from public.ibfc_electoral_locations l join public.ibfc_electoral_imports i on i.id=l.import_id and i.status='completed'
  where l.year<=p_year and(p_uf='BR' or l.uf=p_uf)
  order by l.uf,l.municipality,l.zone,l.local,l.year desc,i.created_at desc,i.id desc
 ), loczones as(select uf,municipality,max(municipality_name) municipality_name,zone,
  count(*) locations_count,avg(latitude) latitude,avg(longitude) longitude,min(year) coordinate_year_min,max(year) coordinate_year_max from locations group by uf,municipality,zone),
 partitions as(select * from public.ibfc_electoral_latest_partitions where year=p_year and turn=p_turn and office=p_office and(p_uf='BR' or uf=p_uf) and(p_target is null or election=(p_target->>'election')::integer)),
 sections as(select t.uf,t.municipality,max(t.municipality_name) municipality_name,t.zone,count(distinct t.section) sections_count
  from public.ibfc_electoral_section_totals t join partitions p using(import_id,year,election,turn,office,uf) group by t.uf,t.municipality,t.zone),
 hardware as(select b.uf,b.municipality,b.zone,count(distinct (b.metadata->>'urna')) urnas_count
  from public.ibfc_science_bu_sections b join partitions p using(import_id,year,election,turn,office,uf) group by b.uf,b.municipality,b.zone),
 jsonzones as(select uf,municipality,max(body->>'municipality_name') municipality_name,zone,max((body->>'total_sections')::bigint) sections_count
  from public.ibfc_science_latest_zones where year=p_year and turn=p_turn and office=p_office and(p_uf='BR' or uf=p_uf) and(p_target is null or election=(p_target->>'election')::integer) group by uf,municipality,zone),
 selected as(select * from public.ibfc_science_zone_side(p_target) where p_target is not null),
 inventory as(select uf,municipality,municipality_name,zone from loczones union select uf,municipality,municipality_name,zone from sections union select uf,municipality,municipality_name,zone from jsonzones union select uf,municipality,municipality_name,zone from selected),
 keys as(select uf,municipality,max(municipality_name) municipality_name,zone from inventory group by uf,municipality,zone),
 rows as(select k.*,k.uf||':'||k.municipality||':'||k.zone key,'Zona '||k.zone name,
  l.latitude,l.longitude,l.coordinate_year_min,l.coordinate_year_max,coalesce(l.locations_count,0) locations_count,
  coalesce(s.sections_count,j.sections_count) sections_count,h.urnas_count,v.votes,v.valid,
  case when v.votes>0 then 'positive' when v.votes=0 then 'zero' else 'missing' end vote_status
  from keys k left join loczones l using(uf,municipality,zone) left join sections s using(uf,municipality,zone)
  left join jsonzones j using(uf,municipality,zone) left join hardware h using(uf,municipality,zone) left join selected v using(uf,municipality,zone)
  where(p_filters->>'municipality' is null or k.municipality=(p_filters->>'municipality')::integer)
   and(p_filters->>'zone' is null or k.zone=(p_filters->>'zone')::integer))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from(select * from rows order by uf,municipality,zone limit 5000)x),'[]'),
 'total_rows',(select count(*) from rows),'truncated',(select count(*)>5000 from rows),'generated_at',now(),
 'notice','Todas as zonas da cobertura importada. Pontos representam médias dos locais; não são limites oficiais. Quantidade de urnas físicas só aparece quando há identificação nos BUs. Referências cartográficas podem ser anteriores ao ano consultado.') into result;
 return result;
end $$;
revoke all on function public.ibfc_science_zone_layers(text,integer,integer,integer,jsonb,jsonb) from public,anon;
grant execute on function public.ibfc_science_zone_layers(text,integer,integer,integer,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
