# Launch SEO handoff

**Paused:** 2026-08-24  
**Production site:** <https://smart.ssteam.workers.dev>  
**Branch:** `main`

This file is the source of truth for the ten-step, post-launch SEO task. The
user asked to complete the work one phase at a time, avoid mistakes, and pause
after the Google Business Profile assessment so the remaining phases can be
continued in a new session.

## Browser requirement

Use the user's installed **Google Chrome** and the signed-in **Abdulla** Chrome
profile for Google services. Do not use the in-app/ChatGPT browser profile. The
Chrome account was confirmed signed in during the work below.

## Progress

| Phase | Task | Status |
|---|---|---|
| 1 | Google Search Console | Completed before this SEO session |
| 2 | Submit and verify XML sitemap | Completed and live |
| 3 | Set up Google Analytics 4 | Completed and live |
| 4 | Google Business Profile | Duplicate/eligibility assessment completed; profile not created |
| 5 | Put the primary keyword in each page title | Not started |
| 6 | Add the city to main service pages | Not started |
| 7 | Write a unique meta description for every page | Not started |
| 8 | Add relevant internal links | Not started |
| 9 | Compress and optimize images | Not started |
| 10 | Start backlinks/citations | Not started |

A final technical SEO audit should be run after phases 5–10.

## Phase 1 — Google Search Console

Search Console was already configured by the user. In the Abdulla Chrome
profile, the sitemap screen showed `/sitemap.xml` submitted successfully. It
previously reported 18 discovered pages; the same sitemap URL now serves a much
larger dynamic inventory and Google must recrawl it.

## Phase 2 — sitemap and robots

Completed in commit `1eff6e4` (`Expand dynamic sitemap coverage`) and pushed to
`origin/main`.

- `app/sitemap.ts` is database-backed and includes localized URLs for published
  library content, events, posters, research, and top-level topic pages.
- It emits English/Arabic alternates plus `x-default`, avoids misleading
  generated timestamps, and excludes duplicate library-poster URLs.
- `app/robots.ts` points crawlers to the sitemap and excludes private account,
  admin, and API routes.
- Production verification found **322 unique sitemap URLs** and a live robots
  file that references `https://smart.ssteam.workers.dev/sitemap.xml`.
- The approved dynamic rendering and layered-cache architecture was preserved;
  no public database-backed page was converted to build-time static output.

## Phase 3 — Google Analytics 4

The following Analytics resources were created in the Abdulla Chrome profile:

- Account: **Smart Surgical Team**
- Property: **Smart Surgical Team Website**
- Web stream: **Smart Surgical Team Website**
- Stream URL: `https://smart.ssteam.workers.dev`
- Stream ID: `15491825768`
- Measurement ID: `G-KZ5GNTTR1K`
- Region/time zone: Iraq, GMT+3
- Industry: Health
- Business size selected: Medium (11–100)
- Objectives: traffic and engagement
- Optional Google data-sharing settings: disabled

The initial consent-banner implementation was committed as `1d67bc1`, but the
user rejected a visitor-facing permission prompt. The final implementation is
commit `cb93c1c` (`Use cookieless GA4 without consent prompt`) and was pushed to
`origin/main`.

Final behavior:

- No analytics consent banner or footer settings control is shown.
- `app/components/GoogleAnalytics.tsx` keeps analytics storage, ad storage, ad
  user data, and ad personalization permanently denied.
- Google signals, ad-personalization signals, URL passthrough, and advertising
  use are disabled.
- Only manual `page_view` events are sent. `page_location` is constructed from
  the origin and pathname, so URL query strings and on-site search/filter terms
  are omitted.
- The GA4 stream's **Enhanced measurement** master switch was explicitly turned
  off in Analytics. This prevents automatic scroll, outbound-click, video, and
  download events; the stream retains only standard/manual page views.
- The English and Arabic privacy-policy text accurately describes the
  privacy-minimized cookieless measurement and Google's limited processing.
- Live verification in the Abdulla Chrome profile found the Google tag loaded,
  no permission banner, and no Analytics Settings control.
- Analytics currently reports data collection as pending; Google states that
  the first data can take up to 48 hours to appear.

## Phase 4 — Google Business Profile assessment

The duplicate check is complete. A Google search for **Smart Surgical Team
Sulaymaniyah Iraq** did not reveal a separate Smart Surgical Team knowledge
panel/profile. Google instead showed the existing **Smart Hospital** profile at
the shared Smart Health Tower location, with its own website, address, phone,
hours, and reviews.

Do **not** create a second profile by guessing. Before creation or claiming in a
future session, verify all of the following:

1. Smart Surgical Team is eligible as a distinct, customer-facing, staffed
   business or department at the location, rather than only an educational
   website/team inside Smart Hospital.
2. The exact real-world business name used on signage and public materials.
3. The correct primary category (for example, surgical center, medical clinic,
   or a more specific eligible category).
4. The team's own public phone number, opening hours, and whether patients can
   visit during those hours.
5. Whether the existing Smart Hospital profile owner should add the team as a
   department/service instead of creating a separate listing.
6. Who can complete Google's verification at the physical location.

This pause is intentional: an inaccurate or duplicate profile can confuse
patients and may be rejected or suspended by Google.

## Validation completed

- Targeted ESLint for the GA/layout/legal/footer files: passing.
- `git diff --check`: passing.
- Production build (`npm run build`): passing.
- Local Chrome smoke test: no banner/settings UI and Google tag present.
- Production HTTP check: status 200, no old consent markup, GA identifier
  present.
- Production Chrome smoke test: no banner/settings UI and
  `https://www.googletagmanager.com/gtag/js?id=G-KZ5GNTTR1K` present.

Repository-wide known issues were not caused by this SEO work: the broader
rendered-HTML suite still has three content/fixture failures (staff directory,
an Arabic topic label, and one topic-detail expectation), and full lint has the
pre-existing ResearchExplorer hooks issue described in `HANDOFF.md`.

## Resume order

1. Recheck GA4 Realtime after the 48-hour collection window.
2. Resolve the Business Profile eligibility and exact business facts above;
   then create/claim or update the appropriate listing in Abdulla Chrome.
3. Audit current metadata across every indexable route before editing titles or
   descriptions. Choose a specific primary keyword per page; do not stuff the
   same phrase everywhere.
4. Add Sulaymaniyah/location language only where it is truthful and useful,
   especially home, about, and contact/service-oriented pages.
5. Improve contextual internal links, then inventory and compress oversized
   images without changing URLs unnecessarily.
6. Build citations/backlinks from legitimate medical, institutional, event,
   author, and local sources. Do not buy links or create spam listings.
7. Run final production checks for canonical URLs, hreflang, indexability,
   sitemap coverage, structured data, metadata uniqueness, broken links, image
   weight, Core Web Vitals, and Search Console status.

Do not push or deploy future changes unless the user explicitly requests it.
