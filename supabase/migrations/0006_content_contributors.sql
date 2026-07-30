-- Allow a content item to credit more than one contributor (admin multi-select).
-- content_items.contributor_id remains as the lead/primary contributor for
-- backward compatibility; this join table holds every credited contributor.

create table if not exists public.content_contributors (
  content_id uuid not null references public.content_items(id) on delete cascade,
  contributor_id uuid not null references public.contributors(id) on delete cascade,
  primary key (content_id, contributor_id)
);

alter table public.content_contributors enable row level security;

create policy "content contributors are readable" on public.content_contributors
  for select using (true);
