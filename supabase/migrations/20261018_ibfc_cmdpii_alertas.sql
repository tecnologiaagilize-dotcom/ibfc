-- Etapa 5: registros de revisão de alertas. Executar após Etapas 3 e 4.
begin;
create table if not exists public.ibfc_cmdpii_audit_reviews (
 id uuid primary key default gen_random_uuid(),
 alert_key text not null unique check (char_length(alert_key) between 8 and 160),
 alert_type text not null check (alert_type in ('sem_conciliacao','valor_duplicado','sem_documento','divergencia_revisada')),
 disposition text not null check (disposition in ('em_analise','justificado','necessita_documentos','encaminhado')),
 notes text not null default '' check (char_length(notes) <= 4000),
 reviewed_by uuid not null references auth.users(id),
 reviewed_at timestamptz not null default now()
);
alter table public.ibfc_cmdpii_audit_reviews enable row level security;
revoke all on public.ibfc_cmdpii_audit_reviews from anon,authenticated;
grant select,insert,update on public.ibfc_cmdpii_audit_reviews to authenticated;
create policy cmdpii_audit_review_select on public.ibfc_cmdpii_audit_reviews for select to authenticated using (
 exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
create policy cmdpii_audit_review_insert on public.ibfc_cmdpii_audit_reviews for insert to authenticated with check (
 reviewed_by=auth.uid() and exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
create policy cmdpii_audit_review_update on public.ibfc_cmdpii_audit_reviews for update to authenticated using (
 exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')))
 with check (reviewed_by=auth.uid() and exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
-- Histórico imutável de cada alteração de revisão, inclusive autor anterior e conteúdo anterior.
create table if not exists public.ibfc_cmdpii_audit_review_history (
 id bigint generated always as identity primary key,
 review_id uuid not null references public.ibfc_cmdpii_audit_reviews(id),
 changed_at timestamptz not null default now(),
 changed_by uuid not null references auth.users(id),
 previous_disposition text, previous_notes text,
 new_disposition text not null, new_notes text not null
);
alter table public.ibfc_cmdpii_audit_review_history enable row level security;
revoke all on public.ibfc_cmdpii_audit_review_history from anon,authenticated;
grant select on public.ibfc_cmdpii_audit_review_history to authenticated;
create policy cmdpii_audit_history_select on public.ibfc_cmdpii_audit_review_history for select to authenticated using (
 exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
create or replace function public.cmdpii_audit_review_log() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='UPDATE' and (new.alert_key<>old.alert_key or new.alert_type<>old.alert_type) then
  raise exception 'A identidade do alerta não pode ser alterada';
 end if;
 if new.reviewed_by is distinct from auth.uid() then raise exception 'Autor da revisão inválido'; end if;
 new.reviewed_at=now();
 insert into public.ibfc_cmdpii_audit_review_history(review_id,changed_by,previous_disposition,previous_notes,new_disposition,new_notes)
 values(new.id,auth.uid(),case when tg_op='UPDATE' then old.disposition else null end,
 case when tg_op='UPDATE' then old.notes else null end,new.disposition,new.notes);
 return new;
end $$;
drop trigger if exists cmdpii_audit_review_log_trg on public.ibfc_cmdpii_audit_reviews;
create trigger cmdpii_audit_review_log_trg before insert or update on public.ibfc_cmdpii_audit_reviews
for each row execute function public.cmdpii_audit_review_log();
commit;
