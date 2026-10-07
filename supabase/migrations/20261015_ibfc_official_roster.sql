begin;
create table if not exists public.ibfc_science_candidate_roster(year integer not null,uf text not null,election integer not null,turn integer not null,office integer not null,candidate_id text not null,number text not null,name text not null,office_name text not null,party text not null,status text not null,source_url text not null,source_sha256 text not null,imported_at timestamptz not null default now(),primary key(year,uf,election,turn,office,candidate_id));
alter table public.ibfc_science_candidate_roster enable row level security;
grant select on public.ibfc_science_candidate_roster to authenticated;
revoke insert,update,delete on public.ibfc_science_candidate_roster from authenticated;
drop policy if exists roster_read on public.ibfc_science_candidate_roster;
create policy roster_read on public.ibfc_science_candidate_roster for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
do $$ begin
 if to_regprocedure('public.ibfc_science_results_catalogue(text)') is null then alter function public.ibfc_science_catalogue(text) rename to ibfc_science_results_catalogue; end if;
end $$;
create or replace function public.ibfc_science_catalogue(p_uf text) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare base jsonb; cc jsonb; pp jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 base:=public.ibfc_science_results_catalogue(p_uf);
 with votes as(select x||jsonb_build_object('results_available',true) x from jsonb_array_elements(base->'candidates') x),
 roster as(select jsonb_build_object('year',r.year,'uf',p_uf,'election',r.election,'turn',r.turn,'office',r.office,'candidate_id',r.candidate_id,'number',r.number,'name',r.name,'office_name',r.office_name,'party',r.party,'status',r.status,'results_available',false,'source_url',r.source_url) x from public.ibfc_science_candidate_roster r where r.uf=p_uf or(r.uf='BR' and r.office=1)),
 combined as(select x from votes union all select r.x from roster r where not exists(select 1 from votes v where (v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number')=(r.x->>'year',r.x->>'election',r.x->>'turn',r.x->>'office',r.x->>'number')))
 select coalesce(jsonb_agg(x order by x->>'name'),'[]') into cc from combined;
 with votes as(select x||jsonb_build_object('results_available',true) x from jsonb_array_elements(base->'parties') x),
 roster as(select distinct jsonb_build_object('year',r.year,'uf',p_uf,'election',r.election,'turn',r.turn,'office',r.office,'number',left(r.number,2),'name',r.party,'office_name',r.office_name,'kind','party','results_available',false) x from public.ibfc_science_candidate_roster r where r.uf=p_uf or(r.uf='BR' and r.office=1)),
 combined as(select x from votes union all select r.x from roster r where not exists(select 1 from votes v where (v.x->>'year',v.x->>'election',v.x->>'turn',v.x->>'office',v.x->>'number')=(r.x->>'year',r.x->>'election',r.x->>'turn',r.x->>'office',r.x->>'number')))
 select coalesce(jsonb_agg(x order by x->>'name'),'[]') into pp from combined;
 return base||jsonb_build_object('candidates',cc,'parties',pp);
end $$;
revoke all on function public.ibfc_science_catalogue(text) from public,anon;
grant execute on function public.ibfc_science_catalogue(text) to authenticated;
notify pgrst,'reload schema';
commit;
