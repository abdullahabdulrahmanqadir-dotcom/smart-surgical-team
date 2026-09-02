-- Justified reading prose, per record.
--
-- Editor-written bodies (a case's written sections, a poster's written
-- details, a news story, a research abstract) read better with both edges
-- even, so this defaults to true and every existing record becomes justified.
-- It is a per-record choice rather than a site setting because the odd item is
-- mostly short fragments or a list, where justification opens visible gaps;
-- an editor can switch that one item back to ragged-right without changing how
-- the rest of the site reads.
--
-- Only long-form bodies follow this flag. Card summaries, headings and
-- captions are deliberately unaffected: a two-line paragraph justifies badly.
--
-- `not null default true` means a row saved by an older client (which does not
-- send the field) still lands justified, matching the site-wide intent.
alter table public.content_items
  add column if not exists justify_body boolean not null default true;
alter table public.news_items
  add column if not exists justify_body boolean not null default true;
alter table public.researches
  add column if not exists justify_body boolean not null default true;

comment on column public.content_items.justify_body is
  'Justify this item''s written case/poster sections on its public page. Off leaves them ragged-right.';
comment on column public.news_items.justify_body is
  'Justify this item''s story sections on its public page. Off leaves them ragged-right.';
comment on column public.researches.justify_body is
  'Justify this paper''s abstract on its public page. Off leaves it ragged-right.';
