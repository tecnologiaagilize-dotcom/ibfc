-- MFB: estruturas exigidas pelo link de preenchimento e pela Central de Dados Públicos.
-- Executar uma vez no SQL Editor do projeto Supabase do MFB. Pode ser repetido.
-- Sincronizações alimentam uma fila de revisão; esta migração não publica dados.
begin;
create extension if not exists pgcrypto;

-- O fluxo de convites atualiza o estado editorial do candidato.
alter table public.candidates add column if not exists review_status text not null default 'draft';
alter table public.candidates add column if not exists ballot_name text;
alter table public.candidates add column if not exists city_name text;
alter table public.candidates add column if not exists mini_cv text;
alter table public.candidates add column if not exists political_project text;
alter table public.candidates add column if not exists public_experience text;
alter table public.candidates add column if not exists priority_areas text;
alter table public.candidates add column if not exists video_url text;
alter table public.candidates add column if not exists external_page_url text;
alter table public.candidates add column if not exists source_url text;
alter table public.candidates add column if not exists source_notes text;
alter table public.candidates add column if not exists verified_at timestamptz;
alter table public.candidates add column if not exists photo_position_x integer not null default 50;
alter table public.candidates add column if not exists photo_position_y integer not null default 20;
alter table public.candidates add column if not exists photo_zoom numeric not null default 1;

create table if not exists public.candidate_edit_invites (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  submitted_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists candidate_edit_invites_candidate_created_idx on public.candidate_edit_invites(candidate_id, created_at desc);

create table if not exists public.candidate_edit_submissions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.candidate_edit_invites(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text
);
create index if not exists candidate_edit_submissions_candidate_idx on public.candidate_edit_submissions(candidate_id, submitted_at desc);

create table if not exists public.mfb_public_data_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  institution text,
  provider_type text not null default 'official_api',
  base_url text,
  documentation_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_external_identities (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  provider_id uuid not null references public.mfb_public_data_providers(id),
  external_id text not null,
  external_name text,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id, provider_id, external_id)
);
create index if not exists candidate_external_identities_candidate_idx on public.candidate_external_identities(candidate_id);

create table if not exists public.mfb_public_data_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.mfb_public_data_providers(id),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  sync_type text not null default 'candidate',
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_found integer not null default 0,
  records_imported integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_errors integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mfb_public_data_sync_runs_candidate_idx on public.mfb_public_data_sync_runs(candidate_id, provider_id, created_at desc);

create table if not exists public.mfb_public_data_import_queue (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.mfb_public_data_providers(id),
  sync_run_id uuid references public.mfb_public_data_sync_runs(id) on delete set null,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  external_identity_id uuid references public.candidate_external_identities(id) on delete set null,
  record_type text not null,
  external_id text,
  external_url text,
  title text,
  summary text,
  occurred_at timestamptz,
  raw_payload jsonb,
  normalized_payload jsonb,
  review_status text not null default 'pending',
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  imported_table text,
  imported_record_id uuid,
  source_change_pending boolean not null default false,
  latest_source_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mfb_public_data_queue_candidate_idx on public.mfb_public_data_import_queue(candidate_id, created_at desc);
create unique index if not exists mfb_public_data_queue_external_unique on public.mfb_public_data_import_queue(provider_id,candidate_id,record_type,external_id) where external_id is not null;

create table if not exists public.mfb_public_data_record_versions (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.mfb_public_data_import_queue(id) on delete cascade,
  provider_id uuid not null references public.mfb_public_data_providers(id),
  sync_run_id uuid references public.mfb_public_data_sync_runs(id) on delete set null,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  record_type text not null,
  external_id text,
  external_url text,
  title text,
  summary text,
  occurred_at timestamptz,
  raw_payload jsonb,
  normalized_payload jsonb,
  content_hash text not null,
  change_type text not null default 'snapshot',
  review_status text not null default 'recorded',
  compared_to_version_id uuid references public.mfb_public_data_record_versions(id),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(queue_item_id, content_hash)
);
create index if not exists mfb_public_data_versions_item_idx on public.mfb_public_data_record_versions(queue_item_id, created_at desc);

create table if not exists public.mfb_public_data_import_events (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.mfb_public_data_import_queue(id) on delete cascade,
  event_type text not null,
  previous_status text,
  new_status text,
  performed_by uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mfb_public_data_events_item_idx on public.mfb_public_data_import_events(queue_item_id, created_at desc);

-- Tabelas documentais usadas pela completude e pela etapa posterior de incorporação.
create table if not exists public.candidate_sources (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  source_type text not null,
  title text, url text, value text, source_name text, source_domain text,
  evidence_url text, discovery_method text not null default 'manual',
  source_level text not null default 'web', notes text,
  validation_status text not null default 'pending',
  is_public boolean not null default false, is_primary boolean not null default false,
  rejection_reason text, created_by uuid references auth.users(id) on delete set null,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists candidate_sources_candidate_idx on public.candidate_sources(candidate_id, created_at desc);

create table if not exists public.candidate_public_positions (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade,
  position_type text not null default 'public_office', title text not null, institution text,
  country_code text default 'BR', state_uf text, city_name text,
  start_date date, end_date date, is_current boolean not null default false,
  description text, source_url text, source_name text, source_type text default 'official',
  verification_status text not null default 'pending', verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.candidate_public_propositions (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade,
  proposition_type text, proposition_number text, title text not null, description text,
  institution text, role text, subject_areas text[] not null default '{}'::text[],
  presented_at date, status text, official_url text, external_id text,
  source_name text, source_type text default 'official', verification_status text not null default 'pending',
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.candidate_public_votes (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade,
  institution text, proposition_reference text, title text not null, description text,
  vote_date date, vote_value text, session_reference text, official_url text, external_id text,
  source_name text, source_type text default 'official', verification_status text not null default 'pending',
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.candidate_public_committees (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade,
  institution text, committee_name text not null, role text, start_date date, end_date date,
  is_current boolean not null default false, description text, official_url text,
  source_name text, source_type text default 'official', verification_status text not null default 'pending',
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.candidate_public_deliveries (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade,
  title text not null, description text, institution text, category text,
  country_code text default 'BR', state_uf text, city_name text, occurred_at date,
  official_url text, source_name text, source_type text default 'official',
  verification_status text not null default 'pending', verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- O painel administrativo usa a sessão autenticada e precisa ler seu próprio papel.
alter table public.admin_profiles enable row level security;
drop policy if exists "mfb staff read own profile" on public.admin_profiles;
create policy "mfb staff read own profile" on public.admin_profiles for select to authenticated using (id = (select auth.uid()));
grant select on public.admin_profiles to authenticated;

-- Convites: apenas a equipe administra os tokens. A página pública usa service role no servidor.
alter table public.candidate_edit_invites enable row level security;
alter table public.candidate_edit_submissions enable row level security;
grant select, insert, update, delete on public.candidate_edit_invites, public.candidate_edit_submissions to authenticated;
drop policy if exists "mfb staff manage invites" on public.candidate_edit_invites;
create policy "mfb staff manage invites" on public.candidate_edit_invites for all to authenticated
  using (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())));
drop policy if exists "mfb staff manage submissions" on public.candidate_edit_submissions;
create policy "mfb staff manage submissions" on public.candidate_edit_submissions for all to authenticated
  using (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())));

-- Dados externos ficam acessíveis somente à equipe; não há publicação automática.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'mfb_public_data_providers', 'candidate_external_identities',
    'mfb_public_data_sync_runs', 'mfb_public_data_import_queue',
    'mfb_public_data_record_versions', 'mfb_public_data_import_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'mfb staff manage ' || table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid()))) with check (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())))', 'mfb staff manage ' || table_name, table_name);
  end loop;
end $$;

-- A atuação só aparece publicamente quando verificada e o candidato estiver publicado.
alter table public.candidate_sources enable row level security;
grant select on public.candidate_sources to anon;
grant select, insert, update, delete on public.candidate_sources to authenticated;
drop policy if exists "mfb staff manage candidate_sources" on public.candidate_sources;
create policy "mfb staff manage candidate_sources" on public.candidate_sources for all to authenticated
  using (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())));
drop policy if exists "mfb public read candidate_sources" on public.candidate_sources;
create policy "mfb public read candidate_sources" on public.candidate_sources for select to anon, authenticated
  using (validation_status = 'approved' and is_public and exists (select 1 from public.candidates c where c.id = candidate_id and c.status = 'published'));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'candidate_public_positions', 'candidate_public_propositions', 'candidate_public_votes',
    'candidate_public_committees', 'candidate_public_deliveries'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select on public.%I to anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'mfb staff manage ' || table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid()))) with check (exists (select 1 from public.admin_profiles p where p.id = (select auth.uid())))', 'mfb staff manage ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'mfb public read ' || table_name, table_name);
    execute format('create policy %I on public.%I for select to anon, authenticated using (verification_status = ''verified'' and exists (select 1 from public.candidates c where c.id = candidate_id and c.status = ''published''))', 'mfb public read ' || table_name, table_name);
  end loop;
end $$;

insert into public.mfb_public_data_providers(code,name,institution,provider_type,base_url,documentation_url,active)
values
 ('camara_dados_abertos','Câmara dos Deputados','Câmara dos Deputados','official_api','https://dadosabertos.camara.leg.br/api/v2','https://dadosabertos.camara.leg.br/swagger/api.html',true),
 ('senado','Senado Federal','Senado Federal','official_api','https://legis.senado.leg.br/dadosabertos','https://legis.senado.leg.br/dadosabertos/',true),
 ('tse','Tribunal Superior Eleitoral — TSE','Tribunal Superior Eleitoral','official_dataset','https://dadosabertos.tse.jus.br/dataset/candidatos-2026','https://dadosabertos.tse.jus.br/',true)
on conflict (code) do update set active = excluded.active, updated_at = now();

-- Atualiza o cache de esquema do PostgREST após criar as tabelas.
notify pgrst, 'reload schema';
commit;
