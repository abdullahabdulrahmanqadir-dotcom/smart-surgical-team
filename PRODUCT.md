# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: head-and-neck surgeons, residents and surgical trainees, who read the
site as a professional reference — looking up a procedure, a published paper, a
documented case, or an upcoming webinar, often between clinical duties and often
on a phone.

Secondary: patients and their families in Kurdistan and Iraq, researching a
diagnosis or a named procedure before or after seeing the team, plus referring
physicians assessing the team's work.

**When the two conflict, professionals win** (confirmed 2026-09-02). Clinical
vocabulary and dense reference material are acceptable; patients are served by
plain-language entry points into that depth, not by diluting it.

## Product Purpose

Smart Surgical Team is the public education and reference platform for the
head-and-neck surgery team at Smart Health Tower, Sulaymaniyah, Kurdistan, Iraq.
It publishes what the team actually does and knows: documented surgical cases,
peer-reviewed publications, e-posters, news, events and webinars, organised by
surgical topic.

It combines public education, healthcare marketing and surgical learning, and is
intended to grow into a structured education academy with surgical video,
webinars and progress tracking. Success is a surgeon or trainee finding the
team's real material on a topic quickly, and a patient understanding what a named
procedure involves.

## Positioning

The material is first-hand: this is one named surgical team's own operative
record, own publications and own posters, from a single hospital in Kurdistan —
not a curated feed of other people's content. A neighbouring product cannot
truthfully claim to be publishing *these* cases by *these* surgeons.

Head and neck only. Breast content is explicitly out of scope.

## Operating Context

- Two shipped locales, both URL-prefixed so neither is privileged: `/en`
  (English, LTR) and `/ar` (Arabic, RTL). Sorani Kurdish (ckb) is intended and
  the fonts already cover its glyphs, but it is **not implemented yet**. Every
  layout must therefore be direction-agnostic (logical CSS properties), and
  Arabic-script typesetting rules are binding, not cosmetic.
- Live at ssthyroid.com, served by the Cloudflare Worker `smart`; the legacy
  WordPress site was 301'd to it on 2026-08-30. Domain registration is still held
  by a coworker at Hostinger.
- Read paths are heavily cached (a 60-second fresh window plus a 24-hour stale
  copy in R2, and a service worker for offline resilience), because the Worker
  runs on Cloudflare's free CPU allowance. Public pages must survive being served
  as cached HTML, and a publish can take up to a minute to appear.
- Content is created by the team itself through an in-site Admin, not by
  engineers: topics, cases, posters, news, events and research are all editable
  rows, and covers for research are generated typographically rather than
  uploaded.
- Real usage skews mobile, on Iraqi networks, where the image weight of a case
  page is felt directly.

## Capabilities and Constraints

**Shipped:** home, about, contact, privacy, terms; topics (a team-editable topic
tree) and topic pages; a content library with case pages; research (72
publications); e-posters; news with galleries; events; sign-up / sign-in
(4-step email-code registration plus Google, one email = one sign-in method),
complete-profile, member profile, and a role-based Admin.

**Access model** (confirmed 2026-09-02): everything published today is **public
with no sign-in check** — a deliberate launch decision, not an oversight.
Gating is expected later for some content types (surgical video is the likely
first), so designs must leave room for locked and preview states without
assuming them now. Accounts today exist for saved learning, progress and
editorial roles.

**Roles:** Owner/Administrator, Content Manager, Editor, Surgeon/Contributor,
Member. Permissions decide who may publish; there is no mandatory final approval
step.

**Deferred, and must not be implied as existing:** certificates, patient
testimonials, outcomes/statistics, appointment booking, a public YouTube channel
page, and the final logo. There is no comment system on content and none is
planned.

**Undecided:** the webinar provider (Zoom is likely, unconfirmed); the WhatsApp
destination for contact submissions.

## Brand Commitments

- Public name **Smart Surgical Team**; **SST** only where space is genuinely
  constrained.
- Tagline: *Head & Neck Surgery, Guided by Expertise.*
- Palette, locked and implemented: deep teal `#0D3838` (text and contrast, not a
  dominant surface), teal `#167A78` (interactive and illustrative), pale aqua
  `#CDEBE5` (dominant educational surface), warm ivory `#F5F2EA` (light
  background), copper `#C9824B` (conversion accent, used sparingly). Aqua and
  teal dominate.
- Typography, locked 2026-07-26 after a live specimen review: Newsreader
  (serif) headings over Inter body for Latin; Noto Kufi Arabic in both roles for
  Arabic script. Self-hosted at build time.
- Register: premium, calm, clinical, modern, trustworthy — editorial and
  institutional rather than start-up.
- Light and dark modes both required.
- The logo is deliberately unresolved; an abstract head-and-neck surgical mark
  is the preferred direction. Do not present a logo as final.
- Home page's main call to action is **Explore the Library**. Not a "Join" CTA.
- The WCTC Academy reference informs functional patterns only; its branding,
  copy, imagery and code must never be reproduced.

## Evidence on Hand

Everything published on the site today is **real and approved** (confirmed by the
client 2026-09-02):

- **Research:** 72 verified head-and-neck publications, cross-checked against
  CrossRef, newest first.
- **Cases:** the library's case records are real consented published cases,
  extracted from the team's legacy ssthyroid.com gallery; media lives in the
  `smart-media` R2 bucket and is served through `/api/media/…`.
- **News:** real events with real photographs.
- **Team / contributors:** real names, credentials, bios and photos.

Consent and de-identification procedures for surgical material are confirmed in
place. There are no outcome statistics, no testimonials and no benchmarks —
future work must not invent any, and must not present total laryngectomy as a
Smart Surgical Team procedure.

## Product Principles

1. **Publish only what the team can stand behind.** Medical content is honest or
   absent; never fabricate a case, a figure, an outcome or a credential.
2. **Reference before persuasion.** A surgeon looking something up must reach it
   in as few moves as possible; marketing lives around that, never in front of it.
3. **Both directions are first-class.** Arabic is not a translation layer over an
   English design — RTL and Arabic-script typesetting are part of the design's
   definition of done.
4. **Built for a constrained network and a constrained Worker.** Weight, caching
   behaviour and offline fallback are design concerns, not just engineering ones.
5. **The team owns its own content.** Anything an editor will maintain must be
   editable, and must still look composed when the data is short, long, missing
   or in the other script.

## Accessibility & Inclusion

Responsive, accessible layouts in both light and dark mode, with a visible
language switcher regardless of automatic language suggestion. Motion is subtle
by design and must respect `prefers-reduced-motion`. No specific conformance
standard has been named by the client; treat WCAG AA contrast as the working
floor until one is.
