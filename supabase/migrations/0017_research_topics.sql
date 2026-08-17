-- Research topics: the filter axis that replaces `researches.category`.
--
-- Every one of the 72 imported papers carried the same category value
-- ('Publication'), so the public "Type" filter offered exactly one choice and
-- filtered nothing. What actually distinguishes these papers is the anatomical
-- site they study, so that becomes the axis: a two-level topic tree the admin
-- owns outright — names, order and colour are all editable after seeding, and
-- an edit applies to every paper already carrying the topic because papers
-- reference the row rather than copying its text.
--
-- The topic also drives the cover artwork. Papers no longer carry a cover
-- image; each one renders a generated cover coloured by its topic's palette,
-- so the grid reads as grouped at a glance. `palette` is a named slot rather
-- than a hex value: the site owns the exact colours, so a rebrand is a code
-- change in one file instead of a data migration across every topic row.
--
-- Safe to re-run.

create table if not exists public.research_topics (
  id uuid primary key default gen_random_uuid(),
  -- Null for a top-level topic; set for a subtopic. Deleting a topic takes its
  -- subtopics with it, and the papers fall back to unfiled (see below).
  parent_id uuid references public.research_topics(id) on delete cascade,
  name text not null,
  slug text not null unique,
  palette text not null default 'teal',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_topics_parent_idx on public.research_topics (parent_id, sort_order);

-- Two levels only. Without this a subtopic could be re-parented under another
-- subtopic, and the explorer's topic -> subtopic pair of selects would silently
-- lose the third level rather than fail loudly.
create or replace function public.research_topics_depth_guard() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null and exists (
    select 1 from public.research_topics where id = new.parent_id and parent_id is not null
  ) then
    raise exception 'research topics are two levels deep: % cannot be nested under a subtopic', new.name;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists research_topics_depth_guard on public.research_topics;
create trigger research_topics_depth_guard before insert or update on public.research_topics
  for each row execute function public.research_topics_depth_guard();

-- `on delete set null` rather than cascade: deleting a topic must never delete
-- published papers. They become unfiled and the admin refiles them.
alter table public.researches add column if not exists topic_id uuid references public.research_topics(id) on delete set null;
alter table public.researches add column if not exists subtopic_id uuid references public.research_topics(id) on delete set null;

create index if not exists researches_topic_idx on public.researches (topic_id);
create index if not exists researches_subtopic_idx on public.researches (subtopic_id);

alter table public.research_topics enable row level security;

drop policy if exists "research topics are readable" on public.research_topics;
create policy "research topics are readable" on public.research_topics for select using (true);

-- Seed the starting tree. `on conflict (slug) do nothing` so re-running this
-- migration never overwrites names the admin has since edited.
insert into public.research_topics (parent_id, name, slug, palette, sort_order) values
  (null, 'Thyroid',                 'thyroid',               'teal',   1),
  (null, 'Parathyroid',             'parathyroid',           'slate',  2),
  (null, 'Salivary glands',         'salivary',              'plum',   3),
  (null, 'Neck & soft tissue',      'neck-soft-tissue',      'copper', 4),
  (null, 'Oral cavity & tongue',    'oral-cavity',           'olive',  5),
  (null, 'Facial & reconstructive', 'facial-reconstructive', 'honey',  6)
on conflict (slug) do nothing;

insert into public.research_topics (parent_id, name, slug, palette, sort_order)
select parent.id, child.name, child.slug, parent.palette, child.sort_order
from (values
  ('thyroid',               'Thyroid cancer & neoplasms',        'thyroid-neoplasms',       1),
  ('thyroid',               'Benign thyroid disease',            'benign-thyroid',          2),
  ('thyroid',               'Thyroid surgery & technique',       'thyroid-surgery',         3),
  ('parathyroid',           'Adenoma & hyperparathyroidism',     'parathyroid-adenoma',     1),
  ('parathyroid',           'Ectopia & rare pathology',          'parathyroid-rare',        2),
  ('salivary',              'Parotid & major glands',            'major-salivary',          1),
  ('salivary',              'Minor glands & lip',                'minor-salivary',          2),
  ('neck-soft-tissue',      'Soft tissue & nerve tumours',       'soft-tissue-nerve',       1),
  ('neck-soft-tissue',      'Lymphoma & multi-tumour cases',     'lymphoma-multitumour',    2),
  ('oral-cavity',           'Tongue & floor of mouth',           'tongue-lesions',          1),
  ('oral-cavity',           'Pharynx & upper aerodigestive',     'pharynx-aerodigestive',   2),
  ('facial-reconstructive', 'Pilonidal sinus of the head & neck','pilonidal-head-neck',     1),
  ('facial-reconstructive', 'Facial lesions & reconstruction',   'facial-lesions',          2)
) as child(parent_slug, name, slug, sort_order)
join public.research_topics parent on parent.slug = child.parent_slug and parent.parent_id is null
on conflict (slug) do nothing;
