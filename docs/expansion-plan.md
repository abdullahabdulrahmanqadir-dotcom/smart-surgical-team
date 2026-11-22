# Expansion plan — Fellowship, MDT partners, Breast Summit + map, Research Desk

Status tracker for the four goals **locked in on 2026-11-22**. Each goal gets its own
design interview → written spec (`docs/superpowers/specs/`) → build plan →
phased build, one goal at a time. Nothing here is decided until it is marked
**Decided** with a date.

| # | Goal | Stage | Spec |
|---|---|---|---|
| 1 | Fellowship programme (apply → train → certify) | Discovery | — |
| 2 | External teams/institutes join our MDTs | **Design agreed; awaiting team facts** | `docs/superpowers/specs/2026-11-22-mdt-front-door-design.md` |
| 3 | Breast Summit tab + International Breast Surgery Collaboration Map | Scope decided (world map) | — |
| 4 | Research Desk (team research dashboard) | Built, not rolled out | `C:\A.smart researches\dashboard` |

**Build order — easiest first, fellowship last (user, 2026-11-22).** Finish the
quick wins early, then give the fellowship full focus.

0. **Patient questions** (already built, unreleased) — internal test + launch.
   Goal 2 reuses its inbox code, so it should land first.
1. **Goal 2 — MDT front door** — one page, one form, one Admin inbox.
2. **Goal 3a — Summit tab** — an event entry + page that links out to the MEBS site.
3. **Goal 3b — Collaboration map** — needs the partner list and their consent;
   collect that in parallel from now.
4. **Goal 4 — Research Desk** — position provisional until we know what's
   wanted (rollout only would move it up).
5. **Goal 1 — Fellowship** — the main project. Its open questions can be
   answered in the background while 1–4 are built.

The summit tab and map must be live by spring 2027 (summit 2–3 Sep 2027).

---

## Cross-cutting — applies to all three

- **Branch:** `feature/patient-questions` is built but unpushed and untested.
  New goals should start from `main` on their own branches so they don't ride on
  unreleased work. Decide when we start building.
- **Languages:** the site ships English + Arabic (`app/lib/dictionaries`).
  Every new page, email and certificate needs both; Kurdish content, if any,
  needs its own decision.
- **Admin roles:** who can see applications / MDT cases / map entries. Patient
  questions set the pattern: a per-section read check, not just a write check.
- **Email:** Resend from `no-reply@ssthyroid.com` (already live).
- **Uploads:** patient questions launched with none. Fellowship (CVs, licences,
  passports) and MDT (imaging, pathology) both need private uploads — a new
  capability: private R2 bucket, signed URLs, size/type limits, virus risk,
  retention and deletion.
- **Caching:** any new public section must be added to the `PUBLIC_DOCUMENT`
  regex in BOTH `page-cache.ts` and `sw.js`, or it is uncached.
- **Privacy policy / terms:** each goal collects new personal data; both pages
  need updating before launch.
- **SEO / schema:** `EducationalOccupationalProgram` (fellowship), `Event`
  (summit), `Organization`/`member` (map). `llms.txt` + sitemap entries.
- **Honesty rule:** no claims of accreditation, partnership or endorsement that
  aren't true and in writing.

---

## Goal 1 — Fellowship programme

The biggest and most open. Areas to settle (✔ = decided):

**A. Programme design**
- [ ] Tracks: clinical fellowship / observership / research fellowship / short
      courses (ultrasound + FNA, neuromonitoring)? One programme or several?
- [ ] Duration, intakes per year, cohort size, start dates
- [ ] Eligibility: degree, specialty, years in practice, board status,
      licence, language, nationality (local vs international)
- [ ] Fees, scholarships, stipend, what the fee covers
- [ ] Hands-on vs observe-only (drives everything in C)

**B. Curriculum and assessment**
- [ ] Competency framework / learning outcomes per track
- [ ] Rotations: OR, clinic, MDT, ultrasound/FNA, pathology, radiology, research
- [ ] Case logbook (minimum numbers, role: observed/assisted/performed)
- [ ] Assessments: DOPS, mini-CEX, case-based discussion, 360° feedback,
      final exam or capstone project/case presentation
- [ ] Research output expectation (abstract, paper, poster at the summit)
- [ ] Teaching: journal club, case conferences, visiting faculty, sim/cadaver

**C. Legal, regulatory, recognition** *(things easy to miss — user,
2026-11-22: resolve these as we go, not up front)*
- [ ] Can non-licensed / foreign doctors touch patients? Kurdistan MoH and
      Iraqi Medical Syndicate rules; temporary licence; hospital privileges at
      Smart Health Tower
- [ ] Malpractice / liability cover for fellows
- [ ] Patient consent when a trainee is involved
- [ ] What the certificate *is*: certificate of completion, not a degree or
      board qualification. Any CME/CPD or board recognition must be real and
      named exactly
- [ ] Visa / invitation letters for international fellows
- [ ] Written fellowship agreement (duties, IP of research, confidentiality,
      photography of patients, social-media rules)

**D. Selection process**
- [ ] Application window and deadlines
- [ ] Documents: CV, degree, licence, ID/passport, references, personal
      statement, logbook to date
- [ ] Stages: screen → score → interview → offer → accept/decline → waitlist
- [ ] Scoring rubric, panel, conflict-of-interest rule, fairness
- [ ] Messages for every outcome, including rejection; feedback/appeal policy

**E. During the fellowship**
- [ ] Onboarding pack / handbook / code of conduct
- [ ] Supervisor + mentor per fellow
- [ ] Attendance, leave, remediation, dismissal policy
- [ ] Two-way evaluation (fellow rates programme and faculty)
- [ ] Wellbeing and a safe route to report harassment

**F. Certificate**
- [ ] Design, signatories, unique ID
- [ ] Public verification page (`/verify/<id>`, QR on the certificate)
- [ ] Revocation; PDF generation; "Add to LinkedIn"

**G. After — alumni**
- [ ] Alumni directory (opt-in), continued MDT access, alumni-as-faculty
- [ ] Outcome tracking (where alumni practise, papers, cases) → public proof

**H. Website / system**
- [ ] Programme pages per track (public)
- [ ] Application portal on the existing account system; applicant status page
- [ ] Admin pipeline: review, score, interview notes, decisions, bulk email
- [ ] Fellow portal later? (logbook, assessments, documents) — phase 2+
- [ ] Data retention for unsuccessful applicants

**I. Ideas beyond what we do now** (to discuss, not decided)
- Named cohorts; graduation at the summit; fellows' research day
- Pre-fellowship online module + entry quiz
- Exchange places with partner institutions (feeds goal 3's map)
- Fellow case presentations at the MDT (feeds goal 2)
- Public outcomes page: cohorts, countries, publications

---

## Goal 2 — External teams join our MDTs

**Decided 2026-11-22 — a front door, not a platform.** The site's job is to let
outside teams, doctors and institutes know our MDTs exist and reach us. How each
partner takes part is agreed in direct contact afterwards, off the site. This
keeps it clear of the second-opinion network (`docs/second-opinion-research.md`,
model 2) — revisit only if that network is built.

Site scope: a page explaining our MDTs (who sits on them, what cases, how often,
in person / online), an inquiry form (name, role, institution, country, contact,
what they want), and an Admin inbox (patient-questions pattern). **The form must
tell them not to send patient details** — there is no consent or
de-identification process on the site.

Agreed off-site later, not built now: who can join (doctors, teams, institutes; verification of
licence); participation levels (one-off case, regular member, observer);
inquiry → verification → agreement → onboarding; structured case template
(history, imaging, cytology/Bethesda, pathology, the question for the board);
**patient consent and de-identification**; data-sharing agreement; imaging
transfer (DICOM size — upload vs link); scheduling and meeting link; written
recommendation with "treating doctor remains responsible" disclaimer; outcome
follow-up; audit log; retention; Admin inbox; CME for attendees; fees or free.

---

## Goal 3 — Breast Summit + Collaboration Map

**The event (read from https://ibs.smarthealth.group, 2026-11-22):** Second
Middle East Breast Summit (2nd MEBS), **2–3 September 2027**, Smart Health Tower,
Madam Mitterrand Street, Sulaymaniyah. Successor to the First Iraqi Breast
Cancer Summit. Its own site has About, Program, Faculty, Registration, Venue,
Hotels, Transportation, Travel & Visa, Contact — so our tab should **summarise
and link out** (the `officialUrl` / `registrationUrl` fields already exist), not
duplicate registration.

Faculty listed so far (8): Prof. Maan Hachmi (UAE), Prof. Régis Paulinelli
(Brazil), Asst. Prof. Giuseppe Catanuto (Italy), Dr. Omar Layth Qassid (UAE),
Dr. Lana Rezan Abdulaziz (Iraq), Dr. Miaad Al-Ataar (UK), Dr. Dhirar Ansarei
(UAE), Dr. Mohamed Ahmed Abdelaal (Egypt) → 6 countries. Faculty are not the
same as supporting institutions; each still needs consent to appear on the map.

**Inconsistency on the summit site to fix at source:** the home page heading
says "Second Middle East Breast Summit" but its welcome text says "The Third
Middle East Breast Summit (MEBS 2027) will build upon … previous editions";
the About page says 2nd, building on the *First Iraqi Breast Cancer Summit*.
The domain is `ibs.` (Iraqi Breast Summit?) while the brand is MEBS. Settle the
edition number and name before our tab copies it.

**Summit tab:** reuse the events model (`app/lib/event-data.ts`, `type:
"Summit"` exists). Dates, venue, hybrid/stream, programme, faculty, registration,
abstract submission + review, sponsors, CME, accommodation/visa letters,
recordings afterwards, press kit.

**Map** — institutions, countries, experts, research partners, educational
activities. **Decided 2026-11-22:** a world map with a pin for each
collaborating place in its country — visual first, "cool and nice to look at".
Areas to cover:
- [ ] Scope: summit-only, or a site-wide collaboration map reused later for
      head & neck?
- [ ] **Written permission** from every institution/expert listed, and logo
      rights. "Supports" vs "collaborates" vs "sponsors" — exact wording
- [ ] Data model + Admin editing (entities, types, links between them,
      coordinates entered by hand)
- [ ] Map style — *recommended:* a stylised dotted world map (static SVG, no
      country borders, no tile service). Looks designed rather than "Google
      Maps", sidesteps disputed-border depiction (Kurdistan Region etc.), costs
      nothing per view, and is light on the Worker. Alternative: MapLibre +
      self-hosted PMTiles on R2 if zoom/street detail is ever needed
- [ ] Motion: pins appearing, arcs from Sulaymaniyah to partners? (reduced-motion fallback)
- [ ] Accessible list/table view alongside the map; mobile; RTL
- [ ] Performance: lazy-load map code, no Worker CPU spike
- [ ] Filters (type, country, activity), clustering, detail panel, counts

---

## Goal 4 — Research Desk

Separate app and repo: `C:\A.smart researches\dashboard`
(`github.com/sarkrda-kurdosis/research-desk`). Invite-only dashboard for active
papers, publications, ideas, deadlines and to-dos, with Google sign-in and a
Telegram bot. Vite + Supabase; 4 migrations; tests on isolated PostgreSQL.

State on 2026-11-22: 8 commits (last 2026-11-21); **uncommitted Telegram changes**
in 6 files; README describes a deploy that has not been confirmed done.

- [ ] What's wanted: roll out to the team? finish the Telegram bot? link it
      from or merge it into the website's Admin? (not yet asked)
- [ ] Which Supabase project it uses — the website's or its own (affects
      accounts and data separation)
- [ ] Hosting for `dist/`
- [ ] Bot rollout steps 1–7 in its README
- [ ] Note: its optional text classifier sends chat text to OpenAI — a
      privacy choice to make deliberately

---

## Decision log

| Date | Decision |
|---|---|
| 2026-11-22 | Three goals set; worked one at a time, fellowship first |
| 2026-11-22 | Fellowship legal/recognition questions resolved progressively, not before starting |
| 2026-11-22 | MDT section = awareness + inquiry front door; terms agreed in direct contact |
| 2026-11-22 | Collaboration map = world map, pin per place in its country, visual-first |
| 2026-11-22 | Summit = 2nd MEBS, 2–3 Sep 2027; fellowship stays first |
| 2026-11-22 | Four goals locked in: fellowship, MDT front door, summit + map, Research Desk |
| 2026-11-22 | Order: easiest first, fellowship last with full focus |
| 2026-11-22 | MDT: `/mdt` "Our MDT", explainer then form, specialties only (no names); shared Admin Inbox with patient questions; Owner + Contributors; team alert email on every submission; reply from team mailbox; built on `feature/patient-questions` and launched with it. Spec in `docs/superpowers/specs/` |
