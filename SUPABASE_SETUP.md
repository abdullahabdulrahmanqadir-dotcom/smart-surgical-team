# Supabase setup

The platform uses Supabase for public authentication and application data. Cloudflare continues to host and run the website.

1. Create a Supabase project and copy the project URL, anon key, and service-role key from **Project Settings → API**.
2. In the Supabase SQL Editor, run `supabase/migrations/0001_initial_platform.sql` once.
3. In **Authentication → Providers**, enable Email and Google. Add the Cloudflare site URL and `http://localhost:3000` as redirect URLs during development.
4. Copy `.env.example` to `.env.local` and enter the four values. Keep the service-role key server-only.
5. Configure the same four values in the Cloudflare deployment environment. Do not add the service-role key to any `NEXT_PUBLIC_` variable.

The database begins with row-level policies: public visitors can read published content, while members can only manage their own profile, saved learning, progress, and webinar registrations. Staff publishing policies will be added with the staff dashboard.
