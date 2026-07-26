# Handoff — Smart Surgical Team website

Written 2026-07-26. Read this first, then `BUILD_PLAN.md`, then `PROJECT_BRIEF.md`.

- `PROJECT_BRIEF.md` — what the client wants. The authority on scope, taxonomy and content rules.
- `BUILD_PLAN.md` — the phase plan and locked decisions.
- `design-system/smart-surgical-team/MASTER.md` — type, colour and RTL rules.
- This file — where the work actually stands and what to do next.

---

## 1. What this project is

A trilingual education platform for a head-and-neck surgical team at Smart Health
Tower, Sulaymaniah, Kurdistan. Public marketing pages plus a members-only library
of surgical videos, webinars and e-posters.

**Stack:** Next.js 16 (App Router) on Cloudflare Workers via `vinext`, React 19,
TypeScript, Tailwind v4. Supabase for data and auth (not yet wired). Drizzle/D1
exists in the scaffold but is **unused** — do not build on it.

**Deployment:** push to `main` → Cloudflare Workers Builds auto-builds and
deploys. **Therefore `main` must always be deployable.** Do not commit
half-finished visual work to `main`; branch it.

---

## 2. Working agreements with the client

These were established in conversation and are binding.

1. **Stop after each phase.** Do not roll from one phase into the next. Deliver,
   report, wait.
2. **Design gate before any new page.** Interview the client on how a page should
   look before building it. Global look decisions are already locked (§4); the
   per-page interview covers only that page's hero, layout and hierarchy.
3. **Review happens live.** Each finished phase is pushed and reviewed on the
   deployed site.
4. **Placeholders now, real content later.** The client has bios, photos, videos
   and contact details but is not supplying them yet. Mark every placeholder with
   a `PLACEHOLDER` comment so the Phase 4 content pass can find them all.

### Environment notes that will bite you

- `npm run build` **fails on Windows** — the scripts use Unix env-var syntax
  (`WRANGLER_LOG_PATH=... vinext build`) and npm runs them through `cmd.exe`.
  Run `WRANGLER_LOG_PATH=.wrangler/wrangler.log npx vinext build` via the Bash
  tool instead.
- The dev server reports its real port in `preview_logs`, not in the tool result.
  It has been landing on **3001** while the preview tool reports something else.
- `npx tsc --noEmit` reports three pre-existing errors in `db/index.ts` and
  `worker/index.ts` (`cloudflare:workers`, `Fetcher`, `D1Database`). These are
  unrelated to app code. Filter them out; do not "fix" them.
- CSS edits do not always hot-reload correctly. A computed style that contradicts
  the stylesheet is usually stale — hard-navigate before believing it.

---

## 3. Where the work stands

### Done and deployed

**Phase 0 — commit `68aa819`, pushed to `main`.** Foundation only, no new pages.

- Three locales, all URL-prefixed: `/en`, `/ar`, `/ckb`. No language is
  privileged. `app/[locale]/` is the root layout (there is no `app/layout.tsx`).
- `proxy.ts` redirects unprefixed paths to a locale negotiated from
  `Accept-Language`. Sorani is matched from **both** `ckb` and `ku` tags because
  clients send either. Next 16 calls this `proxy.ts`, not `middleware.ts`.
- `app/lib/i18n.ts` — locale config, direction, path helpers.
- `app/lib/dictionaries.ts` — English is the source of truth; `ar` and `ckb` are
  empty and fall back per-key, so translation can land one key at a time.
- Fonts wired via `next/font/google`, self-hosted at build.
- Real three-locale language switcher (`LanguageSwitcher.tsx`), server-rendered
  as links so it works without JS.
- `tests/rendered-html.test.mjs` — 5 tests covering locale negotiation, `dir`/
  `lang` per locale, and switcher links. **All passing.**

### In progress — branch `phase-1a-topics-wip`, NOT on `main`

Phase 1a (Topics) was started and then paused at the client's request. Four
files exist. **They typecheck but are not finished and were never verified in a
browser.** Details and required rework in §6.

### Not started

Everything else. See `BUILD_PLAN.md` phases 1–5.

---

## 4. Locked design decisions

Do not relitigate these; the client chose them.

| Decision | Value |
|---|---|
| Latin headings | Newsreader (400/500/600) |
| Latin body | Inter (400/500/600) |
| Arabic-script headings | Noto Kufi Arabic |
| Arabic-script body | Noto Naskh Arabic |
| Motion | 5/10 — refined. Scroll-reveal, smooth hovers, page transitions. Not parallax-heavy. |
| Register | **Varies by page type.** Editorial cleanliness on marketing pages; academy density on library/browse; immersive heroes and transitions throughout. |
| Palette | Brand teal/aqua/ivory/copper — see `MASTER.md`. |

Type was chosen from a **live specimen page**, still at `/specimen`, rendering
all three candidate pairings in all three languages. Keep it until Phase 4; it
is the fastest way to re-check rendering when real Arabic and Sorani copy lands.

### The RTL rule that matters most

Arabic script joins its letters. **Negative letter-spacing breaks the joins**,
and uppercasing is meaningless. Tracking is therefore a set of CSS tokens
(`--tracking-tight`, `--tracking-label`, …) that `[dir="rtl"]` zeroes in one
place, in `app/globals.css`.

**When you write new CSS, use the tracking tokens. Never write a literal
`letter-spacing` value.** If you hardcode one, it will look correct in English
and be broken in Arabic and Kurdish, and nobody will notice until Phase 4.

Same reasoning for layout: use logical properties (`margin-inline-start`,
`padding-inline`, `inset-inline`) so one stylesheet serves both directions.

Also verified: both Noto faces declare `U+600-6FF`, which contains every Sorani
glyph needed (ڕ ڵ ۆ ێ گ چ ژ پ ک ە). Kurdish coverage is confirmed from the
served `@font-face` unicode-range but has **not** been eyeballed on a rendered
Sorani page — do that when real copy arrives.

---

## 5. Content rules from the brief — easy to violate by accident

- **No breast content.** Out of scope entirely.
- **Never present total laryngectomy** as a Smart Surgical Team procedure or
  featured item. Use thyroidectomy, parotidectomy, neck dissection, skin lesion.
- **No join-focused CTA on the home page.** The primary action is
  "Explore the Library". (A "Join free" button was found and removed in Phase 0.)
- **Certificates are deferred** — but the home page still advertises
  *"Certificates for completed tracks"* as a member benefit. **This is an
  unresolved contradiction.** It was raised with the client and they have not
  answered. Do not silently ship it either way; ask.
- No public comments on content.
- Contact form only — no appointment booking.

---

## 6. The paused Topics work — read before resuming

The client answered the Topics design interview:

- **Structure:** 5 group cards on the index → a detail page per group.
- **Card contents:** custom anatomical icon + short blurb. They explicitly
  **rejected** content counts ("18 lessons") and inline sub-topic lists.
  Counts were rejected because placeholder numbers would be lies.
- **Hero:** a cinematic anatomical moment, distinct from the home page hero.

### Files on branch `phase-1a-topics-wip`

| File | State | Action needed |
|---|---|---|
| `app/lib/topics.ts` | **Good.** 5-group taxonomy, single source of truth. | Keep as-is. |
| `app/components/TopicHero.tsx` | Markup good, **no CSS exists**. | Write its CSS. |
| `app/[locale]/topics/page.tsx` | Markup good, **no CSS exists**, never rendered. | Write CSS, then verify. |
| `app/components/SiteFooter.tsx` | **Fixed** — branch commit `16c12b4`. | Done; see defect 1. |

### Known defects in the WIP

1. **`SiteFooter.tsx` duplicated an existing footer — FIXED (branch commit
   `16c12b4`).** The component now uses the original class names, whose styles
   already exist in `globals.css`; the inline `<footer>` was removed from
   `page.tsx` and replaced with `<SiteFooter>`; the hardcoded Sorani column and
   its orphaned `.footer-kr` CSS are gone, replaced by a topic list generated
   from the shared taxonomy; footer strings moved into the dictionary; a test
   guards against a duplicate footer reappearing. Nothing left to do here.

2. **13 of 15 CSS classes used by the WIP do not exist.** Missing:
   `.visually-hidden`, `.topic-index-grid`, `.topic-card-lg`, `.topic-hero`,
   `.topic-hero-art`, `.topic-hero-copy`, `.topic-hero-intro`, `.footer-inner`,
   `.footer-heading`, `.footer-base`, `.footer-tagline`, `.footer-address`.
   The pages would render unstyled.

3. **The topic detail page was never written.** `app/[locale]/topics/[slug]/`
   does not exist, so every card on the index links to a 404.

4. **The home page still hardcodes its own 4-topic array** (`app/[locale]/page.tsx`
   ~line 40) instead of reading `FEATURED_TOPICS` from `app/lib/topics.ts`.
   Rewire it, or the two will drift.

### Remaining Phase 1a checklist

- [x] ~~Rewrite `SiteFooter.tsx` as an extraction of the existing footer~~ — done, `16c12b4`
- [ ] Write CSS for the topic hero, index grid and large topic cards
- [ ] Build `app/[locale]/topics/[slug]/page.tsx` (hero, sub-topic list, empty
      content state, cross-links to other groups)
- [ ] Rewire the home page to `FEATURED_TOPICS`
- [ ] Design a deliberate empty state — there is no content until Phase 2, and
      five pages saying "Coming soon" reads thin. This was flagged to the client
      and is unanswered.
- [ ] Verify in **all three locales**, including RTL layout, before claiming done
- [ ] Extend `tests/rendered-html.test.mjs` to cover the new routes

---

## 7. How to verify anything

Never claim a page works without rendering it.

```bash
WRANGLER_LOG_PATH=.wrangler/wrangler.log npx vinext build
node --test tests/rendered-html.test.mjs
```

Then start the dev server through the preview tool (never `npm run dev` in
Bash), find the real port in `preview_logs`, and check:

- the page renders in `/en`, `/ar` and `/ckb`
- `read_console_messages` is clean — restart the server first, because stale HMR
  errors from mid-edit states persist and will mislead you
- computed `letter-spacing` is `normal` on RTL headings
- computed `font-family` is Noto Kufi/Naskh under RTL, Newsreader/Inter under LTR

The browser pane is frequently unavailable for screenshots in this environment.
`read_page` and `javascript_tool` work regardless and are usually enough.

---

## 8. Open questions for the client

1. Certificates: drop the home page benefit line, or bring certificates back
   into scope? (§5)
2. Empty state for topic pages: build now with a designed empty state, or hold
   Topics until Phase 2 has real content? (§6)
3. Keep `/specimen` or delete it? (recommendation: keep until Phase 4)
4. Still unanswered from the brief: Zoom vs another webinar provider; contact
   email and WhatsApp number; domain name; email delivery provider; exact
   account-activation wording.

---

## 9. Current implementation update — 2026-07-26

This section supersedes the paused-WIP status above.

Phase 1a has been resumed on `codex/phase-1a-topics`, based on current `main`
with the two original WIP commits brought forward. The old
`phase-1a-topics-wip` branch is preserved unchanged.

### Implemented locally

- Topics index rebuilt as an editorial two-panel hero with an intentional four-card layout.
- Four locale-prefixed topic detail routes generated from the shared taxonomy.
- Focus-area lists, cross-links, and a designed “Programme in preparation”
  state while approved learning content is pending.
- Home-page topic cards now use `FEATURED_TOPICS`; invented lesson counts are
  removed.
- Header links work from nested routes and preserve the active locale.
- Responsive layouts, dark/light themes, RTL-safe styles and reduced-motion
  behavior.
- Expanded rendered-route suite: 12 tests covering the index, every published topic
  detail route in all three locales, shared taxonomy links and 404 behavior.

### Verification

- Production `vinext` build: passing.
- ESLint: passing.
- Rendered-route tests: 10/10 passing.
- Browser review: English mobile, dark theme, responsive icons,
  mobile navigation, no horizontal overflow, correct RTL font/tracking, and no
  console warnings/errors.
- `tsc --noEmit` still reports only the three documented scaffold errors in
  `db/index.ts` and `worker/index.ts`; no app-code type error was introduced.

### Current gate

The implementation is ready for client review but is not merged or deployed.
Review the designed empty state and visual direction first. After approval,
commit the remaining working changes, push the feature branch, merge to `main`,
confirm the Cloudflare Workers deployment, then stop before Phase 1b.

### Latest client-directed refinement (not deployed)

- The Upper Aerodigestive Tract group is retained in the taxonomy but is marked
  unpublished: it is absent from the public index, footer, related cards and
  public detail routes until the team elects to publish it.
- The hero no longer contains the “Curriculum” badge. Its copy now describes
  the four published tracks.
- Thyroid and salivary artwork is optically cropped on transparent canvases so
  it sits centred in each tile. Neck/Lymphatic and Skin/Soft Tissue now use
  locally served, recoloured Tabler SVGs; their MIT notice is kept with the
  assets in `public/topic-icons/THIRD_PARTY_NOTICES.md`.
- Current validation: lint, production build, `git diff --check`, and 12/12
  rendered-route tests pass. The English mobile page was checked with no console
  errors. Re-run the full multi-locale visual gate before deployment.

### Latest implemented change — sectioned topic library

The client asked for the lower Topics-page experience to be a real catalogue:
**categories as sections, with clickable boxes representing learning content
within each category.** This is implemented in `app/components/TopicsExplorer.tsx`.

- The anatomy chooser and four category selectors remain at the top of
  `/:locale/topics`.
- `topic-library` renders one section per published topic group. Each has a
  category header, an overview card, and one focused-area card per taxonomy
  subtopic.
- Cards link to the existing published topic-detail route. There are no approved
  video assets or individual lesson routes yet, so the UI labels them **Category
  guide** and **Focused learning area** rather than implying video playback.
- Selecting a top category still focuses the anatomy image and now also outlines
  its matching library section.
- CSS in `app/globals.css` uses three columns on wide screens, two below 900px,
  and one below 620px. Cards preserve visible keyboard focus and 200ms feedback.
- `tests/rendered-html.test.mjs` now asserts the four learning sections,
  category-guide markup, and locale-correct links. A production build and all
  12 rendered-route tests pass.

### Latest implemented change — progressive drill-down (this pass)

The client asked for the Topics page to become a guided, progressive experience
rather than a wall of stacked sections: pick one topic, its branch opens inline
and the *other* branches disappear; pick a focus area, its content opens. Design
spec: `docs/superpowers/specs/2026-07-26-topics-progressive-drilldown-design.md`.

- `TopicsExplorer.tsx` now owns three levels on one page: (1) a persistent
  region chooser, (2) a single focused branch for the chosen topic — only one is
  ever in the flow at a time, and (3) an inline "Programme in preparation" leaf
  per focus area (accordion, one open at a time). No content is invented; the
  leaf is the honest empty state Phase 2 fills.
- `/topics/[slug]` is now a **deep-link** into the same explorer, server-rendered
  pre-opened on that group (SEO + shareable + per-topic `<title>` preserved).
  The bespoke detail page body, `TopicHero.tsx`, and the dead
  `.topic-hero*` / `.topic-library*` / `.topic-content*` CSS were removed.
- Selectors and cross-links are real `<a href>` links (crawlable, work without
  JS); the client intercepts plain clicks and syncs the URL via `pushState`,
  with a `popstate` listener for back/forward.
- Verification: build passes; ESLint clean on changed files; `tsc` shows only the
  three documented scaffold errors; 12/12 rendered-route tests pass (the index
  test was rewritten for the chooser-only bare state). Browser-verified in
  `/en`, `/ar`, `/ckb`: inline drill-down, URL sync, subtopic accordion,
  RTL `letter-spacing: normal` + Noto fonts + mirrored arrows, single-column
  mobile with no horizontal overflow, console clean.

### Latest implemented change — three-level condition/case drill-down

The client refined the drill-down again: they want a **third level**. Choosing a
topic opens its **conditions** horizontally (papillary carcinoma, follicular
carcinoma, goiter, …), and choosing a condition reveals its **case-video boxes**
to browse. Reference for the content shape: the team's current site,
`ssthyroid.com/gallery` — each item is a titled surgical case with a short
clinical history, date, read time and (often) a video.

- `app/lib/topics.ts` gained a third level: `SubTopic` now represents a
  **condition** and carries `cases: CaseVideo[]`. The thyroid group's conditions
  come from the client's own `identity/icons/` set (papillary/follicular/
  medullary carcinoma, goiter, thyroglossal cyst, parathyroid); those five icons
  were copied into `public/topic-icons/`. **PLACEHOLDER:** each `cases` entry is
  a *real example* pulled from ssthyroid.com solely to show the populated layout
  — no real destinations, mark-and-replace in Phase 2. Follicular and medullary
  carcinoma have no example yet and intentionally show the empty state.
- `TopicsExplorer.tsx`: Level 2 is a horizontal **condition rail** (tabs) with a
  per-condition case count; Level 3 is a horizontally-scrolled **case rail** of
  `CaseCard`s (video/read badge, title, summary, date, read time) with a labelled
  "example cases … library in preparation" caption, or an honest per-condition
  "Cases in preparation" empty state.
- CSS: `.condition-rail`/`.condition-chip`, `.case-rail`/`.case-card`,
  `.case-empty` added; the old `.subtopic-*`, `.topic-empty-state*`,
  `.topic-detail-grid/-heading` rules removed. RTL-safe (logical props, tracking
  tokens; both rails scroll internally so the page never overflows).
- Verification: build passes; ESLint clean on changed files; `tsc` only the three
  scaffold errors; **13/13** rendered-route tests pass (new tests assert the
  condition rail, case cards, the empty state, and that examples are labelled as
  placeholders). Browser-verified en/ar/ckb incl. RTL tracking/fonts, condition
  switching, empty vs populated conditions, mobile with no page overflow, console
  clean.

Open follow-ups: the copied condition PNGs are raw (not optically cropped like
the topic-icons) — they may need the same transparent-canvas treatment. Case
cards have no destination yet by design.

### Next agent

1. Start from the commit recorded after this section on `codex/phase-1a-topics`.
2. Treat this as structural catalogue UI only. Do not add invented lesson titles,
   counts, video durations, thumbnails, or playback controls. Add real content
   cards only after Phase 2 provides approved content records and destinations.
3. Before merging to `main`, complete the documented three-locale visual gate
   (including keyboard and RTL checks) and obtain client review. Do not start
   Phase 1b before that approval.
