-- Aplicar depois de 20261011. Atualização Ciência Eleitoral 2.0.
begin;
alter table public.ibfc_electoral_sync_jobs add column if not exists phase text not null default 'discovery';
alter table public.ibfc_electoral_sync_jobs add column if not exists current_file text not null default '';
alter table public.ibfc_electoral_sync_jobs add column if not exists phase_done bigint not null default 0;
alter table public.ibfc_electoral_sync_jobs add column if not exists phase_total bigint not null default 0;
grant select(phase,current_file,phase_done,phase_total) on public.ibfc_electoral_sync_jobs to authenticated;
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
   current_file=coalesce(p_data->>'current_file',current_file),phase=coalesce(p_data->>'phase',phase),phase_done=coalesce((p_data->>'phase_done')::bigint,phase_done),phase_total=coalesce((p_data->>'phase_total')::bigint,phase_total),files_total=coalesce((p_data->>'files_total')::integer,files_total),rows_processed=coalesce((p_data->>'rows_processed')::bigint,rows_processed),bytes_downloaded=coalesce((p_data->>'bytes_downloaded')::bigint,bytes_downloaded),updated_at=now() where id=j.id;
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
create or replace function public.ibfc_science_cross(p_old jsonb,p_new jsonb,p_scope text,p_filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare output jsonb;
begin
 if p_scope not in('country','state','municipality','zone','location','section') or p_old->>'uf'<>p_new->>'uf'  or p_old->>'turn'<>p_new->>'turn' or p_old->>'year'<>p_new->>'year' or p_old->>'year' not in('2022','2026') then raise exception 'Comparação incompatível'; end if;
 if p_new->>'uf'='BR' or p_scope='country' then raise exception 'Compare cargos por UF e seus territórios'; end if;

 with old_p as (select * from public.ibfc_electoral_latest_partitions where year=(p_old->>'year')::integer and (uf=p_old->>'uf' or (p_old->>'uf'='BR' and office=1)) and election=(p_old->>'election')::integer and turn=(p_old->>'turn')::integer and office=(p_old->>'office')::integer),
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
  case when n.local is not null and nl.latitude is not null then (p_new->>'year')::integer when n.local is null and ol.latitude is not null then (p_old->>'year')::integer else null end coordinate_year
  from old_s o full join new_s n using(uf,municipality,zone,section)
  left join loc ol on ol.year=(p_old->>'year')::integer and ol.uf=o.uf and ol.municipality=o.municipality and ol.zone=o.zone and ol.local=o.local
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
 return output;
end $$;
revoke all on function public.ibfc_science_cross(jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.ibfc_science_cross(jsonb,jsonb,text,jsonb) to authenticated;
alter table public.ibfc_science_analyses add column if not exists result_snapshot jsonb;
create table if not exists public.ibfc_science_evidence(
 id uuid primary key default gen_random_uuid(),investigation_id uuid not null references public.ibfc_science_investigations(id),
 created_by uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now(),
 filename text not null,mime_type text not null,bytes bigint not null check(bytes between 1 and 15728640),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),storage_path text not null unique,source_url text,description text not null default '',
 signature_status text not null default 'not_checked' check(signature_status='not_checked'));
alter table public.ibfc_science_evidence enable row level security;
grant select,insert on public.ibfc_science_evidence to authenticated;
revoke update,delete on public.ibfc_science_evidence from authenticated;
drop policy if exists science_evidence_read on public.ibfc_science_evidence;
create policy science_evidence_read on public.ibfc_science_evidence for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists science_evidence_insert on public.ibfc_science_evidence;
create policy science_evidence_insert on public.ibfc_science_evidence for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit) values('ibfc-science-evidence','ibfc-science-evidence',false,15728640) on conflict(id) do update set public=false,file_size_limit=15728640;
  execute 'drop policy if exists science_storage_private_guard on storage.objects';
  execute 'create policy science_storage_private_guard on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>''ibfc-science-evidence'' or exists(select 1 from public.admin_profiles where id=auth.uid() and role in(''admin'',''editor'')))';
  execute 'drop policy if exists science_storage_update_guard on storage.objects';
  execute 'create policy science_storage_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id<>''ibfc-science-evidence'') with check(bucket_id<>''ibfc-science-evidence'')';
  execute 'drop policy if exists science_storage_delete_guard on storage.objects';
  execute 'create policy science_storage_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id<>''ibfc-science-evidence'')';
  execute 'drop policy if exists science_storage_read on storage.objects';
  execute 'create policy science_storage_read on storage.objects for select to authenticated using(bucket_id=''ibfc-science-evidence'' and exists(select 1 from public.admin_profiles where id=auth.uid() and role in(''admin'',''editor'')))';
  execute 'drop policy if exists science_storage_insert on storage.objects';
  execute 'create policy science_storage_insert on storage.objects for insert to authenticated with check(bucket_id=''ibfc-science-evidence'' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.admin_profiles where id=auth.uid() and role in(''admin'',''editor'')))';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
