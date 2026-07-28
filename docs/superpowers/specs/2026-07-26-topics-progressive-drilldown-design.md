# Topics — progressive drill-down (design)

Written 2026-07-26. Branch `codex/phase-1a-topics`. Refinement of the Phase 1a
Topics experience before merge to `main`.

## Problem

The current `/topics` page stacks all four topic "library" sections at once.
Selecting a region only highlights a card — the other sections stay on screen,
so the page reads as a wall of cards rather than a guided path. Each topic's
blurb is also printed twice (top chooser card + library section header). The
client wants a focused, progressive experience: choose a topic, its branch opens
inline and the *other* branches go away; choose a subtopic, its content opens.

## Goal

One inline, progressive drill-down on `/topics`:

- **Level 1 — Region chooser (persistent).** Anatomy model + four topic cards.
  Always visible so the user can switch topics at any time. Selecting one
  focuses the anatomy view and opens only that topic's branch below.
- **Level 2 — Focused branch.** Replaces the four stacked sections with a single
  panel for the chosen topic: its longer `intro` copy + its subtopic ("focus
  area") cards. The other topics' branches are removed from the flow, not dimmed.
- **Level 3 — Content leaf (empty state).** Selecting a subtopic expands a
  "Programme in preparation" panel inline beneath it. One leaf open at a time
  (accordion). This is the real container Phase 2 fills with approved content.
- **Bare `/topics`.** No topic selected → an intentional "choose a region to
  begin" state (chooser only, no branch).

## Non-goals

- No invented content: no sample lesson titles, counts, durations, thumbnails,
  or playback controls. Level 3 is an honest empty state until Phase 2.
- No change to the taxonomy in `app/lib/topics.ts` (still the single source of
  truth). Upper Aerodigestive Tract stays unpublished (`visible: false`).
- No new page. The standalone detail body merges into the explorer.

## Routing & state

- `/topics/[slug]` server-renders the explorer **pre-opened** on `slug`. This
  keeps shareable per-topic URLs, per-topic `<title>`/metadata, and SEO. Only
  published groups (`PUBLIC_TOPIC_GROUPS`) generate routes; unknown/unpublished
  slug → `notFound()`.
- `/topics` (no slug) renders the chooser with nothing focused.
- Selecting a topic inline syncs the URL to `/topics/[slug]` via
  `next/navigation` (`router.push`, `{ scroll: false }`) so there is no full
  reload and no scroll jump. Re-selecting the active topic clears back to
  `/topics`.
- The Level-1 selected topic is derived from the route (server-provided initial
  value, kept in client state for instant response).
- The Level-3 open subtopic is **client-only** local state (not in the URL).
  Changing topics resets the open subtopic.

## Components

- `TopicsExplorer.tsx` (client) — owns the interaction. Props: `groups`,
  `locale`, and `initialSlug?` (from the route). Renders Level 1–3.
- `app/[locale]/topics/page.tsx` — renders `TopicsExplorer` with no
  `initialSlug`.
- `app/[locale]/topics/[slug]/page.tsx` — validates the slug against
  `PUBLIC_TOPIC_GROUPS`, sets per-topic metadata, renders `TopicsExplorer` with
  `initialSlug`. The old bespoke detail markup (`TopicHero`, focus-area list,
  cross-links) is removed in favour of the shared explorer.
- `TopicHero.tsx` — retire if it is no longer referenced after the merge; keep
  the anatomy hero at the top of the explorer.

## Behaviour details

- Switching topics: the outgoing branch collapses, the incoming one expands.
  Simplest correct behaviour — render only the active branch; animate its
  entrance. No need to animate the outgoing branch out if it causes layout jank.
- Accordion leaf: only one subtopic's "Programme in preparation" panel open at a
  time within the active branch.
- Empty `/topics`: prompt copy invites choosing a region; anatomy overview shown
  un-focused.

## Accessibility & i18n

- Level-1 cards are `<button>` with `aria-pressed`; the region chooser is a
  labelled group.
- Subtopic toggles are `<button>` with `aria-expanded` + `aria-controls`; the
  revealed leaf has a matching `id` and `role="region"`.
- `aria-live="polite"` on the stage already announces focus changes; keep it.
- Collapse/expand animates height + opacity; wrapped in
  `@media (prefers-reduced-motion: reduce)` to disable.
- All new CSS uses logical properties (`margin-inline`, `padding-inline`,
  `inset-inline`) and the tracking tokens (`--tracking-*`). **No literal
  `letter-spacing`** — RTL joins would break.

## Verification (before claiming done)

- `WRANGLER_LOG_PATH=.wrangler/wrangler.log npx vinext build` passes.
- `node --test tests/rendered-html.test.mjs` — extend to cover: bare `/topics`
  shows chooser + no branch; `/topics/[slug]` renders the focused branch and
  its subtopics; unpublished slug 404s; links are locale-correct.
- Browser: drill-down works in `/en`, `/ar`, `/ckb`; console clean after a
  server restart; computed `letter-spacing: normal` and Noto fonts under RTL;
  no horizontal overflow at mobile width; keyboard operable.

## Rollout

Feature branch only. Do not merge to `main` until the three-locale visual gate
passes and the client has reviewed. Stop before Phase 1b.
