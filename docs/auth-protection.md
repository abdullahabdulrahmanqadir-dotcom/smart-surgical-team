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
| Leaked-password rejection | Supabase (HaveIBeenPwned), message translated locally | registration, password reset — **needs a Pro plan, see §3** |
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

It also renders at `size: "flexible"`, and the slot sits **inside** the form
just above the submit button, so on the visits where Cloudflare does draw a
challenge it spans the form's width and reads as a field rather than a 300px
island bolted on under the button. `.turnstile-slot` collapses to zero height
when nothing is drawn, which is the normal case — so the quiet path costs no
layout.

**Do not move the wizard's widget inside a step's form.** `SignUpWizard`
renders it outside all four steps on purpose: the render effect does not depend
on the step, so unmounting the container between steps would leave the hook
holding a widget id that no longer exists. Sign-in and the reset form are
single-step, so there it is safely inside the form.

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

**The widget now exists** (created 2026-08-31, Cloudflare account
`Abdullahabdulrahmanqadir`, which also holds `ssthyroid.com` and the `smart`
Worker): named *SST auth (sign-in, sign-up, reset)*, **Managed**, no
pre-clearance, three hostnames — `ssthyroid.com`, `smart.ssteam.workers.dev`
and `localhost`. Its site key is in `.env.local` and verified inlined into
`dist/`. The secret key stays in the dashboard under Widget Keys → Show; it has
not been given to Supabase yet, because step 4 must wait for a deploy.

To add a hostname the dashboard does not already know as one of your zones,
type it and pick the **Add "…" as a custom hostname** entry that appears under
"No results" — it sits below the fold of that dropdown and is easy to miss.
Pressing Enter instead just clears the field.

**Order matters, and this is the trap.** Step 4 makes Supabase reject every
`signUp`, `signInWithPassword`, `resend` and `resetPasswordForEmail` that
arrives without a valid token. Do it before step 3 has deployed and the live
site cannot sign anyone in until the next deploy carries the key. Because
`NEXT_PUBLIC_*` is inlined at build time, adding the key changes nothing on
its own — the rebuild is what puts it in the bundle.

Without a site key the hook reports itself as not required and every token is
`undefined`, so a checkout with no keys still signs in normally. That is the
safe default, and the reason a developer is not blocked by a missing key.

### Verified live, 2026-08-31

The whole chain was confirmed against production without completing a challenge
or using anyone's real password:

- With no token, `token?grant_type=password`, `signup`, `recover` and `otp` all
  answer `400 captcha_failed — no captcha_token found`. Enforcement is on.
- With a **forged** token the answer is `captcha_failed (invalid-input-response)`,
  not `invalid-input-secret`. Supabase really does call Cloudflare, and the
  secret it holds is the right one.
- With a **real** token lifted from the live sign-in page, and a deliberately
  wrong password, the answer is `invalid_credentials`. The captcha layer passed
  and only the password failed — which is the entire chain working.
- `verify` (code entry), `PUT /user` (new password, profile edits) and
  `authorize?provider=google` are **not** captcha-gated, which matters because
  the site sends no token on those three. Google sign-in still answers `302` to
  accounts.google.com.

The token in that third check was obtained with **no interaction at all**, which
is `interaction-only` working as intended. A CDP-automated browser does get
drawn a visible checkbox — useful for checking the styling, and not what an
ordinary visitor sees.

## 3. Password rules

**Length is the only requirement: at least 8 characters.** Nothing about what a
password is made of blocks a submit — there is no letter, number or symbol
requirement (relaxed on the client's instruction, 2026-08-31; it was briefly ten
characters plus two of three classes).

The meter under the field still checks for a letter, a number and a symbol, but
only to colour itself and to suggest what would make a password stronger. Those
three rows are marked `is-optional` and labelled *optional*. If you ever add a
check that can refuse a password, it has to go through `length`, or
`assessPassword().acceptable` and the meter will disagree with each other.
`\p{L}` is used rather than `[a-z]`, so an Arabic password counts as having a
letter.

**Keep `PASSWORD_MIN_LENGTH` and Supabase's minimum equal.** Supabase enforces
its own number server side; a site minimum below it would let the meter accept a
password that the round trip then rejects, with an English error the member
cannot act on.

The rule applies only where a password is **chosen** — registration step 3 and
the reset form. Sign-in deliberately does not enforce it, because it should
never re-judge a password a member already has.

**What this gives up.** Eight characters with no complexity rule means `password`
and `12345678` are both accepted. Supabase's leaked-password check is exactly
what covers that, and it is unavailable on the Free plan (see below), so for now
nothing rejects a breached password. Moving to Pro closes the gap with no code
change.

### The dashboard half

Supabase enforces its own minimum server side and holds the leaked-password
check. Both are at Authentication → Providers → Email:

- **Minimum password length** → `8`, to match `PASSWORD_MIN_LENGTH`. **Done**
  (2026-08-31; set to 10 earlier the same day, then lowered with the rules).
- **Prevent use of leaked passwords** → **blocked.** Supabase answers
  `Configuring leaked password protection via HaveIBeenPwned.org is available
  on Pro Plans and up`, and the project is on the Free plan. The dashboard lets
  you flip the toggle and only refuses on save.

**The save is all-or-nothing.** Turning on the leaked-password toggle rejects
the whole request, so a password-length change made in the same visit is lost
silently along with it. Change one thing at a time here and re-open the panel
to confirm it stuck.

The code needs nothing either way: the site already translates the rejection
Supabase returns for a breached password, so the check starts working the day
the project moves to Pro, with no deploy. Until then the site's own rules — ten
eight-character minimum — is the whole of what a chosen password must clear.

**Password requirements** on the same panel is deliberately left unset. Its
options are fixed character-class sets, and any of them would reject passwords
the site's own meter accepts.

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
