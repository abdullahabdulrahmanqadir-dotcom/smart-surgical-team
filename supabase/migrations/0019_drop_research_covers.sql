-- Retires uploaded cover images for publications.
--
-- Covers are generated from each paper's title and topic now (see 0017), so
-- `cover_image_url` is read by nothing. Of the 21 rows that held a value, 18
-- pointed at smarthealth.group — the legacy site the archive was imported
-- from, not storage we own — and only 3 were objects in our own R2 bucket.
-- Those 3 were deleted from the bucket at the time this migration was written;
-- the 18 external links are simply forgotten here, since we never held them.
--
-- The column itself is kept rather than dropped. Nothing writes to it, so it
-- costs nothing, and dropping a column is the one step here that could not be
-- reversed if a decision changes.
--
-- Safe to re-run.

update public.researches set cover_image_url = null where cover_image_url is not null;
