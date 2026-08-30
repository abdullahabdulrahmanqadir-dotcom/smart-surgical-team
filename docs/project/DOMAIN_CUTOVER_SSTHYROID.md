# ssthyroid.com → Worker `smart` — cutover runbook

Prepared 2026-08-29. Everything below the **STOP** line is unsent. Nothing has
been changed at Hostinger, at Cloudflare, in Supabase, or in this repo.

---

## 1. Verified current state

Checked live against Verisign RDAP and Google Public DNS (8.8.8.8) on 2026-08-29.

| Fact | Value |
| --- | --- |
| Registrar | HOSTINGER operations, UAB |
| Registered | 2024-05-27 |
| Expires | 2027-05-27 |
| Registrar lock | `clientTransferProhibited` (on — Hostinger's default) |
| Authoritative NS | `ns1.dns-parking.com`, `ns2.dns-parking.com` (Hostinger DNS) |
| Website now | Hostinger shared hosting (`193.58.105.224`, `147.79.119.15`) |
| **Email now** | **Live — Hostinger Email (`mx1`/`mx2.hostinger.com`)** |

Our Cloudflare account (the one holding the Worker):

| Field | Value |
| --- | --- |
| Login | `abdullahabdulrahmanqadir@gmail.com` |
| Account ID | `9239fb176e5496e967b95267c9989b53` |
| Worker | `smart` → `smart.ssteam.workers.dev` |

---

## 2. Decision: the domain is NOT being transferred

**Ownership of `ssthyroid.com` stays exactly where it is.** This was set as a hard
condition on 2026-08-29 and it is not up for revisiting during the cutover.

The only thing that changes is *which servers answer DNS questions* for the domain:

| | Before | After |
| --- | --- | --- |
| Registered to | The coworker | The coworker — **unchanged** |
| Registrar | Hostinger | Hostinger — **unchanged** |
| WHOIS record | Hostinger | Hostinger — **unchanged** |
| Billing / renewal | Their Hostinger account | Their Hostinger account — **unchanged** |
| Transfer lock | `clientTransferProhibited` | `clientTransferProhibited` — **unchanged** |
| Who answers DNS | Hostinger (`*.dns-parking.com`) | Cloudflare |

Cloudflare never becomes the registrar. We never hold the domain. The coworker
reverses the whole thing in about a minute by pasting the old nameservers back.

### Why the nameservers have to move at all

A Cloudflare Worker can only serve a hostname belonging to an **active Cloudflare
zone you own** ([Workers custom domains][cf-cd]). A zone becomes active exactly two ways:

- **Full setup** — nameservers point at Cloudflare. Free. *This is what we are doing.*
- **Partial (CNAME) setup** — keeps Hostinger as the DNS provider, but is
  *"only available to customers on a Business or Enterprise plan"* ([docs][cf-partial]).
  Free: No. Pro: No. Business is roughly $200/month.

Cloudflare for SaaS is the only other candidate and it does not help here: it is
bundled with non-Enterprise plans, but an apex domain like `ssthyroid.com` requires
**Apex Proxying, an Enterprise add-on** ([docs][cf-saas]).

So there is no free path that leaves Hostinger as the DNS provider. And the domain
cannot stay untouched under *any* plan — it points at the old Hostinger site today,
so something in DNS has to change for it to serve the new one.

[cf-cd]: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
[cf-partial]: https://developers.cloudflare.com/dns/zone-setups/partial-setup/
[cf-saas]: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/

### The one real hazard

`ssthyroid.com` has working email on Hostinger. The moment the nameservers change,
the Cloudflare zone becomes the only source of truth for DNS. If the mail records
are not already sitting in that zone, **email stops** — outbound mail starts failing
authentication and inbound mail has nowhere to go. That is why §3 builds the zone
completely *before* your coworker touches anything.

Because the Cloudflare zone will carry identical MX/SPF/DKIM/DMARC records, mail
keeps flowing throughout nameserver propagation no matter which nameserver a given
resolver happens to hit. The website is the only thing that actually changes hands.

---

## 3. Cloudflare prep — ✅ DONE 2026-08-29

All of this is complete and verified. The zone is still **Pending**, so none of it is
live: `ssthyroid.com` continues to serve the old Hostinger site and deliver mail
exactly as before. Recorded here as the audit trail.

| Item | State |
| --- | --- |
| Zone `ssthyroid.com` | Exists, Free plan, **Full** setup, **Pending** |
| Zone ID | `a96471c9b8ff2e4baeafa7d3f06b229f` |
| Assigned nameservers | `hans.ns.cloudflare.com`, `treasure.ns.cloudflare.com` |
| Mail records | All 8 present, all forced to **DNS only** |
| Stale old-site records | Deleted |
| Apex + www | Placeholder `192.0.2.1`, proxied |
| Workers Routes | `ssthyroid.com/*` and `www.ssthyroid.com/*` → `smart` |
| SSL/TLS mode | **Full (Strict)** |

**Two things the zone got wrong that were fixed:**

1. **All five mail CNAMEs were Proxied** (orange cloud) — `autoconfig`, `autodiscover`,
   and the three `hostingermail-*._domainkey` DKIM records. Cloudflare's importer
   defaults CNAMEs to proxied, and Cloudflare's own guidance is that *"DNS-only is only
   recommended for records that do not serve web traffic, such as records used for
   email routing"* ([proxy status][cf-proxy]). Left as-is, the coworker's DKIM signing
   and mail-client autodiscovery would have broken at the moment of the flip. All five
   are now DNS only.
2. **Every A/AAAA record was stale.** The zone held `191.96.144.102` / `195.35.60.239`;
   the live site answered `193.58.105.224` / `147.79.119.15` earlier that day and
   `147.79.119.177` / `147.79.116.126` an hour later. Hostinger rotates its shared-hosting
   IPs, so there is no snapshot of them worth keeping — all four were deleted.

**Why Workers Routes rather than a post-activation Custom Domain:** a Custom Domain
needs an *active* zone, which means it can only be added after the coworker flips. That
leaves the site erroring from the moment they flip until someone notices and binds it —
potentially hours, since we do not control when they act. Workers Routes can be created
on a Pending zone, so the Worker is already wired and the new site serves the instant
the nameservers propagate. The `192.0.2.1` placeholder (a reserved documentation address)
exists only to make the hostname resolve through Cloudflare; the routes intercept every
request, so it is never actually contacted.

[cf-proxy]: https://developers.cloudflare.com/dns/proxy-status/

<details>
<summary>Original instructions, kept for reference / rollback</summary>

### 3.1 Add the zone

Cloudflare dashboard → **Add a domain** → `ssthyroid.com` → **Free** plan.

- You do **not** need to own the domain to add it. It sits in state **Pending**
  and affects nothing at all until the nameservers point at Cloudflare.
- Cloudflare scans the existing Hostinger records and imports most of them. Treat
  that scan as a draft, not as truth — verify it against §3.2 line by line.
- If Cloudflare says the domain is *already in another Cloudflare account*, stop
  and tell me. It means someone added it before and it has to be released from
  that account first.

Write down the two assigned nameservers. They look like `xxxx.ns.cloudflare.com`
and are unique to our account — the coworker message in §5 has blanks for them.

### 3.2 Make the DNS records match this table exactly

This is the complete set of records that resolve today.

**Keep as-is — these carry the email. Proxy status must be `DNS only` (grey cloud).**

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| MX | `@` | `mx1.hostinger.com` | 5 |
| MX | `@` | `mx2.hostinger.com` | 10 |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` | — |
| TXT | `_dmarc` | `v=DMARC1; p=none` | — |
| CNAME | `hostingermail-a._domainkey` | `hostingermail-a.dkim.mail.hostinger.com` | — |
| CNAME | `hostingermail-b._domainkey` | `hostingermail-b.dkim.mail.hostinger.com` | — |
| CNAME | `hostingermail-c._domainkey` | `hostingermail-c.dkim.mail.hostinger.com` | — |
| CNAME | `autoconfig` | `autoconfig.mail.hostinger.com` | — |

**Delete / do not recreate — these point at the old Hostinger site, which the Worker replaces:**

| Type | Name | Old value |
| --- | --- | --- |
| A | `@` | `193.58.105.224`, `147.79.119.15` |
| AAAA | `@` | `2a02:4780:36:d02a:…`, `2a02:4780:37:7781:…` |
| CNAME | `www` | `www.ssthyroid.com.cdn.hstgr.net` |

> **Worth doing:** ask your coworker to screenshot the full Hostinger DNS zone
> (hPanel → Domains → ssthyroid.com → DNS / Nameservers) before the flip. The table
> above is built from live DNS lookups, so it covers every record that currently
> resolves — but a record that exists in the zone and is not in use by anything (an
> old verification TXT, a dormant subdomain) is invisible from outside. It is a
> read-only ask and it rides along with the message in §5.

### 3.3 Leave a placeholder so the site is never a dead hostname

Add these two, **proxied (orange cloud)**:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `192.0.2.1` |
| A | `www` | `192.0.2.1` |

`192.0.2.1` is the reserved documentation address — it never routes anywhere. It
exists only so the hostname resolves through Cloudflare the instant the zone goes
live, instead of returning NXDOMAIN while you finish §6.1. Step 6.1 replaces both.

### 3.4 SSL

Zone → **SSL/TLS** → encryption mode **Full (strict)**. Universal SSL issues
automatically once the zone is Active and covers `ssthyroid.com` plus
`*.ssthyroid.com`. Nothing to buy, nothing to upload.

</details>

---

## 4. STOP — this is the handoff point

Everything above happens inside our own Cloudflare account and changes nothing
about the live domain. `ssthyroid.com` still serves the old Hostinger site, still
delivers mail, and the coworker has not been contacted.

**The next action is yours to send.** Nothing further happens until you do.

---

## 5. What you send your coworker

Their entire job is one nameserver change. Fill in the two Cloudflare nameservers
from §3.1 before sending.

> Hi — we're moving the ssthyroid.com website onto a new, faster platform.
>
> **To be clear up front: this is not a domain transfer, and we're not asking you to
> hand the domain over.** ssthyroid.com stays registered in your name, in your
> Hostinger account, on your billing, with the transfer lock left on. We're not
> touching any of that, now or later. The only thing changing is which service
> answers the technical lookups that tell browsers where the website lives.
>
> Your email on the domain also keeps working exactly as it does today — we've
> already copied every mail record across ahead of time, so there's no gap.
>
> There's one change only you can make, and it takes about a minute:
>
> 1. Log in to Hostinger and go to **Domains → ssthyroid.com → DNS / Nameservers**.
> 2. Choose **Change nameservers** → **Use custom nameservers**.
> 3. Replace the two existing entries with:
>    - `hans.ns.cloudflare.com`
>    - `treasure.ns.cloudflare.com`
> 4. Save.
>
> Could you also send a screenshot of the DNS records page *before* you change
> anything? It's just a safety copy in case there's an old record we should keep.
>
> It takes anywhere from a few minutes to a few hours to take effect, and it's
> fully reversible — putting the old nameservers back restores everything as it was.
> Let me know once you've saved it and I'll take it from there.

**Do not ask them for the Hostinger password or for access to the account.** The
nameserver change is the whole ask, and keeping it that way is the point.

---

## 6. After they confirm — your side, ~15 minutes

### 6.1 Bind the Worker — already done, nothing to do

The Workers Routes are pre-wired (§3), so the new site serves as soon as the
nameservers propagate. No action needed at flip time.

**This makes sending the §5 message the go-live trigger.** Confirm the site is
release-ready *before* sending — in particular the News section still carries
labelled placeholder content and migration `0021` is unapplied. Until you send that
message, nothing changes for anyone.

### 6.2 Supabase redirect allowlist — ✅ DONE 2026-08-29

Project `elcjynpdcqxpxfqcamuw` (`smartsurgicalteam`) → Authentication → URL Configuration.

| | Before | After |
| --- | --- | --- |
| Site URL | `https://www.ssthyroid.com/**` | `https://ssthyroid.com` |
| Redirect URLs | 3 entries | 4 — added `https://ssthyroid.com/**` |

**Two pre-existing defects found and fixed here:**

1. **Site URL contained a wildcard.** It read `https://www.ssthyroid.com/**`, and that
   field states plainly that *wildcards cannot be used*. Anything falling back to Site
   URL — including the `{{ .SiteURL }}` variable in the email templates — was producing
   a malformed link. This is the most likely root cause of the Google-login bounce
   recorded earlier.
2. **The apex was never on the allowlist** — only `www.ssthyroid.com`. Since the app
   builds callbacks from `window.location.origin`, every sign-in on `https://ssthyroid.com`
   would have been rejected by Supabase.

`http://localhost:3000/**` and `https://smart.ssteam.workers.dev/**` were both kept, so
local dev and the workers.dev URL keep working.

Auth callbacks come from `window.location.origin` (`app/components/AuthForm.tsx:20`,
`app/components/SignUpWizard.tsx:83`, `app/components/PasswordRecoveryForm.tsx:49`), so
they follow the domain on their own once DNS moves.

### 6.3 Two code edits — ✅ COMMITTED, parked off `main`

```diff
-const SITE_ORIGIN = "https://smart.ssteam.workers.dev";
+const SITE_ORIGIN = "https://ssthyroid.com";
```

Applied to `app/sitemap.ts` and `app/robots.ts`, committed as **`2cf9fb2`** on branch
**`domain-cutover-origin`**.

**Why it is not on `main`:** pushing `main` publishes, and other work is being pushed in
the meantime — a commit sitting on `main` would ship with the next push of anything.
Until the nameservers flip, `ssthyroid.com` still resolves to the old Hostinger site, so
publishing this early would aim every crawler at the wrong content.

The working tree was also reverted to `smart.ssteam.workers.dev`, so a `git add -A` for
unrelated work cannot sweep the change into a pushed commit by accident. The change now
exists in exactly one place: that branch. `main` is untouched at `4b5a788`.

The commit contains **only** the two `SITE_ORIGIN` lines — the in-progress news-section
work in `app/sitemap.ts` was deliberately left out of it and remains uncommitted in the
working tree.

**To land it at cutover:**

```sh
git merge domain-cutover-origin      # then deploy/push as usual
```

Do this at or just after the flip. Leaving it unlanded *past* the flip is the opposite
mistake and costs you too: the live `robots.txt` would keep declaring
`smart.ssteam.workers.dev` as the canonical host, actively competing with the new domain.

Verified: no test asserts on the origin (`tests/rendered-html.test.mjs` matches only path
suffixes such as `/en/news</loc>`), and nothing else in `app/` hardcodes it. `metadataBase`
in `app/[locale]/layout.tsx:79` is derived from the request host, so canonicals,
`hreflang`, and OG URLs follow the new domain with no change.

### 6.4 Legacy URL redirects — ⬜ TO DO

**Not built yet. Requested 2026-08-30 to be done after the transfer.**

The old site has **94 public URLs** (81 posts + 13 pages) that Google has indexed
and that people have shared, cited and bookmarked. The moment DNS moves, every one
of them is answered by *our* Worker, which has no page at those paths — so they all
404 until this lands. A `301` also hands the old page's search ranking to the new
URL; without it Google drops the old pages and the new ones start from zero.

This goes in `worker/index.ts` — nothing about it touches the coworker's Hostinger
account, and it cannot be done on the old site, which stops seeing this traffic the
moment the nameservers move.

The map is mostly mechanical, because the import deliberately kept the old slugs:

| Old path | New path |
|---|---|
| `/thyroid-anatomy` | `/en/library/thyroid-anatomy` |
| `/gallery` | `/en/topics` |
| `/team` | `/en/about` |
| `/publication` | `/en/research` |
| `/contact` | `/en/contact` |
| `/spindle-cell-sarcoma-…-male-copy` | `/en/library/spindle-cell-sarcoma-…-male` (drop `-copy`) |

Build it from `scratch/old/content/_index.json` in the legacy archive, which lists
every old slug (see `LEGACY_GALLERY_MIGRATION.md`).

> **Note on timing.** This was scheduled for after the flip, so expect a window where
> old inbound links 404. It can equally be shipped *before* with no downside: a
> redirect only affects requests that actually reach the Worker, and until DNS moves
> those paths are already 404 on `smart.ssteam.workers.dev`. Landing it early simply
> means the map is waiting when the domain arrives.

### 6.5 Verify before calling it done

```sh
nslookup -type=NS ssthyroid.com 8.8.8.8      # expect the two Cloudflare nameservers
nslookup -type=MX ssthyroid.com 8.8.8.8      # expect mx1/mx2.hostinger.com, unchanged
curl -sI https://ssthyroid.com/en            # expect 200, valid cert
curl -sI https://www.ssthyroid.com/en        # expect 200 or a redirect to the apex
```

Then by hand:

- **Send and receive a test email on the domain.** Do not skip this one.
- Sign in on the live domain — confirms §6.2 took.
- Load `/en` and `/ar`, an admin page, and a case with images (R2 media).
- Google Search Console: add `https://ssthyroid.com` as a new property and submit
  the sitemap. The existing `smart.ssteam.workers.dev` verification does not carry over.
- Once §6.4 has landed, spot-check three old URLs — one post, one renamed post and
  one section page — and confirm each `301`s to its new home rather than 404ing.

### 6.6 Rollback

The coworker restores `ns1.dns-parking.com` / `ns2.dns-parking.com` at Hostinger and
the old site and its DNS return as they were. Keep the Hostinger hosting plan and its
files alive for at least a couple of weeks after cutover — do not cancel it the same day.

---

## Appendix — moving the registration itself: decided against

Recorded so nobody re-opens it by accident. On 2026-08-29 we decided **not** to move
the registration. The domain stays registered to the coworker at Hostinger,
indefinitely. Do not unlock the domain, do not request an EPP/auth code, and do not
start a transfer at Cloudflare Registrar or anywhere else.

Nothing in this runbook depends on that changing. The nameserver move in §3–§6 is
complete on its own — the site and email work permanently with the registration
sitting where it is.

If it is ever revisited, the two routes are a Hostinger→Hostinger account move (the
coworker initiates, we accept — no auth code, no registrar involved) or a transfer to
Cloudflare Registrar (needs the lock off, the EPP code, *and* an approval email, so
it can never be a single coworker action). Both are out of scope.
