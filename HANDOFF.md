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
