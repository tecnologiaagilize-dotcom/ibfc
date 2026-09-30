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

create policy "public read platform settings"
on public.platform_settings for select
to anon, authenticated
using (true);

create policy "staff manage platform settings"
on public.platform_settings for all
to authenticated
using (exists(select 1 from public.admin_profiles a where a.id=auth.uid()))
with check (exists(select 1 from public.admin_profiles a where a.id=auth.uid()));

insert into public.platform_settings(setting_key,company_name,cnpj,website_url)
values(
  'development',
  'Agilize Tecnologia',
  '01.596.311/0001-28',
  'https://site-agilize-tecnologia.vercel.app/'
)
on conflict(setting_key) do nothing;
