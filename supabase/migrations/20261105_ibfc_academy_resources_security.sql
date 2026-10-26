-- Security patch for IBFC Academy resources.
-- Apply manually in Supabase after reviewing existing policies.
begin;
drop policy if exists academy_resources_read on public.academy_resources;
create policy academy_resources_read on public.academy_resources
for select to authenticated
using (
 exists (
  select 1 from public.academy_lessons l
  join public.academy_modules m on m.id=l.module_id
  join public.academy_courses c on c.id=m.course_id
  where l.id=lesson_id and l.status='published' and c.status='published'
 )
);
commit;
