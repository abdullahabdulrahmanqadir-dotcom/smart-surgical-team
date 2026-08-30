# Account registration and Supabase email — status

Supabase project **`elcjynpdcqxpxfqcamuw`** (`smartsurgicalteam`).
Cloudflare zone **`a96471c9b8ff2e4baeafa7d3f06b229f`** (`ssthyroid.com`).

Everything below was applied on **2026-08-30** and verified end to end.
**The flow is live.** Nothing is outstanding.

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

## ✅ 5. SMTP — live

Supabase → Authentication → Emails → SMTP Settings:

| Field | Value |
| --- | --- |
| Enable custom SMTP | on |
| Sender email | `no-reply@ssthyroid.com` |
| Sender name | `Smart Surgical Team` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a Resend *Sending access* API key |

The email rate limit was raised from the post-enable default of 30/h to **100/h**
at Authentication → Rate Limits.

**Trap:** Chrome autofills that Username and Password field with an unrelated
saved credential every time the form is opened. Check both before saving.

## ✅ 6. Email templates — installed

| Template | Source file | Subject |
| --- | --- | --- |
| Confirm signup | `supabase/templates/confirm-signup.html` | `Your Smart Surgical Team verification code` |
| Reset password | `supabase/templates/reset-password.html` | `Reset your Smart Surgical Team password` |
| Change email address | `supabase/templates/change-email.html` | `Confirm your new email address` |

Supabase locks template editing behind custom SMTP on the Free plan, so these
could only be installed after step 5. The confirm-signup template **must** keep
`{{ .Token }}` — Supabase's default carries only `{{ .ConfirmationURL }}`, which
would leave the wizard's step 4 with nothing to type.

Magic link and invite templates stay at their defaults — the site uses neither.

## ✅ 7. Confirm email — ON

Authentication → Sign In / Providers → User Signups → Confirm email.
`/auth/v1/settings` now reports `mailer_autoconfirm: false`.

---

## End-to-end test results (2026-08-30, against production)

Run with a disposable `+ssttest` plus-address, deleted afterwards.

| Check | Result |
| --- | --- |
| `signUp` with Confirm email on | no session, `confirmed_at: null` → wizard goes to step 4 |
| Email delivery | **Delivered** in Resend, from `"Smart Surgical Team" <no-reply@ssthyroid.com>` |
| Rendered email | branded template, six-digit code visible, one-click fallback present |
| `verifyOtp` with the real code | session returned, `email_confirmed_at` set |
| `verifyOtp` with a wrong code | `otp_expired` → the wizard shows "That code is not valid, or it has expired" |
| Profile row after email signup | all six detail columns populated, `role = member` |
| Google sign-in | lands on `/complete-profile`, name prefilled, saves and forwards to `/profile` |
| Profile row after Google completion | all columns populated, `role` unchanged by the guard |
| Duplicate email signup | `user_already_exists` → "An account with this email already exists" |
| Identity guard (transactional probe) | second provider refused with `sst_identity_conflict` |
| Role guard (transactional probe) | `member → owner` as `authenticated` blocked; `service_role` promotion still works |
| Wizard validation | consent gate, required details, short password, mismatched passwords all refused |
| Cleanup | test account deleted; 5 users / 5 profiles, 0 orphans, 0 dual-method accounts |

## Account state

`sarkrda.mohammed04@gmail.com` (Owner) was linked to both `email` and `google`
from 2026-07-29, before the trigger existed. On 2026-08-30 the **password was
removed and Google kept**: the `email` identity row deleted *and*
`auth.users.encrypted_password` nulled. Both are required — deleting the identity
alone leaves password sign-in working, because GoTrue looks the user up by
`auth.users.email` and checks the hash directly.

Database-wide: 0 users with two sign-in methods, google=4, email=1.

## Profile editing

The profile page edits the same six fields registration collects — first name,
last name, organisation, job title, city, country — so a member can correct what
they typed at sign-up, or what Google guessed, without support. It writes through
`accountMetadataPatch` exactly as the wizard does, so `full_name` stays derived
from the two name fields and the metadata trigger mirrors everything into
`public.profiles`.

Consent is deliberately **not** re-stamped on an edit: changing a job title is
not a fresh acceptance of the terms. Completeness is read back off the saved user
rather than assumed, so an account that never recorded consent keeps showing the
"finish your profile" prompt even with all six fields filled.

The sign-in email stays read-only here.

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
