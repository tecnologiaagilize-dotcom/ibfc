begin;
create index if not exists ibfc_commitments_candidate_status on public.ibfc_public_commitments(candidate_id,status);
create or replace function public.ibfc_commitment_report(p_candidate uuid default null,p_status text default null,p_deadline text default 'all',p_uf text default null,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; today date:=(statement_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 or p_deadline is null or p_deadline not in('all','overdue','due30','none') or p_status is not null and p_status not in('registered','in_progress','fulfilled','unfulfilled','cancelled') or p_uf is not null and p_uf not in('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then raise exception 'Filtro inválido';end if;
 with annotated as(
 select x.*,c.name as candidate_name,c.state_uf,
 (x.status in('registered','in_progress') and x.deadline<today) as overdue,
 (x.status in('registered','in_progress') and x.deadline between today and today+30) as due30
 from public.ibfc_public_commitments x join public.candidates c on c.id=x.candidate_id
 where(p_candidate is null or x.candidate_id=p_candidate) and(p_status is null or x.status=p_status) and(p_uf is null or c.state_uf=p_uf)),
 filtered as(select * from annotated where p_deadline='all' or p_deadline='overdue' and overdue or p_deadline='due30' and due30 or p_deadline='none' and deadline is null),
 groups as(select candidate_id,candidate_name,state_uf,count(*) as total,
 count(*) filter(where status='registered') as registered,count(*) filter(where status='in_progress') as in_progress,count(*) filter(where status='fulfilled') as fulfilled,count(*) filter(where status='unfulfilled') as unfulfilled,count(*) filter(where status='cancelled') as cancelled,
 count(*) filter(where overdue) as overdue,count(*) filter(where due30) as due30,count(*) filter(where deadline is null) as without_deadline,max(updated_at) as updated_at
 from filtered group by candidate_id,candidate_name,state_uf),
 page as(select * from groups order by candidate_name,candidate_id limit 50 offset p_offset),
 totals as(select count(*) as total,count(*) filter(where status='registered') as registered,count(*) filter(where status='in_progress') as in_progress,count(*) filter(where status='fulfilled') as fulfilled,count(*) filter(where status='unfulfilled') as unfulfilled,count(*) filter(where status='cancelled') as cancelled,count(*) filter(where overdue) as overdue,count(*) filter(where due30) as due30,count(*) filter(where deadline is null) as without_deadline from filtered)
 select jsonb_build_object('checked_at',statement_timestamp(),'as_of_date',today,'timezone','America/Sao_Paulo','offset',p_offset,'page_size',50,'total_groups',(select count(*) from groups),'summary',(select to_jsonb(totals) from totals),'rows',coalesce((select jsonb_agg(to_jsonb(page) order by candidate_name,candidate_id) from page),'[]'::jsonb),'filters',jsonb_build_object('candidate_id',p_candidate,'status',p_status,'deadline',p_deadline,'uf',p_uf)) into result;
 return result;
end;$$;
revoke all on function public.ibfc_commitment_report(uuid,text,text,text,integer) from public,anon;
grant execute on function public.ibfc_commitment_report(uuid,text,text,text,integer) to authenticated;
commit;
