-- Defines an atomic authoring operation only. Does not seed or publish production content.
-- Requires academy foundation + staff policies (20261103..20261105).
begin;
create or replace function public.academy_install_discipline_one(p_course uuid,p_package jsonb)
returns jsonb
language plpgsql security definer set search_path='' as $function$
declare
 v_module uuid; v_lesson jsonb; v_resource jsonb; v_existing public.academy_lessons%rowtype;
 v_id uuid; v_inserted integer:=0; v_upgraded integer:=0; v_unchanged integer:=0;
 v_legacy text:=$legacy$# Aula 1 — Diagnóstico do negócio e da oferta
**Objetivo:** diferenciar um produto tecnológico de uma oferta comercial capaz de resolver um problema verificável.

## Conceitos
- **Produto:** conjunto de recursos e serviços efetivamente disponíveis.
- **Problema do cliente:** obstáculo específico, observável e relevante.
- **Proposta de valor:** resultado concreto que a oferta ajuda a alcançar, com limites claros.
- **Hipótese comercial:** suposição que deve ser validada com pesquisa e experimentos.

## Estudo de caso: Agilize CRM
Uma empresa recebe contatos de redes sociais e de anúncios, mas não sabe quantos contatos são qualificados, quantas reuniões aconteceram e quantas vendas foram concluídas. A hipótese é que integrar o atendimento ao CRM e medir cada etapa pode reduzir perdas operacionais. Isso **não é uma promessa de aumento de faturamento**; exige validação.

## Exercício guiado
1. Descreva em uma frase a oferta que pretende vender.
2. Liste três funções comprovadamente disponíveis no produto.
3. Identifique o cliente ideal e o problema observável.
4. Descreva como o cliente resolve hoje o mesmo problema.
5. Escreva uma hipótese mensurável de valor.
6. Faça uma lista das informações que ainda não podem ser afirmadas em anúncios.
7. Defina três métricas de acompanhamento: contatos qualificados, demonstrações e propostas.

## Entrega obrigatória
Produza uma ficha com **cliente ideal, problema, oferta, evidências e métricas**. Guarde a primeira versão para comparar com a versão revisada após entrevistas com potenciais compradores.

## Autoavaliação
- Consigo apresentar a oferta em até 60 segundos sem exagerar capacidades?
- Sei distinguir fatos verificados de hipóteses?
- Tenho uma forma objetiva de medir cada etapa?

**Próxima aula:** pesquisa de mercado e entrevistas de descoberta de clientes (em elaboração).
$legacy$;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role in ('admin','editor')) then
  raise exception 'Sem permissão administrativa';
 end if;
 if jsonb_typeof(p_package) is distinct from 'object' or p_package->>'version' is distinct from '1.0.0'
 or jsonb_typeof(p_package->'lessons') is distinct from 'array' then raise exception 'Pacote inválido'; end if;
 if jsonb_array_length(p_package->'lessons')<>8 then raise exception 'Pacote deve conter oito aulas'; end if;
 perform pg_advisory_xact_lock(hashtextextended('academy-discipline-one:'||p_course::text,0));
 perform 1 from public.academy_courses c where c.id=p_course
  and c.slug='empreendedorismo-digital-vendas-automacao-ia' and c.status='draft' for update;
 if not found then raise exception 'Instale o curso-piloto e mantenha-o em rascunho'; end if;
 select m.id into v_module from public.academy_modules m where m.course_id=p_course and m.position=1
 and m.title in ('01 — Mentalidade empreendedora e modelos de negócios','Mentalidade empreendedora, ética e modelo de negócios') for update;
 if v_module is null then raise exception 'Módulo 1 do piloto não encontrado ou foi personalizado'; end if;
 if exists(select 1 from public.academy_lessons l where l.module_id=v_module and (l.position<1 or l.position>8)) then
  raise exception 'Conflito: módulo contém aulas fora das posições 1 a 8';
 end if;
 for v_lesson in select value from jsonb_array_elements(p_package->'lessons') with ordinality as item(value,ord) order by ord loop
  -- Positions must be consecutive, not duplicated, and total exactly 1200 minutes.
  if jsonb_typeof(v_lesson) is distinct from 'object'
   or v_lesson->>'position' is distinct from (v_inserted+v_upgraded+v_unchanged+1)::text
   or v_lesson->>'duration_minutes' is distinct from '150'
   or jsonb_typeof(v_lesson->'title') is distinct from 'string' or length(v_lesson->>'title') not between 8 and 240
   or jsonb_typeof(v_lesson->'content_md') is distinct from 'string' or length(v_lesson->>'content_md') not between 1000 and 100000
   or jsonb_typeof(v_lesson->'resources') is distinct from 'array' then raise exception 'Pacote de aula inválido'; end if;
  select * into v_existing from public.academy_lessons l where l.module_id=v_module and l.position=(v_lesson->>'position')::int for update;
  if found then
   v_id:=v_existing.id;
   if v_existing.status<>'draft' or v_existing.video_provider is not null or v_existing.video_url is not null or v_existing.video_id is not null then
    raise exception 'Conflito na aula %: preservar publicação ou mídia existente',v_existing.position;
   elsif v_existing.content_md is not distinct from v_lesson->>'content_md'
    and v_existing.title is not distinct from v_lesson->>'title'
    and v_existing.description is not distinct from v_lesson->>'description'
    and v_existing.duration_minutes=150 then
    v_unchanged:=v_unchanged+1;
   elsif v_existing.position=1 and v_existing.content_md=v_legacy
    and v_existing.title='Aula 1 — Diagnóstico do negócio e proposta de valor'
    and v_existing.description='Conceitos, estudo de caso Agilize CRM, exercícios e ficha de diagnóstico.'
    and v_existing.duration_minutes=60
    and not exists(select 1 from public.academy_progress pr where pr.lesson_id=v_id)
    and not exists(select 1 from public.academy_resources r where r.lesson_id=v_id) then
    update public.academy_lessons set title=v_lesson->>'title',description=v_lesson->>'description',content_md=v_lesson->>'content_md',duration_minutes=150 where id=v_id;
    v_upgraded:=v_upgraded+1;
   else raise exception 'Conflito na aula %: conteúdo existente preservado; revisão manual necessária',v_existing.position;
   end if;
  else
   insert into public.academy_lessons(module_id,position,title,description,content_md,duration_minutes,status)
    values(v_module,(v_lesson->>'position')::int,v_lesson->>'title',v_lesson->>'description',v_lesson->>'content_md',150,'draft') returning id into v_id;
   v_inserted:=v_inserted+1;
  end if;
  for v_resource in select value from jsonb_array_elements(v_lesson->'resources') loop
   if v_resource->>'resource_url' !~ '^https://' or v_resource->>'resource_type' is distinct from 'reading'
    or coalesce(length(v_resource->>'title'),0)=0 then raise exception 'Recurso inválido'; end if;
   if not exists(select 1 from public.academy_resources r where r.lesson_id=v_id and r.resource_url=v_resource->>'resource_url') then
    insert into public.academy_resources(lesson_id,title,resource_url,resource_type,attribution,license_notes,checked_at)
     values(v_id,v_resource->>'title',v_resource->>'resource_url','reading',v_resource->>'attribution',v_resource->>'license_notes',(v_resource->>'checked_at')::timestamptz);
   end if;
  end loop;
 end loop;
 return jsonb_build_object('version','1.0.0','inserted',v_inserted,'upgraded',v_upgraded,'unchanged',v_unchanged,'minutes',1200,'status','draft');
end $function$;
revoke all on function public.academy_install_discipline_one(uuid,jsonb) from public,anon;
grant execute on function public.academy_install_discipline_one(uuid,jsonb) to authenticated;
commit;
