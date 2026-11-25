# Breast Summit tab + Collaboration Map — design (Goal 3)

Status: **Phases 1 (Summit page) and 2 (map) built 2026-11-23 on `feature/breast-summit`. Not committed, not deployed; migration 0030 not applied.** Tracker: `docs/expansion-plan.md` (Goal 3).
Visual reference: TOSIC "Find a Center" (`tosicollaborative.org/centers`): a map with a synced list
beside it. We keep that shape and make it nicer and our own.

## Decided (user, 2026-11-23)

| | |
|---|---|
| Event name | **Second Middle East Breast Summit (2nd MEBS 2027)**, 2–3 Sep 2027, Smart Health Tower, Sulaymaniyah |
| Map look | **A real map with country borders.** Not dotted or stylised |
| Borders | **Internationally recognised country borders only.** No Kurdistan Region outline, no internal lines |
| Movement | Like TOSIC: +/− buttons, drag to pan, markers open details, list beside the map |
| Placement | **Both:** a section of the Summit page **and** its own page `/collaboration` |
| Launch data | **Empty.** Institutions are added in Admin as each one agrees in writing |
| Entry types | **Institutions only** |
| Invitation | **A new short "Collaborate with us" form** that lands in the Admin Inbox. **Deferred (2026-11-23):** page and map first |
| Framing | **The official summit site stays the main focus.** Our page is a companion: it sends visitors there and adds only what we have (the map, our breast research) |
| Hero / empty state | No preference, so we use the recommended defaults: big date + countdown hero; map shown with only Sulaymaniyah lit, plus the invitation |

## How it differs from TOSIC (the "nicer")

TOSIC is Leaflet on Esri's rented grey tiles: generic look, Esri's borders, Esri account terms, and a
cramped pop-up. Ours:

- **Our own drawn map:** Natural Earth country shapes rendered as SVG in the site palette. No tile
  service, no per-view cost, no third-party terms.
- **Sulaymaniyah is the hub:** a softly pulsing marker for the team at Smart Health Tower (it is us,
  so it needs no consent).
- **Selecting a partner** draws an arc from Sulaymaniyah to it, and a detail card slides in from the
  panel edge instead of a pop-up.
- **Partner countries are lightly tinted**, so the reach reads at a glance even zoomed out.
- **The list and map are synced:** hovering a list item lights its marker, and clicking flies the
  map there.
- **No scroll-jacking:** the wheel zooms only with Ctrl (with a hint), and phones pinch with two
  fingers. Page scroll is never captured.
- **Labels at the right zoom:** country names fade in from regional zoom; city labels show on
  selection.
- **Overlap handled:** markers that overlap at the current zoom merge into a count bubble that
  expands on click.
- **Reduced motion:** no pulse, no arc draw, and jumps instead of flights.

## Pages

### `/[locale]/breast-summit`: "Breast Summit" header tab (built, phase 1)

A companion page. Every strong call to action points to the official site.
Facts live in `app/lib/breast-summit.ts`, copied from ibs.smarthealth.group on 2026-11-23.
Order:

1. **Hero** (deep teal, rings radiating from the hub): edition lockup, title, lede, dates,
   venue, "Register on the summit website" + "Visit the summit website", and a note that
   registration, programme and travel live there. Date plate with a live countdown to opening
   day, counted to the day (the session start time is unpublished).
2. **About:** two short paragraphs, the care-pathway themes, and "Read more on the summit website".
3. **Faculty:** all 10 announced (6 countries), each card linking to that person's page on the
   official site. Photos come from the organiser's asset host, as the MET summit's do.
4. **Plan your visit on the summit website:** 8 link tiles (registration, programme, faculty,
   venue, hotels, transportation, travel & visa, sponsors) and the organisers' email.
5. **Our additions:** the 3 newest breast papers from /research, plus "All breast research".
   The collaboration map joins this section in phase 2.
6. **Previous edition:** the First Iraqi Breast Cancer Summit, on the official site.

Event schema names Smart Health Tower as organiser (as the official site does), with the
official URL as `url` and our page as `sameAs`. Attendance mode is left out until the format
is confirmed. Code-defined apart from the research read; 2026-09-03 onward the countdown shows
"took place".

### `/[locale]/collaboration`: full map page

Title: *International Breast Surgery Collaboration Map*. A map (left) and list panel (right; the
sides flip in Arabic RTL). The panel holds:

- A count line ("N institutions in M countries").
- A hub card for Smart Surgical Team, Smart Health Tower.
- A country filter.
- The institution cards.
- The form at the bottom (`#collaborate`).

The list is server-rendered HTML, so it is the SEO and accessible version of the map. Mobile: the map
sits on top at about 60vh, with the list below. Tapping a card scrolls up and flies the map to it.

## Map — technical

- **Shapes:** `world-atlas` Natural Earth 1:110m for the world view, swapping to 1:50m past regional
  zoom. These are pre-built static files in `public/`, so they cost the Worker nothing and the
  browser and CDN cache them.
- **Rendering:** `d3-geo` (projection) + `d3-zoom` + `topojson-client`, about 35 KB gzipped,
  **lazy-loaded** when the map scrolls into view.
- **Projection:** Equal Earth (true country sizes). Our pick, not one the user made; change it here
  if it looks wrong in review.
- **Markers:** real `<button>`s with accessible names; the keyboard can tab through them.
  The +/− buttons and Escape work.
- **Coordinates:** entered by hand in Admin (lat/lng, with a live preview pin). Pasting a Google Maps
  link fills them in.

## Data — `collaborators` (migration 0030)

`slug`, `name_en`, `name_ar`, `city_en`, `city_ar`, `country_code` (ISO, from `countries.ts`),
`lat`, `lng`, `description_en`, `description_ar`, `website_url`, `field` (default `breast`, so
head & neck can reuse it later), `featured`, `status` (draft/published), `consent_received_on`,
`consent_note`, timestamps.

- **Honesty rule enforced in the database:** a check constraint refuses `published` without
  `consent_received_on`. Consent fields are Admin-only and never reach the public read.
- **Wording on the site:** "collaborating institution". Never "partner", "supporter" or "sponsor"
  unless that exact word is agreed in writing.
- **Logos:** left out of v1 (logo rights are a separate permission). The card can carry one later.
- **Admin:** a "Collaborators" section (Owner + Editors). Saving revalidates the cache tag, so
  changes show within the page-cache window.

## Collaborate form

Same build and the same proven anti-spam stack as the MDT form: Turnstile, honeypot, rate limit,
server validation, a team alert email, and a third list in the shared Admin Inbox. Fields: name,
role, institution, country, email, and what they propose (20–2000 characters). A notice says
not to send patient details. Replies go out from the team mailbox via `mailto:`, as with MDT. This
needs its own table (`collaboration_inquiries`) and an update to the privacy policy and terms before launch.

## Cross-cutting

- `PUBLIC_DOCUMENT` regex: add `breast-summit` and `collaboration` in **both** `page-cache.ts` and
  `public/sw.js`.
- SEO: `Event` schema on the summit page; sitemap and `llms.txt` entries; `Organization` member
  markup only once real entries exist.
- English + Arabic for all copy. The summit's Arabic name is needed from the organisers.

## Build phases (stop after each for review)

Branch `feature/breast-summit`, cut from `main`.

1. **Summit page:** page, countdown, header tab, caching, schema. *Built 2026-11-23.*
2. **Map:** map data files, map component, `/collaboration`, the embed on the summit page,
   migration 0030, Admin "Collaboration map" section. *Built 2026-11-23.*
3. **Collaborate form** (deferred): table, form, Inbox list, alert email, privacy policy and terms.
   Until then, the map's invitation links to /contact.

## Open items (from the team)

- [ ] Official registration / programme / faculty URLs (the summit site renders by JS; recheck
      in a browser)
- [x] Faculty list re-read 2026-11-23: 10 speakers, 6 countries
- [ ] Photos are hotlinked from the organiser's host, as the MET summit's are: confirm that's fine
- [ ] Add MEBS 2027 to the events table in Admin so /events lists it (link it to /breast-summit)
- [ ] The summit's Arabic name
- [ ] Fix the "Second"/"Third" inconsistency on the official summit site at source
- [ ] First institutions and their written consent (date + who agreed)

## Phase 2 as built (2026-11-23)

- **Shapes:** `scripts/build-world-map.mjs` turns `world-atlas` (Natural Earth) into
  `public/maps/world-110m.json` (37 KB gzipped, world view) and `world-50m.json` (233 KB,
  fetched only past zoom 2.6), each country tagged with its ISO alpha-2 code. Somaliland is folded
  into Somalia and Northern Cyprus into Cyprus (no line drawn between them); Kosovo stays as drawn;
  the Siachen Glacier is left unassigned. `/maps/*` is cached for a week (`public/_headers`).
- **Component:** `app/components/CollaborationMap.tsx` (d3-geo, d3-zoom, topojson-client).
  Equal Earth projection; +/−/world buttons; drag; Ctrl+wheel or two fingers to zoom (a hint
  appears otherwise); count bubbles where markers overlap; selecting an institution frames it with
  Sulaymaniyah, draws a rose arc and opens a card (under the map on phones); country labels from
  zoom 2.2, sized for the screen; panel list synced with the map, with a country filter.
  Reduced motion turns off the pulse, the arc animation and the glide.
- **Data:** migration `0030_collaborators.sql` (not yet applied). A check constraint refuses
  `published` without `consent_received_on`; RLS on with no policies; the public read selects
  named columns only. Until the table exists the map shows the empty state, not an error.
- **Admin:** "Collaboration map" section. Owner, Content managers and Editors can add and edit;
  only Owner and Content managers can delete. The editor fills coordinates from a pasted Google Maps
  link and refuses to publish without a consent date.
- **Verified in the dev server** with temporary demo data (removed): markers, clusters, arc,
  card, labels, list sync, the light and dark themes, Arabic RTL, phone layout, no horizontal
  overflow, and the empty state. **Not verified:** the Admin section in a browser (it needs a
  staff sign-in), and anything against the real table (migration not applied).

## Update (2026-11-25)

- `/[locale]/collaboration` was removed; the full collaboration map lives solely on `/[locale]/breast-summit` as a dashboard (small solid dots on neutral land, a ranked country bar chart in the sidebar, and a country-grouped institutions table below).
- In the header, **Breast Summit** moved into an **Events** dropdown alongside **All events**.
