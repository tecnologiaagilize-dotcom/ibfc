begin;
create index if not exists ibfc_demands_created on public.ibfc_community_demands(created_at);
create or replace function public.ibfc_community_report(p_filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb; f date; t date;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 f=nullif(p_filters->>'from','')::date;t=nullif(p_filters->>'to','')::date;
 if f is not null and t is not null and f>t then raise exception 'Período inválido'; end if;
 with filtered as materialized(select d.id,d.title,d.category,d.priority,d.responsible,d.status,d.due_on,d.created_at,
 o.name organization_name,o.uf,o.municipality,o.territory,
 (d.status not in('resolvida','cancelada') and d.due_on<(now() at time zone 'America/Sao_Paulo')::date) overdue
 from public.ibfc_community_demands d left join public.ibfc_community_organizations o on o.id=d.organization_id
 where (f is null or d.created_at >= (f::timestamp at time zone 'America/Sao_Paulo')) and (t is null or d.created_at < ((t+1)::timestamp at time zone 'America/Sao_Paulo'))
 and(coalesce(p_filters->>'uf','')='' or o.uf=p_filters->>'uf')
 and(coalesce(p_filters->>'municipality','')='' or o.municipality=p_filters->>'municipality')
 and(coalesce(p_filters->>'territory','')='' or o.territory=p_filters->>'territory')
 and(coalesce(p_filters->>'status','')='' or d.status=p_filters->>'status')
 and(coalesce(p_filters->>'category','')='' or d.category=p_filters->>'category')),
 limited as(select * from filtered order by created_at desc,id limit 1000),
 categories as(select category,count(*) total,count(*) filter(where status='resolvida') resolved,count(*) filter(where overdue) overdue from filtered group by category),
 regions as(select uf,municipality,count(*) total,count(*) filter(where status='resolvida') resolved,count(*) filter(where overdue) overdue from filtered group by uf,municipality),
 region_limited as(select * from regions order by total desc,uf,municipality limit 500)
 select jsonb_build_object('generated_at',now(),'filters',p_filters,'total',count(*),'truncated',count(*)>1000,
 'summary',jsonb_build_object('total',count(*),'open',count(*) filter(where status not in('resolvida','cancelada')),'resolved',count(*) filter(where status='resolvida'),'cancelled',count(*) filter(where status='cancelada'),'overdue',count(*) filter(where overdue),'without_organization',count(*) filter(where organization_name is null)),
 'rows',coalesce((select jsonb_agg(to_jsonb(limited) order by created_at desc,id) from limited),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(to_jsonb(categories) order by category) from categories),'[]'::jsonb),
 'regions',coalesce((select jsonb_agg(to_jsonb(region_limited) order by total desc,uf,municipality) from region_limited),'[]'::jsonb),
 'regions_truncated',(select count(*)>500 from regions)) into result from filtered;
 return result;
end;$$;
revoke all on function public.ibfc_community_report(jsonb) from public,anon;
grant execute on function public.ibfc_community_report(jsonb) to authenticated;
commit;
