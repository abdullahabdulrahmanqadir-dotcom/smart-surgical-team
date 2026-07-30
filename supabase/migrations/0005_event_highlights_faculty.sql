-- Public event detail pages show programme highlights and a faculty preview.
-- These were previously hardcoded in app/lib/events.ts and lost once an event
-- moved into the database. Store them so the admin panel fully owns events.

alter table public.events
  add column if not exists highlights text[] not null default '{}',
  add column if not exists faculty jsonb not null default '[]',
  add column if not exists faculty_url text;
