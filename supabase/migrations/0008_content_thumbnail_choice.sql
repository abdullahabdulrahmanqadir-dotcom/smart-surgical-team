-- Card artwork is either derived from the linked YouTube video or selected
-- from a content item's own R2-backed image attachments.
alter table public.content_items
  add column if not exists thumbnail_source text not null default 'youtube'
    check (thumbnail_source in ('youtube', 'image')),
  add column if not exists thumbnail_media_path text;
