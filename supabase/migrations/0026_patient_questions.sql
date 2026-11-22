-- Patient questions: a private inbox for questions sent from /:locale/ask.
--
-- A patient asks without an account; the team answers from Admin by email
-- (Resend) or WhatsApp (from the team number). Nothing here is ever public.
--
-- Access model: row-level security is on and NO policy exists, and every
-- privilege is revoked from `anon` and `authenticated`. The only reader and
-- writer is the Worker, through the service-role key, in routes that check
-- the caller's staff role first (Owner and Contributors only). A leaked
-- publishable key therefore reads nothing.
--
-- Plan: docs/patient-questions-plan.md. Safe to re-run.

create table if not exists public.patient_questions (
  id uuid primary key default gen_random_uuid(),

  -- What the patient sent.
  name text not null check (char_length(name) between 1 and 120),
  -- Normalised to E.164 by the server (+9647701234567) so the WhatsApp link
  -- is always valid; the check is a backstop, not the validator.
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email is null or char_length(email) between 3 and 254),
  reply_via text not null check (reply_via in ('email', 'whatsapp')),
  -- A fixed list in code, not the admin topic tree, so /ask stays a
  -- code-defined page.
  topic text check (topic is null or topic in ('thyroid', 'parathyroid', 'breast', 'other')),
  question text not null check (char_length(question) between 10 and 3000),
  locale text not null check (locale in ('en', 'ar')),
  consent_at timestamptz not null,

  -- Email ownership. The link carries a random token; only its SHA-256 is
  -- stored, so a database read cannot confirm someone else's address.
  email_token_hash text unique,
  email_token_expires_at timestamptz,
  email_confirmed_at timestamptz,

  -- Workflow.
  status text not null default 'new' check (status in ('new', 'answered', 'closed', 'spam')),
  answer text check (answer is null or char_length(answer) <= 6000),
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  answered_via text check (answered_via is null or answered_via in ('email', 'whatsapp')),
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),

  -- HMAC-SHA-256 of the sender's IP with a Worker secret, for rate limiting
  -- only. A plain hash of an IPv4 address is reversible by enumeration.
  ip_hash text,

  -- Retention: 6 months after submission, reset to 6 months after the answer
  -- when one is sent; spam is cut to 30 days. Rows past this date are deleted
  -- whenever staff open the inbox.
  delete_after timestamptz not null default (now() + interval '6 months'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Email replies need an address to send to.
  constraint patient_questions_email_reply_needs_email check (reply_via <> 'email' or email is not null)
);

create index if not exists patient_questions_inbox_idx on public.patient_questions (status, created_at desc);
create index if not exists patient_questions_phone_idx on public.patient_questions (phone, created_at desc);
create index if not exists patient_questions_ip_idx on public.patient_questions (ip_hash, created_at desc);
create index if not exists patient_questions_retention_idx on public.patient_questions (delete_after);

alter table public.patient_questions enable row level security;
revoke all on table public.patient_questions from anon, authenticated;
