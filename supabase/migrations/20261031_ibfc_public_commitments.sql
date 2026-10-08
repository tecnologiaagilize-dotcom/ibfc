begin;
create table if not exists public.ibfc_public_commitments(
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 candidate_id uuid not null references public.candidates(id), title text not null,
 description text not null default '', source_url text not null, deadline date,
 status text not null default 'registered', evidence_url text, review_note text not null,
 version integer not null default 1, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ibfc_commitment_history(
 id uuid primary key default gen_random_uuid(), commitment_id uuid not null references public.ibfc_public_commitments(id),
 actor_id uuid not null references auth.users(id), occurred_at timestamptz not null default now(),
 before_record jsonb, after_record jsonb not null
);
alter table public.ibfc_public_commitments enable row level security;
alter table public.ibfc_commitment_history enable row level security;
revoke all on public.ibfc_public_commitments,public.ibfc_commitment_history from anon,authenticated;
grant select on public.ibfc_public_commitments,public.ibfc_commitment_history to authenticated;
drop policy if exists staff_read on public.ibfc_public_commitments;
create policy staff_read on public.ibfc_public_commitments for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
drop policy if exists staff_read on public.ibfc_commitment_history;
create policy staff_read on public.ibfc_commitment_history for select to authenticated using(exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')));
create or replace function public.ibfc_commitment_save(p_request uuid,p_id uuid,p_version integer,p_candidate uuid,p_title text,p_description text,p_source text,p_deadline date,p_status text,p_evidence text,p_note text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare oldrow public.ibfc_public_commitments; newrow public.ibfc_public_commitments;
begin
 if not exists(select 1 from public.admin_profiles where id=auth.uid() and role in('admin','editor')) then raise exception 'Acesso administrativo necessário';end if;
 if p_request is null then raise exception 'Identificador obrigatório';end if;
 if p_id is null then
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into newrow from public.ibfc_public_commitments where request_id=p_request;
 if found then
 if newrow.created_by<>auth.uid() then raise exception 'Pedido pertence a outro usuário';end if;
 return to_jsonb(newrow);end if;
 end if;
 if p_title is null or length(trim(p_title)) not between 3 and 180 or p_description is null or length(p_description)>5000 or p_note is null or length(trim(p_note)) not between 10 and 2000 or p_source is null or length(p_source)>2000 or p_source !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or p_status is null or p_status not in('registered','in_progress','fulfilled','unfulfilled','cancelled') then raise exception 'Campos inválidos';end if;
 if p_evidence is not null and (length(p_evidence)>2000 or p_evidence !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then raise exception 'Evidência inválida';end if;
 if p_status in('fulfilled','unfulfilled','cancelled') and p_evidence is null then raise exception 'Conclusão exige evidência';end if;
 if p_id is not null then
 select * into oldrow from public.ibfc_public_commitments where id=p_id for update;
 if not found or p_version is null or oldrow.version<>p_version then raise exception 'Registro alterado; atualize antes de salvar';end if;
 update public.ibfc_public_commitments set candidate_id=p_candidate,title=trim(p_title),description=p_description,source_url=p_source,deadline=p_deadline,status=p_status,evidence_url=p_evidence,review_note=trim(p_note),version=version+1,updated_at=now() where id=p_id returning * into newrow;
 else
 insert into public.ibfc_public_commitments(request_id,candidate_id,title,description,source_url,deadline,status,evidence_url,review_note,created_by) values(p_request,p_candidate,trim(p_title),p_description,p_source,p_deadline,p_status,p_evidence,trim(p_note),auth.uid()) returning * into newrow;
 end if;
 insert into public.ibfc_commitment_history(commitment_id,actor_id,before_record,after_record) values(newrow.id,auth.uid(),case when p_id is null then null else to_jsonb(oldrow) end,to_jsonb(newrow));
 return to_jsonb(newrow);
end;$$;
revoke all on function public.ibfc_commitment_save(uuid,uuid,integer,uuid,text,text,text,date,text,text,text) from public,anon;
grant execute on function public.ibfc_commitment_save(uuid,uuid,integer,uuid,text,text,text,date,text,text,text) to authenticated;
commit;
