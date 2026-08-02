# Smart Surgical Team

The trilingual surgical education site, built on
[vinext](https://github.com/cloudflare/vinext) and running on Cloudflare
Workers.

## Prerequisites

- Node.js `>=22.13.0`
- `wrangler login` — local development binds the real R2 media bucket

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This project does not use `wrangler.jsonc`; bindings for local development are
declared in `vite.config.ts`.

## Shape

- site code lives under `app/`, with locale-prefixed routes at `app/[locale]/`
- `vite.config.ts` declares the local binding set and the Vite plugin chain
- `worker/index.ts` is the Worker entry

## Deployment

The site is the Cloudflare Worker **`smart`**, deployed from `main` through the
Cloudflare Git integration — pushing to `main` deploys. The Worker's Bindings
tab in the Cloudflare dashboard is the source of truth for bindings and
secrets.

## Data and media

- **Supabase** holds content, members and media metadata. Member sign-in and
  sign-up run on Supabase Auth (`lib/supabase/browser.ts`,
  `lib/supabase/server.ts`).
- **Cloudflare R2** (`smart-media`) holds editorial media. Uploads go through
  `app/api/admin/upload/route.ts`, which writes keys shaped like
  `topics/<topic>/<case>/<file>`; `app/api/media/[...path]/route.ts` serves
  them back. Stored URLs are `/api/media/…` paths, never bucket URLs.

`MEDIA_BUCKET` is bound with `remote: true`, so local development reads and
writes the real bucket. A local Miniflare bucket starts empty, which makes
every image 404 and sends Admin uploads into a local cache the deployed site
cannot read — while the Supabase row, always the shared instance, points at a
key that does not exist.

## Member auth notes

- Email + password sign-in, and an email OTP → profile details → password
  sign-up wizard (`app/components/AuthForm.tsx`,
  `app/components/SignUpWizard.tsx`).
- "Continue with Google" on both forms via
  `client.auth.signInWithOAuth({ provider: "google" })`. Enable the Google
  provider in the Supabase Dashboard (Authentication → Providers → Google)
  with a Google Cloud OAuth client, and add this site's origin(s) to the
  Google client's authorized redirect URIs as instructed by Supabase.
- Sessions are held client-side by the Supabase browser client; the profile
  page (`app/components/MemberProfile.tsx`) fetches the current user on mount
  and has no server-rendered identity dependency.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build and verify the rendered output
- `npm run lint`: run ESLint

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
