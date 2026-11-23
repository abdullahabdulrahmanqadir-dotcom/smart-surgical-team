-- Patient questions: the form now takes questions about anything to do with
-- the team, not only medical ones (owner, 2026-11-23). Three topics join the
-- existing four; the old values stay valid so earlier questions are untouched.
--
-- Rollback (only while no row uses a new topic):
--   alter table public.patient_questions drop constraint patient_questions_topic_check;
--   alter table public.patient_questions add constraint patient_questions_topic_check
--     check (topic is null or topic in ('thyroid', 'parathyroid', 'breast', 'other'));
--
-- Safe to re-run.

alter table public.patient_questions drop constraint if exists patient_questions_topic_check;
alter table public.patient_questions add constraint patient_questions_topic_check
  check (topic is null or topic in ('thyroid', 'parathyroid', 'breast', 'appointments', 'team', 'research', 'other'));
