-- MFB — banco inicial
create extension if not exists "pgcrypto";

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  state_uf char(2) not null,
  cargo text not null,
  party text,
  number text,
  photo_url text,
  biography text,
  proposals text,
  endorsement_reason text,
  endorsement_issued_at date default ((now() at time zone 'America/Sao_Paulo')::date),
  instagram_url text,
  facebook_url text,
  youtube_url text,
  website_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

alter table public.candidates enable row level security;
alter table public.admin_profiles enable row level security;

-- Público: somente candidatos publicados.
create policy "public can read published candidates"
on public.candidates for select
to anon, authenticated
using (status = 'published');

-- Administradores/editor: CRUD.
create policy "staff can manage candidates"
on public.candidates for all
to authenticated
using (exists (
  select 1 from public.admin_profiles p
  where p.id = auth.uid()
))
with check (exists (
  select 1 from public.admin_profiles p
  where p.id = auth.uid()
));

create or replace view public.candidates_public as
select
  c.*,
  case c.state_uf
    when 'AC' then 'Acre' when 'AL' then 'Alagoas' when 'AP' then 'Amapá'
    when 'AM' then 'Amazonas' when 'BA' then 'Bahia' when 'CE' then 'Ceará'
    when 'DF' then 'Distrito Federal' when 'ES' then 'Espírito Santo'
    when 'GO' then 'Goiás' when 'MA' then 'Maranhão' when 'MT' then 'Mato Grosso'
    when 'MS' then 'Mato Grosso do Sul' when 'MG' then 'Minas Gerais'
    when 'PA' then 'Pará' when 'PB' then 'Paraíba' when 'PR' then 'Paraná'
    when 'PE' then 'Pernambuco' when 'PI' then 'Piauí' when 'RJ' then 'Rio de Janeiro'
    when 'RN' then 'Rio Grande do Norte' when 'RS' then 'Rio Grande do Sul'
    when 'RO' then 'Rondônia' when 'RR' then 'Roraima' when 'SC' then 'Santa Catarina'
    when 'SP' then 'São Paulo' when 'SE' then 'Sergipe' when 'TO' then 'Tocantins'
    else c.state_uf
  end as state_name
from public.candidates c;

grant select on public.candidates_public to anon, authenticated;

-- Depois de criar um usuário no Supabase Auth, promova-o com:
-- insert into public.admin_profiles (id, role)
-- values ('UUID_DO_USUARIO_AUTH', 'admin');

-- MFB V4 — comunidade / membros
create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  whatsapp text,
  state_uf char(2),
  city text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  description text, cover_url text, status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  member_id uuid not null references public.member_profiles(id) on delete cascade, progress integer not null default 0 check(progress between 0 and 100),
  enrolled_at timestamptz not null default now(), completed_at timestamptz, unique(course_id,member_id)
);

alter table public.member_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
create policy "members read own profile" on public.member_profiles for select to authenticated using(id=auth.uid());
create policy "members update own profile" on public.member_profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "staff manage member profiles" on public.member_profiles for all to authenticated using(exists(select 1 from public.admin_profiles p where p.id=auth.uid())) with check(exists(select 1 from public.admin_profiles p where p.id=auth.uid()));
create policy "authenticated read published courses" on public.courses for select to authenticated using(status='published' or exists(select 1 from public.admin_profiles p where p.id=auth.uid()));
create policy "staff manage courses" on public.courses for all to authenticated using(exists(select 1 from public.admin_profiles p where p.id=auth.uid())) with check(exists(select 1 from public.admin_profiles p where p.id=auth.uid()));
create policy "members read own enrollments" on public.course_enrollments for select to authenticated using(member_id=auth.uid());
create policy "staff manage enrollments" on public.course_enrollments for all to authenticated using(exists(select 1 from public.admin_profiles p where p.id=auth.uid())) with check(exists(select 1 from public.admin_profiles p where p.id=auth.uid()));

create or replace function public.handle_new_member() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.member_profiles(id,full_name,whatsapp,state_uf,city)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.raw_user_meta_data->>'whatsapp',upper(nullif(new.raw_user_meta_data->>'state_uf','')),new.raw_user_meta_data->>'city')
 on conflict(id) do nothing; return new;
end; $$;
drop trigger if exists on_auth_user_created_mfb on auth.users;
create trigger on_auth_user_created_mfb after insert on auth.users for each row execute procedure public.handle_new_member();

-- MFB Academy — módulos, aulas, materiais e progresso por aula
create table if not exists public.course_modules (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 title text not null, description text, position integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.course_lessons (
 id uuid primary key default gen_random_uuid(), module_id uuid not null references public.course_modules(id) on delete cascade,
 title text not null, description text, position integer not null default 1, content_type text not null default 'video' check(content_type in ('video','text','pdf','link')),
 video_url text, body text, material_url text, duration_minutes integer, is_preview boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.lesson_progress (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.course_lessons(id) on delete cascade,
 member_id uuid not null references public.member_profiles(id) on delete cascade, completed_at timestamptz not null default now(), unique(lesson_id,member_id)
);
alter table public.course_modules enable row level security; alter table public.course_lessons enable row level security; alter table public.lesson_progress enable row level security;
create policy "members read published course modules" on public.course_modules for select to authenticated using(exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()))));
create policy "members read published course lessons" on public.course_lessons for select to authenticated using(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()))));
create policy "staff manage course modules" on public.course_modules for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage course lessons" on public.course_lessons for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read own lesson progress" on public.lesson_progress for select to authenticated using(member_id=auth.uid());
create policy "members insert own lesson progress" on public.lesson_progress for insert to authenticated with check(member_id=auth.uid());
create policy "members delete own lesson progress" on public.lesson_progress for delete to authenticated using(member_id=auth.uid());
create policy "staff read lesson progress" on public.lesson_progress for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));

-- MFB Academy V4.1 — matrícula do próprio membro e cálculo automático de progresso
create policy "members enroll themselves" on public.course_enrollments for insert to authenticated
with check(member_id=auth.uid() and exists(select 1 from public.courses c where c.id=course_id and c.status='published'));
create policy "members update own enrollment" on public.course_enrollments for update to authenticated
using(member_id=auth.uid()) with check(member_id=auth.uid());

create or replace function public.recalculate_course_progress() returns trigger language plpgsql security definer set search_path=public as $$
declare v_member uuid; v_course uuid; v_total integer; v_done integer; v_progress integer;
begin
 v_member=coalesce(new.member_id,old.member_id);
 select m.course_id into v_course from public.course_lessons l join public.course_modules m on m.id=l.module_id where l.id=coalesce(new.lesson_id,old.lesson_id);
 select count(l.id) into v_total from public.course_lessons l join public.course_modules m on m.id=l.module_id where m.course_id=v_course;
 select count(lp.id) into v_done from public.lesson_progress lp join public.course_lessons l on l.id=lp.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=v_course and lp.member_id=v_member;
 v_progress=case when v_total=0 then 0 else round((v_done::numeric/v_total::numeric)*100) end;
 update public.course_enrollments set progress=v_progress, completed_at=case when v_progress=100 then coalesce(completed_at,now()) else null end where course_id=v_course and member_id=v_member;
 return coalesce(new,old);
end; $$;
drop trigger if exists lesson_progress_recalculate on public.lesson_progress;
create trigger lesson_progress_recalculate after insert or delete on public.lesson_progress for each row execute procedure public.recalculate_course_progress();


-- MFB Academy V4.2 — avaliações, tentativas e certificados
create table if not exists public.course_assessments (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 title text not null default 'Avaliação final', instructions text, passing_score integer not null default 70 check(passing_score between 0 and 100),
 max_attempts integer not null default 3 check(max_attempts > 0), is_published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.assessment_questions (
 id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.course_assessments(id) on delete cascade,
 prompt text not null, position integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.assessment_options (
 id uuid primary key default gen_random_uuid(), question_id uuid not null references public.assessment_questions(id) on delete cascade,
 label text not null, is_correct boolean not null default false, position integer not null default 1
);
create table if not exists public.assessment_attempts (
 id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.course_assessments(id) on delete cascade,
 member_id uuid not null references public.member_profiles(id) on delete cascade, score integer not null check(score between 0 and 100),
 passed boolean not null default false, answers jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.certificates (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 member_id uuid not null references public.member_profiles(id) on delete cascade, verification_code text not null unique default upper(encode(gen_random_bytes(6),'hex')),
 issued_at timestamptz not null default now(), unique(course_id,member_id)
);
alter table public.course_assessments enable row level security; alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security; alter table public.assessment_attempts enable row level security; alter table public.certificates enable row level security;
create policy "members read published assessments" on public.course_assessments for select to authenticated using(is_published or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read assessment questions" on public.assessment_questions for select to authenticated using(exists(select 1 from public.course_assessments a where a.id=assessment_id and (a.is_published or exists(select 1 from public.admin_profiles p where p.id=auth.uid()))));
-- Opções corretas não são expostas diretamente ao membro; a correção ocorre em função SECURITY DEFINER.
create policy "staff read assessment options" on public.assessment_options for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage assessments" on public.course_assessments for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage questions" on public.assessment_questions for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage options" on public.assessment_options for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read own attempts" on public.assessment_attempts for select to authenticated using(member_id=auth.uid());
create policy "staff read attempts" on public.assessment_attempts for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read own certificates" on public.certificates for select to authenticated using(member_id=auth.uid());
create policy "staff read certificates" on public.certificates for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));

create or replace function public.get_assessment_for_member(p_assessment uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 return (select jsonb_build_object('id',a.id,'title',a.title,'instructions',a.instructions,'passing_score',a.passing_score,'max_attempts',a.max_attempts,
  'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'position',q.position,'options',
    coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'position',o.position) order by o.position) from public.assessment_options o where o.question_id=q.id),'[]'::jsonb)) order by q.position)
   from public.assessment_questions q where q.assessment_id=a.id),'[]'::jsonb)) from public.course_assessments a where a.id=p_assessment and a.is_published);
end; $$;
grant execute on function public.get_assessment_for_member(uuid) to authenticated;

create or replace function public.submit_assessment(p_assessment uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_total int; v_correct int; v_score int; v_pass int; v_max int; v_count int; v_course uuid; v_progress int; v_passed bool; v_attempt uuid; v_cert text;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select passing_score,max_attempts,course_id into v_pass,v_max,v_course from public.course_assessments where id=p_assessment and is_published=true;
 if v_course is null then raise exception 'assessment unavailable'; end if;
 select count(*) into v_count from public.assessment_attempts where assessment_id=p_assessment and member_id=auth.uid(); if v_count>=v_max then raise exception 'maximum attempts reached'; end if;
 select count(*) into v_total from public.assessment_questions where assessment_id=p_assessment;
 select count(*) into v_correct from public.assessment_questions q join public.assessment_options o on o.question_id=q.id and o.is_correct=true where q.assessment_id=p_assessment and (p_answers->>q.id::text)=o.id::text;
 v_score=case when v_total=0 then 0 else round((v_correct::numeric/v_total::numeric)*100) end; v_passed=v_score>=v_pass;
 insert into public.assessment_attempts(assessment_id,member_id,score,passed,answers) values(p_assessment,auth.uid(),v_score,v_passed,p_answers) returning id into v_attempt;
 select progress into v_progress from public.course_enrollments where course_id=v_course and member_id=auth.uid();
 if v_passed and coalesce(v_progress,0)=100 then insert into public.certificates(course_id,member_id) values(v_course,auth.uid()) on conflict(course_id,member_id) do nothing; end if;
 select verification_code into v_cert from public.certificates where course_id=v_course and member_id=auth.uid();
 return jsonb_build_object('attempt_id',v_attempt,'score',v_score,'passed',v_passed,'certificate_code',v_cert);
end; $$;
grant execute on function public.submit_assessment(uuid,jsonb) to authenticated;

-- MFB V4.3 — Gestão Nacional de Membros
alter table public.member_profiles add column if not exists neighborhood text;
alter table public.member_profiles add column if not exists local_nucleus text;
alter table public.member_profiles add column if not exists membership_status text not null default 'active' check (membership_status in ('active','inactive','blocked'));
alter table public.member_profiles add column if not exists last_seen_at timestamptz;
create index if not exists member_profiles_state_city_idx on public.member_profiles(state_uf, city);
create index if not exists member_profiles_created_at_idx on public.member_profiles(created_at desc);

-- A equipe administrativa já possui política de leitura/gestão dos perfis.
-- Os campos territoriais são declaratórios e não representam preferência política.

-- MFB V4.5 — Eventos, agenda, inscrições e presença
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(), title text not null, description text,
 event_type text not null default 'in_person' check(event_type in ('in_person','online','hybrid')),
 start_at timestamptz not null, end_at timestamptz, venue_name text, address text, city text, state_uf text,
 online_url text, capacity integer check(capacity is null or capacity > 0),
 status text not null default 'draft' check(status in ('draft','published','cancelled','completed')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.event_registrations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 member_id uuid not null references public.member_profiles(id) on delete cascade,
 status text not null default 'registered' check(status in ('registered','cancelled','attended','no_show')),
 registered_at timestamptz not null default now(), checked_in_at timestamptz, unique(event_id,member_id)
);
create index if not exists events_start_at_idx on public.events(start_at);
create index if not exists event_registrations_event_idx on public.event_registrations(event_id);
alter table public.events enable row level security; alter table public.event_registrations enable row level security;
create policy "members read published events" on public.events for select to authenticated using(status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage events" on public.events for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read own event registrations" on public.event_registrations for select to authenticated using(member_id=auth.uid() or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members register for events" on public.event_registrations for insert to authenticated with check(member_id=auth.uid() and exists(select 1 from public.events e where e.id=event_id and e.status='published'));
create policy "members update own event registrations" on public.event_registrations for update to authenticated using(member_id=auth.uid()) with check(member_id=auth.uid());
create policy "staff manage event registrations" on public.event_registrations for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));

-- MFB V4.6 — QR Code, check-in e histórico de participação
alter table public.event_registrations add column if not exists checkin_token uuid not null default gen_random_uuid();
alter table public.event_registrations add column if not exists checkin_method text check (checkin_method in ('qr','manual'));
alter table public.event_registrations add column if not exists checked_in_by uuid references auth.users(id);
create unique index if not exists event_registrations_checkin_token_idx on public.event_registrations(checkin_token);
create index if not exists event_registrations_member_status_idx on public.event_registrations(member_id,status);

create or replace function public.admin_checkin_event(p_token uuid)
returns table(registration_id uuid,event_id uuid,member_id uuid,status text,checked_in_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.admin_profiles where id=auth.uid()) then raise exception 'Acesso negado'; end if;
  return query update public.event_registrations r
    set status='attended', checked_in_at=coalesce(r.checked_in_at,now()), checkin_method=coalesce(r.checkin_method,'qr'), checked_in_by=coalesce(r.checked_in_by,auth.uid())
    where r.checkin_token=p_token and r.status<>'cancelled'
    returning r.id,r.event_id,r.member_id,r.status,r.checked_in_at;
end; $$;
grant execute on function public.admin_checkin_event(uuid) to authenticated;

-- MFB V4.7 — Pesquisas e enquetes voluntárias
create table if not exists public.polls (
 id uuid primary key default gen_random_uuid(), title text not null, description text,
 scope text not null default 'national' check(scope in ('national','state','city')), state_uf text, city text,
 status text not null default 'draft' check(status in ('draft','published','closed')), created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.poll_questions (id uuid primary key default gen_random_uuid(),poll_id uuid not null references public.polls(id) on delete cascade,prompt text not null,question_type text not null default 'single_choice',position integer not null default 1);
create table if not exists public.poll_options (id uuid primary key default gen_random_uuid(),question_id uuid not null references public.poll_questions(id) on delete cascade,label text not null,position integer not null default 1);
create table if not exists public.poll_responses (id uuid primary key default gen_random_uuid(),poll_id uuid not null references public.polls(id) on delete cascade,member_id uuid not null references public.member_profiles(id) on delete cascade,answers jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),unique(poll_id,member_id));
alter table public.polls enable row level security;alter table public.poll_questions enable row level security;alter table public.poll_options enable row level security;alter table public.poll_responses enable row level security;
create policy "members read eligible published polls" on public.polls for select to authenticated using(status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read poll questions" on public.poll_questions for select to authenticated using(exists(select 1 from public.polls p where p.id=poll_id and (p.status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()))));
create policy "members read poll options" on public.poll_options for select to authenticated using(exists(select 1 from public.poll_questions q join public.polls p on p.id=q.poll_id where q.id=question_id and (p.status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()))));
create policy "staff manage polls" on public.polls for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage poll questions" on public.poll_questions for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage poll options" on public.poll_options for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members read own poll responses" on public.poll_responses for select to authenticated using(member_id=auth.uid() or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create or replace function public.submit_poll_response(p_poll uuid,p_answers jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare v_id uuid;v_scope text;v_uf text;v_city text;v_member_uf text;v_member_city text; begin if auth.uid() is null then raise exception 'not authenticated';end if;select scope,state_uf,city into v_scope,v_uf,v_city from public.polls where id=p_poll and status='published';if v_scope is null then raise exception 'poll unavailable';end if;select state_uf,city into v_member_uf,v_member_city from public.member_profiles where id=auth.uid();if v_scope='state' and coalesce(v_member_uf,'')<>coalesce(v_uf,'') then raise exception 'poll unavailable for member region';end if;if v_scope='city' and coalesce(v_member_city,'')<>coalesce(v_city,'') then raise exception 'poll unavailable for member region';end if;insert into public.poll_responses(poll_id,member_id,answers) values(p_poll,auth.uid(),p_answers) returning id into v_id;return v_id;end;$$;grant execute on function public.submit_poll_response(uuid,jsonb) to authenticated;

-- MFB V4.8 — Conteúdo e Comunicação
create table if not exists public.content_items (
 id uuid primary key default gen_random_uuid(), title text not null, summary text, body text,
 content_type text not null default 'announcement' check(content_type in ('announcement','article','material','news')),
 scope text not null default 'national' check(scope in ('national','state','city')), state_uf text, city text,
 attachment_url text, status text not null default 'draft' check(status in ('draft','published','archived')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 published_at timestamptz generated always as (case when status='published' then created_at else null end) stored
);
create index if not exists content_items_status_created_idx on public.content_items(status,created_at desc);
alter table public.content_items enable row level security;
create policy "members read published content" on public.content_items for select to authenticated using(status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage content" on public.content_items for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));

-- MFB V4.9 — Notificações e Central de Avisos
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), title text not null, message text not null,
 category text not null default 'general' check(category in ('general','course','event','content','system')),
 scope text not null default 'national' check(scope in ('national','state','city')), state_uf text, city text,
 action_url text, status text not null default 'draft' check(status in ('draft','published','archived')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 published_at timestamptz generated always as (case when status='published' then created_at else null end) stored
);
create table if not exists public.notification_reads (
 notification_id uuid not null references public.notifications(id) on delete cascade,
 member_id uuid not null references public.member_profiles(id) on delete cascade,
 read_at timestamptz not null default now(), primary key(notification_id,member_id)
);
create table if not exists public.member_notification_preferences (
 member_id uuid primary key references public.member_profiles(id) on delete cascade,
 in_app boolean not null default true, email_enabled boolean not null default true, whatsapp_enabled boolean not null default false,
 courses boolean not null default true, events boolean not null default true, content boolean not null default true, general boolean not null default true,
 updated_at timestamptz not null default now()
);
create index if not exists notifications_status_created_idx on public.notifications(status,created_at desc);
alter table public.notifications enable row level security;alter table public.notification_reads enable row level security;alter table public.member_notification_preferences enable row level security;
create policy "members read published notifications" on public.notifications for select to authenticated using(status='published' or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "staff manage notifications" on public.notifications for all to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members manage own notification reads" on public.notification_reads for all to authenticated using(member_id=auth.uid() or exists(select 1 from public.admin_profiles a where a.id=auth.uid())) with check(member_id=auth.uid() or exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "members manage own notification preferences" on public.member_notification_preferences for all to authenticated using(member_id=auth.uid()) with check(member_id=auth.uid());
create policy "staff read notification preferences" on public.member_notification_preferences for select to authenticated using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));

-- MFB V5 — consolidação: auditoria administrativa
create table if not exists public.audit_logs (
 id bigint generated by default as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type,entity_id);
alter table public.audit_logs enable row level security;
create policy "staff read audit logs" on public.audit_logs for select to authenticated
using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
-- Inserções devem ocorrer por funções/rotinas administrativas SECURITY DEFINER; não há INSERT direto pelo cliente.

-- MFB V5.1 — dados institucionais da empresa desenvolvedora
create table if not exists public.platform_settings (
  setting_key text primary key,
  company_name text not null default '',
  cnpj text not null default '',
  website_url text not null default '',
  email text,
  phone text,
  whatsapp text,
  address text,
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  youtube_url text,
  x_url text,
  tiktok_url text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
create policy "public read platform settings" on public.platform_settings for select to anon, authenticated using(true);
create policy "staff manage platform settings" on public.platform_settings for all to authenticated
using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()))
with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
insert into public.platform_settings(setting_key,company_name,cnpj,website_url)
values('development','Agilize Tecnologia','01.596.311/0001-28','https://site-agilize-tecnologia.vercel.app/')
on conflict(setting_key) do nothing;
create table if not exists public.candidate_profile_templates (
  template_key text primary key check (template_key = 'global'),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.candidate_profile_templates enable row level security;
grant select on public.candidate_profile_templates to anon, authenticated;
grant insert, update on public.candidate_profile_templates to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='candidate_profile_templates' and policyname='public read global candidate template') then
    create policy "public read global candidate template" on public.candidate_profile_templates for select to anon,authenticated using (template_key='global');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='candidate_profile_templates' and policyname='admins edit global candidate template') then
    create policy "admins edit global candidate template" on public.candidate_profile_templates for all to authenticated
      using (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role='admin'))
      with check (exists(select 1 from public.admin_profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
end $$;
