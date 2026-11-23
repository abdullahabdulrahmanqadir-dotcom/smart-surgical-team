-- Patient questions: email first, WhatsApp optional (owner, 2026-11-23).
--
-- The form now requires an email address and makes the WhatsApp number
-- optional. Email stays nullable here because questions sent before this
-- change may have none; the server's validator is what requires it from now
-- on. A WhatsApp reply still needs a number to send to.
--
-- The existing phone format check passes for NULL, so it needs no change.
--
-- Rollback (only while no row has a NULL phone):
--   alter table public.patient_questions drop constraint if exists patient_questions_whatsapp_reply_needs_phone;
--   alter table public.patient_questions alter column phone set not null;
--
-- Safe to re-run.

alter table public.patient_questions alter column phone drop not null;

alter table public.patient_questions drop constraint if exists patient_questions_whatsapp_reply_needs_phone;
alter table public.patient_questions add constraint patient_questions_whatsapp_reply_needs_phone
  check (reply_via <> 'whatsapp' or phone is not null);
