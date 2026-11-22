-- MDT inquiries: outside doctors, teams and institutes asking to take part in
-- our multidisciplinary team meetings, sent from /:locale/mdt.
--
-- A front door, not a platform: the team replies from its own mailbox and
-- agrees everything else by email. The form tells people not to send patient
-- details, and nothing here is ever public.
--
-- Access model: identical to patient_questions (0026). Row-level security is
-- on and NO policy exists, and every privilege is revoked from `anon` and
-- `authenticated`. The only reader and writer is the Worker, through the
-- service-role key, in routes that check the caller's staff role first
-- (Owner and Contributors only).
--
-- Spec: docs/superpowers/specs/2026-11-22-mdt-front-door-design.md.
-- Safe to re-run.

create table if not exists public.mdt_inquiries (
  id uuid primary key default gen_random_uuid(),

  -- What they sent. Lists are fixed in code (app/lib/mdt-inquiries.ts) so
  -- /mdt stays a code-defined page; the checks are a backstop.
  name text not null check (char_length(name) between 1 and 120),
  role text not null check (role in (
    'surgeon', 'endocrinologist', 'oncologist', 'radiologist', 'pathologist',
    'nuclear_medicine', 'other_doctor', 'institution', 'other'
  )),
  institution text not null check (char_length(institution) between 2 and 200),
  -- English country name from app/lib/countries.ts, as the account forms store it.
  country text not null check (char_length(country) between 2 and 80),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  interest text not null check (interest in ('present_case', 'attend', 'observe', 'collaborate', 'other')),
  message text not null check (char_length(message) between 10 and 2000),
  locale text not null check (locale in ('en', 'ar')),
  -- Privacy consent and "I have not included patient-identifying information",
  -- ticked together.
  consent_at timestamptz not null,

  -- Workflow. Replies go from the team's own mailbox; Admin records only that
  -- contact was made, by whom and when.
  status text not null default 'new' check (status in ('new', 'contacted', 'closed', 'spam', 'wrong_form')),
  contacted_by uuid references public.profiles(id) on delete set null,
  contacted_at timestamptz,
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),

  -- HMAC-SHA-256 of the sender's IP with a Worker secret, rate limiting only.
  ip_hash text,

  -- When the "new inquiry" email reached Resend. Null after the insert means
  -- the alert failed, and Admin shows that on the row, so a broken mail key
  -- can never hide a submission.
  team_alerted_at timestamptz,

  -- Retention (proposed, awaiting the team's decision): 24 months, reset on
  -- each action; spam 30 days. Rows past this date are deleted whenever staff
  -- open the inbox.
  delete_after timestamptz not null default (now() + interval '24 months'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mdt_inquiries_inbox_idx on public.mdt_inquiries (status, created_at desc);
create index if not exists mdt_inquiries_email_idx on public.mdt_inquiries (email, created_at desc);
create index if not exists mdt_inquiries_ip_idx on public.mdt_inquiries (ip_hash, created_at desc);
create index if not exists mdt_inquiries_retention_idx on public.mdt_inquiries (delete_after);

alter table public.mdt_inquiries enable row level security;
revoke all on table public.mdt_inquiries from anon, authenticated;

-- The same alert-failure flag for patient questions (0026), so neither inbox
-- can lose a submission silently when the team alert email fails.
alter table public.patient_questions add column if not exists team_alerted_at timestamptz;
