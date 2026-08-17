-- A third kind of card artwork: two of the item's own images shown as one
-- seamless split, used for before/after surgical pairs. Both paths point at
-- rows in content_media, exactly like thumbnail_media_path does.
alter table public.content_items
  add column if not exists thumbnail_before_path text,
  add column if not exists thumbnail_after_path text;

alter table public.content_items
  drop constraint if exists content_items_thumbnail_source_check;

alter table public.content_items
  add constraint content_items_thumbnail_source_check
    check (thumbnail_source in ('youtube', 'image', 'before_after'));
