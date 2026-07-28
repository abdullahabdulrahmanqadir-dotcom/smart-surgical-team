-- Case summary fields for content pages.
--
-- Each content item can carry a short structured clinical account, rendered
-- under the player in place of the discussion panel. Every column is nullable:
-- a case page shows only the sections the team has actually written, so a
-- partially completed record is never presented as a full clinical account.
--
-- These fields are published material. Anything entered here must already be
-- de-identified — no names, dates of birth, medical record numbers, or free
-- text that could identify a patient.

alter table public.content_items
  add column if not exists case_presentation text,
  add column if not exists case_imaging text,
  add column if not exists case_procedure text,
  add column if not exists case_histopathology text,
  add column if not exists case_outcome text;
