-- Mantém o planejamento partidário apenas no painel administrativo.
-- É seguro aplicar também em um banco novo sem as tabelas ou funções SAPF.
do $$
begin
  if to_regclass('public.ibfc_sapf_campaign') is not null then
    update public.ibfc_sapf_campaign set enabled = false;
  end if;
  if to_regclass('public.ibfc_sapf_queue') is not null then
    update public.ibfc_sapf_queue
       set status = 'cancelled', electoral_title = null, code = null,
           code_expires_at = null, operator_id = null,
           finished_at = now(), updated_at = now()
     where status in ('waiting', 'called', 'code_received');
  end if;
  if to_regprocedure('public.ibfc_sapf_join(text,boolean,boolean)') is not null then
    execute 'revoke all on function public.ibfc_sapf_join(text,boolean,boolean) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.ibfc_sapf_send_code(text)') is not null then
    execute 'revoke all on function public.ibfc_sapf_send_code(text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.ibfc_sapf_claim(uuid)') is not null then
    execute 'revoke all on function public.ibfc_sapf_claim(uuid) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.ibfc_sapf_finish(uuid,text)') is not null then
    execute 'revoke all on function public.ibfc_sapf_finish(uuid,text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.ibfc_sapf_cancel()') is not null then
    execute 'revoke all on function public.ibfc_sapf_cancel() from public, anon, authenticated';
  end if;
end $$;
