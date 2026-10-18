-- Executar somente após 20261018_ibfc_cmdpii_financeiro.sql
begin;
create table if not exists public.ibfc_cmdpii_bank_transactions (
 id uuid primary key default gen_random_uuid(),
 transaction_date date not null,
 description text not null check (char_length(description) between 1 and 1000),
 amount numeric(16,2) not null check (amount <> 0), -- positivo: entrada; negativo: saída
 account_label text not null check (char_length(account_label) between 1 and 120),
 source_filename text not null default '',
 source_row integer not null check (source_row > 0),
 fingerprint text not null unique check (char_length(fingerprint) = 64),
 financial_entry_id uuid references public.ibfc_cmdpii_financial_entries(id) on delete set null,
 review_status text not null default 'pendente' check (review_status in ('pendente','conciliado','divergente')),
 review_notes text not null default '',
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 constraint cmdpii_review_consistency check ((review_status <> 'conciliado') or financial_entry_id is not null)
);
create index if not exists cmdpii_bank_date_idx on public.ibfc_cmdpii_bank_transactions(transaction_date desc);
create index if not exists cmdpii_bank_match_idx on public.ibfc_cmdpii_bank_transactions(financial_entry_id);
alter table public.ibfc_cmdpii_bank_transactions enable row level security;
revoke all on public.ibfc_cmdpii_bank_transactions from anon, authenticated;
grant select,insert,update on public.ibfc_cmdpii_bank_transactions to authenticated;
create policy cmdpii_bank_select on public.ibfc_cmdpii_bank_transactions for select to authenticated using (
 exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')));
create policy cmdpii_bank_insert on public.ibfc_cmdpii_bank_transactions for insert to authenticated with check (
 created_by=auth.uid() and review_status='pendente' and financial_entry_id is null and reviewed_by is null and reviewed_at is null and
 exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')));
create policy cmdpii_bank_update on public.ibfc_cmdpii_bank_transactions for update to authenticated using (
 exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')))
 with check (exists(select 1 from public.admin_profiles a where a.id=auth.uid() and a.role in ('admin','editor')));
-- Impede adulteração de valores de extrato, proveniência e autoria após a importação.
create or replace function public.cmdpii_bank_protect_source() returns trigger language plpgsql set search_path = '' as $$
begin
 if row(new.transaction_date,new.description,new.amount,new.account_label,new.source_filename,new.source_row,new.fingerprint,new.created_by,new.created_at)
 is distinct from row(old.transaction_date,old.description,old.amount,old.account_label,old.source_filename,old.source_row,old.fingerprint,old.created_by,old.created_at) then
  raise exception 'Campos de origem do extrato são imutáveis';
 end if;
 return new;
end $$;
drop trigger if exists cmdpii_bank_source_immutable on public.ibfc_cmdpii_bank_transactions;
create trigger cmdpii_bank_source_immutable before update on public.ibfc_cmdpii_bank_transactions for each row execute function public.cmdpii_bank_protect_source();
commit;
