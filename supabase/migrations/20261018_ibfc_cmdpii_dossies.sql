-- Etapa 6: dossiês e evidências vinculadas. Executar após as etapas 3 a 5.
begin;
create table if not exists public.ibfc_cmdpii_dossiers (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(trim(title)) between 8 and 200),
 scope text not null default 'APAM' check (scope in ('APAM','COSEA','CMDP II','CBMDF','Outro')),
 summary text not null check (char_length(trim(summary)) between 20 and 6000),
 status text not null default 'rascunho' check (status in ('rascunho','em_analise','revisado','encerrado')),
 conclusion text not null default '' check (char_length(conclusion)<=8000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.ibfc_cmdpii_dossier_evidence (
 id uuid primary key default gen_random_uuid(),
 dossier_id uuid not null references public.ibfc_cmdpii_dossiers(id) on delete restrict,
 evidence_kind text not null check (evidence_kind in ('documento','lancamento','extrato','alerta','outra_referencia')),
 reference text not null check (char_length(trim(reference)) between 3 and 500),
 explanation text not null default '' check (char_length(explanation)<=3000),
 verification text not null default 'nao_verificado' check (verification in ('nao_verificado','em_conferencia','corroborado','refutado')),
 added_by uuid not null references auth.users(id),
 added_at timestamptz not null default now()
);
create index if not exists cmdpii_dossier_evidence_dossier_idx on public.ibfc_cmdpii_dossier_evidence(dossier_id);
create table if not exists public.ibfc_cmdpii_dossier_events (
 id bigint generated always as identity primary key,
 dossier_id uuid not null references public.ibfc_cmdpii_dossiers(id) on delete restrict,
 actor_id uuid not null references auth.users(id),
 event_type text not null,
 detail jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create or replace function public.cmdpii_dossier_event_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.ibfc_cmdpii_dossier_events(dossier_id,actor_id,event_type,detail)
  values(new.id,auth.uid(),'dossie_criado',jsonb_build_object('status',new.status));
 else
  if new.id<>old.id or new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'Campos de origem imutáveis'; end if;
  new.updated_at=now();
  insert into public.ibfc_cmdpii_dossier_events(dossier_id,actor_id,event_type,detail)
  values(new.id,auth.uid(),'dossie_atualizado',jsonb_build_object('status_anterior',old.status,'status_novo',new.status,'conclusao_anterior',old.conclusion,'conclusao_nova',new.conclusion));
 end if;
 return new;
end $$;
drop trigger if exists cmdpii_dossier_events_trg on public.ibfc_cmdpii_dossiers;
create trigger cmdpii_dossier_events_trg before insert or update on public.ibfc_cmdpii_dossiers for each row execute function public.cmdpii_dossier_event_trigger();
create or replace function public.cmdpii_dossier_evidence_event_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.ibfc_cmdpii_dossier_events(dossier_id,actor_id,event_type,detail)
 values(new.dossier_id,auth.uid(),'evidencia_vinculada',jsonb_build_object('evidence_id',new.id,'tipo',new.evidence_kind,'referencia',new.reference,'verificacao',new.verification));
 return new;
end $$;
drop trigger if exists cmdpii_dossier_evidence_events_trg on public.ibfc_cmdpii_dossier_evidence;
create trigger cmdpii_dossier_evidence_events_trg after insert on public.ibfc_cmdpii_dossier_evidence for each row execute function public.cmdpii_dossier_evidence_event_trigger();
-- Acesso apenas para equipe administrativa autorizada; não permite exclusão.
do $$ declare t text; begin
 foreach t in array array['ibfc_cmdpii_dossiers','ibfc_cmdpii_dossier_evidence','ibfc_cmdpii_dossier_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in (''admin'',''editor'')))',t||'_read',t);
 end loop;
end $$;
grant insert,update on public.ibfc_cmdpii_dossiers to authenticated;
grant insert on public.ibfc_cmdpii_dossier_evidence to authenticated;
create policy cmdpii_dossiers_insert on public.ibfc_cmdpii_dossiers for insert to authenticated with check (created_by=auth.uid() and exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
create policy cmdpii_dossiers_update on public.ibfc_cmdpii_dossiers for update to authenticated using (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor'))) with check (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
create policy cmdpii_dossier_evidence_insert on public.ibfc_cmdpii_dossier_evidence for insert to authenticated with check (added_by=auth.uid() and exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
commit;
