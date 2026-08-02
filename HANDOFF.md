# Handoff — Smart Surgical Team website

**Updated:** 2026-07-28
**Read this first.** It supersedes the old paused-Topics notes in this file and
the stale Phase 1a status text in `docs/project/BUILD_PLAN.md`.

## 1. Project at a glance

Smart Surgical Team is a trilingual head-and-neck surgery education platform for
Smart Health Tower, Sulaymaniah. The public-facing site is being built first;
the authenticated learning platform, real content management and member
workflows follow later.

### Stack

- Next.js 16 App Router, React 19 and TypeScript
- Cloudflare Workers-compatible output through `vinext`
- Tailwind v4 plus the project stylesheet in `app/globals.css`
- Supabase for content, members and auth; Cloudflare R2 (`smart-media`) for
  editorial media, served through `/api/media/…`

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

## 4. What is implemented now

### Shared site foundation

- Locale-prefixed public routes: `/en`, `/ar` and `/ckb`
- Locale negotiation at the bare root through `proxy.ts`
- English is the current source dictionary. Arabic and Sorani fall back to
  English until approved translations are supplied.
- Light/dark themes, reduced-motion handling, skip link, responsive header and
  shared footer
- Newsreader/Inter for Latin text; Noto Kufi Arabic/Noto Naskh Arabic for Arabic
  and Sorani

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

## 5. Files most likely to be touched next

| File | Purpose |
|---|---|
| `app/components/TopicsExplorer.tsx` | Topics selection, search/filter state and case-card rendering |
| `app/lib/topics.ts` | Single source of truth for topic groups, subtopics and placeholder cases |
| `app/components/LanguageSwitcher.tsx` | Accessible language dropdown and locale-preserving navigation |
| `app/components/SiteHeader.tsx` | Header placement and mobile menu integration |
| `app/globals.css` | Global tokens and all Topics/language-menu responsive styles |
| `tests/rendered-html.test.mjs` | Static rendered-route contract tests; currently needs updating |
| `app/lib/dictionaries.ts` | English source strings and future Arabic/Sorani translations |

## 6. Validation status — do not overstate it

### Passing on current `HEAD`

- ESLint: passing
- Production build, using the Windows-safe command below: passing
- `git diff --check`: passing before the latest commits

### Rendered-route tests: 13 of 13 passing

The two stale Topics assertions were updated on 2026-07-28. The test suite now
checks the current interaction contract: four `.content-topic-option` selectors,
the default case library, search, three filters, case grid/cards and a
representative example case for every published topic route.

### Verification commands on Windows

`npm run build` uses Unix-style environment assignment and fails under normal
Windows `cmd.exe`. Use:

```powershell
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; npx vinext build
npm run lint
node --test tests/rendered-html.test.mjs
```

`npx tsc --noEmit` historically reports pre-existing scaffold errors in
`db/index.ts` and `worker/index.ts` around Cloudflare Worker types. These were
not part of the Topics work; confirm them separately before attempting a broad
TypeScript cleanup.

### Required manual QA before the next requested release

- `/en/topics`, `/ar/topics` and `/ckb/topics`
- One direct detail URL for each public topic
- Topic switching, search, every dropdown filter, native search clear affordance
  and `Clear all`
- Language menu: mouse/touch, Escape, outside click, keyboard focus and each
  locale link
- Light and dark themes at 375px, 768px, 1024px and 1440px
- RTL typography: Arabic and Sorani headings must have normal tracking and use
  the Noto font stacks; verify no horizontal overflow

### QA pass completed 2026-07-28

This gate was run against the local preview and covers the three previously
ungated commits (palette refresh, language-menu restyle, case search/filters).

- **Locales/routes** — `/en`, `/ar`, `/ckb` topics index plus detail routes:
  correct `dir`/`lang` (`rtl`, `ckb-Arab`), four topic selectors, three filters,
  five case cards, correct topic pre-selected on deep links.
- **RTL typography** — zero elements with non-normal `letter-spacing` across all
  headings/links/buttons; Noto Kufi Arabic for headings, Noto Naskh Arabic for
  body. No horizontal overflow in any locale.
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
- Arabic and Sorani translations still need a professional content pass.

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
| All locales | Approved Arabic and Sorani translations |
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
