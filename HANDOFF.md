# Handoff — Smart Surgical Team website

**Updated:** 2026-08-24
**Read this first.** It supersedes the old paused-Topics notes in this file and
the stale Phase 1a status text in `docs/project/BUILD_PLAN.md`.

**Latest work:** The launch SEO sequence is paused after sitemap and Google
Analytics setup. Read `docs/project/SEO_LAUNCH_HANDOFF.md` before resuming it.

## 1. Project at a glance

Smart Surgical Team is a trilingual head-and-neck surgery education platform for
Smart Health Tower, Sulaymaniah. The public-facing site is being built first;
the authenticated learning platform, real content management and member
workflows follow later.

### Stack

- Next.js 16 App Router, React 19 and TypeScript
- Cloudflare Workers-compatible output through `vinext`
- Tailwind v4 plus the project stylesheet in `app/globals.css`
- Supabase for content, members and auth; Cloudflare R2 for editorial media
  (`smart-media`, served through `/api/media/…`) and for both server caches
  (`smart-cache`)

### Key reference documents

- `docs/project/PROJECT_BRIEF.md` — product scope, clinical constraints and
  future feature requirements
- `docs/project/BUILD_PLAN.md` — broader delivery plan; its old Topics status
  is historical only
- `assets/design-system/smart-surgical-team/MASTER.md` — typography, colour and
  RTL rules
- `docs/superpowers/specs/2026-07-26-topics-progressive-drilldown-design.md` —
  earlier drill-down specification; the current Topics UI has since evolved

## 2. Current working agreement

1. **Work locally by default.** The client has a localhost preview and asked
   that routine changes are not published automatically.
2. **Publish only when the client explicitly asks.** A requested production
   release must use the validated commit, not an arbitrary worktree state.
3. **Commit when asked.** Do not assume that a visual refinement should be
   pushed or deployed just because it was committed.
4. **Keep medical content honest.** Current case records are visual placeholders
   for layout only; they do not have destinations or approved media yet.
5. **Do not advance into another product phase without the client’s direction.**

## 3. Exact repository and deployment state

### Branch

Work lands on `main`. Keep `main` deployable, since pushing it deploys.

### Deployment

The site is the Cloudflare Worker **`smart`**, deployed from `main` through the
Cloudflare Git integration — pushing to `main` deploys. The Worker's Bindings
tab in the Cloudflare dashboard is the source of truth for bindings and
secrets.

Cloudflare is the only deployment target. The OpenAI Sites packaging that this
repository started from — `.openai/hosting.json`, the `sites` Vite plugin and
its deployment archives — has been removed, along with the unused D1/Drizzle
scaffold that came with it. The app's data layer is Supabase.

### Cloudflare Error 1102 recovery and offline resilience (2026-08-19)

This release addresses the production `Worker exceeded resource limits` outage.
Public vinext SSR responses had been sent with `Cache-Control: no-store`, so
repeat page views still executed SSR in the Worker. Warm local production-route
measurements were roughly 14–28 ms, above the Cloudflare Free plan's 10 ms CPU
allowance. The existing `unstable_cache` calls reduced Supabase traffic but did
not cache the final rendered HTML.

The fix adds two complementary cache layers:

- `worker/page-cache.ts` caches safe public HTML in the regional Cloudflare
  Cache API and in a global store — Workers KV at the time, the `smart-cache`
  R2 bucket since 2026-08-31; see §"Both caches moved from KV to R2" below. It
  only caches cookie-free, authorization-free `GET` requests with no query
  string and bypasses RSC, prefetch, admin, auth, profile and API traffic.
- Public HTML is fresh for 60 seconds. The global store keeps a 24-hour stale
  copy that can be returned immediately during an SSR failure or CPU outage
  while a refresh is scheduled with `waitUntil`. Inspect `x-sst-page-cache`
  (`MISS`, `HIT`, or `STALE`) when diagnosing production.
- Cached pages now send `Cache-Control: public, max-age=60, s-maxage=60,
  stale-while-revalidate=86400`, allowing browsers to reuse recent HTML too.
- `lib/supabase/server.ts` memoizes the server client, and the allowed image
  widths are hoisted out of the request handler to reduce CPU on genuine cache
  misses.
- `public/sw.js` provides device/offline resilience. It precaches both locale
  homes and core shell assets, saves the exact page open during installation,
  uses network-first for safe public navigation, and falls back to the last
  successful page for network errors, 1102 responses, and other server errors.
  Versioned assets are cache-first; public media is stale-while-revalidate.
- The service worker never stores personalized requests, query-bearing
  navigation, RSC responses, auth/admin/profile pages, private APIs, opaque
  responses, or unsuccessful responses. `public/_headers` prevents a stale
  service-worker script while keeping hashed assets immutable.
- `public/manifest.webmanifest` and the registration in
  `app/[locale]/layout.tsx` make the offline layer available on supported
  browsers and installed devices.

When changing cached route rules or response formats, bump
`PAGE_CACHE_VERSION` in `worker/page-cache.ts`. When changing service-worker
cache behavior, bump `VERSION` in `public/sw.js`; these versions are independent.

This section describes the release requested for `main` on 2026-08-19. Pushing
`main` triggers the Cloudflare Git deployment. After deployment, verify and
prime `/en`, `/ar`, `/en/topics`, and `/ar/topics`, then confirm repeat requests
return `x-sst-page-cache: HIT`.

### Both caches moved from KV to R2 (2026-08-31)

The `sst-cache` KV namespace was deleted after the account hit KV's free-plan
limits, which are per **day** and shared by the whole namespace: 1,000 writes,
1,000 deletes, 1,000 lists and 100,000 reads. This site spends them quickly —
every cold render of a public page writes an entry, and every publish from the
Admin expires a tag — and the only way past them is a paid plan.

R2's free plan measures the same work per **month**: 1,000,000 Class A
operations (write, delete, list) and 10,000,000 Class B operations (read),
against 10 GB of storage. Roughly thirty times the daily write headroom, at no
cost, for exactly the same job.

Deleting the namespace also switched both caches off, which is worth
understanding before reading old numbers: `worker/index.ts` only installs a
cache handler when the binding exists, and `servePublicDocument` renders
straight through when it does not. Between the deletion and this change, every
public page view executed SSR and queried Supabase unless the isolate happened
to be warm.

**What now stores what.** One bucket, `smart-cache`, holds both caches under
separate key prefixes so neither can list or expire the other's keys:

| Prefix | Written by | Holds | Lifecycle rule |
|---|---|---|---|
| `page:v1:` | `worker/page-cache.ts` | rendered public HTML documents | expire after 2 days |
| `data:` | vinext's `KVCacheHandler` | `unstable_cache` entries and tag markers | expire after 31 days |

`worker/r2-cache-store.ts` is a Workers-KV-shaped façade over the bucket.
`KVCacheHandler` is upstream vinext code written against `get`/`put`/`delete`/
`list`, so handing it the façade keeps its tag semantics, entry validation and
stale-while-revalidate rules untouched rather than reimplementing them.

**Three behavioural differences from KV, all handled in code:**

- **R2 has no `expirationTtl`.** Both caches stamp an `expiresAt` into custom
  metadata and treat a passed-expiry object as absent; the page cache also
  refuses anything older than its 24-hour stale window. The bucket lifecycle
  rules above are the backstop that reclaims storage for keys nothing reads
  again — they are set on the bucket, not in this repository, with
  `npx wrangler r2 bucket lifecycle list smart-cache` to check them.
- **R2 is one regional bucket, not KV's edge-replicated store**, so a read
  costs more. `page-cache.ts` now seeds the regional Cache API from *stale*
  entries as well as fresh ones, which caps R2 reads and background re-renders
  at one per colo per minute instead of one per reader.
- **R2 is read-after-write consistent.** KV took up to 60 seconds to propagate
  globally, so a tag expired by the Admin could keep losing to a cached entry
  for a minute after a publish. That window is gone. The page cache's own
  60-second freshness window is unchanged and is still what governs how quickly
  a publish appears.

`PAGE_CACHE_VERSION` was deliberately left at `v1`; the reason is at the top of
`worker/page-cache.ts`.

Guarded by `tests/r2-cache-store.test.mjs` (the façade, including the expiry and
list-metadata behaviour KV gave for free) and the two page-cache suites, which
now run against `tests/memory-r2.mjs`.

## 4. What is implemented now

### Shared site foundation

- Locale-prefixed public routes: `/en` and `/ar`
- Locale negotiation at the bare root through `proxy.ts`
- English is the source dictionary. Arabic is translated in
  `app/lib/dictionaries.ts` and falls back to English per missing key. Kurdish
  (`ckb`) was removed 2026-08-08 — do not reintroduce it without re-adding the
  locale to `LOCALES`, `LOCALE_META`, the switcher flag map and the tests.
- Light/dark themes, reduced-motion handling, skip link, responsive header and
  shared footer
- Newsreader/Inter for Latin text; Noto Kufi Arabic for all Arabic (headings,
  body, and Arabic strings inside English pages)

### Current Topics experience

Public routes:

- `/:locale/topics`
- `/:locale/topics/:slug` for the four published tracks

Published tracks:

1. Thyroid & Parathyroid
2. Salivary Glands
3. Neck & Lymphatic Surgery
4. Skin & Soft Tissue

`Upper Aerodigestive Tract` remains in `app/lib/topics.ts`, but is marked
unpublished and must not appear in public navigation or routes until approved.

The current screen is a content-first Topics browser, not the older three-level
condition-rail design described in past handoffs:

- An anatomy-led hero opens on the first public topic at `/topics`; a topic URL
  opens its matching topic.
- Four compact topic cards switch the active subject while preserving shareable
  locale-aware URLs.
- The selected topic presents a **Case library** with a responsive three-column
  grid (two columns on medium screens, one on small screens).
- Each card has a visual type treatment, condition label, title, short clinical
  summary, date and read time. Cards are non-navigable until approved detail or
  video destinations exist.
- Active-topic case data is filterable by subtopic, publication year and format
  (video vs case study).
- A text search now matches case title, summary, subtopic and date as the user
  types. `Clear all` resets the search and all filters without changing the
  selected topic.
- Empty search/filter results are explicit and provide a clear recovery path.

### Topics design refinements completed in this pass

- The Topics palette keeps teal (`#167A78`) as the primary interactive colour.
  Olive, honey, clay and restrained rose from the supplied palette add warmth to
  topic cards, filter surfaces and case artwork without overriding teal actions.
- Removed the hero’s `4 surgical tracks · … learning cases` counter and the
  `Now exploring` anatomy overlay after client review.
- The Neck/Lymphatic and Skin/Soft Tissue selector cards now use the built-in
  medical glyphs rather than the unsuitable image icons.
- The language control is a globe-led dropdown, based on the client’s reference
  screenshots. It presents full language names with CSS-rendered US, Kurdistan
  and Iraq flag treatments. It supports click-outside and Escape dismissal,
  keyboard focus, locale-preserving links and a compact header trigger on
  smaller screens.

### Important content status

`app/lib/topics.ts` deliberately contains **placeholder example cases** to make
the layout reviewable. They were adapted from the team’s existing archive and
have no approved destinations. Before public clinical use, Phase 2 must replace
them with team-approved records, media, imagery, ownership and consent status.

### Research administration (2026-08-03)

Research is now **database-backed** and managed from the admin workspace; the
old external `smarthealth.group` feed is no longer read.

- New migration `supabase/migrations/0009_research.sql` creates
  `public.researches` and `public.research_media`, and seeds the **29** papers
  that were live on the site (generated by `scripts/generate-research-seed.mjs`,
  keeping their existing external image URLs). **This migration must be applied
  to Supabase before research appears** — until then `/:locale/research` shows
  its empty state.
- `app/lib/research.ts` reads published rows through `unstable_cache`
  (60s revalidate, tag `published-research`), mirroring `content.ts`.
- The admin **Contact inbox** section was removed. A **Research** section
  replaces it: search + Year/Type/Status filters, and an editor with a cover
  image plus an image gallery. Covers and gallery images upload to R2 via
  `/api/admin/upload` and serve through the cached `/api/media/…` route, exactly
  like content media. New covers/galleries are self-hosted; imported papers keep
  their external cover URL until an editor replaces it.
- The public research detail page now renders the cover image and a figure
  gallery.
- The `contact_messages` table is left untouched in the database (only the admin
  UI/API surface was removed).

## 5. Files most likely to be touched next

| File | Purpose |
|---|---|
| `app/components/TopicsExplorer.tsx` | Topics selection, search/filter state and case-card rendering |
| `app/lib/topics.ts` | Single source of truth for topic groups, subtopics and placeholder cases |
| `app/components/LanguageSwitcher.tsx` | Accessible language dropdown and locale-preserving navigation |
| `app/components/SiteHeader.tsx` | Header placement and mobile menu integration |
| `app/globals.css` | Global tokens and all Topics/language-menu responsive styles |
| `tests/rendered-html.test.mjs` | Static rendered-route contract tests; currently needs updating |
| `app/lib/dictionaries.ts` | English source strings and the Arabic translation |

## 6. Validation status — do not overstate it

### Verified for the 2026-08-19 caching release

- Production build: passing (`npm run build`)
- Wrangler deployment dry run against `dist/server/wrangler.json`: passing
- Targeted ESLint for the changed application, Worker and service-worker files:
  passing
- Cache and offline tests: 4 of 4 passing
- Local browser smoke test: manifest and service worker loaded; the worker
  fetched both locale homes, core assets and the exact open page for precaching
- Header checks: service worker revalidates, manifest caches for one hour,
  public HTML caches for 60 seconds and reports `x-sst-page-cache`

Do not report the whole repository as clean: full `npm run lint` still has the
pre-existing `react-hooks/set-state-in-effect` error in
`app/components/ResearchExplorer.tsx` plus image warnings. The broader rendered
HTML suite currently has three content/data-fixture failures (staff directory,
an Arabic topic label, and the Papillary Carcinoma topic-detail fixture). A raw
`npx tsc --noEmit` also reports pre-existing Supabase generic `never` errors in
admin/events code; none point to the caching files changed in this release.

### Rendered-route test harness

The test suite checks the current interaction contract: four
`.content-topic-option` selectors, the default case library, search, three
filters, case grid/cards and a representative example case for every published
topic route.

**The suite needs its loader hook.** The tests import the built Worker bundle
into plain Node, which cannot resolve `cloudflare:workers`. Once the R2 media
and upload routes started importing it, all 15 tests failed to load — a failure
that predates the performance work and was fixed on 2026-08-03 by stubbing that
module. Run the tests through the hook, as `npm test` now does:

```powershell
node --import ./tests/register-hooks.mjs --test tests/rendered-html.test.mjs
```

### Editable case sections (2026-08-05)

A case record is no longer five fixed headings. In the content editor every
heading can be renamed, sections can be reordered or removed, and **Add a
section** appends a new one with the same rich-text toolbar as the rest.

- New migration `supabase/migrations/0010_case_sections.sql` adds
  `content_items.case_sections` (jsonb), holding the whole ordered record as
  `[{ key, label, body }, …]`. **Apply it to Supabase.** Until it is applied the
  code degrades rather than breaks: reads and writes retry without the column,
  the five built-in sections keep using their legacy `case_*` columns, and a
  save that would have stored a renamed heading or an added section returns a
  warning the workspace shows in place of the usual "Saved" notice.
- The built-in five keep their keys (`presentation`, `imaging`, `procedure`,
  `histopathology`, `outcome`) and are still mirrored into their own columns, so
  renaming a heading does not move the text. `resolveCaseSections()` in
  `app/lib/content-types.ts` is the single reader: it prefers `case_sections`
  and falls back to the legacy columns for rows saved before this change.
- Media in the editor can be dragged into the order it should publish in (or
  nudged with the arrow buttons); the list order is written as `sort_order`,
  which the gallery and the videoless hero image already follow.
- Saving shows a progress bar in the sticky editor header, stepping through each
  pending R2 upload and the database write.
- **Import from case.json** at the top of the content editor reads an archived
  case file (`cases/<page> - <n>/case.json`) and fills the title, card summary,
  video link, reading time and the whole section list. It shows what it will do
  before touching the editor, asks before replacing work in progress, and lists
  everything it could not apply: skipped empty headings, sections with no
  heading, the file's categories, its publication date, and the images (never
  uploaded — pick them from the same folder with "Choose files"). The archive
  writes a heading as its own text-less entry followed by unheaded body entries;
  those are collected back under their heading. Verified against all 20 files in
  `cases/`.

### Verification commands on Windows

`npm run build` uses Unix-style environment assignment and fails under normal
Windows `cmd.exe`. Use:

```powershell
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; npx vinext build
npm run lint
node --import ./tests/register-hooks.mjs --test tests/rendered-html.test.mjs
```

### Performance architecture (2026-08-03)

Public pages no longer query Supabase on every request.

- `app/lib/content.ts` exposes two projections. `getLibraryContent` and
  `getTopicContent` return `ContentCard`, which carries only what a card
  paints; `getContent` returns the full `ContentRecord` and is used solely by a
  case page. Both go through `unstable_cache` with a 60-second revalidate and
  the `published-content` tag. `app/lib/events.ts` does the same under
  `published-events`.
- **Cache durability depends on the `CACHE_BUCKET` binding.** `worker/index.ts`
  installs vinext's `KVCacheHandler` over `worker/r2-cache-store.ts` when the
  `smart-cache` R2 bucket is bound as `CACHE_BUCKET`, and otherwise falls back
  to a per-isolate memory cache that goes cold with the isolate. The binding is
  declared in `localBindingConfig` in `vite.config.ts`, which is what the build
  writes into `dist/server/wrangler.json` — that generated file, not the
  dashboard Bindings tab, is what a deploy applies.
- Topics load one at a time. `/topics` reads nothing; `/topics/:slug` renders
  only that group; the explorer fetches any other group from
  `/api/topics/:slug/cases` and keeps it for the session.
- Data-dependent sections sit behind `Suspense` with skeleton fallbacks, so
  headers, heroes and footers paint before any query resolves.
- `LazyImage` gives every thumbnail its own placeholder and fade-in so images
  never hold up text. `/api/media/:path+` answers from the edge cache and
  handles conditional requests, so repeat image loads do not touch R2.

Measured on the local dev server against the same routes, before and after:

| Route | Before (TTFB) | After, cache warm | After, cache cold |
|---|---|---|---|
| `/en/topics` | 0.56–0.70 s | 0.04–0.05 s | — (no query) |
| `/en/topics/thyroid-parathyroid` | 0.58 s | 0.04–0.05 s | 0.19 s |
| A case page | 1.36–1.38 s | 0.06–0.08 s | 0.07 s |

`/en/topics` also dropped from 168.6 KB to 147.4 KB because it no longer
serialises every topic's cases in order to display none of them.

`npx tsc --noEmit` historically reports pre-existing scaffold errors in
`db/index.ts` and `worker/index.ts` around Cloudflare Worker types. These were
not part of the Topics work; confirm them separately before attempting a broad
TypeScript cleanup.

### Required manual QA before the next requested release

- `/en/topics` and `/ar/topics`
- One direct detail URL for each public topic
- Topic switching, search, every dropdown filter, native search clear affordance
  and `Clear all`
- Language menu: mouse/touch, Escape, outside click, keyboard focus and each
  locale link
- Light and dark themes at 375px, 768px, 1024px and 1440px
- RTL typography: Arabic headings must have normal tracking and use the Noto
  font stacks; verify no horizontal overflow

### QA pass completed 2026-07-28

This gate was run against the local preview and covers the three previously
ungated commits (palette refresh, language-menu restyle, case search/filters).

- **Locales/routes** — `/en`, `/ar` topics index plus detail routes:
  correct `dir`/`lang` (`rtl`, `ar`), four topic selectors, three filters,
  five case cards, correct topic pre-selected on deep links.
- **RTL typography** — zero elements with non-normal `letter-spacing` across all
  headings/links/buttons; Noto Kufi Arabic for headings and body alike. No horizontal overflow in any locale.
- **Case library** — search filters 5→2 on `goiter`; a no-match query shows the
  honest "No cases match this search" empty state; format filter returns the one
  case study; `Clear all` appears only when a filter is active and resets search
  plus all three selects.
- **Language menu** — opens on click, closes on Escape and on outside pointer
  press, `aria-expanded` tracks state, locale links preserve the current path
  and mark the active locale with `aria-current`.
- **Responsive/theme** — case grid reflows 1/2/3 columns at 375/768/1024 with no
  overflow at any width; light theme applies its cream/white tokens and persists
  via `sst-theme`.
- **Console** — clean; no errors or warnings.

**Defect found and fixed:** `LanguageSwitcher` hardcoded `id="language-options"`,
but the header renders the switcher twice (desktop and mobile), producing a
duplicate DOM id so the mobile trigger's `aria-controls` resolved to the desktop
menu. Now uses React `useId()` per instance.

Two apparent failures during this pass were **stale hot-reload artifacts**, not
defects — the language menu appeared not to open, and the light theme appeared
not to apply. Both behaved correctly after a hard reload. Always hard-navigate
before believing a computed style or interaction failure in dev.

## 6b. News section — built end to end on placeholders (2026-08-26)

A News section was designed with the client and **both phases are implemented**:
the data model and admin workspace, and the public feed, item page and homepage
banner. Read `docs/superpowers/specs/2026-08-26-news-section-design.md` first —
it carries the design, every client decision, the deviations and the
verification actually performed (§14 Phase 1, §15 Phase 2).

**Two things are outstanding, in this order.**

1. ~~Apply `supabase/migrations/0021_news.sql`.~~ **APPLIED 2026-08-29** with
   `npx supabase db query --linked -f supabase/migrations/0021_news.sql`. The
   stored CLI login turned out to be on the correct account already — 
   `projects list` returns exactly one project, `smartsurgicalteam` at
   `elcjynpdcqxpxfqcamuw`, `linked: true`, and `supabase/.temp/project-ref`
   matches the ref inside the app's own `SUPABASE_URL`. The admin News section
   can now be opened. Verified afterwards **through the app's own service-role
   credentials**, not the CLI, so the check was independent of the write path:
   all three tables return 200 where they returned `PGRST205` before; the four
   categories are seeded with their Arabic names; RLS is on with a select-only
   read policy on each table; and every index exists, including
   `news_items_single_pin_idx`.

   Both guarantees were then exercised against the live database with two
   throwaway rows, since neither can be proved by reading the schema: an
   anonymous reader saw the published row and **not** the draft, and a second
   `pinned = true` was refused with
   `23505 … violates unique constraint news_items_single_pin_idx` — which is
   exactly why the admin API clears the old pin before setting the new one.
   Both rows were deleted; `news_items` and `news_media` are empty again and
   the four categories are intact.
2. **The first real news item is published (2026-08-29)** —
   `international-consultants-join-our-mdt-meeting`, Event recaps, pinned to the
   homepage, with a 15-image gallery. Spec §19 has the detail. Publishing it
   **retired the placeholders on its own**: `getNewsItems()` prefers the
   database, so the six `Example:` items left the feed, the sitemap and the
   banner with no code change.

   Its images were 204 MB of 6720x3776 PNG; they are 2.6 MB of 2200px WebP in
   R2 under the usual `topics/news/<slug>/…` keys. **The media route does no
   resizing** — the stored file is the delivered file, so size images before
   upload.

3. ~~Remove the placeholders before the first release carrying real news.~~
   **DONE 2026-08-29** (spec §20). The example set is deleted;
   `getNewsItems`/`getNewsCategories` are now straight pass-throughs with **no
   fallback content**, so an empty database renders the feed's own empty state
   rather than anything invented.

   The nine placeholder-dependent tests were **rewritten, not deleted**: five
   rendered-route tests for what must hold with nothing published, plus a new
   `tests/news-rules.test.mjs` with 14 unit tests covering the item-shape rule,
   section resolution, the per-field Arabic fallback and date handling
   directly. Node 24 strips TypeScript natively and `news-data.ts` has no
   server imports, so it imports straight into the test runner. **`npm test` is
   now 46/46**, up from 36; lint and `tsc` are at their documented baselines.

   One of the new tests is a deliberate regression guard — *"an empty news feed
   invents nothing to fill itself"* — asserting no example headline, disclaimer
   or slug can reappear in either locale.

Public routes: `/:locale/news` (lead story, 3/2/1 grid, category chips) and
`/:locale/news/:slug` (body, cover, gallery, related event/case/paper, share
actions, more-news rail). The homepage carries only the dismissible pinned
banner, by the client's decision — no latest-news strip.

**A cache decision to leave alone:** a newly pinned item can take up to an hour
to reach every reader, because the page cache is not tag-aware. The client chose
this explicitly over a client-side fetch or cache purging. Do not "fix" it
without asking.

**Verifying a cached route: send the browser's header.** `curl` without
`accept: text/html` fails `isPublicDocumentRequest` and bypasses the page cache
entirely, so it measures raw SSR and says nothing about what a reader sees. A
"the page is clean" check made that way is worthless for any cached route — use
`curl -H "accept: text/html"` and read `x-sst-page-cache`. This cost a wrong
"it's fixed" on 2026-08-29; spec §21.

**Stale content in dev is usually a zombie dev server.** If the dev log says
"Port 3000 is in use, trying another one", the port being looked at is served by
an older run. Stop every `workerd` process (they hold miniflare's sqlite open),
delete `.wrangler/state/v3/cache` and `.wrangler/state/v3/r2`, then restart.
Those are local caches only — the production `smart-cache` bucket is untouched,
and dev never writes to it (the binding is deliberately not `remote`).

**Service-worker navigation fix (2026-08-29, `VERSION` v3).**
`publicNavigation()` answered from the device cache for *any* unstorable
response, so a healthy 200 marked `no-store` served withdrawn content
indefinitely. It now falls back only when the response is unsuccessful. The v3
rename is what actually evicts already-stored pages from a reader's device,
since `activate` deletes every `sst-` cache it no longer names. Two tests guard
both halves.

**Caching now matches the rest of the site.** News was initially uncached: both
`worker/page-cache.ts` (edge + global store) and `public/sw.js`
(device/offline) gate on a
`PUBLIC_DOCUMENT` path whitelist that news was missing from. Both now include
it, `sw.js` `VERSION` is bumped to `v2`, and a test asserts the two copies of
that rule stay identical — a section added to one and not the other would be
edge-cached with no offline copy. `PAGE_CACHE_VERSION` was deliberately left at
`v1`; the reason is written at the top of that file, and §16 of the spec explains
it. Measured: `/en/news` returns `MISS` then `HIT` with the same
`cache-control` as `/en/topics`.

Verified: `npm test` 36/36, `npm run lint` at the documented baseline (1
pre-existing error, 17 warnings), `npx tsc --noEmit` unchanged at 78, build
passing, and every route plus every cache bypass exercised against the real dev
server.

**The browser QA list is now done too (2026-08-29)** — see §17 of the spec.
Both locales, light and dark, at 375/768/1024/1440: zero horizontal overflow,
zero non-normal letter-spacing, correct grid breakpoints, the banner dismissal
persisting across a reload and returning when a different item is pinned, and
all four share actions. Console clean.

That pass found and fixed one **site-wide** defect: `[lang="ar"]` in
`globals.css` out-specifies `h1, h2, h3`, so every Arabic-authored heading was
rendering in the Arabic *body* face instead of the display face. One rule was
added beneath it scoping headings back to `--font-display-arabic-stack`. It
would have hit Arabic event, case and research titles too; the Arabic
placeholder news item is simply the first Arabic-authored title the site has
ever rendered.

The same pass also checked heading order, alt text, accessible names, focus
visibility, keyboard chip activation, `prefers-reduced-motion`, the link-only
card's `noindex` + sitemap exclusion, and a dangling related record — all
correct. One nit was fixed: `NewsShare`'s copy button now returns to its resting
label after 2.2s instead of reading "Link copied" for the rest of the visit.
`npm test` 36/36 and `npm run lint` at the documented baseline after both fixes.

Local only, unpushed, uncommitted.

## 7. Remaining work, in priority order

### Immediate maintenance before another release

1. ~~Perform the manual QA list in §6 against the local preview.~~ Done
   2026-07-28; results recorded in §6.
2. ~~Ask the client whether the current Topics structure is approved.~~
   **Approved 2026-07-28.** The Topics case-library structure is signed off.
   The client noted one follow-up: **the case images need to be changed** —
   deferred by their instruction, tracked under Phase 2 below.
3. ~~Push `codex/phase-1a-topics` to the remote.~~ Pushed 2026-07-28 at
   `6f1e269`.

Phase 1a is therefore cleared to merge to `main`. Remember that merging to
`main` triggers the Cloudflare Workers Builds deployment — it publishes.

### Phase 2 — replace visual placeholders with real content

- Establish the approved Supabase data model and server-side public queries.
- Replace `app/lib/topics.ts` placeholder cases with approved content records.
- **Replace the case images.** The client approved the Topics structure on
  2026-07-28 but explicitly flagged the imagery as needing change. The current
  thumbnails are branded stand-ins generated in `CaseCard` (teal gradient plus a
  faded anatomical glyph), not real case photography. This is the first Phase 2
  item to raise with them.
- Add real case/video detail destinations, case imagery and correct access state.
- Preserve patient consent, de-identification and content ownership metadata;
  do not treat unlisted YouTube URLs as secure access control.

### Later public-site scope

- About, Contributors, Webinars, Events, Contact, Library public face, Sign in
  and Register pages remain to be planned/built.
- Contact delivery destination, webinar provider, email provider, final domain,
  approved bios/photos and final logo are still required from the client.
- The Arabic UI strings are translated but have not had a native-speaker
  review pass. Dynamic content (cases, events, research) is still English-only —
  the database has no translated columns.

### Deferred by scope

- Certificates
- Appointment booking
- Public comments
- Outcomes/statistics and patient testimonials
- Custom admin panel
- Public YouTube-channel page

## 8. Non-negotiable content and accessibility constraints

- No breast content.
- Never present total laryngectomy as an SST procedure or featured item.
- Do not invent lesson counts, patient outcomes, biographies, media links,
  surgical-video destinations or clinical claims.
- Use logical CSS properties for bidirectional layout and the existing tracking
  tokens. Do not hardcode letter-spacing: Arabic script needs joined letters.
- Preserve visible focus states, native labels for form controls, 44px touch
  targets where practical and `prefers-reduced-motion` support.
- Teal remains the primary interactive colour. Supporting palette colours are
  decorative/contextual, never the sole carrier of meaning.

## 9. Client decisions still needed

| Needed for | Decision or input |
|---|---|
| Topics / Phase 2 | Approved case records, media destinations, imagery and copy; confirmation of how case cards should link/open |
| Arabic | Native-speaker review of `dictionaries.ts`; a decision on whether case/event/research content should be translated (needs a schema migration) |
| Contact page | Contact email, WhatsApp number and form-delivery destination |
| Webinars | Zoom or another provider, registration/reminder policy |
| Identity | Account activation wording, email provider and Google OAuth credentials if Google sign-in is wanted |
| Launch | Final domain, professional bios/photos and logo direction |
| Certificates | Keep deferred, or return to scope with rules and content? |

## 10. Safe next-agent checklist

1. Read this file, `PROJECT_BRIEF.md` and the design-system master file.
2. Confirm the current branch and whether the client wants local work, a push or
   an explicit deployment. Do not infer publishing permission.
3. If touching Topics, update the rendered-route tests alongside the
   implementation. Do not leave the test suite behind the user interface.
4. Keep clinical placeholders clearly labelled and never fabricate destinations.
5. Before handing off, record the actual current commit, test result and whether
   the deployed site is behind local work.
6. For the 2026-08-19 outage work, start with the new section in §3, preserve
   the public/private cache boundaries, and run `tests/page-cache.test.mjs` plus
   `tests/service-worker.test.mjs` whenever cache behavior changes.
