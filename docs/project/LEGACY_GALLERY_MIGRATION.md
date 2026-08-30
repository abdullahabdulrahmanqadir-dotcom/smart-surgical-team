# Legacy ssthyroid.com migration — what came across, and what did not

Status as of **2026-08-30**, taken before the domain cutover
(`DOMAIN_CUTOVER_SSTHYROID.md`).

The old site is a Hostinger/Zyro builder site, site id `mjE2g8GxZDiv9OBQ`, with
its images on `https://assets.zyrosite.com/mjE2g8GxZDiv9OBQ/<filename>`. It has
**94 pages: 81 blog posts and 13 static pages**. 78 of the 81 posts were visible
in `/gallery`; the other three are one Recommendation post and two Fast Track
reviews.

Moving the nameservers does not delete that site — it stays in the coworker's
Hostinger account — but it stops being reachable at `ssthyroid.com`, and we do
not control that account. A full offline archive was taken first: every page's
HTML, the decoded text of each page, and all 466 unique images (237 MB). The 43
videos are on YouTube and were not copied.

## Content

| | Count |
|---|---|
| Gallery posts on the old site | 78 |
| Already in Supabase before 2026-08-30 | 60 |
| Imported 2026-08-30 (`scripts/import-legacy-remainder.mjs`) | 18 |
| Cases authored directly on the new site, no old counterpart | 8 |

The 18 are eight clinical cases and ten teaching & reference items. Their prose
is the legacy post's own text folded into the site's canonical case sections per
the client's 2026-08-06 instruction; images went straight to R2 under
`topics/<topic>/<slug>/`, with no local `cases/` folder.

Teaching items carry `content_items.is_teaching` (migration 0022) and appear in
the topic grids beside cases with a "Teaching" badge, filterable through the
Content format select. They keep their own section headings via
`case_sections`; cases leave that column null so their headings stay
translatable.

### Known gap

`thyroid-nodulectomy` is imported as a **draft**. The legacy post carried no
prose at all — only a video embedded from Google Drive, which the site's player
cannot play. It needs its video re-hosted (YouTube, or R2 as a direct file)
before it can be published.

## Deliberately not migrated

These were reviewed on 2026-08-30 and left behind by decision, not oversight.
None of them blocks the domain cutover.

- **Team page.** The old `/team` listed 26 people; `app/lib/team.ts` carries 19.
  The *SST Research Staff* (Harun A. Ahmed, Akar H. Khdhir, Omar A. Hammad,
  Hunar A. Hassan, Ari Jamal) and *SST Clinic Staff* (Muhammad A. Hama Ali,
  Bushra O. Hussain) groups were dropped **on purpose**. Leave as is.
- **Statistics page.** Surgery volume counters — 1,500+ thyroid lobectomy, 800+
  neck dissection, 130+ parathyroid, 50+ follicular carcinoma, and others across
  16 images. The figures are **out of date**; the client will supply new ones.
  Do not port the old numbers.
- **Self Assessment.** A quiz embed. **Not wanted** on the new site.
- **Empty pages.** `/activity`, `/event`, `/recommendations` and `/about` on the
  old site held nothing but the shared footer. Nothing was lost.
- **The three non-gallery posts.** One Recommendation
  ("Reclassifying TRAb-negative hyperthyroidism") and two Fast Track reviews.
  They were never in the gallery and have no section on the new site. They are
  in the archive if they are ever wanted.

## Still open

- **No redirects for the 94 legacy URLs.** `worker/index.ts` has no legacy
  redirect map, so every old inbound link 404s the moment DNS moves. Most new
  slugs match the old ones (the importer deliberately kept them), so the map is
  mostly identity plus a handful of renames.
- **The archive is not yet in durable storage.** It was taken into
  `scratch/old/`, which is gitignored — the same way the earlier `cases/`
  extraction was lost. It needs a home outside the working tree.
