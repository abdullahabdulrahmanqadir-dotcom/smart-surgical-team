# SST editorial redesign review

## Section review and refinements · 10 November 2026

The baseline for this pass is the working copy of `codex/sst-editorial-redesign` at the start of the review, including the refinements already recorded below. I scored the public surfaces touched by the branch in English and Arabic. Each score combines visual hierarchy, spacing and readability, brand fit, responsive behavior, and interaction and accessibility, each worth up to 20 points. The overall score is the equal-weight mean of the 32 rows. Scores are design judgments informed by browser checks.

The first pass addressed hierarchy, links, and mobile composition. The second pass addressed issues exposed by browser verification, including the display-font fallback, keyboard focus, and dropdown scrolling. A score in the 90s means the section is polished in the reviewed contexts, with the remaining uncertainty stated below.

| Surface | Before | Pass 1 | Final | Critique and changes |
| --- | ---: | ---: | ---: | --- |
| Shared header and navigation | 86 | 95 | 96 | The open mobile menu shifted the page and repeated account links. It now opens below the masthead, marks the current section and presents each account action once. |
| Language and theme controls | 89 | 94 | 95 | The utility bar keeps both visible across screen sizes. Escape, focus return, and route preservation held up in both languages. |
| Editorial type across pages | 80 | 83 | 96 | The redesign named fonts directly and bypassed the configured faces. Headlines now use the existing Literata and Noto Naskh variables with serif fallbacks. |
| Footer navigation and contact | 81 | 92 | 94 | Two related link groups sit side by side on phones. Social links have a larger hit area, and the email address keeps its reading direction in Arabic. |
| Home · headline and calls to action | 87 | 91 | 95 | The headline has a more comfortable measure, the library remains the most prominent action, and the surgeon byline reads as a link. |
| Home · thyroid illustration and caption | 91 | 92 | 94 | The existing linework and copper emphasis balance the headline. The mobile composition keeps the plate and caption in proportion to the introduction. |
| Home · pinned announcement | 82 | 94 | 95 | The label, story and action have distinct positions on phones. Dismissal hands keyboard focus to the following section and survives a reload. |
| Home · topic shortcuts | 81 | 94 | 95 | Direction-aware arrows and stronger hover and focus states make the four subject links look actionable. |
| Home · recent publications | 84 | 90 | 94 | Citation typography now separates titles from journal, year and topic. Topic names use existing translations where available. |
| Home · latest news | 84 | 91 | 94 | Longer titles wrap within the column. Links to external coverage follow the same behavior as the news archive and identify the destination to assistive technology. |
| Home · upcoming events | 85 | 90 | 92 | The empty calendar is concise and points directly to the events archive. The live sample contained no upcoming event. |
| Home · team and credentials | 85 | 92 | 95 | A short introduction connects the team and clinic. A ruled grid separates the credentials from the portraits and video. |
| Home · introduction video | 88 | 91 | 93 | The play affordance sits beside the clinician profiles. The existing click-to-load player keeps the initial page independent of YouTube. |
| Topics · index and case-library link | 86 | 89 | 94 | The heading and route to all cases form a clear first row above the anatomy module. |
| Topics · anatomy map | 89 | 89 | 95 | The existing callout layout fits the sampled narrow views. Focused callouts have an explicit outline, and selection and reset return focus to the appropriate control. |
| Topics · region cards and latest case | 88 | 90 | 94 | The region cards provide an alternate entry point to the map, and the latest case gives the unselected state a concrete next step. |
| Case library · introduction and results | 82 | 93 | 95 | The archive uses a shorter introduction with a clear path back to Topics. The result count stays beside the filters as the grid changes. |
| Case library · search, filter and reset | 80 | 92 | 96 | Search accepts either writing direction. The count announces changes, clear returns focus to search, and keyboard selection stays in view even with the pointer parked over the menu. |
| Case library · case cards | 89 | 91 | 94 | The existing image-first cards are easy to compare. A shorter introduction and stable filter area bring the results into view earlier. |
| Research · heading and publication grid | 86 | 89 | 94 | The display heading and existing generated journal covers give the archive a distinct editorial hierarchy. |
| Research · search and filters | 82 | 83 | 96 | The visible option tracks keyboard selection, results are announced, and clearing filters returns focus to the search field. |
| Research · pagination and saved view | 83 | 83 | 96 | Page changes return keyboard focus to the archive heading. The saved view restores before the browser writes back the filter and page values. |
| Posters · featured study | 82 | 91 | 94 | The title, summary and action form one reading block, followed by the poster in visual and keyboard order. The wider desktop preview gives the study more presence. |
| Posters · archive | 86 | 91 | 94 | The archive follows at a consistent interval with a clear serif heading and a direct jump link from the page introduction. |
| News · story feed | 79 | 92 | 95 | The tiny mobile thumbnails became full-width photos. Desktop keeps a compact editorial list, and image descriptions come from the actual cover. |
| News · category filters and feedback | 86 | 91 | 95 | The selected category stays clear and the live region announces the number of stories without reading the entire replacement feed. |
| Events · image hero and archive jump | 87 | 93 | 95 | The hero now has a visible route to the event list. The link sits on the image with a clear underlined treatment. |
| Events · archive and filters | 88 | 89 | 93 | The shorter hero and direct jump put the list within reach, and the shared dropdown keeps keyboard-selected options visible. |
| About · introduction and mission | 85 | 92 | 94 | The mission and headline align at desktop sizes. On phones the team link has a larger hit area before the page moves into the mission. |
| About · team directory | 90 | 92 | 94 | The existing portrait grid anchors the page. Directory headings now match the editorial type used elsewhere. |
| Contact · introduction and directions | 85 | 93 | 95 | Directions became the primary action. The location heading uses more of its panel and wraps naturally on phones. |
| Contact · details and map | 88 | 91 | 94 | The email reads in the correct direction and the map heading matches the rest of the page. The map remains an external embed. |
| **Overall** | **85.1** | **90.7** | **94.5** | |

The strongest changes were the news feed on phones, case-library filtering, and keyboard use of the research archive. Scores reflect local Chromium review, sampled content and automated accessibility checks. A live release on real devices, a screen-reader session, and pages populated with an upcoming event would give additional evidence for the remaining points.

### Verification

- Compared 84 viewport, locale and theme combinations across the nine public routes. Rechecked the production build locally with the same matrix. Every view returned successfully and fit its viewport. Axe reported no violations in the 18 sampled production-build views.
- Tested keyboard navigation for the mobile menu, language switcher, anatomy map, case and research filters, and research pagination. Also checked theme switching, announcement dismissal and persistence, news filter feedback, and poster archive jump clearance.
- The local media bucket is empty. The browser used the public URLs for the media spot check, with the page layouts still served locally. All 21 sampled images loaded.
- The Windows Vinext build emitted local paths for the webfonts. The built preview rendered with the serif fallbacks. I pointed a browser-only override at the packaged files, verified that Literata, Inter, Noto Naskh Arabic and IBM Plex Sans Arabic loaded, then reran the 84 layouts and 18 axe scans with those fonts. The layout and axe checks passed in that run as well.
- The production build and all 129 repository tests passed. TypeScript passed. ESLint reported zero errors and 22 warnings.

## Previous review · 9 November 2026

**Branch:** `codex/sst-editorial-redesign` · **Baseline:** `eb95eaa` · **Reviewed:** 9 November 2026

The [TOSIC homepage](https://www.tosicollaborative.org/) provides the visual benchmark: a dark utility bar, a serif lead, clear primary and secondary actions, and page sections organized with fine rules. SST applies those principles using its own teal and ivory palette, anatomy artwork, and clinical content. The library remains the main action.

## Scorecard

Score each category out of 20. **16** means the category meets the professional baseline across the reviewed pages; **18** means it is consistent with only minor polish opportunities; **20** means no material issue remains in the reviewed scope. **Pass: at least 85/100, every category at least 16/20, and no blocker** (clipped content, failed contrast in the sampled views, or a keyboard blocker in the reviewed controls). The scores are design judgments; the browser checks below support them.

| Category | Before | After | What changed |
| --- | ---: | ---: | --- |
| Typography and hierarchy | 15 | 19 | Calmer serif titles, better headline wrapping and reading measure, and a clearer distinction between the library and research actions. |
| Spacing and alignment | 14 | 18 | Shared spacing above public indexes, consistent outer gutters, and better balance between the hero copy and anatomy plate. |
| Visual consistency and fit | 16 | 18 | TOSIC's editorial cues carry through the masthead and page hierarchy. SST's own artwork, palette, research cards and case cards retain their identity. |
| Responsive layout and Arabic | 14 | 18 | The hero plate scales down on phones, short anatomy labels sit clear of the illustration, and the layout uses direction-aware spacing. |
| Accessibility and interaction | 14 | 17 | Stronger metadata contrast, larger navigation targets, a current-section marker, and predictable focus when dismissing menus or resetting the map. |
| **Total** | **73** | **90** | **Pass for the reviewed local layouts and interactions.** |

## Verification scope

- Compared 84 Chromium views before and after across Home, Topics, Library, Research, Posters, News, Events, About and Contact. Covered English and Arabic, 320–1440 CSS pixels, portrait and landscape, light and dark, and reduced motion.
- None of those views had horizontal page overflow. Axe found no violations in the final 18 sampled views (English desktop light and Arabic small-screen dark). Keyboard checks passed for opening and dismissing both navigation controls, switching themes, and selecting and resetting anatomy regions.
- The review used the W3C [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and [keyboard focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) criteria as checks. This is a targeted review of changed public layouts, not a site-wide conformance audit.
- The Cloudflare remote preview could not open the media bucket. The browser spot check used the public production URLs for media only, with the redesigned pages still served locally. All 19 sampled news, poster, and case images loaded.
