begin;
create table if not exists public.ibfc_tramitation_snapshots(
 id uuid primary key default gen_random_uuid(),revision bigint generated always as identity unique,
 record_id uuid not null references public.ibfc_legislative_records(id),request_id uuid not null,
 previous_id uuid references public.ibfc_tramitation_snapshots(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 snapshot jsonb not null,unique(record_id,request_id)
);
create index if not exists ibfc_tramitation_snapshots_record on public.ibfc_tramitation_snapshots(record_id,revision desc);
alter table public.ibfc_tramitation_snapshots enable row level security;
revoke all on public.ibfc_tramitation_snapshots from anon,authenticated;
grant select on public.ibfc_tramitation_snapshots to authenticated;
drop policy if exists tramitation_staff_read on public.ibfc_tramitation_snapshots;
create policy tramitation_staff_read on public.ibfc_tramitation_snapshots for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create or replace function public.ibfc_tramitation_archive(p_record uuid,p_request uuid,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare record public.ibfc_legislative_records;s public.ibfc_tramitation_snapshots;prior uuid;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_request is null then raise exception 'Identificador de tentativa obrigatório';end if;
 select * into record from public.ibfc_legislative_records where id=p_record and provider='camara' and category='propositions' for update;
 if not found or record.source_url!~'^https://dadosabertos[.]camara[.]leg[.]br/api/v2/proposicoes/[1-9][0-9]{0,9}$' then raise exception 'Proposição oficial indisponível';end if;
 select * into s from public.ibfc_tramitation_snapshots where record_id=p_record and request_id=p_request;
 if found then return to_jsonb(s);end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' or octet_length(p_snapshot::text)>20000000
 or p_snapshot->>'source' is distinct from record.source_url||'/tramitacoes'
 or coalesce(p_snapshot->>'source_hash','')!~'^[a-f0-9]{64}$'
 or jsonb_typeof(p_snapshot->'steps') is distinct from 'array'
 or jsonb_typeof(p_snapshot->'raw'->'dados') is distinct from 'array'
 or jsonb_typeof(p_snapshot->'raw'->'links') is distinct from 'array' then raise exception 'Consulta inválida';end if;
 if jsonb_array_length(p_snapshot->'steps')>5000 or jsonb_array_length(p_snapshot->'steps')<>jsonb_array_length(p_snapshot->'raw'->'dados') then raise exception 'Movimentos inválidos';end if;
 if exists(select 1 from jsonb_array_elements(p_snapshot->'steps') value where jsonb_typeof(value) is distinct from 'object' or jsonb_typeof(value->'sequence') is distinct from 'number' or coalesce(value->>'sequence','')!~'^[0-9]{1,15}$') then raise exception 'Sequência de movimento inválida';end if;
 if exists(select 1 from jsonb_array_elements(p_snapshot->'raw'->'links') value where value->>'rel'='next') then raise exception 'Histórico incompleto';end if;
 select id into prior from public.ibfc_tramitation_snapshots where record_id=p_record order by revision desc limit 1;
 insert into public.ibfc_tramitation_snapshots(record_id,request_id,previous_id,created_by,snapshot) values(p_record,p_request,prior,auth.uid(),p_snapshot) returning * into s;
 return to_jsonb(s);
end;$$;
revoke all on function public.ibfc_tramitation_archive(uuid,uuid,jsonb) from public,anon;
grant execute on function public.ibfc_tramitation_archive(uuid,uuid,jsonb) to authenticated;
commit;
