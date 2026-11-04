-- Biblioteca IBFC: modelo inicial, sem importar dados do CEC.
create extension if not exists pgcrypto;
create table if not exists public.library_books (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text,
 primary_subject text,
 themes text[] not null default '{}',
 authors text[] not null default '{}',
 language text,
 publisher text,
 edition text,
 publication_year integer,
 page_count integer check (page_count is null or page_count > 0),
 cover_url text,
 format text not null default 'pdf' check (format in ('pdf','epub')),
 storage_path text,
 drive_file_id text unique,
 drive_folder_id text,
 drive_modified_at timestamptz,
 drive_mime_type text,
 download_allowed boolean not null default false,
 audience text not null default 'members' check(audience in ('members','staff')),
 status text not null default 'draft' check(status in ('draft','published','unavailable','archived')),
 metadata_reviewed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists library_books_subject_idx on public.library_books(primary_subject);
create index if not exists library_books_authors_idx on public.library_books using gin(authors);
create index if not exists library_books_themes_idx on public.library_books using gin(themes);
create table if not exists public.library_reading (
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid not null references public.library_books(id) on delete cascade,
 state text not null default 'want' check(state in ('want','reading','paused','completed')),
 current_page integer not null default 1 check(current_page >= 1),
 pages_read integer not null default 0 check(pages_read >= 0),
 favorite boolean not null default false,
 rating smallint check(rating between 1 and 5),
 started_at timestamptz,
 completed_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(user_id,book_id)
);
create table if not exists public.library_notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid not null references public.library_books(id) on delete cascade,
 page_number integer check(page_number is null or page_number >= 1),
 selected_text text,
 body text not null check(length(trim(body))>0),
 created_at timestamptz not null default now()
);
create table if not exists public.library_goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid references public.library_books(id) on delete cascade,
 unit text not null check(unit in ('pages','minutes','books')),
 target integer not null check(target>0),
 period text not null check(period in ('daily','weekly','monthly','custom')),
 due_date date,
 created_at timestamptz not null default now()
);
create table if not exists public.library_sync_runs (
 id uuid primary key default gen_random_uuid(),
 folder_id text not null,
 status text not null default 'pending' check(status in ('pending','running','completed','failed')),
 cursor text,
 found_count integer not null default 0,
 inserted_count integer not null default 0,
 updated_count integer not null default 0,
 error_count integer not null default 0,
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
alter table public.library_books enable row level security;
alter table public.library_reading enable row level security;
alter table public.library_notes enable row level security;
alter table public.library_goals enable row level security;
alter table public.library_sync_runs enable row level security;
-- Apenas perfis existentes no IBFC administram a biblioteca.
create policy "library staff manage books" on public.library_books for all to authenticated
 using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()))
 with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
create policy "library members view published" on public.library_books for select to authenticated
 using(status='published' and (audience='members' or exists(select 1 from public.admin_profiles a where a.id=auth.uid())));
create policy "library own reading" on public.library_reading for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "library own notes" on public.library_notes for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "library own goals" on public.library_goals for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "library staff sync" on public.library_sync_runs for all to authenticated
 using(exists(select 1 from public.admin_profiles a where a.id=auth.uid()))
 with check(exists(select 1 from public.admin_profiles a where a.id=auth.uid()));
-- Arquivos em bucket privado: somente o servidor deve emitir URLs temporárias após verificar a obra.
insert into storage.buckets(id,name,public)
 values('ibfc-library','ibfc-library',false) on conflict(id) do update set public=false;
