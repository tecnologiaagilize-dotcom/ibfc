begin;
create table if not exists public.ibfc_cmdpii_financial_entries (
 id uuid primary key default gen_random_uuid(),
 entry_type text not null check (entry_type in ('receita','despesa')),
 transaction_date date not null,
 description text not null check (char_length(trim(description)) between 5 and 500),
 amount numeric(16,2) not null check (amount > 0),
 counterparty text not null default '',
 document_reference text not null default '',
 payment_method text not null default '',
 bank_reference text not null default '',
 verification_status text not null default 'pendente' check (verification_status in ('pendente','conferido','divergente')),
 notes text not null default '',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists ibfc_cmdpii_financial_entries_date on public.ibfc_cmdpii_financial_entries(transaction_date desc);
create index if not exists ibfc_cmdpii_financial_entries_type on public.ibfc_cmdpii_financial_entries(entry_type);
alter table public.ibfc_cmdpii_financial_entries enable row level security;
revoke all on public.ibfc_cmdpii_financial_entries from anon, authenticated;
grant select, insert on public.ibfc_cmdpii_financial_entries to authenticated;
create policy cmdpii_financial_select on public.ibfc_cmdpii_financial_entries for select to authenticated using (
 exists (select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor'))
);
create policy cmdpii_financial_insert on public.ibfc_cmdpii_financial_entries for insert to authenticated with check (
 created_by=auth.uid() and exists (select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor'))
);
comment on table public.ibfc_cmdpii_financial_entries is 'Lançamentos de auditoria restritos; divergências são indícios a conferir, não comprovação de ilícito.';
commit;
