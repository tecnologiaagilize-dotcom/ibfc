-- Prioridade automática para registros atuais e futuros; preserva display_order.
-- Executar no Supabase MFB depois da criação de public.candidates.
alter table public.candidates
  add column if not exists cargo_rank smallint generated always as (
    case
      when lower(trim(cargo)) like '%president%' then 10
      when lower(trim(cargo)) like '%governador%' or lower(trim(cargo)) like '%governadora%' then 20
      when lower(trim(cargo)) like '%senador%' or lower(trim(cargo)) like '%senadora%' then 30
      when lower(trim(cargo)) like 'deputad%federal%' then 40
      when lower(trim(cargo)) like 'deputad%estadual%' then 50
      when lower(trim(cargo)) like 'deputad%distrital%' then 60
      else 90
    end
  ) stored;

create index if not exists candidates_cargo_display_order_idx
  on public.candidates (status, state_uf, cargo_rank, display_order, name);

notify pgrst, 'reload schema';
