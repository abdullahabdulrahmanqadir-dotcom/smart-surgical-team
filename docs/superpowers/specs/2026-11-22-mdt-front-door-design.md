# MDT front door — design (Goal 2)

Status: **Phase 1 built 2026-11-22 on `feature/patient-questions` — unlinked, `noindex`, not deployed.** Tracker:
`docs/expansion-plan.md` (Goal 2). Sister feature: `docs/patient-questions-plan.md`.

## What it is

A public page that tells outside doctors, teams and institutes that our MDT
exists, what it does and how to reach us — plus an inquiry form that lands in
Admin. **A front door, not a platform:** how anyone takes part (presenting a
case, attending, observing, partnering) is agreed by email afterwards, off the
site. No patient data is collected anywhere on the site.

## Decided (user, 2026-11-22)

| | |
|---|---|
| URL / name | `/en/mdt`, `/ar/mdt` — "Our MDT" (title: Multidisciplinary Team Meetings) |
| Layout | Explainer sections first, form at the bottom with the "no patient details" notice beside it |
| Who sits on it | **Specialties only**, no names |
| Link to patient questions | **Shared Admin inbox**: one "Inbox" tab with two lists (Patient questions / MDT inquiries); each public page points the wrong visitor to the other form |
| Who sees inquiries | **Owner + Contributors** (existing `canAnswerQuestions()` read gate); Editors get 403 |
| Team alert | **An email to the team on every submission**, both forms |
| Reply | From the team's own mailbox: Admin "Reply by email" opens a pre-filled `mailto:`, then "Mark contacted". No in-site sending, so no email-confirm step |
| Spam | Must not get spammed or junk-filled; must be proven to work cleanly (see below) |
| Branch | **Built on `feature/patient-questions`**, launched together with patient questions (and the editorial redesign that branch carries) |
| Linked from (at launch) | Header About menu, Contact page row, Our Team page band, footer |

## The page (`/[locale]/mdt`)

Code-defined, no database read, cached like `/ask` and `/contact`. Order:

1. **Intro** — what the MDT is, one paragraph.
2. **Who sits on it** — the disciplines represented (e.g. endocrine surgery,
   breast surgery, endocrinology, radiology, cytopathology/pathology, oncology,
   nuclear medicine — *exact list from the team*).
3. **Cases we discuss** — thyroid, parathyroid, breast, head & neck (*confirm*).
4. **When and how it meets** — frequency, in person at Smart Health Tower
   and/or online (*facts from the team*).
5. **Ways to take part** — present a case, attend regularly, observe,
   institutional collaboration — each worded as "get in touch to arrange",
   never as a promise.
6. **Form** + side notice: *do not include any patient details; case material
   is arranged by email after we reply.*
7. A line for patients: "Are you a patient? Ask the team a question →" `/ask`.
   `/ask` gets the mirror line: "Are you a doctor or institute? → `/mdt`".

Honesty rule: no "partners", counts or "international" claims unless true and
in writing.

## The form

| Field | Rule |
|---|---|
| Name | required, 1–120 |
| Role | required, fixed list: surgeon / endocrinologist / oncologist / radiologist / pathologist / nuclear medicine / other doctor / institution representative / other |
| Institution | required, 2–200 |
| Country | required, ISO country list (clean data; can feed the collaboration map later) |
| Email | required, normalised |
| Phone / WhatsApp | optional, E.164 via the existing normaliser |
| Interested in | required, one of: present a case / attend regularly / observe / institutional collaboration / other |
| Message | required, 10–2000, at most 2 links |
| Confirmation tick | required: "I have not included any patient-identifying information" + privacy consent |

## Spam and junk — layered, cheapest first

Reuses the patient-questions pipeline, which already has the first five:

1. Size limit on the request body.
2. Honeypot field (bots fill it; silently "accepted", not stored).
3. Server validation before anything costly (lengths, fixed lists, link count).
4. Turnstile, **fails closed** (no secret → 503, never accept unchecked).
5. Rate limits: per email and per HMAC-hashed IP (proposed 3/email/day,
   5/IP/hour, 10/IP/day) + duplicate detection (same email + message within 24 h).
6. **New:** minimum fill time — a submission sent under ~3 s after page load is
   treated like a honeypot hit.
7. Admin "Spam" button; spam rows purge after 30 days.

## Team alert email — on every submission

- Patient questions already sends "New patient question — open Admin".
  MDT sends "New MDT inquiry — open Admin" with **no name or message text**
  (mail is less private than Admin), just the link and the waiting count.
- Address: `MDT_TEAM_EMAIL`, falling back to `QUESTIONS_TEAM_EMAIL`.
- **Failure is visible, not silent:** each row stores `team_alerted_at`. If the
  alert failed, the inquiry is still saved and Admin shows "alert email failed"
  on it, so a broken Resend key can't hide submissions.

## Proving it works cleanly

- **Automated tests:** validation rules, link limit, fill-time trap, honeypot,
  fail-closed Turnstile, rate limits, rendered EN/AR page, API status codes.
- **Internal end-to-end test** (same session as the patient-questions one):
  submit both forms for real → both alerts arrive → rows appear in the right
  list → reply by email / mark contacted → spam → delete. As Contributor (sees
  it) and as Editor (no tab, API 403).
- **After launch:** one real submission per form on the live site, confirm the
  alert arrives, then delete the test rows.

## Admin

- The "Patient questions" tab becomes **"Inbox"** with two lists; the
  Overview card shows waiting counts for both.
- MDT list: filters New / Contacted / Closed / Spam / All, search, reading
  pane, internal note, "Reply by email" (mailto with subject
  "Your MDT inquiry — Smart Surgical Team"), "Mark contacted" (who + when),
  close / spam / reopen, two-click delete, "Wrong form — patient" status.
- Own route `app/api/admin/mdt/route.ts`, same auth helpers.

## Data

New table `mdt_inquiries` (migration `0027`), same access model as
`patient_questions`: RLS on, no policies, all privileges revoked from `anon` and
`authenticated`; only the Worker (service role) reads and writes, after a staff
role check. Columns: the form fields, `locale`, `consent_at`, `status`
(new/contacted/closed/spam/wrong_form), `contacted_by`, `contacted_at`,
`internal_note`, `ip_hash`, `team_alerted_at`, `delete_after`, timestamps.

Shared server code (Turnstile, HMAC, Resend, rate limiting) moves out of
`patient-questions-server.ts` into one shared module used by both routes;
patient-questions tests must still pass unchanged.

## Also needed before launch

- `mdt` added to `PUBLIC_DOCUMENT` in **both** `worker/page-cache.ts` and
  `public/sw.js`.
- ~~Privacy policy + terms: a paragraph on MDT inquiries (what, why, how long).~~ Done 2026-11-22 (24-month retention stated; change both if the team picks another).
- Sitemap, `llms.txt`, remove `noindex`.
- Arabic text read by a native speaker.

## What Phase 1 built (2026-11-22)

| Piece | File |
|---|---|
| Table + RLS/revoke; also adds `team_alerted_at` to `patient_questions` | `supabase/migrations/0027_mdt_inquiries.sql` (not applied; apply after 0026 with `db query --linked -f`) |
| Shared server helpers (Turnstile, HMAC, Resend, email layout), moved out of patient questions | `app/lib/inbox-server.ts` |
| Rules: validation, link count, fill-time trap, retention, page facts (`MDT_FACTS`, **draft**) | `app/lib/mdt-inquiries.ts` |
| Team alert address + email (no sender details) | `app/lib/mdt-inquiries-server.ts` |
| `POST /api/mdt` — size → honeypot → fill time → validate → Turnstile → rate limits → dedupe → save → alert → record `team_alerted_at` | `app/api/mdt/route.ts` |
| Patient-questions route now records `team_alerted_at` too | `app/api/questions/route.ts` |
| Page + form | `app/[locale]/mdt/page.tsx`, `mdt.css`, `app/components/MdtInquiryForm.tsx` |
| `/ask` → `/mdt` link ("Are you a doctor or institute?") | `app/[locale]/ask/page.tsx` |
| EN + AR text | `mdt`, `ask.doctor*`, `seo.mdt*` in both dictionaries |
| `mdt` in `PUBLIC_DOCUMENT` | `worker/page-cache.ts`, `public/sw.js` |
| Tests | `tests/mdt-inquiries.test.mjs`, two in `tests/rendered-html.test.mjs` |

New optional secret: `MDT_TEAM_EMAIL` (falls back to `QUESTIONS_TEAM_EMAIL`).

## What Phase 2 built (2026-11-22, uncommitted at time of writing)

| Piece | File |
|---|---|
| `/api/admin/mdt` — GET (purges expired first), POST `save` / `mark-contacted` / `set-status`, DELETE; Owner + Contributors only | `app/api/admin/mdt/route.ts` |
| Inbox tab with two lists, both mounted so drafts survive tab switches | `app/components/AdminInbox.tsx` |
| MDT list: filters, search, detail, "Reply by email" (mailto in the sender's language; wrong-form replies point to `/ask`), mark contacted, note, close / wrong form / spam / reopen, delete | `app/components/AdminMdtInquiries.tsx` |
| Alert-failed badge + banner in **both** lists (2-minute grace) | `teamAlertMissing()` in `app/lib/mdt-inquiries.ts` |
| "MDT inquiries waiting" card on the Overview, opening the MDT tab | `AdminWorkspace.tsx`, `app/api/admin/[resource]/route.ts` |

Verified: `npm test` 174/174, tsc + lint clean; clicked through against a local mock with fake rows (overview cards → MDT tab, counts, alert-failed flags, Arabic reply link, mark contacted). **Not verified:** the real database (0026/0027 not applied) and a real Contributor/Editor login.

## Phases (stop and review after each)

1. ~~Migration, `/mdt` page, form, `POST /api/mdt`, alert email, cross-links
   with `/ask` — built but unlinked and `noindex`.~~ Built 2026-11-22 (`b3ec338`).
2. ~~Admin Inbox tab (two lists) + alert-failure flag.~~ Built 2026-11-22.
3. Internal end-to-end test of **both** forms.
4. Launch both together: links (header, contact, team, footer), privacy/terms,
   sitemap, push only with the user's yes.

## Open — needed from the team

1. Disciplines that sit on the MDT.
2. Which cases (thyroid, parathyroid, breast, head & neck?).
3. How often, which day, how long; in person, online, or both (which platform).
4. Languages the meeting runs in.
5. Anything true and citable (years running, cases per year) — optional.
6. **Retention** — proposed: 24 months after last action (these are
   professional contacts that may become partnerships); spam 30 days.
7. Team alert address for MDT (same as patient questions, or an MDT secretary?).

## Design review (2026-11-22)

An independent review (fresh reviewer, screenshots + source) plus our own pass.

**Applied:**
- Hero: kicker "For doctors and institutes", sentence-case title, shorter intro, a "Send an inquiry" button that jumps to the form.
- The three chip cards became a ruled fact sheet (Specialties / Cases / Schedule), the same style as the contact page's details list.
- "Ways to take part": larger heading, no 01–04 numbering (they are choices, not steps), serif item titles.
- The patient-data notice is a calm note with a rose side rule, no longer an alarm box (`/ask` keeps its emergency box). The warning is said once in the notice and once in the tick-box, not four times.
- Form: removed the name/institution icons, "Send an inquiry" title, "How would you like to take part?".
- On phones: notice → form → the rest of the guide (the form starts about 750px higher).
- Bugs: misaligned two-column fields (`align-items: start`), copper "(optional)", and Arabic phone/email/select padding (`globals.css`, logical padding; affects every form, LTR unchanged).
- Arabic: brand names kept on one line (non-breaking spaces).
- Admin: waiting counts in their own amber row above the banner, five content counts on one row; a one-line note instead of a boxed one; plain-English alert banner; zero counts hidden; no meaningless row icon; sans-serif section labels; clearer disabled button; solid quick-reply chips.

**Needs the owner's approval (site-wide):**
1. Required-field asterisks are copper everywhere; proposal: muted text colour.
2. The primary button's aqua glow is strong in dark mode; proposal: a plain shadow.
3. Icons inside every text input on other forms; proposal: only where they help (email, phone, search, country).
4. The cool green-grey dark-mode footer under the warm page; proposal: base it on `--bg-muted`.
5. Admin `.admin-status` uses a literal `letter-spacing: .04em` (pre-existing).

**Left out on purpose:** a reply time on /mdt — only if the team commits to one.
