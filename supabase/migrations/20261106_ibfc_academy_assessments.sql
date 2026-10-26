-- IBFC Academy: avaliações e certificação (aplicar no Supabase antes das telas).
begin;
create table if not exists public.academy_assessments(
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.academy_courses(id) on delete cascade,
 title text not null,
 passing_score integer not null default 70 check(passing_score between 0 and 100),
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now()
);
create table if not exists public.academy_questions(
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
 position integer not null default 1,
 prompt text not null,
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)>=2),
 correct_option integer not null check(correct_option>=0),
 unique(assessment_id,position)
);
create table if not exists public.academy_attempts(
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 score integer not null check(score between 0 and 100),
 passed boolean not null,
 created_at timestamptz not null default now()
);
create table if not exists public.academy_certificates(
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.academy_courses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null unique references public.academy_attempts(id),
 verification_code uuid not null default gen_random_uuid() unique,
 issued_at timestamptz not null default now(),
 unique(course_id,user_id)
);
alter table public.academy_assessments enable row level security;
alter table public.academy_questions enable row level security;
alter table public.academy_attempts enable row level security;
alter table public.academy_certificates enable row level security;
drop policy if exists academy_assessments_read on public.academy_assessments;
create policy academy_assessments_read on public.academy_assessments for select to authenticated using (
 status='published' and exists(select 1 from public.academy_courses c where c.id=course_id and c.status='published')
);
drop policy if exists academy_questions_read on public.academy_questions;
-- Correct answers must not be exposed through client-side SELECT policies.
-- All grading and question retrieval happens in trusted RPC, not PostgREST.
drop policy if exists academy_attempts_read on public.academy_attempts;
create policy academy_attempts_read on public.academy_attempts for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists academy_certificates_read on public.academy_certificates;
create policy academy_certificates_read on public.academy_certificates for select to authenticated using(user_id=(select auth.uid()));
-- Functions run with definer privileges, do not leak correct_option to the client.
create or replace function public.academy_get_questions(p_assessment uuid)
returns table(id uuid, "position" integer, prompt text, options jsonb)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Não autenticado'; end if;
 if not exists (
  select 1 from public.academy_assessments a join public.academy_courses c on c.id=a.course_id
  join public.academy_enrollments e on e.course_id=c.id
  where a.id=p_assessment and a.status='published' and c.status='published' and e.user_id=auth.uid()
 ) then raise exception 'Avaliação indisponível'; end if;
 return query select q.id,q.position,q.prompt,q.options from public.academy_questions q where q.assessment_id=p_assessment order by q.position;
end $$;
create or replace function public.academy_submit_assessment(p_assessment uuid,p_answers jsonb)
returns table(score integer,passed boolean,certificate_code uuid)
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_course uuid;v_passing integer;v_count int;v_right int;v_score int;v_attempt uuid;v_code uuid;
begin
 if v_user is null or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'Dados inválidos';end if;
 select a.course_id,a.passing_score into v_course,v_passing from public.academy_assessments a
 join public.academy_courses c on c.id=a.course_id
 where a.id=p_assessment and a.status='published' and c.status='published';
 if v_course is null or not exists(select 1 from public.academy_enrollments e where e.course_id=v_course and e.user_id=v_user) then raise exception 'Avaliação indisponível';end if;
 if exists(select 1 from public.academy_certificates ce where ce.course_id=v_course and ce.user_id=v_user) then raise exception 'Certificação já emitida'; end if;
 select count(*),count(*) filter(where (p_answers ->> q.id::text) ~ '^[0-9]+$' and
 (p_answers ->> q.id::text)::int=q.correct_option)
 into v_count,v_right from public.academy_questions q where q.assessment_id=p_assessment;
 if v_count=0 or (select count(*) from jsonb_object_keys(p_answers))<>v_count then raise exception 'Responda todas as questões';end if;
 v_score:=round(v_right*100.0/v_count);
 insert into public.academy_attempts(assessment_id,user_id,score,passed)
 values(p_assessment,v_user,v_score,v_score>=v_passing) returning id into v_attempt;
 if v_score>=v_passing then
  insert into public.academy_certificates(course_id,user_id,attempt_id) values(v_course,v_user,v_attempt)
  on conflict(course_id,user_id) do nothing returning verification_code into v_code;
 end if;
 return query select v_score,v_score>=v_passing,v_code;
end $$;
revoke all on function public.academy_get_questions(uuid) from public,anon;
revoke all on function public.academy_submit_assessment(uuid,jsonb) from public,anon;
grant execute on function public.academy_get_questions(uuid) to authenticated;
grant execute on function public.academy_submit_assessment(uuid,jsonb) to authenticated;
commit;
