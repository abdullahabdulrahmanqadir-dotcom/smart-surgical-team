-- Smart Surgical Team operational workspace.
-- Run after 0001_initial_platform.sql and 0002_case_summary.sql.

alter type public.content_kind add value if not exists 'case_article';

create type public.content_access as enum ('public', 'members_only');
create type public.media_kind as enum ('image', 'document');

alter table public.content_items
  add column if not exists access_level public.content_access not null default 'public',
  add column if not exists body_html text,
  add column if not exists reading_minutes integer check (reading_minutes is null or reading_minutes > 0),
  add column if not exists level text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create table if not exists public.content_media (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  kind public.media_kind not null default 'image',
  storage_path text not null,
  public_url text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  event_type text not null default 'Event',
  topic text,
  format text not null default 'in-person',
  status public.content_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  image_url text,
  official_url text,
  registration_url text,
  programme_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contributors
  add column if not exists role_title text,
  add column if not exists group_name text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists content_media_content_idx on public.content_media (content_id, sort_order);
create index if not exists events_starts_at_idx on public.events (starts_at desc);

alter table public.content_media enable row level security;
alter table public.events enable row level security;

create policy "public content media is readable" on public.content_media
  for select using (exists (
    select 1 from public.content_items
    where id = content_id and status = 'published' and access_level = 'public'
  ));
create policy "published events are readable" on public.events
  for select using (status = 'published');

-- A private bucket for staff uploads. The application creates short-lived
-- signed upload requests through the service-role API; it does not expose a
-- broad browser write policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sst-content', 'sst-content', true, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Seed the sole Owner from the already-created Supabase account. This is safe
-- to rerun: only this account is promoted and every other profile is unchanged.
update public.profiles
set role = 'owner', updated_at = now()
where id = (select id from auth.users where email = 'sarkrda.mohammed04@gmail.com' limit 1);

