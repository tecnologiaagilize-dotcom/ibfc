-- IBFC Academy — fundação acadêmica (não aplicar automaticamente).
-- Execução controlada no Supabase após backup, revisão e testes de RLS.
create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  estimated_hours integer not null default 0 check (estimated_hours >= 0),
  curriculum_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  title text not null,
  position integer not null check (position >= 0),
  unique(course_id,position)
);
create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  content_md text,
  video_provider text check (video_provider in ('youtube','vimeo','external') or video_provider is null),
  video_id text,
  video_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  unique(module_id,position)
);
create table if not exists public.academy_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  title text not null,
  resource_url text not null,
  resource_type text not null check (resource_type in ('reading','video','exercise','repository','document')),
  attribution text,
  license_notes text,
  checked_at timestamptz
);
create table if not exists public.academy_enrollments (
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (course_id,user_id)
);
create table if not exists public.academy_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id,lesson_id)
);
create index if not exists academy_modules_course_idx on public.academy_modules(course_id,position);
create index if not exists academy_lessons_module_idx on public.academy_lessons(module_id,position);
create index if not exists academy_progress_user_idx on public.academy_progress(user_id);
alter table public.academy_courses enable row level security;
alter table public.academy_modules enable row level security;
alter table public.academy_lessons enable row level security;
alter table public.academy_resources enable row level security;
alter table public.academy_enrollments enable row level security;
alter table public.academy_progress enable row level security;
create policy academy_courses_read on public.academy_courses for select to authenticated using (status='published');
create policy academy_modules_read on public.academy_modules for select to authenticated using (exists(select 1 from public.academy_courses c where c.id=course_id and c.status='published'));
create policy academy_lessons_read on public.academy_lessons for select to authenticated using (
 status='published' and exists(
 select 1 from public.academy_modules m join public.academy_courses c on c.id=m.course_id
 where m.id=module_id and c.status='published'
 ));
create policy academy_resources_read on public.academy_resources for select to authenticated using (exists(select 1 from public.academy_lessons l where l.id=lesson_id));
create policy academy_enrollments_read on public.academy_enrollments for select to authenticated using (user_id=(select auth.uid()));
create policy academy_enrollments_insert on public.academy_enrollments for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.academy_courses c where c.id=course_id and c.status='published')
);
create policy academy_progress_read on public.academy_progress for select to authenticated using (user_id=(select auth.uid()));
create policy academy_progress_insert on public.academy_progress for insert to authenticated with check (
 user_id=(select auth.uid()) and exists (
 select 1 from public.academy_lessons l
 join public.academy_modules m on m.id=l.module_id
 join public.academy_enrollments e on e.course_id=m.course_id
 where l.id=lesson_id and l.status='published' and e.user_id=(select auth.uid())
 ));
-- Escrita de conteúdo: deliberadamente restrita à administração via serviço server-side,
-- com autorização explícita. Não conceder políticas de escrita de currículo ao cliente.
