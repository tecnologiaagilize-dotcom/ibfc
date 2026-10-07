begin;
alter table public.ibfc_community_organizations add column if not exists latitude double precision;
alter table public.ibfc_community_organizations add column if not exists longitude double precision;
alter table public.ibfc_community_organizations add column if not exists location_note text not null default '';
alter table public.ibfc_community_organizations add column if not exists location_verified_at timestamptz;
alter table public.ibfc_community_organizations add column if not exists location_verified_by uuid references auth.users(id);
alter table public.ibfc_community_organizations drop constraint if exists ibfc_community_coordinates;
alter table public.ibfc_community_organizations add constraint ibfc_community_coordinates check((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));
alter table public.ibfc_community_organizations drop constraint if exists ibfc_community_location_note;
alter table public.ibfc_community_organizations add constraint ibfc_community_location_note check(length(location_note)<=300 and (latitude is null or length(trim(location_note))>=5));
create or replace function public.ibfc_community_map(p_uf text default null) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário'; end if;
 if p_uf is not null and p_uf !~ '^[A-Z]{2}$' then raise exception 'UF inválida'; end if;
 with counts as(select organization_id,count(*) total,count(*) filter(where status not in('resolvida','cancelada')) open,
 count(*) filter(where status not in('resolvida','cancelada') and due_on<(now() at time zone 'America/Sao_Paulo')::date) overdue from public.ibfc_community_demands group by organization_id),
 orgs as(select o.id,o.name,o.uf,o.municipality,o.territory,o.purpose,o.latitude,o.longitude,o.location_note,o.location_verified_at,
 coalesce(c.total,0) demands_total,coalesce(c.open,0) demands_open,coalesce(c.overdue,0) demands_overdue from public.ibfc_community_organizations o left join counts c on c.organization_id=o.id where p_uf is null or o.uf=p_uf),
 limited as(select * from orgs order by name,id limit 1000)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(limited)) from limited),'[]'::jsonb),'total',(select count(*) from orgs),'truncated',(select count(*)>1000 from orgs),
 'unlinked_demands',(select count(*) from public.ibfc_community_demands where organization_id is null),'generated_at',now()) into result;
 return result;
end;$$;
revoke all on function public.ibfc_community_map(text) from public,anon;
grant execute on function public.ibfc_community_map(text) to authenticated;
comment on column public.ibfc_community_organizations.latitude is 'Ponto público de atendimento da organização, confirmado pela equipe. Não representa residência, território oficial ou distribuição de eleitores.';
commit;
