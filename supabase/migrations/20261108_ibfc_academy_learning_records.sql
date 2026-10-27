-- Apply in homologation after migrations 20261103..20261107. No production execution.
begin;
alter table public.academy_attempts add column if not exists request_id uuid;
alter table public.academy_attempts add column if not exists mode text not null default 'assessment' check(mode in ('assessment','practice'));
create unique index if not exists academy_attempt_request_unique on public.academy_attempts(user_id,request_id) where request_id is not null;
create table if not exists public.academy_responses (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.academy_attempts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null,
 prompt text not null,
 options jsonb not null,
 selected_option integer not null,
 correct_option integer not null,
 is_correct boolean not null,
 created_at timestamptz not null default now(),
 unique(attempt_id,question_id)
);
-- question_id deliberately has no cascade FK: retain evidence when author removes an item.
alter table public.academy_responses enable row level security;
revoke all on public.academy_responses from anon,authenticated;
grant select on public.academy_responses to authenticated;
create policy academy_responses_owner on public.academy_responses for select to authenticated using(user_id=(select auth.uid()));
create index academy_responses_errors on public.academy_responses(user_id,created_at desc) where not is_correct;
drop function public.academy_submit_assessment(uuid,jsonb);
create function public.academy_submit_assessment(p_assessment uuid,p_answers jsonb,p_request uuid default null,p_mode text default 'assessment')
returns table(score integer,passed boolean,certificate_code uuid,attempt_id uuid)
language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=auth.uid(); v_course uuid; v_passing integer; v_count int:=0; v_right int:=0;
 v_score int; v_attempt uuid; v_code uuid; v_existing public.academy_attempts%rowtype;
 v_q record; v_questions jsonb; v_value jsonb; v_index int;
begin
 if v_user is null or p_request is null or p_mode is null or p_mode not in ('assessment','practice')
 or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'Dados inválidos'; end if;
 -- Serialize retries per learner; replay returns the original result.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select * into v_existing from public.academy_attempts a where a.user_id=v_user and a.request_id=p_request;
 if found then
  if v_existing.assessment_id<>p_assessment or v_existing.mode<>p_mode then raise exception 'Identificador reutilizado'; end if;
  if exists(select 1 from public.academy_responses r where r.attempt_id=v_existing.id and
   (p_answers->r.question_id::text) is distinct from to_jsonb(r.selected_option))
   or (select count(*) from jsonb_object_keys(p_answers))<>(select count(*) from public.academy_responses r where r.attempt_id=v_existing.id)
   then raise exception 'Respostas diferentes para o mesmo envio'; end if;
  select c.verification_code into v_code from public.academy_certificates c where c.attempt_id=v_existing.id;
  return query select v_existing.score,v_existing.passed,v_code,v_existing.id;return;
 end if;
 select a.course_id,a.passing_score into v_course,v_passing from public.academy_assessments a
 join public.academy_courses c on c.id=a.course_id where a.id=p_assessment and a.status='published' and c.status='published';
 if v_course is null or not exists(select 1 from public.academy_enrollments e where e.course_id=v_course and e.user_id=v_user) then raise exception 'Avaliação indisponível'; end if;
 -- Snapshot all questions in a single statement. Never return answer keys before submission.
 select jsonb_agg(to_jsonb(q) order by q.position) into v_questions from public.academy_questions q where q.assessment_id=p_assessment;
 v_count:=coalesce(jsonb_array_length(v_questions),0);
 if v_count=0 or (select count(*) from jsonb_object_keys(p_answers))<>v_count then raise exception 'Responda todas as questões'; end if;
 for v_q in select * from jsonb_to_recordset(v_questions) as q(id uuid,prompt text,options jsonb,correct_option int) loop
  v_value:=p_answers->v_q.id::text;
  if jsonb_typeof(v_value) is distinct from 'number' or (v_value::text) !~ '^[0-9]{1,6}$' then raise exception 'Resposta inválida'; end if;
  v_index:=(v_value::text)::int;
  if v_index>=jsonb_array_length(v_q.options) then raise exception 'Alternativa inválida'; end if;
  if v_index=v_q.correct_option then v_right:=v_right+1;end if;
 end loop;
 if p_mode='assessment' and exists(select 1 from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
 where m.course_id=v_course and l.status='published' and not exists(select 1 from public.academy_progress p where p.lesson_id=l.id and p.user_id=v_user))
 then raise exception 'Conclua as aulas publicadas antes da avaliação certificadora ou utilize a prática';end if;
 v_score:=round(v_right*100.0/v_count);
 insert into public.academy_attempts(assessment_id,user_id,score,passed,request_id,mode)
 values(p_assessment,v_user,v_score,v_score>=v_passing,p_request,p_mode) returning id into v_attempt;
 insert into public.academy_responses(attempt_id,user_id,question_id,prompt,options,selected_option,correct_option,is_correct)
 select v_attempt,v_user,q.id,q.prompt,q.options,(p_answers->>q.id::text)::int,q.correct_option,
 (p_answers->>q.id::text)::int=q.correct_option
 from jsonb_to_recordset(v_questions) as q(id uuid,prompt text,options jsonb,correct_option int);
 if p_mode='assessment' and v_score>=v_passing then
  insert into public.academy_certificates(course_id,user_id,attempt_id) values(v_course,v_user,v_attempt)
  on conflict(course_id,user_id) do nothing returning verification_code into v_code;
 end if;
 return query select v_score,v_score>=v_passing,v_code,v_attempt;
end $$;
revoke all on function public.academy_submit_assessment(uuid,jsonb,uuid,text) from public,anon;
grant execute on function public.academy_submit_assessment(uuid,jsonb,uuid,text) to authenticated;
commit;
