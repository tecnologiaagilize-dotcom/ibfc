-- Atualização sobre 20261009: candidatos/partidos e agendamento opcional.
begin;
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
