# Sign-in and registration protection

What now stands between a stranger and the member area, where each piece lives,
and the dashboard switches that are not code.

Related: `docs/auth-email-setup.md` (Resend, the verification code and the rate
limits behind it).

## 1. What is in place

| Protection | Where it runs | Covers |
| --- | --- | --- |
| Cloudflare Turnstile | `app/components/Turnstile.tsx`, verified by Supabase | sign-in, registration, code resend, password reset |
| Password rules and strength meter | `app/lib/password-strength.ts`, `app/components/PasswordStrength.tsx` | registration, password reset |
| Leaked-password rejection | Supabase (HaveIBeenPwned), message translated locally | registration, password reset |
| Failed-attempt back-off | `app/lib/auth-throttle.ts` | sign-in, registration, code entry, password reset |
| Non-committal sign-in error | `app/components/AuthForm.tsx` | sign-in |

`tests/auth-protection.test.mjs` covers the three rule modules directly. Run it
with the rest of the suite: `npm test`.

## 2. Cloudflare Turnstile

Supabase does the verifying. With CAPTCHA protection switched on it rejects any
`signUp`, `signInWithPassword`, `resend` or `resetPasswordForEmail` that does
not carry a valid `captchaToken`. The site's only job is to obtain that token,
which `useTurnstile()` does.

The widget runs in `interaction-only` mode, so most members never see anything;
Cloudflare only draws a challenge when it is unhappy about the visitor. Tokens
are single-use and expire after about five minutes, so every form resets the
widget after a submit, and an expired token is replaced immediately — a
four-step registration can easily outlive one.

### Setup — do these in order

1. **Create the widget.** Cloudflare dashboard → Turnstile → Add widget.
   - Widget mode: **Managed**
   - Hostnames: `ssthyroid.com`, `smart.ssteam.workers.dev`, and `localhost`
     if you want the check active in local development
   - This gives a **site key** (public) and a **secret key** (private)
2. **Give the build the site key.** Put
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY=…` in `.env.local` **on the machine that
   runs the build**. It is a `NEXT_PUBLIC_` value, so the bundler inlines it
   into the JavaScript at build time — it is never read at runtime. A
   Cloudflare Worker variable is a runtime binding and will *not* reach it, so
   setting one there does nothing. Since the deploy is a local
   `npm run build` followed by `wrangler deploy`, `.env.local` is the only
   place the production key has to be.
3. **Build and deploy, then confirm sign-in still works** on the live site.
   Until this deploy lands the site key is not in the bundle and no token is
   sent, whatever the dashboards say.
4. **Only now, give Supabase the secret key.** Supabase dashboard →
   Authentication → Attack Protection → Enable CAPTCHA protection → provider
   **Turnstile**, paste the secret key, save.

**Order matters, and this is the trap.** Step 4 makes Supabase reject every
`signUp`, `signInWithPassword`, `resend` and `resetPasswordForEmail` that
arrives without a valid token. Do it before step 3 has deployed and the live
site cannot sign anyone in until the next deploy carries the key. Because
`NEXT_PUBLIC_*` is inlined at build time, adding the key changes nothing on
its own — the rebuild is what puts it in the bundle.

Without a site key the hook reports itself as not required and every token is
`undefined`, so a checkout with no keys still signs in normally. That is the
safe default, and the reason a developer is not blocked by a missing key.

## 3. Password rules

Chosen passwords must be at least **10 characters** and satisfy at least two of:
a letter, a number, a symbol. The meter under the field shows this as it is
typed. `\p{L}` is used rather than `[a-z]`, so an Arabic password counts.

These rules apply only where a password is **chosen** — registration step 3 and
the reset form. Sign-in deliberately does not enforce them: members who
registered under the old eight-character minimum still have valid passwords,
and gating the sign-in field would lock them out of their own accounts.

### The dashboard half

Supabase enforces its own minimum server side and holds the leaked-password
check. Both are at Authentication → Providers → Email:

- **Minimum password length** → set to `10` to match the site
- **Prevent use of leaked passwords** → on

The site already translates the rejection Supabase returns for a breached
password, so turning it on needs no code change.

## 4. Failed-attempt back-off

Four failures are free — people mistype passwords. From the fifth, the form
closes for 30 seconds, then 60, 120, and so on to a 15-minute ceiling. Thirty
quiet minutes clear the count.

Counts are kept per action and per address, so one member's mistakes never lock
out a colleague on a shared machine. The address is hashed rather than stored:
`localStorage` on a shared computer should not become a list of who has signed
in here.

**This is a guardrail, not the security boundary.** It lives in the browser.
Clearing storage walks past it, and so does anything driving the Supabase API
directly. The real limits are Supabase's own rate limits and the Turnstile check.
Its purpose is to tell an ordinary member to wait, in their own language, rather
than let them run into a server-side limit that explains nothing.

A browser with storage blocked — private mode, tightened settings — fails open.
Refusing to sign someone in because their browser will not remember failures
would be the worse mistake.

## 5. What is deliberately *not* protected

- **Google sign-in** carries no Turnstile token. OAuth hands the challenge to
  Google, and Supabase does not check a captcha on the OAuth path.
- **Password reset** never reveals whether an address has an account; Supabase
  answers identically either way, and the site does not add a signal.
- **Sign-in errors** say only that the pair does not match an account, so a
  wrong password and an unknown address are indistinguishable.
