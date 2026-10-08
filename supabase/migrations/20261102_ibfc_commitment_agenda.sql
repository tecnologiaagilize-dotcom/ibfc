begin;
create table if not exists public.ibfc_commitment_agenda(
 commitment_id uuid primary key references public.ibfc_public_commitments(id),owner_id uuid references auth.users(id),next_review date,note text not null,
 version integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid not null references auth.users(id),
 check((owner_id is null and next_review is null) or(owner_id is not null and next_review is not null))
);
create table if not exists public.ibfc_commitment_agenda_history(
 id uuid primary key default gen_random_uuid(),commitment_id uuid not null references public.ibfc_public_commitments(id),actor_id uuid not null references auth.users(id),occurred_at timestamptz not null default now(),commitment_version integer not null,before_record jsonb,after_record jsonb not null
);
alter table public.ibfc_commitment_agenda enable row level security;
alter table public.ibfc_commitment_agenda_history enable row level security;
revoke all on public.ibfc_commitment_agenda,public.ibfc_commitment_agenda_history from anon,authenticated;
grant select on public.ibfc_commitment_agenda,public.ibfc_commitment_agenda_history to authenticated;
drop policy if exists staff_read on public.ibfc_commitment_agenda;
create policy staff_read on public.ibfc_commitment_agenda for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists staff_read on public.ibfc_commitment_agenda_history;
create policy staff_read on public.ibfc_commitment_agenda_history for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create index if not exists ibfc_agenda_owner_review on public.ibfc_commitment_agenda(owner_id,next_review);
create or replace function public.ibfc_commitment_agenda_list(p_mode text default 'due',p_candidate uuid default null,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; today date:=(statement_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_mode is null or p_mode not in('all','mine','due','unassigned') or p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Filtro inválido';end if;
 with annotated as(select x.id as commitment_id,x.candidate_id,c.name as candidate_name,x.title,x.status,x.deadline as commitment_deadline,x.source_url,x.version as commitment_version,a.owner_id,u.email as owner_email,a.next_review,a.note,coalesce(a.version,0) as agenda_version,a.updated_at,
 exists(select 1 from public.admin_profiles s where s.id=a.owner_id and s.role in('admin','editor')) as owner_valid,
 (a.next_review<=today) as review_due
 from public.ibfc_public_commitments x join public.candidates c on c.id=x.candidate_id left join public.ibfc_commitment_agenda a on a.commitment_id=x.id left join auth.users u on u.id=a.owner_id
 where x.status in('registered','in_progress') and(p_candidate is null or x.candidate_id=p_candidate)),
 filtered as(select * from annotated where p_mode='all' or p_mode='mine' and owner_id=auth.uid() or p_mode='due' and review_due or p_mode='unassigned' and not owner_valid),
 page as(select * from filtered order by next_review nulls last,commitment_deadline nulls last,commitment_id limit 20 offset p_offset)
 select jsonb_build_object('checked_at',statement_timestamp(),'as_of_date',today,'current_user_id',auth.uid(),'mode',p_mode,'candidate_id',p_candidate,'offset',p_offset,'page_size',20,'total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page) order by next_review nulls last,commitment_deadline nulls last,commitment_id) from page),'[]'::jsonb),'staff',coalesce((select jsonb_agg(t) from(select s.id,u.email,s.role from public.admin_profiles s join auth.users u on u.id=s.id where s.role in('admin','editor') order by u.email,s.id limit 1000)t),'[]'::jsonb)) into result;
 return result;
end;$$;
create or replace function public.ibfc_commitment_agenda_save(p_id uuid,p_version integer,p_owner uuid,p_review date,p_note text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare oldrow public.ibfc_commitment_agenda;newrow public.ibfc_commitment_agenda;cv integer;cs text;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_id is null or p_version is null or p_version<0 or p_note is null or length(trim(p_note)) not between 10 and 2000 or (p_owner is null)<>(p_review is null) then raise exception 'Campos inválidos';end if;
 if p_owner is not null and not exists(select 1 from public.admin_profiles s join auth.users u on u.id=s.id where s.id=p_owner and s.role in('admin','editor')) then raise exception 'Responsável não é administrador ou editor';end if;
 select version,status into cv,cs from public.ibfc_public_commitments where id=p_id for update;
 if not found or cs not in('registered','in_progress') then raise exception 'Compromisso não está aberto; atualize a agenda';end if;
 select * into oldrow from public.ibfc_commitment_agenda where commitment_id=p_id for update;
 if coalesce(oldrow.version,0)<>p_version then raise exception 'Agenda alterada; atualize antes de salvar';end if;
 insert into public.ibfc_commitment_agenda(commitment_id,owner_id,next_review,note,updated_by) values(p_id,p_owner,p_review,trim(p_note),auth.uid()) on conflict(commitment_id) do update set owner_id=excluded.owner_id,next_review=excluded.next_review,note=excluded.note,version=ibfc_commitment_agenda.version+1,updated_at=now(),updated_by=auth.uid() returning * into newrow;
 insert into public.ibfc_commitment_agenda_history(commitment_id,actor_id,commitment_version,before_record,after_record) values(p_id,auth.uid(),cv,case when oldrow.version is null then null else to_jsonb(oldrow) end,to_jsonb(newrow));
 return to_jsonb(newrow);
end;$$;
revoke all on function public.ibfc_commitment_agenda_list(text,uuid,integer),public.ibfc_commitment_agenda_save(uuid,integer,uuid,date,text) from public,anon;
grant execute on function public.ibfc_commitment_agenda_list(text,uuid,integer),public.ibfc_commitment_agenda_save(uuid,integer,uuid,date,text) to authenticated;
commit;
