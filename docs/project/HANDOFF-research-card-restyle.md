# Handoff — restyle the publication card

## What you are being asked to do

Redesign the publication card in the research archive. The owner's verdict on
the current design is blunt: it looks bad. The underlying system works and is
verified; what it needs is a designer's pass over the visual result.

Treat the current look as a starting point to be replaced, not defended.

## See it first

```bash
npm run dev          # needs a valid wrangler login; picks a free port from 3000
```

Then open, in this order:

- `/en/research` — the archive grid. **This is the thing to redesign.**
- `/en/research/1412` — a paper's own page (long title, for context)
- `/ar/research` — the same grid in Arabic, RTL
- `/en` — the home page, which reuses one card in `.research-preview-media`

Use the theme toggle in the header. Both light and dark must work.

## Where the code is

| What | Where |
|---|---|
| The cover component | `app/components/ResearchCover.tsx` |
| Cover styles | `app/globals.css`, search `Generated publication covers` (~line 3640) |
| Card grid + card shell styles | `app/globals.css` ~line 2097, `.research-card-grid`, `.research-card` |
| Card markup (grid, filters, pagination) | `app/components/ResearchExplorer.tsx` |
| Topic colour palettes | `app/lib/research-palettes.ts` |
| Title size-by-length rule | `coverTitleScale` in `app/lib/research-cover.ts` |
| SVG twin, for link previews only | `researchCoverSvg` in `app/lib/research-cover.ts` |

## What a card is made of today

A card is a link containing two parts:

1. **The cover** — a coloured panel, `aspect-ratio: 3/2`, holding only the
   paper's title, centred, white on a diagonal gradient. The colour comes from
   the topic the paper is filed under.
2. **The copy** — plain white area beneath: authors (clamped to 2 lines), the
   publication month and year, and a "Read research" link.

## Constraints you must not break

These are decisions the owner made explicitly. Changing them means asking first.

- **No images anywhere.** Publications have no artwork; the covers are generated
  from text. Do not add photographs, icons, illustrations, logos or journal
  branding. The `cover_image_url` column is dead and the files were deleted.
- **No decorative shapes.** Concentric rings were tried and rejected by name.
- **The journal name is not on the cover.** It lives in Publication details on
  the paper's page. Don't put it back.
- **Colour identifies the topic.** Each of the six topics has a palette, and
  papers of the same topic must be recognisably the same colour so the grid
  reads as grouped. Palettes are named slots in `research-palettes.ts` and the
  admin picks one per topic — so whatever you design must work for any of the
  six, and for a topic added later.
- **Type scales with the card, not the viewport.** The grid is 3 columns → 2 →
  1, so a card can get narrower as the screen gets wider. The cover is a
  container (`container-type: inline-size`) and sizes are in `cqi`. If you use
  `vw` here you will reintroduce a bug that was already fixed twice.
- **Titles fill the line before wrapping.** `text-wrap: balance` is banned on
  the title: it breaks early and leaves a ragged gutter. This was a specific
  complaint.
- **No literal `letter-spacing`.** Project-wide RTL rule — use the `--tracking-*`
  tokens or nothing.
- **The title must stay a real heading** (`h3`) with real text. Not an image,
  not a background, not `aria-label`. The archive is a list of results and
  needs navigable headings.

## What you are free to change

Everything else, including:

- The gradient treatment, or whether there is a gradient at all
- The aspect ratio, or dropping the fixed ratio
- Radius, borders, shadows, hover and focus treatment
- Typography: family, weight, size, line-height, alignment, case
- Whether the title is centred (it is right now, but only because the previous
  layout looked emptier — this is not sacred)
- The whole lower copy area: what it shows and how it sits
- Card spacing, grid gaps, column counts and breakpoints
- Whether the cover is a distinct panel at all, versus one continuous card

## My honest read on why it looks bad

Not a spec — a starting list. Disagree freely.

1. **The covers are heavy, dark slabs.** Six saturated dark rectangles in a
   3×3 grid dominate a light, otherwise restrained page. The archive looks
   heavier than anything else on the site.
2. **The palettes are too close in value.** They were darkened for contrast,
   which flattened the difference between them — teal, olive and slate read as
   nearly the same dark colour at card size, so the grouping they exist to
   convey barely registers.
3. **There is no hierarchy inside the card.** A big coloured block, then a
   grey run of author names, then a date, then a link — four things of roughly
   equal weight with nothing leading the eye.
4. **The author line is noise.** Many papers have 10+ authors, so it clamps to
   two lines of names ending in an ellipsis. It occupies real estate and tells
   the reader almost nothing.
5. **Short titles still float.** The length-based scaling caps at 1.28×, so a
   36-character title in a 3/2 box still leaves a lot of empty colour.
6. **Nothing signals what the colour means.** A reader sees six colours with no
   key. The topic name appears nowhere on the card.
7. **The bottom half is unstyled.** It is default text on white; no
   consideration was given to it beyond making it not-broken.

## Approaches already tried and rejected

Save yourself the loop:

- Uploaded cover images — removed; most papers have none and thirteen share a
  journal, so the grid was part empty, part duplicated.
- Concentric ring decorations — rejected by the owner.
- Journal name in an all-caps eyebrow at the top — rejected: hard to read.
- Journal name at the foot in normal case — rejected: moved off the cover.
- `text-wrap: balance` on the title — rejected: wraps too early.
- Letting the cover height follow the title — considered, not tried. CSS Grid
  rows stretch to the tallest item, so this needs ragged card bottoms or
  masonry. If you want it, say so before building it.

## Verifying your work

Screenshots alone have already hidden one real bug in this work — a stray `*/`
killed an entire CSS rule and the result still looked plausible in an image.
Measure, don't eyeball:

```js
// In the browser console on /en/research
[...document.querySelectorAll('.research-card .research-cover')].map(c => {
  const t = c.querySelector('.research-cover-title');
  const cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect();
  return {
    fontPx: parseFloat(getComputedStyle(t).fontSize).toFixed(1),
    clipped: t.scrollHeight > t.clientHeight + 1,
    spills: tr.bottom > cr.bottom + 1 || tr.right > cr.right + 1,
  };
});
```

Check all of these before claiming it works:

- **Widths** 360, 390, 700, 768, 1024, 1280, 1920. No horizontal page overflow,
  nothing clipped or spilling its box, type legible at every one.
- **Both themes**, light and dark.
- **Arabic** at `/ar/research`. Latin titles inside an RTL page have split a
  heading in half twice now — the fix is to set `dir`/`lang` on the wrapper so
  every part of a block agrees. Check alignment, don't assume.
- **The extremes.** Titles run 36 to 166 characters. Search the archive for
  `Scalp pilonidal` for the shortest; `/en/research/1437` is the longest. Both
  must look deliberate, not like one is broken.
- **The home page** at `/en`, which reuses a card in a different slot.
- `npx tsc --noEmit` clean, and `npm test` failing no more than the 3
  pre-existing failures (staff directory and two topic-route tests — none touch
  publications).

## Out of scope — do not touch

- Database, migrations, or anything under `supabase/`. The topic taxonomy is
  live and backfilled across all 72 papers.
- The admin workspace, except that `ResearchTopicEditor` renders a live cover
  preview via `<ResearchCover>`. It must keep working — do not fork the markup,
  that drift has already caused a bug once.
- The paper's own page layout. It was deliberately returned to a plain heading
  and should stay that way.
- `researchCoverSvg`. It only serves link previews. Keep it visually in step
  with whatever you build, but it is not the thing being redesigned.

## Working agreement for this repo

- `main` is what Cloudflare deploys. Work on the branch `research-topic-covers`
  or a new branch off it; do not commit to `main`.
- Commit only when asked.
- The dev server logs to the console, not to a file you should create.
