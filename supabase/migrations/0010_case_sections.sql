-- Case records used to be five fixed columns with five fixed headings. Editors
-- need to rename those headings (a case may call for "MDT outcome" rather than
-- "Outcome & follow-up") and to add sections of their own.
--
-- `case_sections` holds the whole ordered record as
--   [{ "key": "presentation", "label": "Presentation", "body": "<p>…</p>" }, …]
-- and is the source of truth once written. The five legacy columns are still
-- maintained for the built-in keys so older readers, the import script and any
-- row saved before this migration keep working; a row with a null
-- `case_sections` is rendered from those columns instead.
alter table public.content_items
  add column if not exists case_sections jsonb;
