# Patient questions — plan (simple version)

Status: **Phases 1 and 2 built on branch `feature/patient-questions`, not
deployed, not linked anywhere.** Plan written 2026-11-21; both phases built the
same day. Next: the internal end-to-end test, then Phase 3 (launch).

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
3. **Team** opens Admin → **Patient questions**, reads, writes the answer (or
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

## What Phase 2 built

| Piece | File |
|---|---|
| `canAnswerQuestions()` — Owner + Contributors, gates **reading** too | `app/lib/admin-server.ts` |
| `/api/admin/questions` — GET (purges rows past `delete_after` first), POST `save` / `send-email` / `mark-whatsapp` / `set-status`, DELETE | `app/api/admin/questions/route.ts` |
| Answer email (EN/AR): quotes the question, keeps line breaks, adds the "general information, not a diagnosis" notice; reply-to is the team address | `answerEmail()` in `app/lib/patient-questions-server.ts` |
| Ready-made replies (EN + AR, **draft text for the team to approve**) and the WhatsApp opening message | `app/lib/patient-question-replies.ts` |
| Inbox screen: filters (Waiting / Overdue / Answered / Closed / Spam / All) with counts, search, reading pane, per-question drafts, email and WhatsApp panels, internal note, close / spam / reopen, two-click delete | `app/components/AdminQuestions.tsx`, `admin-questions.css` |
| "Patient questions" tab (hidden from other roles) and a "waiting" card first on the Overview | `app/components/AdminWorkspace.tsx`, `app/api/admin/[resource]/route.ts` |

Rules the screen and API enforce:
- **Email** can only be sent to a **confirmed** address. If Resend fails, nothing
  is marked answered. If the email went out but recording failed, the screen
  says not to resend.
- **WhatsApp:** open the chat with a pre-written "Did you send us a question?"
  message, wait for a yes, copy the answer, send it from the team phone, then
  "Mark answered on WhatsApp", which stores exactly what was sent.
- Answering resets retention to 6 months from the answer; spam is 30 days;
  reopening clears the answered stamp but keeps the draft.
- Waiting questions are listed oldest first. Overdue means more than
  3 working days (Saturday–Thursday) without an answer.

Verified 2026-11-21: `npm test` 156/156, `tsc` clean. Clicked through on the
built site against a **local mock** of the two admin endpoints with fake
questions: overview card → inbox, ready reply insert, send by email, WhatsApp
link text (Arabic), mark answered on WhatsApp, disabled email when there is no
or no confirmed address, and the layout at 1180 px. **Not verified:** the real
database, real Resend delivery, and a real Contributor account. Those are what
the internal test below is for.

## Before the internal test (Phase 2 sign-off)

**2026-11-22 status:** step 1 is **done** — 0026 and 0027 applied with the CLI
(now on the right account). Verified separately through PostgREST: both tables
exist, RLS on, 0 policies, `anon`/`authenticated` get `42501 permission denied`,
service role can insert. Local end-to-end run against the **real database**
(dev server with Cloudflare's always-pass Turnstile test keys): /ask WhatsApp
path → success screen and row saved (phone normalised to E.164, 6-month
retention); email path → token stored, Arabic confirm page → "confirmed", then
replay = `already`, unknown = 404, malformed = 400; honeypot and duplicate store
nothing; invalid = 422; no bot token = 400; 4th send from one phone = 429; IP
stored only as an HMAC. /mdt the same, plus the fill-time trap (no/short
`elapsedMs` is silently dropped); 4th from one email = 429; 24-month retention.
Admin endpoints answer 401 without a valid session. Test rows deleted.
`npm test` 174/174. **Not yet verified:** real Turnstile, real Resend delivery
(team alert, confirm email, answer email) and the Admin inbox signed in as a
Contributor and an Editor — those wait on step 2 and on staff logins.

**2026-11-22, later — step 2 mostly done, Admin verified.**
- Worker secrets set with `wrangler versions secret put` (a new, **undeployed**
  version; the live version `5194c262` is untouched, and the next deploy
  inherits them): `TURNSTILE_SECRET_KEY` (pulled from the "SST auth" widget via
  the Cloudflare API, never displayed; siteverify confirms it is valid),
  `QUESTIONS_IP_SECRET` (random), `QUESTIONS_TEAM_EMAIL=info@ssthyroid.com`
  (the address the contact page already publishes; Hostinger MX — change it if
  the team wants another inbox). The same three are in `.env.local` for local dev.
- **Still missing: `RESEND_API_KEY`.** Without it nothing emails (no team alert,
  no confirm email, no answer email); questions still save and Admin flags the
  missing alert. Create a key at resend.com/api-keys (sending access,
  ssthyroid.com) and run `npx wrangler versions secret put RESEND_API_KEY --name smart`
  (also add it to `.env.local` to test locally).
- Admin test against the real database with throwaway accounts (created by the
  service role, sessions via admin magic link, deleted afterwards): **18/18**.
  Contributor reads both inboxes, saves a draft, marks answered on WhatsApp
  (row stamped with who/when/how, retention reset to 6 months), reopens, marks
  an MDT inquiry contacted, deletes; send-email is refused without a confirmed
  address. Editor gets 403 on every GET/POST/DELETE of both inboxes, the
  Overview carries no counts, and the refused writes changed nothing. In the
  UI, the Contributor sees the Inbox tab and the waiting cards; the Editor sees
  neither.
- The real Turnstile widget renders on localhost (the widget allows
  `localhost`, `smart.ssteam.workers.dev`, `ssthyroid.com`) and asks for the
  checkbox, which a person has to tick — so one real submission by a person
  remains, ideally after the Resend key so the emails are checked too.

1. Apply the migration (never `db push`):
   `npx supabase db query --linked -f supabase/migrations/0026_patient_questions.sql`
   then `0027_mdt_inquiries.sql` (MDT table + `team_alerted_at` on this table;
   see the MDT spec). Optional secret: `MDT_TEAM_EMAIL`.
2. Add Worker secrets: `TURNSTILE_SECRET_KEY` (same widget as the auth forms;
   Supabase holds a copy), `QUESTIONS_IP_SECRET` (any long random string),
   `RESEND_API_KEY` (a key of the site's own), `QUESTIONS_TEAM_EMAIL`.
   Optional: `QUESTIONS_FROM_EMAIL` (defaults to `no-reply@ssthyroid.com`).
3. Fill `ASK_CONTACT` in `app/lib/patient-questions.ts` with the emergency and
   booking numbers. Until then the page leaves those lines out.

## 2026-11-22 — form merged into the contact page

On the user's request /contact and /ask are now **one page**: details strip
(email, hours, tower) → "Ask our team" section (`#ask`: emergency notice and
guide first in the DOM, form beside it on wide screens) → map. `/:locale/ask`
answers **308 → `/:locale/contact#ask`**; `/:locale/ask/confirm` stays where it
is because emailed links point there. The header Contact menu has two items
(Contact us, MDT meeting); the MDT page and the MDT "wrong form" reply link to
`/contact#ask`. MDT stays its own page (user's choice).

**Launch consequence:** /contact is a live, indexed page, so the form has no
`noindex` holdback any more — whenever this branch ships, the form is public.
Everything under "Before the internal test" and "Still open" must be finished
before that deploy. New Arabic header hint "العنوان وساعات العمل وأسئلة لجرّاحينا"
(built from existing phrases) joins the native-speaker review.

## Phases (stop and review after each)

0. ~~Decisions + design interview.~~ Done 2026-11-21.
1. ~~Database, form, server routes, emails. Built but not linked.~~ Done 2026-11-21.
2. ~~Admin Questions tab.~~ Built 2026-11-21. **Still to do:** the full internal
   test once the setup above is in place: ask → confirm → answer by email, and
   ask → answer by WhatsApp. Signed in as a Contributor *and* as an Editor (the
   Editor must not see the tab, and the API must answer 403).
3. **Launch:** privacy and terms text, remove `noindex`, add to the sitemap,
   links in the header/footer and topic pages. (Contact page link added
   2026-11-22: a "Questions" row in the details card, EN + AR, tested.) Push only with your yes.
4. **Later:** a public FAQ written by the team from recurring questions.

## Still open

1. Emergency number to show (Sulaymaniyah).
2. ~~Team email address~~ — set to `info@ssthyroid.com` on 2026-11-22 (change if the team prefers another inbox).
3. Team WhatsApp number (a dedicated WhatsApp Business number).
4. Clinic booking phone.
5. Does Smart Health Tower have a policy on staff answering patients online?
6. **The Arabic form and email text should be read by a native speaker** before
   launch.
7. Ready-made replies and the WhatsApp opening message (EN + AR) are drafts in
   `app/lib/patient-question-replies.ts`; the clinical team must approve them.
8. The four secrets are runtime Worker secrets on the `smart` Worker (`npx wrangler secret put …`), not build variables: none is `NEXT_PUBLIC_`, so no build setting is needed.
