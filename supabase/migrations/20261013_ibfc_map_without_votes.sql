begin;
create or replace function public.ibfc_science_locations(p_uf text default 'DF',p_filters jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare output jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if p_uf<>'BR' and p_uf not in('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then raise exception 'UF inválida'; end if;
 with latest as(select distinct on(l.uf,l.municipality,l.zone,l.local) l.* from public.ibfc_electoral_locations l join public.ibfc_electoral_imports i on i.id=l.import_id and i.status='completed'
 where (p_uf='BR' or l.uf=p_uf) and ((p_filters->>'municipality') is null or l.municipality=(p_filters->>'municipality')::integer) and ((p_filters->>'zone') is null or l.zone=(p_filters->>'zone')::integer) and ((p_filters->>'local') is null or l.local=(p_filters->>'local')::integer)
 order by l.uf,l.municipality,l.zone,l.local,l.year desc,i.created_at desc,i.id desc)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from(select uf,municipality,municipality_name,zone,local,name,address,latitude,longitude,year from latest order by uf,municipality,zone,local limit 5000)x),'[]'),'total_rows',(select count(*) from latest),'truncated',(select count(*)>5000 from latest)) into output;
 return output;
end $$;
revoke all on function public.ibfc_science_locations(text,jsonb) from public,anon;
grant execute on function public.ibfc_science_locations(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
