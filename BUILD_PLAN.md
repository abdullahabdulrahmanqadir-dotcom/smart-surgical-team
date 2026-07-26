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

## Phase 1 — Public site

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

## Phase 2 — Content data layer

- Supabase schema: `content_items`, `topics`, `contributors`, `webinars`, `events`, `content_topics`, `content_contributors`. Publish state + `publish_at` for scheduled publishing.
- Row-level security: published content readable by anyone, drafts staff-only.
- Replace hardcoded placeholder arrays with server-side Supabase queries. Pages keep rendering identically.
- Seed script loads the current placeholder content so the site never looks empty.
- Written handover: how to add a video/webinar/poster from the Supabase dashboard.

**Done when:** you can add a video in Supabase and see it appear on the live site without a deploy.

## Phase 3 — Members

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
