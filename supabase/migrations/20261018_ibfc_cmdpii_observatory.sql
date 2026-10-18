begin;
create table if not exists public.ibfc_cmdpii_records (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('historico','legislacao','convenio','governanca','apam','cosea','financeiro','auditoria','documento')),
 title text not null check(char_length(trim(title)) between 5 and 250),
 description text not null default '',
 status text not null default 'relato_nao_verificado' check(status in ('relato_nao_verificado','documento_recebido','evidencia_verificada','conclusao_fundamentada')),
 source_reference text not null default '',
 event_date date,
 visibility text not null default 'restrito' check(visibility in ('restrito','publico')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ibfc_cmdpii_records_kind_date on public.ibfc_cmdpii_records(kind,created_at desc);
alter table public.ibfc_cmdpii_records enable row level security;
revoke all on public.ibfc_cmdpii_records from anon,authenticated;
grant select,insert,update on public.ibfc_cmdpii_records to authenticated;
create policy cmdpii_admin_select on public.ibfc_cmdpii_records for select to authenticated using (
 exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor'))
);
create policy cmdpii_admin_insert on public.ibfc_cmdpii_records for insert to authenticated with check (
 created_by=auth.uid() and exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor'))
);
create policy cmdpii_admin_update on public.ibfc_cmdpii_records for update to authenticated using (
 exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor'))
) with check (
 exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor'))
);
comment on table public.ibfc_cmdpii_records is 'Observatorio CMDP II: dados restritos, sem publicacao automatica e com grau de verificacao explicito.';
commit;
