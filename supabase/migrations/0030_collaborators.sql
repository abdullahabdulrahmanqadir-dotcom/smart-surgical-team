-- Collaborating institutions for the International Breast Surgery
-- Collaboration Map (/:locale/collaboration and the /breast-summit embed).
--
-- Honesty rule, enforced here rather than trusted to the editor: a row cannot
-- be published without the date written consent was received. The consent
-- fields are internal and never leave the Worker; the public read selects
-- named columns only (app/lib/collaborators-server.ts).
--
-- Access model: as patient_questions (0026) and mdt_inquiries (0027). Row-level
-- security is on with NO policy and every privilege revoked from `anon` and
-- `authenticated`. The only reader and writer is the Worker, through the
-- service-role key, in routes that check the caller's staff role first.
--
-- Spec: docs/superpowers/specs/2026-11-23-breast-summit-and-map-design.md.
-- Safe to re-run.

create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  name_en text not null check (char_length(name_en) between 2 and 200),
  name_ar text check (name_ar is null or char_length(name_ar) between 2 and 200),
  city_en text not null check (char_length(city_en) between 1 and 120),
  city_ar text check (city_ar is null or char_length(city_ar) between 1 and 120),
  -- ISO 3166-1 alpha-2, the code app/lib/countries.ts and the map shapes use.
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  description_en text check (description_en is null or char_length(description_en) <= 600),
  description_ar text check (description_ar is null or char_length(description_ar) <= 600),
  website_url text check (website_url is null or website_url ~ '^https?://'),

  -- Which map the institution appears on. Breast only for now; head & neck can
  -- reuse the table later without a migration.
  field text not null default 'breast' check (field in ('breast', 'head_neck')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),

  -- Internal. When the institution agreed in writing to be listed, and a note
  -- of who agreed and where the agreement is kept.
  consent_received_on date,
  consent_note text check (consent_note is null or char_length(consent_note) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint collaborators_published_needs_consent
    check (status <> 'published' or consent_received_on is not null)
);

create index if not exists collaborators_public_idx
  on public.collaborators (field, status, sort_order);

alter table public.collaborators enable row level security;
revoke all on public.collaborators from anon, authenticated;
