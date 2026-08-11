-- A poster can optionally point readers to its source paper or another
-- supporting resource. Both fields stay nullable so existing posters keep
-- their current presentation until an editor opts in.
alter table public.content_items
  add column if not exists poster_cta_text text,
  add column if not exists poster_cta_url text;
