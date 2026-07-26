# Smart Surgical Team — Build Plan

> **Status as of 2026-07-26:** Phase 0 complete and deployed (`68aa819`).
> Phase 1a (Topics) started, then paused at the client's request — the work sits
> on branch `phase-1a-topics-wip` and is unfinished. See `HANDOFF.md` for the
> exact state, known defects and the resume checklist.
>
> **Working agreement: stop after each phase.** Deliver, report, wait for the go
> before starting the next one. Interview the client on a page's design before
> building it.

Derived from `PROJECT_BRIEF.md`. Decisions locked 2026-07-26:

- **Order:** public site first, member platform second.
- **i18n:** three locales — English (LTR), Arabic (RTL), Sorani Kurdish (RTL). Structure now (locale routing + RTL + logical CSS properties), English strings only at first, Arabic and Sorani copy added later. **All three locales are URL-prefixed** — `/en/…`, `/ar/…`, `/ckb/…` — so no locale is privileged; `/` redirects to a detected locale.
- **Type:** Newsreader headings + Inter body (Latin); Noto Kufi Arabic + Noto Naskh Arabic (ar/ckb). Locked from the live `/specimen` review. Full rules in `design-system/smart-surgical-team/MASTER.md`.
- **Register:** varies by page type, not per page — editorial cleanliness on marketing pages, academy density on library/browse pages, immersive treatment for heroes and transitions throughout. Motion 5/10.
- **Design gate:** no page is built before its look is agreed. One global design-language decision governs what must stay consistent across pages; a short per-page interview covers hero, layout and hierarchy for that page only. Design decisions are recorded in `design-system/smart-surgical-team/`.
- **Content admin:** Supabase tables managed via the Supabase dashboard at launch. Custom admin is a later phase.
- **Content:** clearly-marked placeholders now, one real-content pass later.
- **Auth:** Supabase email/password now; Google provider added when OAuth credentials exist.
- **Review:** each phase is pushed to `main`, auto-deployed by Cloudflare, reviewed live before the next phase starts.

---

## Phase 0 — Foundation (no visible change)

The homepage is currently one 524-line component and one 2,009-line stylesheet. Eight more pages cannot be built on that without duplicating it.

- Extract reusable primitives from `app/page.tsx` into `app/components/`: `Section`, `PageHero`, `ContentCard`, `TopicCard`, `PersonCard`, `Button`, `Badge`, `Breadcrumb`, `SiteFooter`.
- Split `app/globals.css` into `tokens.css` (design tokens, light/dark), `base.css` (reset, typography, layout), and co-located component styles. Delete rules orphaned by the recent hero simplification.
- Add the shared page shell: header + footer + skip link + consistent `<main>` landmark, applied via `app/layout.tsx`.
- Add `app/lib/i18n.ts`: a `t()` lookup, `en` dictionary, locale-aware `dir` attribute, and a `[locale]` route segment for `en` / `ar` / `ckb`. Arabic and Sorani dictionaries stubbed, three-way switcher rendered.
- All layout CSS uses logical properties (`margin-inline-start`, `padding-inline`, `inset-inline`) rather than left/right, so both RTL locales work without a mirrored stylesheet. Arabic and Sorani webfonts loaded per-locale.
- Metadata helper: per-page `<title>`, description, OG image, canonical.

**Status: DONE** — commit `68aa819`, deployed. Locale routing, type system, RTL
tracking tokens, dictionaries, language switcher and 5 passing tests all landed.

Two items from this phase were **deferred into Phase 1a** rather than completed:
extracting the shared components out of `app/[locale]/page.tsx`, and splitting
`globals.css`. The page still carries its own inline sections and the stylesheet
is still one file. Do that as part of the first page build, not as a separate
pass.

## Phase 1b — Public discovery release

Every page uses Phase 0 primitives. Placeholder copy is marked with a `PLACEHOLDER` comment so the content pass can find it.

Each page gets its own design interview before it is built. Topics is first
because its card and detail-page patterns are reused by Contributors, Webinars,
Events and the Library.

1. **About Us** — team, location, vision, mission, specialties, contact. No stats.
2. **Topics** — *in progress, paused.* Index of the five taxonomy groups + a
   detail page per group. Design agreed: 5 group cards → detail pages; cards show
   anatomical icon + blurb only (client rejected content counts and inline
   sub-topic lists); cinematic anatomical hero distinct from the home page.
   Resume checklist in `HANDOFF.md` §6.
3. **Contributors** — surgeon grid + individual profile pages.
4. **Webinars** — upcoming vs past, registration CTA stubbed.
5. **Events** — chronological listing.
6. **Contact** — form wired to the existing `/api/contact` route, plus location, map, and channel links.
7. **Library (public face)** — the browse/filter UI visible to anyone, with items gated behind a "sign in to watch" state. No real auth yet.
8. **Sign in / Register** — the pages, forms and validation; submit disabled pending Phase 3.

**Done when:** all nav links resolve, no dead ends, responsive and dark-mode clean, Lighthouse accessibility ≥ 95 on every page.

## Phase 2 — Content foundation

- Supabase schema: `content_items`, `topics`, `contributors`, `webinars`, `events`, `content_topics`, `content_contributors`. Publish state + `publish_at` for scheduled publishing.
- Row-level security: published content readable by anyone, drafts staff-only.
- Replace hardcoded placeholder arrays with server-side Supabase queries. Pages keep rendering identically.
- Seed script loads the current placeholder content so the site never looks empty.
- Written handover: how to add a video/webinar/poster from the Supabase dashboard.

**Done when:** you can add a video in Supabase and see it appear on the live site without a deploy.

## Phases 3a and 3b — Identity, access and member learning

- Supabase Auth: email/password, registration capturing name, email, phone, city, profession into a `profiles` table.
- Session handling in the Worker runtime; protected routes; role column (`owner`, `content_manager`, `editor`, `contributor`, `member`).
- Library gating flips from "sign in to watch" to real access.
- Saved items, viewing progress, video chapters, webinar registration.
- Transactional email (provider TBD) for welcome + confirmation.
- Google sign-in switched on when OAuth credentials are supplied.

## Phase 4 — Content & polish pass

- Swap all placeholders for real bios, photos, videos, e-posters, contact details.
- Sorani translation pass + RTL visual QA.
- Image optimization, OG images per page, sitemap, robots, analytics.
- Final logo integration when ready.

## Phase 5 — Deferred (explicitly out of scope until asked)

Certificates · testimonials · outcomes statistics · appointment booking · custom admin panel · public YouTube channel page.

---

## Standing constraints

- `npm run build` must pass before every push; Cloudflare auto-deploys `main`.
- Build scripts use Unix env syntax — run builds through the Bash tool, not PowerShell.
- No breast content. Never present total laryngectomy as an SST procedure.
- Secrets: `NEXT_PUBLIC_*` are build-time variables; `SUPABASE_SERVICE_ROLE_KEY` is a runtime secret. Never inline the service key into client bundles.

---

## Delivery map — agreed future scope

The product is delivered in two releases. A phase must meet its definition of
done and be reviewed on the live Cloudflare Workers deployment before the next
phase begins. This keeps the public site, data layer and member experience from
becoming one unreviewable release.

This delivery map is the controlling scope statement. The earlier phase notes
remain useful as detailed checklists; where they conflict with this map, this
map wins.

| Release | Outcome | Included phases | Explicitly excluded |
| --- | --- | --- | --- |
| **Release A — Public discovery** | A credible, complete public site explaining SST, its team, topics and educational programme, with every public navigation path working. | Phase 1a and Phase 1b | Accounts, protected viewing, real content management, registration, certificates, booking |
| **Release B — Member learning platform** | A secure account and content experience: members can access, find and follow approved learning material. | Phases 2, 3a and 3b | Custom admin, certificates, public comments, appointment booking, public YouTube promotion |
| **Release C — Content and launch polish** | Real approved content, translations, operational integrations and launch readiness. | Phase 4 | New product features unless separately approved |

### Delivery rules

- **One phase, one deployable outcome.** Work in a feature branch; merge to
  `main` only after its checks pass. Cloudflare Workers Builds publishes `main`.
- **No design-by-implementation.** Before a new page or major interaction, agree
  its hero, hierarchy and primary action with the client and record the choice.
- **Placeholders are structural only.** They must be marked `PLACEHOLDER`; do not
  invent patient outcomes, lesson counts, biographies, contact details or dates.
- **A missing dependency is not a reason to fake a feature.** Ship an approved
  static/empty state or defer the capability to its named phase.
- **Every phase ends with a live review.** Record the deployed commit, tested
  routes, decisions made, and remaining client inputs in `HANDOFF.md`.

### Release gates

| Gate | Required evidence |
| --- | --- |
| Build | Production build, route tests and lint pass; no new console errors. |
| Experience | 375px, 768px, 1024px and 1440px checked; `/en`, `/ar` and `/ckb` checked for every new shared pattern. |
| Accessibility | Keyboard path, visible focus, headings/landmarks, contrast, reduced motion, and no horizontal overflow checked. |
| Content | Taxonomy and surgical examples match `PROJECT_BRIEF.md`; no breast content or total-laryngectomy feature claim. |
| Deployment | The approved commit is on `main`, Cloudflare Workers deployment succeeds, then the client reviews the live URL. |

### Phase 1a — Topics: finish the current bounded slice

**Objective:** establish the reusable topic-exploration pattern without starting
other public pages.

**In scope:** the published topic index, one route template serving every
published topic group,
cinematic topic hero, shared footer, linked featured topics on the home page,
an approved no-content state, and route/RTL coverage.

**Out of scope:** real lesson records, filtering, accounts, new public-page
layouts, and a content-management integration.

**Exit criteria:** every published topic card opens a working detail route; the home-page
cards use `FEATURED_TOPICS`; all new styles exist and use RTL-safe tokens; the
three locales render correctly; build, lint and expanded route tests pass; the
client reviews the deployed branch after merge.

**Client decision required before implementation resumes:** choose the topic
empty-state treatment — either a quiet “programme in preparation” state now, or
hold topic detail pages until initial content is available. Do not decide this
silently.

### Phase 1b — Public discovery release

**Objective:** complete the public-information experience using the topic-card
and page-shell patterns proved in Phase 1a.

**Suggested build order:**

1. About and Contributors (establish people/profile pattern)
2. Webinars and Events (establish chronological/content-card pattern)
3. Contact (connect the existing contact endpoint; destinations remain clearly
   placeholder until supplied)
4. Public Library preview (browse structure and member-access state only)
5. Sign-in and registration entry pages (presentation and validation only; no
   account creation until Phase 3a)

**Release A exit criteria:** all header/footer links resolve; every page has a
purposeful empty/placeholder state; contact submission has an approved delivery
destination; no public route promises member-only access; responsive, keyboard,
RTL and dark-mode checks pass across the shared system.

### Phase 2 — Content foundation

**Objective:** replace presentation-only arrays with a minimal production data
model while keeping the public experience stable.

**In scope:** Supabase project configuration; tables, migrations and RLS for
topics, contributors, content items, webinars and events; publish scheduling;
server-side read paths; safe placeholder seed data; a short dashboard operating
guide.

**Exit criteria:** a permitted staff member can publish a content item in
Supabase and see it on the deployed site without a code deployment; unpublished
items are not public; no service-role credential reaches the browser.

### Phase 3a — Identity and access

**Objective:** make account creation, sign-in and roles real before building
personal learning state.

**In scope:** Supabase email/password authentication, profile fields, role
model, session handling, protected library routes, and an email workflow once a
provider and wording are approved. Google sign-in is enabled only after OAuth
credentials are supplied.

**Exit criteria:** a new member can register, confirm/activate according to the
approved wording, sign in/out, and access gated material; roles are enforced
server-side and tested; account failures are understandable and accessible.

### Phase 3b — Member learning experience

**Objective:** deliver the learning workflows promised at launch on top of the
approved data and identity foundation.

**In scope:** library search and filters, content access state, YouTube embeds,
chapters, saved items, viewing progress, webinar registration/reminders, and
recordings appearing in the library.

**Constraints:** unlisted YouTube links are not a security boundary; sensitive
material needs a separate private-video decision. Webinar reminders require the
chosen webinar service and an email provider.

**Exit criteria:** a signed-in member can discover, watch, resume and save an
approved item; progress and saved items persist; webinar registration has a
clear confirmation path; public users cannot reach gated learning material.

### Phase 4 — Launch-content and operational readiness

Do this only when the team supplies approved bios, imagery, videos, dates,
translations, contact details, domain, logo direction and operational accounts.
The final pass includes per-page metadata and OG images, sitemap/robots,
analytics decision, image optimisation, live Sorani QA, and a production
content/permissions review.

### Decision and dependency register

| Needed before | Decision or input | Owner |
| --- | --- | --- |
| Phase 1a | Topic-page empty-state treatment | Client |
| Phase 1b Contact | Contact email, WhatsApp and where submissions are delivered | Client |
| Phase 2 | Supabase project ownership and production environment values | Client + implementation team |
| Phase 3a | Activation/confirmation wording; email provider; Google OAuth credentials if Google login is wanted | Client |
| Phase 3b | Webinar provider and reminder policy; initial approved content; decision for sensitive video hosting | Client |
| Phase 4 | Bios, photos, translations, final domain and logo direction | Client |

**Certificates remain deferred.** Remove the home-page certificate benefit before
Release A unless the client explicitly returns certificates to scope and defines
the completion rules.
