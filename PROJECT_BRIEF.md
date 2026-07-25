# Smart Surgical Team — Project Brief

## Purpose

Build a bilingual digital platform for **Smart Surgical Team** at Smart Health Tower in Sulaymaniah, Kurdistan, Iraq.

The platform combines public education, healthcare marketing, and surgical learning. It focuses on head and neck surgery and will grow into a structured education academy with surgical videos, webinars, e-posters, and more.

## Brand

- **Public name:** Smart Surgical Team
- **Preferred compact name:** SST, only where space is constrained
- **Tagline:** *Head & Neck Surgery, Guided by Expertise.*
- **Location:** Smart Health Tower, Sulaymaniah, Kurdistan, Iraq
- **Logo direction:** Abstract head-and-neck surgical mark is currently preferred. Final logo design is deferred.

### Colour palette

| Role | Colour |
| --- | --- |
| Primary / deep brand tone | `#0D3838` Deep teal |
| Interactive teal | `#167A78` Teal |
| Soft educational surface | `#CDEBE5` Pale aqua |
| Light background | `#F5F2EA` Warm ivory |
| Call-to-action accent | `#C9824B` Copper |

### Visual direction

- Premium, calm, clinical, modern, and trustworthy.
- Content-first learning platform inspired by the functional structure of the WCTC Academy reference, without copying its branding, text, assets, or code.
- **Approved landing-page visual foundation:** the refined combined mockup is locked as the build direction. It uses the structured education-academy layout (mockup 3) enriched with the spacious editorial feel and large featured-surgery treatment from mockup 1, plus the richer content modules and team presence from mockup 2. Fine visual retouching will happen during implementation.
- Light aqua and teal are the dominant visual colours: `#CDEBE5` for surfaces and `#167A78` for interactive/illustrative elements. Use deep teal mainly for accessible text and contrast, not as the dominant page surface.
- The hero will use a refined anatomical head-and-neck line illustration with layered contour lines, flowing paths, and subtle particles/nodes. It should be gently animated on arrival to give the page life, while respecting reduced-motion settings.
- Light and dark modes.
- Responsive, accessible layouts.
- English and Sorani Kurdish support, including right-to-left Sorani layouts.
- Language should be automatically suggested/detected while always keeping a visible language switcher.

## Audience and access

- Primary audiences: public/patients and healthcare professionals/trainees.
- All registered members see the same content; patient and professional content are not separated at launch.
- Anyone can register and access the library.
- Registration fields: name, email, phone number, city, and profession.
- Authentication: Google sign-in plus email/password.
- Account workflow is intended to be immediate activation with welcome and email-confirmation/approval messaging; confirm precise wording before implementation.
- No public comments on content.

## Content scope

### Content types

- Surgical and educational videos
- Live webinars and webinar recordings
- E-posters: uploaded PDF and interactive image-based formats
- Events
- Surgeon/contributor profiles

### Learning features at launch

- Searchable content library
- Filters by content type and topic
- Video chapters
- Viewing progress tracking
- Saved learning / personal library
- Webinar registration and reminders
- Scheduled publishing
- Webinar recordings added to the library

### Deferred features

- Certificates
- Patient testimonials and success stories
- Outcomes/statistics section
- Appointment booking
- Final logo design
- Public YouTube channel page

### Video and webinar services

- Surgical videos will be hosted on YouTube and presented through the members-only library. The YouTube channel will not be publicly promoted from the website initially.
- Note: YouTube unlisted links are not a security boundary; highly sensitive training content may require a private video platform later.
- Zoom is the likely webinar provider, but this remains to be confirmed.
- Consent and de-identification procedures for surgical video material are confirmed as in place.

### Surgical topic taxonomy

1. **Thyroid & Parathyroid**
   - Thyroid
   - Parathyroid
2. **Salivary Glands**
   - Parotid
3. **Neck & Lymphatic Surgery**
   - Lymph nodes
   - Neck masses
4. **Skin & Soft Tissue**
   - Skin lesions
5. **Upper Aerodigestive Tract**
   - Oral cavity
   - Larynx

No breast content is in scope.

### Confirmed example content for design mockups

- Do not use or imply **total laryngectomy** as a Smart Surgical Team procedure or featured learning item.
- Use thyroidectomy, parotidectomy, lymph-node/neck-dissection, skin-lesion, and other confirmed subject examples instead.

## Pages and navigation

### Essential public pages

- Home
- About Us
- Topics / specialties
- Content Library (member access)
- Webinars
- Events
- Contributors / surgical team
- Contact Us
- Sign in / Register

### About Us content

Keep it essential and focused on the team, location, vision, mission, specialties, and contact details. Do not add outcomes/statistics initially.

### Home page priority

- Main call to action: **Explore the Library**
- No "Join"-focused home-page call to action
- Introduce the team, learning resources, specialties, and featured/upcoming content

### Contact

- Contact form only at launch; no appointment-request flow.
- Contact submissions should ultimately reach email and WhatsApp; destination details will be supplied later.

## Roles and permissions

Role-based access is required. No mandatory final administrator-approval workflow is required before publishing; permissions determine who may publish.

| Role | Expected responsibilities |
| --- | --- |
| Owner / Administrator | All settings, users, roles, and platform controls |
| Content Manager | Publish and manage videos, webinars, posters, topics, and schedules |
| Editor | Create and edit content without account/system controls |
| Surgeon / Contributor | Manage their professional profile and submit/manage assigned material |
| Member | Watch content, register for webinars, save learning items, and track progress |

## Technical direction

- A secure, responsive member platform is needed rather than a static marketing site.
- Recommended authentication and data foundation: **Supabase** for public Google/email sign-in, member data, roles, saved items, progress, and email workflows.
- A Supabase account and Google OAuth credentials will be needed later to activate production authentication.
- Email delivery provider and final email copy remain to be decided.
- Domain name has not yet been chosen; use a temporary project URL until one is selected.

## Reference product features

Recreate comparable functional patterns from the WCTC Academy reference:

- Browseable library with search and type/topic/access filters
- Topic exploration
- Events and webinars
- Contributor pages
- Content cards with type, topic, presenters, duration, and access state
- Registered-member library access
- Progress tracking and chapter navigation
- Webinar registration/reminders and on-demand recordings

Do not copy the reference site's intellectual property, content, imagery, branding, or source code.

## Open decisions

- Confirm Supabase as the account/data provider.
- Confirm exact account activation and confirmation-email wording.
- Confirm Zoom or another service for live webinars.
- Supply contact email address and WhatsApp number.
- Supply team biographies, names, credentials, professional photos, and initial content later.
- Choose domain name.
- Finalize logo after additional exploration.
