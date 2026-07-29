# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Member Auth (Supabase)

Member sign-in/sign-up runs on Supabase Auth (`lib/supabase/browser.ts`,
`lib/supabase/server.ts`), not on any Dispatch-owned identity headers:

- Email + password sign-in, and an email OTP → profile details → password
  sign-up wizard (`app/components/AuthForm.tsx`, `app/components/SignUpWizard.tsx`).
- "Continue with Google" on both forms via
  `client.auth.signInWithOAuth({ provider: "google" })`. Enable the Google
  provider in the Supabase Dashboard (Authentication → Providers → Google)
  with a Google Cloud OAuth client, and add this site's origin(s) to the
  Google client's authorized redirect URIs as instructed by Supabase.
- Sessions are held client-side by the Supabase browser client; the profile
  page (`app/components/MemberProfile.tsx`) fetches the current user on
  mount and has no server-rendered identity dependency.

The `/signin-with-chatgpt`, `/signout-with-chatgpt`, and `/callback` paths
remain reserved by the Dispatch hosting platform; this app does not use them.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
