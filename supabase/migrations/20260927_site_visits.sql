-- Contador de visitas do portal: uma visita por navegador a cada dia.
-- Datas seguem o horario de Brasilia. Execute no SQL Editor do Supabase do MFB.
create table if not exists public.site_visit_days (
  visit_date date primary key,
  visit_count bigint not null default 0 check (visit_count >= 0)
);

alter table public.site_visit_days enable row level security;
grant select on public.site_visit_days to anon, authenticated;

drop policy if exists "read site visits" on public.site_visit_days;
create policy "read site visits" on public.site_visit_days
  for select to anon, authenticated using (true);

-- Sem permissao de INSERT/UPDATE/DELETE direto para visitantes.
revoke insert, update, delete on public.site_visit_days from anon, authenticated;

create or replace function public.record_site_visit()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count bigint;
begin
  insert into public.site_visit_days (visit_date, visit_count)
  values ((now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (visit_date) do update
    set visit_count = public.site_visit_days.visit_count + 1
  returning visit_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.record_site_visit() from public;
grant execute on function public.record_site_visit() to anon, authenticated;
notify pgrst, 'reload schema';
