begin;
create table if not exists public.ibfc_legislative_notice_reviews(
 user_id uuid not null references auth.users(id),notice_key text not null check(length(notice_key)<=180),reviewed_at timestamptz not null default now(),primary key(user_id,notice_key)
);
alter table public.ibfc_legislative_notice_reviews enable row level security;
revoke all on public.ibfc_legislative_notice_reviews from anon,authenticated;
grant select on public.ibfc_legislative_notice_reviews to authenticated;
drop policy if exists own_staff_reviews on public.ibfc_legislative_notice_reviews;
create policy own_staff_reviews on public.ibfc_legislative_notice_reviews for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create or replace view public.ibfc_legislative_notice_sources as
 with flagged as(select id,candidate_id,provider,category,external_id,version,updated_at,
 case when status='failed' or queue_status='failed' then 'failed' when status='partial' then 'partial' when execution_mode='background' and queue_status='processing' and(lease_until is null or lease_until<statement_timestamp()) then 'expired' when execution_mode='background' and queue_status='queued' and updated_at<statement_timestamp()-interval '30 minutes' then 'queued_delay' end as kind
 from public.ibfc_legislative_runs)
 select 'run:'||r.id||':'||r.version||':'||r.kind as notice_key,r.kind,r.candidate_id,r.provider,r.category,r.external_id,r.updated_at as occurred_at,r.id as run_id,null::uuid as record_id,null::uuid as snapshot_id,
 case r.kind when 'failed' then 'Coleta com falha' when 'partial' then 'Coleta com cobertura parcial' when 'expired' then 'Prazo de processamento expirado' else 'Fila sem atualização há mais de 30 minutos' end as title,
 case r.kind when 'failed' then 'Confira o erro registrado e a possibilidade de retomada no Observatório.' when 'partial' then 'A coleta alcançou um limite; não presuma cobertura completa.' when 'expired' then 'O prazo do worker expirou ou está ausente. Verifique a execução antes de retomar.' else 'A consulta está na fila sem atualização; confira o workflow do GitHub antes de reiniciar.' end as message
 from flagged r where kind is not null
 union all
 select 'snapshot:'||s.id,'tramitation_changed',r.candidate_id,r.provider,r.category,r.external_id,s.created_at,null::uuid,r.id,s.id,'Resposta de tramitação alterada','Uma versão arquivada difere da anterior. Abra a comparação: a diferença pode incluir metadados e não comprova irregularidade.'
 from public.ibfc_tramitation_snapshots s join public.ibfc_tramitation_snapshots p on p.id=s.previous_id and p.record_id=s.record_id join public.ibfc_legislative_records r on r.id=s.record_id
 where s.snapshot->>'source_hash' is distinct from p.snapshot->>'source_hash';
revoke all on public.ibfc_legislative_notice_sources from public,anon,authenticated;
create or replace function public.ibfc_legislative_notices(p_candidate uuid default null,p_reviewed boolean default false,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 or p_reviewed is null then raise exception 'Filtro inválido';end if;
 with notices as(select n.*,c.name as candidate_name,c.state_uf,a.reviewed_at from public.ibfc_legislative_notice_sources n join public.candidates c on c.id=n.candidate_id left join public.ibfc_legislative_notice_reviews a on a.notice_key=n.notice_key and a.user_id=auth.uid() where (p_candidate is null or n.candidate_id=p_candidate) and(p_reviewed or a.reviewed_at is null)),
 page as(select * from notices order by occurred_at desc,notice_key limit 50 offset p_offset)
 select jsonb_build_object('checked_at',statement_timestamp(),'offset',p_offset,'page_size',50,'total',(select count(*) from notices),'pending',(select count(*) from notices where reviewed_at is null),'rows',coalesce((select jsonb_agg(to_jsonb(page) order by occurred_at desc,notice_key) from page),'[]'::jsonb)) into result;
 return result;
end;$$;
create or replace function public.ibfc_legislative_notice_review(p_key text,p_reviewed boolean) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_key is null or p_reviewed is null or length(p_key)>180 or not exists(select 1 from public.ibfc_legislative_notice_sources where notice_key=p_key) then raise exception 'Aviso não está disponível; atualize a consulta';end if;
 if p_reviewed then insert into public.ibfc_legislative_notice_reviews(user_id,notice_key) values(auth.uid(),p_key) on conflict(user_id,notice_key) do nothing;
 else delete from public.ibfc_legislative_notice_reviews where user_id=auth.uid() and notice_key=p_key;end if;
 return jsonb_build_object('notice_key',p_key,'reviewed',p_reviewed);
end;$$;
revoke all on function public.ibfc_legislative_notices(uuid,boolean,integer),public.ibfc_legislative_notice_review(text,boolean) from public,anon;
grant execute on function public.ibfc_legislative_notices(uuid,boolean,integer),public.ibfc_legislative_notice_review(text,boolean) to authenticated;
commit;
