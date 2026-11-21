# Patient questions — plan (simple version)

Status: **Phase 1 built on branch `feature/patient-questions`, not deployed,
not linked anywhere.** Plan written 2026-11-21; Phase 1 built the same day.

## What it is

Patients send the team a question from the site. The team answers in Admin, and
the answer goes straight to the patient by **email** or **WhatsApp**. Nothing is
public. No account needed.

## Decided

| | |
|---|---|
| Who can ask | Anyone, no account |
| Contact asked | Name, phone (WhatsApp), email (optional) |
| Reply | Email from Admin, or WhatsApp from the team number |
| Uploads | None at launch |
| Public page | None now; later a team-written FAQ from common questions |
| Answers | General information only; personal cases get "please book a visit" |
| Who sees questions | **Owner + Contributors** only (decided 2026-11-21) |
| Retention | **6 months** after the answer (or after submission if never answered); spam **30 days** (decided 2026-11-21) |
| Page layout | Form + side panel; panel first on phones (decided 2026-11-21) |
| Branch | `feature/patient-questions`, cut from `codex/sst-editorial-redesign` |

## How it works

1. **Patient** opens `/en/ask` or `/ar/ask` and fills in: name, phone, email
   (optional), question, topic (optional), and "reply by email or WhatsApp".
   Beside the form they see: what we answer and what we don't, the emergency
   notice, how to book, the reply time, and the privacy note. A consent tick is
   required. Kurdish questions are accepted.
2. **Site** validates, checks Turnstile and the rate limits, saves the question
   privately, and:
   - emails the patient a **confirm link** if they gave an email;
   - emails the team **"New question — open Admin"** (no name, no question text).
3. **Team** opens Admin → **Questions** (Phase 2), reads, writes the answer (or
   picks a ready-made reply), then:
   - **Email:** "Send" — only allowed once the email is confirmed;
   - **WhatsApp:** "Copy answer" + "Open chat". The team's first message asks
     *"Did you send a question to Smart Surgical Team?"* and sends the answer only
     after a yes.
   The question is marked answered, with who answered and when.

## Changes from the first draft (review, 2026-11-21)

1. **The confirm link does not confirm on open.** Mail security scanners
   (Outlook Safe Links, Gmail, gateways) open every link, which would confirm any
   address. The link opens `/ask/confirm`, where the patient presses a button.
   The token is 256-bit, travels in the URL **fragment** (never sent to the
   server or logged), is removed from the address bar on load, is stored only as
   a SHA-256 hash, and expires after 7 days.
2. **The IP is hashed with a secret (HMAC)**, not plain SHA-256 — a plain hash
   of an IPv4 address is reversible by trying all ~4 billion. Without the secret
   no IP is stored and rate limiting runs on the phone number alone.
3. **Reading is gated, not just writing.** Today every staff role can read every
   Admin section. Questions get their own read check (Owner + Contributors).
4. **Own route files** (`app/api/questions/…`, and in Phase 2
   `app/api/admin/questions/route.ts`) instead of growing the shared 791-line
   admin route. Same auth helpers.
5. **Topic list is fixed in code** (Thyroid / Parathyroid / Breast / Other) so
   `/ask` stays a code-defined page with no database read, cached like `/contact`.
6. **Phones are normalised to E.164 on the server.** Iraqi formats (07…, 7…,
   964…, 00964…) and Arabic-Indic / Persian digits are converted; other countries
   must type `+` or `00` — the code never guesses a country.
7. **Validation runs before the bot check**, so junk never costs a siteverify
   call. A honeypot field is also checked first. Turnstile **fails closed**: if a
   site key is built in but `TURNSTILE_SECRET_KEY` is missing, questions are
   refused (503) rather than accepted unchecked.

## What Phase 1 built

| Piece | File |
|---|---|
| Table, RLS on, no policies, all privileges revoked from `anon`/`authenticated` | `supabase/migrations/0026_patient_questions.sql` |
| Shared rules: validation, phone/email normalising, retention, overdue, WhatsApp link | `app/lib/patient-questions.ts` |
| Server helpers: Turnstile, HMAC, tokens, Resend, email templates (EN/AR) | `app/lib/patient-questions-server.ts` |
| `POST /api/questions` — size → honeypot → validate → Turnstile → rate limit (3/phone/day, 5/IP/hour, 10/IP/day) → de-duplicate → save → emails | `app/api/questions/route.ts` |
| `POST /api/questions/confirm` | `app/api/questions/confirm/route.ts` |
| `/[locale]/ask` page (noindex until launch) and `/[locale]/ask/confirm` | `app/[locale]/ask/…` |
| Form and confirm components | `app/components/AskQuestionForm.tsx`, `ConfirmQuestionEmail.tsx` |
| EN + AR text | `ask` and `seo.ask*` in both dictionaries |
| `/ask` added to `PUBLIC_DOCUMENT` | `worker/page-cache.ts`, `public/sw.js` |
| Tests: 17 rule tests + 3 rendered-page/API tests | `tests/patient-questions.test.mjs`, `tests/rendered-html.test.mjs` |

Verified 2026-11-21: `npm test` 151/151, `tsc` clean, lint clean on new files.
Rendered locally from the build (EN, AR/RTL, light, dark, 375 px phone):
validation messages and focus, fail-closed 503, confirm page states. **Not
verified:** a real end-to-end send (needs the migration, the secrets and a
Turnstile pass) and the success screen — both belong to the Phase 2 internal test.

## Before Phase 2 can be tested end to end

1. Apply the migration (never `db push`):
   `npx supabase db query --linked -f supabase/migrations/0026_patient_questions.sql`
2. Add Worker secrets: `TURNSTILE_SECRET_KEY` (same widget as the auth forms;
   Supabase holds a copy), `QUESTIONS_IP_SECRET` (any long random string),
   `RESEND_API_KEY` (a key of the site's own), `QUESTIONS_TEAM_EMAIL`.
   Optional: `QUESTIONS_FROM_EMAIL` (defaults to `no-reply@ssthyroid.com`).
3. Fill `ASK_CONTACT` in `app/lib/patient-questions.ts` with the emergency and
   booking numbers. Until then the page leaves those lines out.

## Phases (stop and review after each)

0. ~~Decisions + design interview.~~ Done 2026-11-21.
1. ~~Database, form, server routes, emails. Built but not linked.~~ Done 2026-11-21.
2. **Admin Questions tab** (Owner + Contributors): list with filters (new,
   overdue, answered), answer box, ready-made replies, Send-email (confirmed
   addresses only), Copy + Open-WhatsApp, mark closed or spam, delete; expired
   rows deleted when the inbox opens. Then a full internal test: ask → confirm →
   answer by email and by WhatsApp.
3. **Launch:** privacy and terms text, remove `noindex`, add to the sitemap,
   links in the header/footer, contact page and topic pages. Push only with your yes.
4. **Later:** a public FAQ written by the team from recurring questions.

## Still open

1. Emergency number to show (Sulaymaniyah).
2. Team email address for the alert and the reply-to.
3. Team WhatsApp number (a dedicated WhatsApp Business number).
4. Clinic booking phone.
5. Does Smart Health Tower have a policy on staff answering patients online?
6. **The Arabic form and email text should be read by a native speaker** before
   launch.
7. Ready-made replies (EN + AR): the team writes or approves the text.
