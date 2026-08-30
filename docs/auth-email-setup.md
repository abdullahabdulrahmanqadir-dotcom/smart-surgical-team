# Account registration and Supabase email — status

Supabase project **`elcjynpdcqxpxfqcamuw`** (`smartsurgicalteam`).
Cloudflare zone **`a96471c9b8ff2e4baeafa7d3f06b229f`** (`ssthyroid.com`).

Everything below marked ✅ was applied on **2026-08-30** and verified. Two steps
remain, both blocked on a credential that must be handled by hand.

---

## ✅ 1. Migration `0023_account_registration.sql` — applied

Run through the dashboard SQL editor as `postgres`. Verified afterwards by
querying the catalogue directly:

| Object | State |
| --- | --- |
| `profiles.first_name / last_name / organisation / job_title / country / legal_accepted_at / legal_version` | all 7 present |
| `on_auth_user_created` on `auth.users` | present |
| `on_auth_user_metadata_updated` on `auth.users` | present |
| `enforce_single_sign_in_method` on `auth.identities` | present |
| `protect_profile_role` on `public.profiles` | present |
| policy `members update their profile` | now `with check (auth.uid() = id)` |

Backfill touched all 5 existing profiles; 1 already had an organisation on file.

The `auth.identities` trigger was accepted without a permissions error, so the
one-email-one-method rule is live. Its rollback, if Google registration ever
breaks: `drop trigger enforce_single_sign_in_method on auth.identities;`

## ✅ 2. Auth provider settings — corrected

Two mismatches between the dashboard and the shipped code were found and fixed:

- **Email OTP length was 8**, but the wizard's code field accepts exactly six
  digits. Set to **6**.
- **Minimum password length was 6**, while the wizard enforces 8 client-side.
  Set to **8**, so the server agrees with the form.

`Email OTP expiration` was already 3600 s, which is what the email template says.
Email and Google providers are both enabled.

## ✅ 3. URL configuration — already correct, nothing changed

Site URL `https://ssthyroid.com`. Redirect allowlist already carries all four
wildcards, so the new `/<locale>/complete-profile` landing is covered:

```
https://ssthyroid.com/**
https://www.ssthyroid.com/**
https://smart.ssteam.workers.dev/**
http://localhost:3000/**
```

## ✅ 4. Resend domain — added and verified

`ssthyroid.com` is **Verified** in Resend (region `ap-northeast-1`, Tokyo — the
default; it affects sending infrastructure, not deliverability, and is not worth
re-creating the domain to change).

Three records were added to the Cloudflare zone, and confirmed to resolve
through a public resolver:

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3…wIDAQAB` (DKIM) | — |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

**Resend's fourth record was deliberately NOT added.** Its "Enable Receiving"
step asks for an `MX` on the **apex** (`inbound-smtp.ap-northeast-1.amazonaws.com`,
priority 4). The apex already carries `mx1`/`mx2.hostinger.com`, which is the
coworker's live mail. Adding Resend's apex MX would compete with it and could
break their email. The site only needs to *send*, so receiving stays off.

For the same reason Resend's SPF sits on the `send` subdomain and the apex SPF
(`v=spf1 include:_spf.mail.hostinger.com ~all`) was left untouched. Verified
after the change: apex MX still returns both Hostinger hosts, apex TXT still
returns the Hostinger SPF and the Google Search Console verification.

"Auto configure" was declined in favour of manual records — it asks for OAuth
access to the whole Cloudflare account.

---

## ⛔ 5. SMTP password — needs you

The Supabase SMTP form at **Authentication → Emails → SMTP Settings** is staged
with everything except the password:

| Field | Value | State |
| --- | --- | --- |
| Enable custom SMTP | on | filled |
| Sender email | `no-reply@ssthyroid.com` | filled |
| Sender name | `Smart Surgical Team` | filled |
| Host | `smtp.resend.com` | filled |
| Port | `465` | filled |
| Username | `resend` | filled |
| **Password** | a Resend API key | **empty — yours to enter** |

I do not enter API keys, tokens or passwords into fields, so this last step is
yours:

1. Resend → **API keys** → *Create API key*, permission **Sending access**. The
   `re_…` value is shown once. (An older key named "Onboarding" already exists,
   but its value is no longer retrievable — make a new one unless you saved it.)
2. Paste it into the Supabase **Password** field and **Save changes**.

Note: Chrome autofilled that Username and Password field with an unrelated saved
credential when the form opened. Both were cleared and the username retyped — if
you reload the page before saving, check them again.

Once saved, Supabase raises the auth email rate limit to 30/hour automatically.
Raise it further at **Authentication → Rate Limits** if needed; 100 is ample.

## ⛔ 6. Email templates — blocked until step 5

Supabase **locks template editing behind custom SMTP** on the Free plan ("Set up
custom SMTP to edit templates"). The alternatives it offers are upgrading to Pro
or configuring a Send Email hook; custom SMTP is the cheapest path.

So this is not optional polish — **until step 5 is saved, the confirm-signup
email carries Supabase's default template, which contains only
`{{ .ConfirmationURL }}` and no `{{ .Token }}`.** The wizard's step 4 would then
have no code to type.

After saving SMTP, go to **Authentication → Emails → Templates** and paste:

| Template | File | Subject |
| --- | --- | --- |
| Confirm signup | `supabase/templates/confirm-signup.html` | `Your Smart Surgical Team verification code` |
| Reset password | `supabase/templates/reset-password.html` | `Reset your Smart Surgical Team password` |
| Change email address | `supabase/templates/change-email.html` | `Confirm your new email address` |

Magic link and invite templates stay at their defaults — the site uses neither.

## ⛔ 7. Turn on "Confirm email" — last, not first

**Authentication → Sign In / Providers → User Signups → Confirm email.** It is
currently **off**, deliberately: turning it on before steps 5 and 6 would send
the default link-only email through Supabase's built-in sender, which is capped
at a couple of messages an hour. Sign-up keeps working meanwhile — `signUp()`
returns a session immediately and the wizard skips its verification step.

---

## Testing, in this order

1. **Do this first after the SMTP save.** Sign in with Google on a *fresh*
   address — expect `/complete-profile`, then the profile page; sign out and
   back in, expect to go straight to the profile. If Google registration fails
   outright, the GoTrue version is writing an `email` identity alongside
   `google` and the new trigger is refusing it: drop the trigger (§1) and say
   so — nothing else depends on it.
2. Register with a fresh address. Confirm the email arrives from
   `no-reply@ssthyroid.com`, shows six digits, and that entering them signs you
   in.
3. Register again with that same address — expect "An account with this email
   already exists".
4. Sign in with Google using that same address — expect "This email already has
   an account", not a successful sign-in.
5. Check both routes landed in the database:
   ```sql
   select u.email, p.organisation, p.job_title, p.country, p.legal_accepted_at
   from public.profiles p join auth.users u on u.id = p.id
   order by p.created_at desc limit 5;
   ```
6. Confirm the coworker's mail still flows — send a message to and from a
   `@ssthyroid.com` mailbox. The apex records were not touched, but this is
   cheap insurance.

## Security fix included in `0023`

The `members update their profile` policy from `0001` had a `USING` clause and
no `WITH CHECK`, so anyone holding a session and the public anon key could run
`update profiles set role = 'owner' where id = auth.uid()` straight against
PostgREST and take the Admin workspace. The policy now pins the row to its
owner, and `protect_profile_role` pins the `role` column for the `authenticated`
and `anon` database roles. It is deliberately **SECURITY INVOKER**: `current_user`
is the only reliable way to tell a browser session from the service-role key,
and a SECURITY DEFINER body would report the function owner for both and break
the Admin workspace's own promotions in `/api/admin/people`.
