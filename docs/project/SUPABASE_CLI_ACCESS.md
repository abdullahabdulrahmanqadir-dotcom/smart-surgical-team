# Giving an agent database access without logging anyone out

**Problem.** The Supabase CLI on this machine is signed in to the wrong account
(`kurdosis`), the site's project `elcjynpdcqxpxfqcamuw` (`smartsurgicalteam`) is
not in that account at all, and `supabase login` cannot run inside Claude Code —
there is no TTY, so the browser flow aborts. Logging out would disturb the other
project's work.

**None of that has to be touched.** Two mechanisms let a command act as a
different identity for that one command, leaving every stored credential alone.

---

## Option A — a project-scoped connection string (recommended)

A Postgres connection string reaches **one database and nothing else**. It
cannot list projects, cannot administer the account, and cannot see `kurdosis`
or `qaradaxy-portfolio`. It is the narrowest thing that can still run a
migration, and it is revocable in one click by rotating the database password.

### Setting it up, once

1. Open the dashboard **in the Chrome profile signed in to the right account**
   and confirm the project list shows `smartsurgicalteam`:
   <https://supabase.com/dashboard/project/elcjynpdcqxpxfqcamuw/settings/database>
2. Under **Connection string**, choose **Session pooler** — not Transaction
   pooler. Transaction mode (port 6543) rejects some DDL; session mode runs
   migrations correctly and works over IPv4, which the direct connection on new
   projects does not.
3. Copy the URI and put it in a file at the repository root called
   **`.env.supabase`**:

   ```
   SUPABASE_DB_URL=postgresql://postgres.elcjynpdcqxpxfqcamuw:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
   ```

   `.gitignore` already ignores `.env*`, so this file can never be committed.

   If the password contains `@ : / ? # [ ] %` or a space, percent-encode those
   characters — the CLI requires the URI to be encoded.

### What that enables

Any command can then be run without a login:

```bash
set -a; . ./.env.supabase; set +a
npx supabase db query --db-url "$SUPABASE_DB_URL" -f supabase/migrations/0021_news.sql
```

### Why this is safe to hand to an agent

- **Nothing is logged out.** The stored CLI login is never read.
- **No other session is affected.** The variable exists only inside the single
  command that sources it. It is not a user environment variable, so no other
  terminal, project or agent inherits it.
- **The secret is never seen or repeated.** The value is read from the file
  straight into the process environment. It is never printed, never echoed into
  a transcript, and never pasted into a chat message — do not send it in chat
  even if asked to.
- **Blast radius is one database**, and rotating the database password revokes
  it immediately.

---

## Option B — a personal access token

`SUPABASE_ACCESS_TOKEN` overrides the stored login for the command it is set on,
which also solves the logout problem. Verified empirically: with the variable
set, the CLI authenticates as that token rather than as the stored account.

Tokens come from <https://supabase.com/dashboard/account/tokens>. Same file, same
pattern:

```
SUPABASE_ACCESS_TOKEN=sbp_...
```

```bash
set -a; . ./.env.supabase; set +a
npx supabase link --project-ref elcjynpdcqxpxfqcamuw --yes
npx supabase db query --linked -f supabase/migrations/0021_news.sql
```

**Prefer Option A.** A personal access token is an *account* credential: it can
administer every project the account owns, `kurdosis` included. Option A cannot.
Use B only if the Management API is specifically needed.

The CLI also supports `--profile <name>`, which stores a second named
credential beside the default one instead of replacing it. That is the native
way to keep two accounts side by side, but it still requires a personal access
token, so it inherits Option B's scope.

---

## Rules that do not change

- **Never `supabase db push`.** The earlier migrations were applied by hand and
  are absent from the migration history table, so a push tries to replay all of
  them against live data.
- **Confirm the target before writing.** With Option A the ref is inside the
  connection string; with Option B run `npx supabase projects list` and check
  that `smartsurgicalteam` is listed.
- **Verify independently afterwards, from the data.** A green result in a SQL
  editor has lied before — in August 2026 a migration was pasted into the wrong
  project's editor, reported success, and the real database never changed. The
  check that cannot be fooled uses the credentials already in `.env.local`,
  which hard-code the correct project:

  ```bash
  set -a; . ./.env.local; set +a
  curl -s "$SUPABASE_URL/rest/v1/news_items?select=id&limit=1" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
  ```

  `PGRST205 … in the schema cache` means the table still does not exist.
  `[]` or rows means it does.
