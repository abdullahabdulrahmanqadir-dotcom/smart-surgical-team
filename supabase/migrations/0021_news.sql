-- News: announcements, press coverage, event recaps and milestones.
--
-- Its own tables rather than another `content_items.kind`, following the
-- `events` precedent. A news item is not a clinical record: it carries no
-- topic filing, no contributors, no chapters, no access level, and its
-- categories are the admin's to invent — none of which the content pipeline
-- models. Reuses `public.content_status` (0001) and `public.media_kind` (0003).
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Categories
--
-- Editable records rather than a hardcoded enum: they drive the filter chips
-- on the public feed and the label on every card, and the admin renames or
-- replaces them without a code release. `name_ar` is optional — an Arabic page
-- falls back to `name`, the same rule the items themselves follow.
-- ---------------------------------------------------------------------------
create table if not exists public.news_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_categories_order_idx on public.news_categories (sort_order);

-- ---------------------------------------------------------------------------
-- Items
--
-- `link_url` is what decides how an item is read, so there is no separate
-- "type" field for an editor to contradict:
--
--   body, no link   -> a detail page at /:locale/news/:slug
--   link, no body   -> the card links straight out to the external URL
--   both            -> the detail page, with a "read the original" link
--
-- `body` and `body_ar` hold the ordered section list as
-- `[{ "key": …, "label": …, "body": "<p>…</p>" }, …]`, the same shape as
-- `content_items.case_sections`, so the admin's section editor is reused
-- verbatim. Arabic is per-field and never blocks publishing: an empty
-- `*_ar` field falls back to the English text on the Arabic page.
-- ---------------------------------------------------------------------------
create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ar text,
  slug text not null unique,
  summary text,
  summary_ar text,
  body jsonb,
  body_ar jsonb,
  category_id uuid references public.news_categories(id) on delete set null,
  status public.content_status not null default 'draft',
  -- The editor's own date, not a write timestamp: a conference recap or a press
  -- clipping is dated when it happened, which is how the feed orders itself.
  published_at timestamptz,
  link_url text,
  -- Stored as its `/api/media/<key>` URL, matching `content_items.poster_url`
  -- and `events.image_url`, so the same R2 cleanup path handles all three. An
  -- item with no cover gets a generated typographic one on the site.
  cover_url text,
  pinned boolean not null default false,
  -- One optional related record, pointed at by kind + slug (or research id)
  -- rather than three nullable foreign keys across three differently-keyed
  -- tables.
  related_type text check (related_type is null or related_type in ('content', 'event', 'research')),
  related_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists news_items_published_idx on public.news_items (status, published_at desc);
create index if not exists news_items_category_idx on public.news_items (category_id);

-- At most one item is pinned to the homepage. Enforced here as well as in the
-- admin API: the API clears the previous pin before writing the new one, and
-- this makes a second pin impossible even if two editors save at once.
create unique index if not exists news_items_single_pin_idx on public.news_items (pinned) where pinned;

-- ---------------------------------------------------------------------------
-- Gallery images, mirroring `content_media`.
-- ---------------------------------------------------------------------------
create table if not exists public.news_media (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news_items(id) on delete cascade,
  kind public.media_kind not null default 'image',
  storage_path text not null,
  public_url text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists news_media_news_idx on public.news_media (news_id, sort_order);

-- ---------------------------------------------------------------------------
-- Row-level security, matching the events and content-media policies.
-- ---------------------------------------------------------------------------
alter table public.news_categories enable row level security;
alter table public.news_items enable row level security;
alter table public.news_media enable row level security;

drop policy if exists "news categories are readable" on public.news_categories;
create policy "news categories are readable" on public.news_categories
  for select using (true);

drop policy if exists "published news is readable" on public.news_items;
create policy "published news is readable" on public.news_items
  for select using (status = 'published');

drop policy if exists "published news media is readable" on public.news_media;
create policy "published news media is readable" on public.news_media
  for select using (exists (
    select 1 from public.news_items where id = news_id and status = 'published'
  ));

-- ---------------------------------------------------------------------------
-- Starting categories.
--
-- `on conflict (slug) do nothing` so re-running never overwrites wording the
-- admin has since edited. These four are a starting point, not a fixed set —
-- rename, reorder or delete them from the News section of the workspace.
-- ---------------------------------------------------------------------------
insert into public.news_categories (name, name_ar, slug, sort_order) values
  ('Announcements', 'إعلانات',            'announcements', 1),
  ('Press',         'تغطية إعلامية',       'press',         2),
  ('Event recaps',  'ملخصات الفعاليات',    'event-recaps',  3),
  ('Milestones',    'إنجازات',            'milestones',    4)
on conflict (slug) do nothing;
