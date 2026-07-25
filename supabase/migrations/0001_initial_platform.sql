-- Smart Surgical Team: initial application data model.
create type public.platform_role as enum ('owner', 'content_manager', 'editor', 'contributor', 'member');
create type public.content_kind as enum ('video', 'webinar_recording', 'poster', 'event');
create type public.content_status as enum ('draft', 'scheduled', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, city text, profession text,
  role public.platform_role not null default 'member',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.topics (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  parent_id uuid references public.topics(id) on delete set null, description text,
  sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.contributors (
  id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id) on delete set null,
  display_name text not null, credentials text, biography text, photo_url text, created_at timestamptz not null default now()
);
create table public.content_items (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, summary text,
  kind public.content_kind not null, status public.content_status not null default 'draft',
  video_url text, poster_url text, duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  published_at timestamptz, scheduled_for timestamptz,
  contributor_id uuid references public.contributors(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.content_topics (
  content_id uuid not null references public.content_items(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade, primary key (content_id, topic_id)
);
create table public.content_chapters (
  id uuid primary key default gen_random_uuid(), content_id uuid not null references public.content_items(id) on delete cascade,
  title text not null, position integer not null check (position >= 0),
  starts_at_seconds integer not null default 0 check (starts_at_seconds >= 0), unique (content_id, position)
);
create table public.user_saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, content_id)
);
create table public.user_content_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  watched_seconds integer not null default 0 check (watched_seconds >= 0), completed_at timestamptz,
  updated_at timestamptz not null default now(), primary key (user_id, content_id)
);
create table public.webinars (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, description text,
  starts_at timestamptz not null, ends_at timestamptz, provider text, registration_url text,
  recording_content_id uuid unique references public.content_items(id) on delete set null,
  status public.content_status not null default 'draft', created_at timestamptz not null default now()
);
create table public.webinar_registrations (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (webinar_id, user_id)
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text, email text not null, message text,
  source text not null default 'website', created_at timestamptz not null default now()
);

create index content_items_published_idx on public.content_items (status, published_at desc);
create index content_items_contributor_idx on public.content_items (contributor_id);
create index webinars_starts_at_idx on public.webinars (starts_at);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.contributors enable row level security;
alter table public.content_items enable row level security;
alter table public.content_topics enable row level security;
alter table public.content_chapters enable row level security;
alter table public.user_saved_items enable row level security;
alter table public.user_content_progress enable row level security;
alter table public.webinars enable row level security;
alter table public.webinar_registrations enable row level security;
alter table public.contact_messages enable row level security;

create policy "published content is readable" on public.content_items for select using (status = 'published');
create policy "topics are readable" on public.topics for select using (true);
create policy "contributors are readable" on public.contributors for select using (true);
create policy "content topics are readable" on public.content_topics for select using (true);
create policy "chapters are readable for published content" on public.content_chapters for select using (exists (select 1 from public.content_items where id = content_id and status = 'published'));
create policy "published webinars are readable" on public.webinars for select using (status = 'published');
create policy "members read their profile" on public.profiles for select using (auth.uid() = id);
create policy "members update their profile" on public.profiles for update using (auth.uid() = id);
create policy "members manage saved items" on public.user_saved_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "members manage progress" on public.user_content_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "members manage webinar registrations" on public.webinar_registrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
