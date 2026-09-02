---
name: Smart Surgical Team
description: A printed surgical journal rendered for the web — teal ink on warm ivory, serif headings, hairline rules.
colors:
  primary: "#146c6a"
  primary-strong: "#0c514f"
  primary-soft: "#e2f0ec"
  on-primary: "#ffffff"
  brand-teal: "#167a78"
  brand-teal-deep: "#0d3838"
  brand-aqua: "#cdebe5"
  brand-ivory: "#f5f2ea"
  accent-copper: "#a9642f"
  accent-copper-soft: "#f7ead9"
  confirm-olive: "#5f6e4a"
  brand-rose: "#a85f68"
  brand-honey: "#d3ab63"
  bg: "#fbf9f4"
  surface: "#ffffff"
  surface-2: "#f2eee4"
  line: "#ded5c6"
  line-strong: "#c6bba8"
  text: "#40322a"
  text-muted: "#6d5f54"
  text-soft: "#8b7d71"
typography:
  display:
    fontFamily: "Literata, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.3rem, 4.4vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "clamp(1.3rem, 2.4vw, 1.75rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.266rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.79rem"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "8px"
  lg: "14px"
  xl: "14px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1rem"
  button-outline-hover:
    textColor: "{colors.primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1rem"
  button-ghost-hover:
    backgroundColor: "{colors.brand-aqua}"
    textColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "1.1rem 1.15rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 0.85rem"
  eyebrow:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.8rem"
  kind-tag:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.26rem 0.5rem"
---

# Design System: Smart Surgical Team

## Overview

**Creative North Star: "The Surgical Journal"**

Every page is a page in a published clinical record. The surface is warm ivory
paper (`#fbf9f4`), the ink is teal, headings are set in a serif with real
bookish weight (Literata), and structure is carried by hairline rules rather
than boxes and glow. Nothing on the page tries to sell; it presents. The
authority comes from the composition — margins, a real type scale, restrained
colour — not from decoration.

Density is standard-to-generous: a `1200px` measure with a fluid gutter
(`clamp(1.25rem, 4vw, 3rem)`), reading prose kept near 58–65ch, and cards that
behave like catalogue entries rather than product tiles. Motion is subtle by
intent — a 3px lift and a border warming on hover, nothing that moves on its
own — and every transition drops under `prefers-reduced-motion`.

The system is bidirectional by construction, not by patch. Arabic is a
first-class rendering of the same journal: its own faces (Noto Naskh Arabic over
IBM Plex Sans Arabic, chosen to echo the Latin pair's register), its own looser
type scale, and zero tracking, because Arabic script has no case and
letter-spacing breaks its joins. Layout CSS uses logical properties throughout so
one stylesheet serves both directions.

**Key Characteristics:**

- Warm ivory paper, teal ink, copper reserved for conversion
- Serif display over humanist sans body; a 1.125 scale from a 16px base
- Hairline `1px` rules as the primary structural device
- Small radii (8px / 14px) — the form language is paper, not app chrome
- Bidirectional and dual-theme as a definition of done, not a variant
- Subtle motion: 220ms, `cubic-bezier(0.22, 1, 0.36, 1)`, always reduced-motion aware

## Colors

Warm, low-chroma, and paper-first: two teals doing almost all the work over an
ivory ground, with copper held back for conversion and a small set of muted
signal hues for state.

### Primary

- **Journal Teal** (`#146c6a`): every interactive element — links, primary
  buttons, focus rings, active nav, inline icons inside fields. This is the ink.
- **Deep Press Teal** (`#0c514f`): the hover and pressed state of Journal Teal,
  and the colour of emphasised link text on soft backgrounds.
- **Aqua Wash** (`#e2f0ec`): the soft teal fill behind tags, notes, and quiet
  callouts — the tint of teal on paper, never a page background.
- **Plate Teal** (`#167a78`) and **Contour Teal** (`#0d3838`): the brand pair
  used for illustration, media gradients, and the anatomical hero linework; the
  deep value also carries text contrast on aqua surfaces.
- **Pale Aqua** (`#cdebe5`): the dominant educational surface — section grounds,
  the ghost-button hover, illustration fills.

### Secondary

- **Copper** (`#a9642f`) with **Copper Wash** (`#f7ead9`): conversion only.
  Required-field markers, the single decisive action on a page, an editorial
  accent on a section that must break the teal rhythm.

### Tertiary

- **Olive Confirm** (`#5f6e4a`), **Clinical Rose** (`#a85f68`), **Honey**
  (`#d3ab63`): success, error, and caution respectively, each with a soft wash
  sibling. Muted on purpose so a validation message never shouts louder than the
  content.

### Neutral

- **Ivory Ground** (`#fbf9f4`): the page. **Warm Ivory** (`#f5f2ea`) is the
  alternating band that separates sections without a border.
- **Paper White** (`#ffffff`): cards, inputs, the raised surface. **Oat**
  (`#f2eee4`): the recessed surface — read-only fields, wells, zebra rows.
- **Hairline** (`#ded5c6`) and **Rule** (`#c6bba8`): the 1px structure. Hairline
  divides; Rule outlines something interactive.
- **Ink Brown** (`#40322a`) body text, **Muted Brown** (`#6d5f54`) secondary
  prose, **Soft Brown** (`#8b7d71`) meta, timestamps, placeholders. Text is warm
  brown, never black — that is what keeps the paper feeling like paper.

### Named Rules

**The Copper Scarcity Rule.** Copper appears at most once per viewport, on the
one thing a visitor is meant to do. A second copper element on screen means one
of them is wrong.

**The Ink, Not Ground Rule.** Deep teal (`#0d3838`) carries text and contrast;
it is never the dominant page surface. Aqua and ivory are the grounds.

**The Dual-Theme Rule.** No colour is defined outside the token set. Dark mode
(`[data-theme="dark"]`) redefines the same variables — `#1a1512` ground,
`#4aa9a5` primary, `#f2ece2` text — so a hardcoded hex is a bug in both themes.

## Typography

**Display Font:** Literata (with Georgia, 'Times New Roman', serif)
**Body Font:** Inter (with 'Segoe UI', system-ui, sans-serif)
**Arabic Display:** Noto Naskh Arabic · **Arabic Body:** IBM Plex Sans Arabic

**Character:** A modern journal serif with printed, slab-ish sturdiness over a
neutral humanist sans. Editorial and institutional rather than start-up; the
serif does the declaring, the sans does the explaining. All four faces are
self-hosted at build time via `next/font` — no runtime request leaves the site.

### Hierarchy

- **Display** (400, `clamp(2.3rem, 4.4vw, 3.4rem)`, 1.08, `-0.035em`): page
  titles and hero headlines. One per page, `text-wrap: balance`.
- **Headline** (500, `clamp(1.3rem, 2.4vw, 1.75rem)`, 1.15): section headings.
- **Title** (700, `--step-2` / 1.266rem, 1.45): card and list-item titles. Set in
  the **body** face, not the serif — the serif is the page's own voice; cards are
  content.
- **Body** (400, `--step-0` / 1rem, 1.7): reading prose. Measure 58–65ch.
- **Label** (750, `--step--2` / 0.79rem, `+0.08em`, uppercase): eyebrows, kind
  tags, metadata keys, `dt` elements.

The scale is a 1.125 ratio from a 16px base, exposed as `--step--2` through
`--step-4`. Arabic redefines the whole scale one step larger (`--step-0` becomes
1.125rem) because Arabic script reads smaller at the same pixel size.

### Named Rules

**The Sixteen Pixel Floor Rule.** No public reading prose below `--step-0`
(16px), and no label below `--step--2` (12.6px). A rule that needs a size
reaches for a step; it does not invent a number. The scale exists precisely
because 335 ad-hoc font sizes had drifted, 67 of them below the prose floor.

**The No-Tracking-In-Arabic Rule.** Never write a literal `letter-spacing`. Use
the `--tracking-*` tokens, all of which collapse to `0` under `[dir="rtl"]`, and
drop `text-transform` there too. Tracking breaks Arabic letter joining and case
does not exist in the script.

**The Looser Arabic Leading Rule.** Arabic headings sit at ~1.5 and Arabic body
at 1.9–2.0. Latin values (1.1 / 1.7) look broken on the script.

## Layout

A single `1200px` content measure (`--content`) with a fluid gutter
(`--gutter: clamp(1.25rem, 4vw, 3rem)`) and a `72px` sticky header
(`--header-h`). Sections are separated by band colour (`--bg` alternating with
`--bg-muted`) or by a `1px --line` rule, and vertical rhythm is fluid rather than
stepped: `clamp(2rem, 5vw, 4rem)` for section padding, `clamp(1rem, 2.5vw,
1.75rem)` for grid gaps.

Grids step down at three breakpoints, all `max-width` and all governed by content
rather than device names: **1000px** (3 columns → 2), **900px** (side-by-side
hero and lead layouts → stacked), **620px** (2 columns → 1, and the phone type
ramp). A fourth at **430px** exists only where two items would each be under
~140px wide — case and news thumbnails go single-file there because a face is
unrecognisable smaller.

Spacing tokens run `4 / 8 / 16 / 24 / 32 / 48 / 64px` at a standard density
(4/10). Every offset, border side and padding uses logical properties
(`margin-inline`, `inset-inline-end`, `padding-block`) so the same rule serves
LTR and RTL — with one deliberate exception: a glyph that must keep pointing the
same physical way (a select chevron) uses physical borders and lets only its
position flip.

### Named Rules

**The One Measure Rule.** Content lives inside `max-width: var(--content)` with
`padding-inline: var(--gutter)`. Full-bleed is for media and section grounds,
never for text.

## Elevation & Depth

Softly layered. Borders and shadows work together: a `1px --line` outline gives a
card its edge, and a resting shadow is permitted where a card genuinely needs to
sit above its ground. Shadow is warm-tinted (`rgba(64, 50, 42, …)` in light,
plain black in dark) so it reads as paper shadow rather than a grey glow, and it
deepens one level on hover alongside a `-3px` lift over `220ms
cubic-bezier(0.22, 1, 0.36, 1)`. The sticky header is the one place depth comes
from blur instead: `backdrop-filter: blur(12px)` over an 88% ivory wash.

### Shadow Vocabulary

- **Hairline** (`box-shadow: 0 1px 2px rgba(64, 50, 42, 0.07)`): pills, eyebrows,
  chips — a hint that the element sits on the page rather than in it.
- **Card** (`box-shadow: 0 6px 18px rgba(64, 50, 42, 0.09)`): resting depth for a
  card that needs separation, and the hover state of every flat card.
- **Overlay** (`box-shadow: 0 18px 44px rgba(64, 50, 42, 0.13)`): dialogs, menus,
  and the few genuinely floating surfaces.
- **Primary glow** (`box-shadow: 0 6px 16px var(--primary-ring)`): unique to the
  primary button — teal-tinted, so the main action reads as lit rather than
  raised.

### Named Rules

**The Warm Shadow Rule.** Shadows are tinted with the text brown, never
`rgba(0,0,0,…)` in light mode. A neutral-black shadow on ivory turns the page
grey.

**The Three Level Rule.** `--shadow-sm/md/lg` are the whole vocabulary. A new
`box-shadow` literal is a token that should have existed.

## Shapes

Paper, not app chrome. Radii are small and few: `8px` (`--radius-sm` /
`--radius-md`) for buttons, inputs, tags and cards; `14px` (`--radius-lg` /
`--radius-xl`) for large panels and hero-scale containers; `99px` for pills
(eyebrows, chips, meters). Nothing is a circle except an avatar or a status dot.

Borders are the signature: exactly `1px`, in `--line` for division and
`--line-strong` for anything interactive, warming to `color-mix(in srgb,
var(--primary) 32%, var(--line))` on hover. Where a container needs to feel
authored rather than generated, the treatment is a soft radial wash plus a single
drawn outline shape with an irregular `border-radius: 49% 51% 54% 46%` — an
organic contour that echoes the anatomical linework, used once per page at most.

Media keeps journal ratios: `16/9` for banners and news leads, `16/10` for
thumbnails, `1/1` only for portraits.

## Components

### Buttons

- **Shape:** gently rounded (8px, `--radius-sm`; `--radius-md` at `.btn-lg`), with
  a `1px` transparent border so every variant shares the same box.
- **Primary:** Journal Teal ground, white text, teal-tinted glow (`0 6px 16px
  var(--primary-ring)`), `0.6rem 1rem` padding at 600 weight; `0.85rem 1.35rem`
  at large.
- **Hover / Focus:** ground deepens to `--primary-strong` and the button rises
  `1px` over 180ms; focus-visible is a `3px var(--primary-ring)` outline at `3px`
  offset, never a removed outline.
- **Outline:** paper-white ground, `--line-strong` border, ink text; on hover the
  border and text both become teal — no fill change.
- **Ghost:** transparent with muted text; on hover it takes a Pale Aqua wash and
  teal text. This is the quiet tertiary action, used in toolbars and headers.

### Chips

- **Kind tag:** Aqua Wash ground, Journal Teal text, uppercase label at 750 weight
  with `--tracking-label`, `8px` radius, `0.26rem 0.5rem`. Names a content type
  (case, poster, paper, news).
- **Eyebrow:** a full pill (99px) on paper white with a `--line` border, a
  Hairline shadow, and a teal icon — a section's kicker, above its headline.
- **Filter chips:** unselected reads as an outline button; selected fills with
  `--primary-soft` and teal text. Filters never use copper.

### Cards / Containers

- **Corner Style:** 8px (`--radius-md`); 14px for a panel that carries a whole
  section.
- **Background:** `--surface` on an `--bg` or `--bg-muted` ground; `--surface-2`
  when the card is deliberately recessed.
- **Border:** `1px var(--line)`, warming toward teal on hover.
- **Shadow Strategy:** see Elevation — flat-with-border is the common resting
  state, `--shadow-md` on hover with a `-3px` lift; a resting `--shadow-md` is
  allowed where separation from a busy ground demands it.
- **Internal Padding:** `1.1rem 1.15rem` for a list card, `clamp(1.5rem, 4vw,
  2.4rem)` for a section panel.
- **Focus:** the whole card takes `outline: 3px solid var(--primary-ring)` at
  `3px` offset — cards are links, and they must be reachable by keyboard.

### Inputs / Fields

- **Style:** a shell (`.field-control`) — `48px` min height, `1px
  var(--line-strong)`, 8px radius, paper-white ground — holding a borderless
  input at exactly `16px` (never smaller: iOS zooms below that). A teal leading
  icon sits inside the shell with logical margins.
- **Focus:** the shell's border turns teal and gains a `3px var(--primary-ring)`
  ring. The input itself never shows its own outline.
- **Read-only / disabled:** Oat ground (`--surface-2`), muted text, default
  cursor. Submit buttons drop to `0.65` opacity with a `wait` cursor.
- **Messages:** inline at `0.78rem` with a leading icon — error on Rose wash with
  plum ink, success on Olive wash. Required markers are copper.
- **Select:** the identical shell; the native arrow is replaced by a CSS chevron
  drawn on the shell so it keeps pointing down while its position flips in RTL.

### Navigation

- **Header:** sticky, `72px`, an 88% ivory wash with `blur(12px)` and a `1px
  --line` bottom edge — content scrolls under it legibly in both themes.
- **Brand:** mark plus a two-line lockup — name at 700/0.98rem with snug
  tracking, the tagline beneath at 0.7rem in Soft Brown with tracking reset to 0.
- **Links:** body face, muted at rest, teal on hover and when active. The active
  route is teal text, not a filled pill.
- **Mobile:** the nav collapses behind an icon button; the language switcher and
  theme toggle stay visible, because the switcher must never be hidden.

### Signature: Generated Research Cover

Research papers have no cover images by design. `ResearchCover.tsx` composes a
typographic cover from the record itself — journal name, year, title — using
`--cover-*` custom properties set inline per item, so 72 papers produce 72
distinct covers at zero image weight. This is the house answer to "we need a
picture": set the type instead.

## Do's and Don'ts

### Do:

- **Do** reach for a `--step-*` size and a `--tracking-*` token. A literal
  `font-size` or `letter-spacing` is a regression.
- **Do** write every offset with logical properties (`margin-inline`,
  `inset-inline-end`) and check the page at `/ar` before calling it done.
- **Do** keep `1px var(--line)` as the primary structural device, and let colour
  warm the border on hover rather than filling the element.
- **Do** give every interactive element a visible `focus-visible` state — `3px
  solid var(--primary-ring)` at `3px` offset is the house ring.
- **Do** wrap every transition and transform in a `prefers-reduced-motion:
  reduce` opt-out; the motion dial is 3/10.
- **Do** define both themes. `[data-theme="dark"]` redefines the same variables;
  a new colour needs a value in both.
- **Do** design the short, long, missing and Arabic version of any editor-filled
  field — every content surface here is admin-editable.
- **Do** keep image weight honest: prefer generated typographic covers and
  properly sized media over a large JPEG.

### Don't:

- **Don't** use stock hospital imagery — smiling-doctor photography, blue-cross
  iconography, "trusted care" visual language. The team's own case and event
  photographs are the only imagery, and they are real.
- **Don't** drift toward cold clinical minimalism (white + grey + one blue). The
  warmth of ivory and brown ink is the identity; a grey page is off-brand even
  when it is "clean".
- **Don't** put deep teal `#0d3838` behind a whole page, and don't let copper
  appear twice in one viewport.
- **Don't** uppercase or letter-space Arabic script, and don't apply Latin line
  heights to it.
- **Don't** introduce a fifth radius, a fourth shadow, or a hardcoded hex. The
  token set is the vocabulary.
- **Don't** set public reading prose below 16px or a label below 12.6px.
- **Don't** claim outcomes, statistics, testimonials or certificates in a
  layout — they do not exist and must not be implied.
