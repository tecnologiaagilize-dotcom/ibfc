-- Histórico: certificados dos candidatos cadastrados até 24/09/2026.
-- Cadastros posteriores recebem por padrão a data de inclusão em Brasília.
alter table public.candidates
  add column if not exists endorsement_issued_at date;

alter table public.candidates
  alter column endorsement_issued_at
  set default ((now() at time zone 'America/Sao_Paulo')::date);

update public.candidates
set endorsement_issued_at = date '2026-09-24'
where (created_at at time zone 'America/Sao_Paulo')::date <= date '2026-09-24';
