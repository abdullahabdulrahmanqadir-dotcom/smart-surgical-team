# Research Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unused admin Contact-inbox section with full research administration (create/edit/delete/filter, including the papers already live on the site) backed by Supabase, with cover + gallery images uploaded to Cloudflare R2 and served through the cached media route.

**Architecture:** Research moves from a live external API into a new Supabase `researches` table (+ `research_media` gallery), seeded once from the current feed. The public reader (`app/lib/research.ts`) is rewritten to read the DB through `unstable_cache` exactly like `content.ts`. The admin API gains a `research` resource and drops `messages`; the admin UI gains a research list/editor mirroring the Content section; the public detail page renders cover + gallery.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (service-role writes, RLS reads), Cloudflare R2 (`MEDIA_BUCKET`), `unstable_cache`.

## Global Constraints

- Keep `main` deployable at every commit — pushing `main` deploys (Cloudflare Worker `smart`). Work stays local; do not push/deploy unless the client asks.
- Windows-safe verification only:
  - Build: `$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; npx vinext build`
  - Lint: `npm run lint`
  - Tests: `node --import ./tests/register-hooks.mjs --test tests/rendered-html.test.mjs`
- `npx tsc --noEmit` has pre-existing scaffold errors in `db/index.ts` and `worker/index.ts` — those are not introduced by this work; do not chase them.
- No hardcoded `letter-spacing`; use logical CSS properties (RTL rule).
- Teal `#167A78` stays the primary interactive colour.
- Reader must never throw to the page: on DB error return `[]` / `undefined`.
- Public reads use `revalidate: 60` and tag `published-research`, matching `content.ts`.
- The migration keeps the one already-excluded title out — seed **29** rows (the papers shown on the live site today).

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0009_research.sql` | `researches` + `research_media` tables, indexes, RLS, seed (29 rows), sequence bump |
| `scripts/generate-research-seed.mjs` | One-off generator that fetches the live feed and prints the seed `insert` SQL (kept in repo for reproducibility) |
| `app/lib/research.ts` | Rewritten reader: Supabase + cache; `Publication` type gains `media` |
| `app/lib/admin-server.ts` | Drop `messages`; add `research` to `AdminResource`, `WRITABLE`, `DELETABLE` |
| `app/api/admin/[resource]/route.ts` | Drop `messages`; add `research` GET/POST/DELETE; overview metric swap |
| `app/components/AdminWorkspace.tsx` | Nav, overview card, research list + filters, research editor |
| `app/[locale]/research/[id]/page.tsx` | Render cover image + gallery |
| `app/globals.css` | Research detail cover/gallery styles; cover-picker control |
| `tests/rendered-html.test.mjs` | Keep the suite green (adjust only if a checked assertion moves) |

---

## Task 1: Database migration + seed

**Files:**
- Create: `scripts/generate-research-seed.mjs`
- Create: `supabase/migrations/0009_research.sql`

**Interfaces:**
- Produces: tables `public.researches` (columns: `id bigint`, `title`, `authors`, `abstract`, `journal`, `category`, `link`, `published_date`, `status public.content_status`, `cover_image_url`, `created_at`, `updated_at`, `updated_by`) and `public.research_media` (`id uuid`, `research_id bigint`, `kind public.media_kind`, `storage_path`, `public_url`, `alt_text`, `caption`, `sort_order`, `created_at`). Reused enums: `public.content_status` (from 0001), `public.media_kind` (from 0003).

- [ ] **Step 1: Write the seed generator**

Create `scripts/generate-research-seed.mjs`. It fetches the live feed, applies the *same* filter the current site uses (active + Abdulwahid + not in the excluded-title set), and prints `insert ... on conflict (id) do nothing` rows. Escapes single quotes by doubling.

```js
// Usage: node scripts/generate-research-seed.mjs > /tmp/research-seed.sql
const EXCLUDED = new Set(["giant malignant phyllodes tumor with ulceration: a case report and brief review of the literature"]);
const plain = (h = "") => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const journalFromLink = (link) =>
  /pagepressjournals\.org\/jbr/i.test(link) ? "Journal of Biological Research"
  : /academic\.oup\.com\/rescon/i.test(link) ? "Research Connections"
  : /academic\.oup\.com\/jscr/i.test(link) ? "Journal of Surgical Case Reports"
  : /sciencedirect\.com\/science\/article\/pii\/S2949916X/i.test(link) ? "Journal of Medicine, Surgery, and Public Health"
  : "Journal website";
const readableAuthors = (a) => a && a === a.toUpperCase() ? a.toLocaleLowerCase().replace(/\b[a-z]/g, (c) => c.toLocaleUpperCase()) : a;
const q = (v) => v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;

const res = await fetch("https://smarthealth.group/api/api/Researches/GetResearchsGrouped?skip=0&take=100");
const data = await res.json();
const items = (data.groups ?? []).flatMap((g) => g.items ?? []).filter((i) => i.isActive && i.link && i.title);
const papers = items.filter((i) =>
  /abdulwahid/i.test(`${i.authorsFreeText ?? ""} ${(i.authors ?? []).map((a) => a.userProfileName ?? "").join(" ")}`) &&
  !EXCLUDED.has(i.title.trim().toLocaleLowerCase()));

console.log("-- Generated from the live feed. 29 papers as shown on the site.");
console.log("insert into public.researches (id, title, authors, abstract, journal, category, link, published_date, status, cover_image_url) values");
const rows = papers.map((i) => {
  const date = i.publishYearString ?? (i.publishYear ? i.publishYear.slice(0, 10) : "");
  const authors = readableAuthors(i.authorsFreeText ?? "Smart Health research team");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : (/^\d{4}$/.test(date) ? `${date}-01-01` : null);
  return `  (${i.id}, ${q(i.title)}, ${q(authors)}, ${q(plain(i.abstract))}, ${q(journalFromLink(i.link))}, ${q(i.englishCategory ?? "Publication")}, ${q(i.link)}, ${day ? q(day) : "null"}, 'published', ${q(i.imageUrl ?? "")})`;
});
console.log(rows.join(",\n") + "\non conflict (id) do nothing;");
```

- [ ] **Step 2: Generate the seed SQL**

Run: `node scripts/generate-research-seed.mjs > "$env:TEMP\research-seed.sql"` (PowerShell) — or capture to a temp file. Confirm it prints ~29 value rows and no `undefined`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0009_research.sql`. Paste the generated `insert` block where marked. `content_status` and `media_kind` already exist (0001, 0003) — do not recreate them.

```sql
-- Research publications: DB is the source of truth (replaces the external feed).
-- Reuses public.content_status (0001) and public.media_kind (0003).

create table if not exists public.researches (
  id bigint generated by default as identity primary key,
  title text not null,
  authors text,
  abstract text,
  journal text,
  category text not null default 'Publication',
  link text,
  published_date date,
  status public.content_status not null default 'published',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.research_media (
  id uuid primary key default gen_random_uuid(),
  research_id bigint not null references public.researches(id) on delete cascade,
  kind public.media_kind not null default 'image',
  storage_path text not null,
  public_url text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists researches_published_date_idx on public.researches (published_date desc);
create index if not exists research_media_research_idx on public.research_media (research_id, sort_order);

alter table public.researches enable row level security;
alter table public.research_media enable row level security;

-- Recreate policies idempotently.
drop policy if exists "published researches are readable" on public.researches;
create policy "published researches are readable" on public.researches
  for select using (status = 'published');

drop policy if exists "public research media is readable" on public.research_media;
create policy "public research media is readable" on public.research_media
  for select using (exists (
    select 1 from public.researches where id = research_id and status = 'published'
  ));

-- === BEGIN generated seed (from scripts/generate-research-seed.mjs) ===
-- <<< paste the generated insert block here >>>
-- === END generated seed ===

-- New rows must not collide with the explicitly-inserted source ids.
select setval(pg_get_serial_sequence('public.researches', 'id'),
              coalesce((select max(id) from public.researches), 1));
```

- [ ] **Step 4: Verify the SQL parses locally (dry sanity check)**

There is no local Postgres in CI; verify by eye that: enums are not redeclared, every `insert` row has 10 values matching the column list, the seed block is pasted, and quotes are balanced. (Application to Supabase is a rollout step, §8 of the spec — not part of the build.)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-research-seed.mjs supabase/migrations/0009_research.sql
git commit -m "feat(research): add researches + research_media schema and seed"
```

---

## Task 2: Public reader — Supabase-backed `research.ts`

**Files:**
- Modify: `app/lib/research.ts` (rewrite the data-source half; keep the portrait-enrichment helpers)

**Interfaces:**
- Consumes: `researches`, `research_media` (Task 1); `getSupabaseServerClient`.
- Produces: `getResearches(): Promise<Publication[]>`, `getResearchById(id: string): Promise<Publication | undefined>`. `Publication` gains `media?: { publicUrl: string; altText?: string; caption?: string }[]`.

- [ ] **Step 1: Extend the `Publication` type**

Add the gallery field near the top of `app/lib/research.ts`:

```ts
export type Publication = {
  id: number;
  title: string;
  link: string;
  imageUrl: string;
  authors: string;
  abstract: string;
  date: string;
  year: string;
  category: string;
  journal: string;
  contributors?: { name: string; portraitUrl?: string }[];
  media?: { publicUrl: string; altText?: string; caption?: string }[];
};
```

- [ ] **Step 2: Replace the fetch layer with Supabase reads**

Remove `ApiPublication`, `FALLBACK_PUBLICATIONS`, `EXCLUDED_TITLES`, `journalFromLink`, `readableAuthors`, and the external `fetch` in `getResearches`/`getResearchById`. **Keep** `plainText` is no longer needed (DB stores plain text) — remove it too. **Keep** `TEAM_GROUPS` import, `STAFF`, `STAFF_NAME_ALIASES`, `nameKey`, `staffPortraitFor`, `sameAuthor`, `contributorsFromNames`, `withStaffPortraits` unchanged. Add the DB layer:

```ts
import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";

const REVALIDATE_SECONDS = 60;
const RESEARCH_CACHE_TAG = "published-research";

function canUseDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

type ResearchRow = {
  id: number; title: string; authors: string | null; abstract: string | null;
  journal: string | null; category: string | null; link: string | null;
  published_date: string | null; cover_image_url: string | null;
  research_media: { public_url: string; alt_text: string | null; caption: string | null; sort_order: number }[] | null;
};

const RESEARCH_SELECT =
  "id,title,authors,abstract,journal,category,link,published_date,cover_image_url," +
  "research_media(public_url,alt_text,caption,sort_order)";

function mapRow(row: ResearchRow): Publication {
  const date = row.published_date ?? "";
  const media = [...(row.research_media ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ publicUrl: item.public_url, altText: item.alt_text ?? undefined, caption: item.caption ?? undefined }));
  return withStaffPortraits({
    id: row.id,
    title: row.title,
    link: row.link ?? "",
    imageUrl: row.cover_image_url ?? "",
    authors: row.authors ?? "Smart Health research team",
    abstract: row.abstract ?? "",
    date,
    year: date.slice(0, 4) || "Research",
    category: row.category ?? "Publication",
    journal: row.journal ?? "Journal website",
    media,
  });
}

async function fetchResearches(): Promise<Publication[]> {
  if (!canUseDatabase()) return [];
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("researches")
      .select(RESEARCH_SELECT)
      .eq("status", "published")
      .order("published_date", { ascending: false });
    if (error) { console.error("published researches query failed:", error.message); return []; }
    return (data as unknown as ResearchRow[]).map(mapRow);
  } catch { return []; }
}

const cachedResearches = unstable_cache(fetchResearches, ["published-researches"], { revalidate: REVALIDATE_SECONDS, tags: [RESEARCH_CACHE_TAG] });

export async function getResearches(): Promise<Publication[]> {
  return cachedResearches();
}

export async function getResearchById(id: string): Promise<Publication | undefined> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return undefined;
  return (await cachedResearches()).find((paper) => paper.id === numericId);
}
```

Keep `import { TEAM_GROUPS } from "./team";` at the bottom (its existing position works because `STAFF` is evaluated lazily... — actually it is evaluated at module load). Move the `import { TEAM_GROUPS }` to the **top** of the file with the other imports to avoid a temporal-dead-zone error now that surrounding code changed.

- [ ] **Step 3: Build**

Run: `$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; npx vinext build`
Expected: build succeeds (no reference to removed symbols).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: passes (no unused-symbol errors — confirm every removed helper is actually gone).

- [ ] **Step 5: Run the rendered-route suite**

Run: `node --import ./tests/register-hooks.mjs --test tests/rendered-html.test.mjs`
Expected: all tests pass (research routes are not asserted by the suite; this confirms nothing else broke).

- [ ] **Step 6: Commit**

```bash
git add app/lib/research.ts
git commit -m "feat(research): read publications from Supabase with cache"
```

---

## Task 3: Admin server permissions & API — drop `messages`, add `research`

**Files:**
- Modify: `app/lib/admin-server.ts`
- Modify: `app/api/admin/[resource]/route.ts`

**Interfaces:**
- Consumes: `researches`/`research_media` (Task 1); `apiError`, `canWrite`, `canDelete`, `jsonObject`, `optionalText`/`text`/`date` helpers (local to the route), `resolveAdminIdentity`.
- Produces: `AdminResource` union now includes `"research"` and excludes `"messages"`. `GET/POST/DELETE /api/admin/research`. Overview `metrics.research` replaces `metrics.messages`.

- [ ] **Step 1: Update `admin-server.ts` types & permissions**

In `app/lib/admin-server.ts`:
- Change the type:
```ts
export type AdminResource = "overview" | "content" | "topics" | "events" | "contributors" | "people" | "research";
```
- Add `research` to the same tiers content has:
```ts
const WRITABLE: Record<StaffRole, AdminResource[]> = {
  owner: ["content", "research", "topics", "events", "contributors", "people"],
  content_manager: ["content", "research", "topics", "events", "contributors"],
  editor: ["content", "research", "events", "contributors"],
  contributor: ["content", "research"],
};

const DELETABLE: Record<StaffRole, AdminResource[]> = {
  owner: ["content", "research", "topics", "events", "contributors"],
  content_manager: ["content", "research", "topics", "events", "contributors"],
  editor: ["content", "research"],
  contributor: [],
};
```

- [ ] **Step 2: Update the route's resource list**

In `app/api/admin/[resource]/route.ts`:
```ts
const allowedResources = ["overview", "content", "topics", "events", "contributors", "people", "research"] as const;
```

- [ ] **Step 3: Swap the overview metric**

Replace the `messages` count with a `researches` count:
```ts
const [content, drafts, events, contributors, members, research] = await Promise.all([
  client.from("content_items").select("id", { count: "exact", head: true }).eq("status", "published"),
  client.from("content_items").select("id", { count: "exact", head: true }).neq("status", "published"),
  client.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
  client.from("contributors").select("id", { count: "exact", head: true }),
  client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
  client.from("researches").select("id", { count: "exact", head: true }).eq("status", "published"),
]);
return Response.json({ identity, metrics: { published: content.count ?? 0, drafts: drafts.count ?? 0, events: events.count ?? 0, contributors: contributors.count ?? 0, members: members.count ?? 0, research: research.count ?? 0 } });
```

- [ ] **Step 4: Remove the `messages` GET branch, add the `research` GET branch**

Delete the whole `if (resource === "messages") { ... }` block. Add:
```ts
if (resource === "research") {
  const { data, error } = await client.from("researches")
    .select("id,title,authors,abstract,journal,category,link,published_date,status,cover_image_url,created_at,updated_at,research_media(id,storage_path,public_url,kind,alt_text,caption,sort_order)")
    .order("updated_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return Response.json({ data });
}
```

- [ ] **Step 5: Update POST guard and add the `research` write branch**

The POST guard currently rejects `overview` and `messages`. Change it to reject only `overview` (messages no longer exists):
```ts
if (!resource || resource === "overview") return apiError("This resource cannot be created here.", 404);
```
Add the research write branch (place it after the `content` branch). Note `id` is bigint: only pass it to `.eq`/update when present; inserts omit `id` so identity generates it.
```ts
if (resource === "research") {
  const title = text(body.title);
  if (!title) return apiError("A research title is required.");
  const status = ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "draft";
  const payload = {
    title,
    authors: optionalText(body.authors),
    abstract: optionalText(body.abstract),
    journal: optionalText(body.journal),
    category: optionalText(body.category) ?? "Publication",
    link: optionalText(body.link),
    published_date: date(body.published_date),
    status,
    cover_image_url: optionalText(body.cover_image_url),
    updated_by: identity.id,
    updated_at: new Date().toISOString(),
  };
  const existingId = text(body.id);
  const { data: saved, error } = existingId
    ? await client.from("researches").update(payload).eq("id", existingId).select("id").single()
    : await client.from("researches").insert(payload).select("id").single();
  if (error || !saved) return apiError(error?.message ?? "Could not save this research.", 500);

  const media = Array.isArray(body.media) ? body.media : [];
  const validMedia = media.flatMap((entry, sort_order) => {
    const item = jsonObject(entry); const public_url = text(item?.public_url); const storage_path = text(item?.storage_path);
    return public_url && storage_path ? [{ research_id: saved.id, storage_path, public_url, kind: text(item?.kind) === "document" ? "document" : "image", alt_text: optionalText(item?.alt_text), caption: optionalText(item?.caption), sort_order }] : [];
  });
  const removed = await client.from("research_media").delete().eq("research_id", saved.id);
  if (removed.error) return apiError(`Saved the research, but could not update its images: ${removed.error.message}`, 500);
  if (validMedia.length) {
    const inserted = await client.from("research_media").insert(validMedia);
    if (inserted.error) return apiError(`Saved the research, but could not update its images: ${inserted.error.message}`, 500);
  }
  return Response.json({ data: saved });
}
```

- [ ] **Step 6: Add `research` to the DELETE allow-list**

```ts
if (!resource || !["content", "topics", "events", "contributors", "research"].includes(resource)) return apiError("This item cannot be deleted here.", 404);
```
and map the table name:
```ts
const table = resource === "content" ? "content_items" : resource === "research" ? "researches" : resource;
```

- [ ] **Step 7: Build, lint, test**

Run all three (build, lint, rendered-route suite). Expected: pass. There should be **no** remaining reference to `contact_messages` or `"messages"` in these two files — grep to confirm:
Run: `grep -rn "messages" app/api/admin app/lib/admin-server.ts`
Expected: no matches for the `messages` resource (grep returns nothing relevant).

- [ ] **Step 8: Commit**

```bash
git add app/lib/admin-server.ts app/api/admin/[resource]/route.ts
git commit -m "feat(research): admin API CRUD; remove contact inbox resource"
```

---

## Task 4: Admin UI — research list, filters, editor; remove inbox

**Files:**
- Modify: `app/components/AdminWorkspace.tsx`

**Interfaces:**
- Consumes: `/api/admin/research` (Task 3), the existing `MediaManager`, `Field`, `Select`, `EditorHead`, `upload()`, `accessToken`, `readResponse`.
- Produces: a `research` section in the workspace with search + Year/Category/Status filters and a full editor.

- [ ] **Step 1: Update the `Section` type and nav**

- Type: `type Section = "overview" | "content" | "topics" | "events" | "contributors" | "people" | "research";`
- In `nav`, remove the `messages` entry and add research (place after `content`):
```ts
{ id: "research", label: "Research", icon: IconFile },
```

- [ ] **Step 2: Swap the overview card**

In `Overview`, replace the `messages` card object with:
```ts
{ key: "research", label: "Research publications", section: "research" },
```

- [ ] **Step 3: Add a research filter type and empty value**

Near `ContentFilters`:
```ts
type ResearchFilters = { year: string; category: string; status: string };
const EMPTY_RESEARCH_FILTERS: ResearchFilters = { year: "", category: "", status: "" };
```
Add state in `AdminWorkspace`:
```ts
const [researchFilters, setResearchFilters] = useState<ResearchFilters>(EMPTY_RESEARCH_FILTERS);
```

- [ ] **Step 4: Extend search haystack and add research filtering**

In the `searchable` `useMemo` key list, add `"authors"`, `"journal"`, `"category"` (already partly present — ensure `authors` and `journal` are included).

In the `filtered` `useMemo`, after the content branch, add a research branch (before the final return):
```ts
if (active === "research") {
  return searched.filter((item) => {
    const year = String(item.published_date ?? "").slice(0, 4);
    return (!researchFilters.year || year === researchFilters.year)
      && (!researchFilters.category || item.category === researchFilters.category)
      && (!researchFilters.status || item.status === researchFilters.status);
  }).sort((a, b) => String(b.published_date ?? "").localeCompare(String(a.published_date ?? "")));
}
```
Add `researchFilters` to the memo's dependency array.

- [ ] **Step 5: `startNew()` research template**

```ts
else if (active === "research") setEditing({ title: "", authors: "", abstract: "", journal: "", category: "Paper", status: "published", published_date: "", link: "", cover_image_url: "", research_media: [] });
```

- [ ] **Step 6: Add-button label**

In the topbar add-button condition, include `research` and label it:
```tsx
{["content", "research", "topics", "events", "contributors"].includes(active) && <button className="btn btn-primary" type="button" onClick={startNew}><IconPlus size={17}/> Add {active === "content" ? "content" : active === "research" ? "research" : active === "events" ? "event" : active.slice(0, -1)}</button>}
```

- [ ] **Step 7: Pass research filters into `List`**

Extend `List`'s props with `researchFilters`/`setResearchFilters`, and render a research filter bar. In the `List` call site pass them. Update `List`'s signature and add, after the content-filters block:
```tsx
{section === "research" ? <div className="admin-content-filters">
  <label>Year<select value={researchFilters.year} onChange={(event) => setResearchFilters({ ...researchFilters, year: event.target.value })}><option value="">All years</option>{researchYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
  <label>Type<select value={researchFilters.category} onChange={(event) => setResearchFilters({ ...researchFilters, category: event.target.value })}><option value="">All types</option>{researchCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
  <label>Status<select value={researchFilters.status} onChange={(event) => setResearchFilters({ ...researchFilters, status: event.target.value })}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
  <button type="button" onClick={() => setResearchFilters(EMPTY_RESEARCH_FILTERS)}>Clear filters</button>
</div> : null}
```
where `researchYears`/`researchCategories` are derived inside `List` from `items`:
```ts
const researchYears = section === "research" ? [...new Set(items.map((item) => String(item.published_date ?? "").slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a)) : [];
const researchCategories = section === "research" ? [...new Set(items.map((item) => String(item.category ?? "")).filter(Boolean))].sort() : [];
```
In the row meta, show the research date like content:
```tsx
{(section === "content" || section === "research") && <span>{item.published_at || item.published_date ? new Date(String(item.published_at ?? item.published_date)).toLocaleDateString() : "Not published"}</span>}
```

- [ ] **Step 8: Add the research branch to `Editor`**

`Editor` currently maps `content_media` from the incoming value for content. Add research handling. In the `Editor` `useState` initialiser, also seed `research_media`:
```ts
research_media: Array.isArray(value.research_media) ? value.research_media : [],
```
Make `upload()` target research when active: it already accepts a `File` and appends to `content_media`. Generalise it to append to the right key. Simplest: add a second uploader for research that appends to `research_media`, or parameterise. Implement a small helper inside `Editor`:
```ts
async function uploadTo(file: File, key: "content_media" | "research_media") {
  if (file.size > 10 * 1024 * 1024) { setUploadError("Choose a file no larger than 10 MB."); return null; }
  setUploading(true);
  try {
    const token = await accessToken();
    const body = new FormData();
    body.append("file", file);
    if (section === "research") { body.append("topicSlug", "research"); if (typeof form.title === "string") body.append("caseSlug", form.title); }
    else { const topicId = (form.topic_ids as string[] | undefined)?.[0]; const topicSlug = topics.find((topic) => String(topic.id) === topicId)?.slug; if (typeof topicSlug === "string") body.append("topicSlug", topicSlug); if (typeof form.title === "string") body.append("caseSlug", form.title); }
    const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` }, body });
    const result = await readResponse(response);
    if (!response.ok) throw new Error(errorMessage(result.error, "Could not upload this file."));
    const path = typeof result.path === "string" ? result.path : "";
    const publicUrl = typeof result.publicUrl === "string" ? result.publicUrl : "";
    const kind = result.kind === "document" ? "document" : result.kind === "image" ? "image" : null;
    if (!path || !publicUrl || !kind) throw new Error("The upload service returned an incomplete file record.");
    setUploadError("");
    if (key) setForm((current) => ({ ...current, [key]: [...(Array.isArray(current[key]) ? current[key] as Media[] : []), { storage_path: path, public_url: publicUrl, kind, alt_text: "", caption: "" }] }));
    return { path, publicUrl, kind } as { path: string; publicUrl: string; kind: "image" | "document" };
  } catch (error) { setUploadError(error instanceof Error ? error.message : "Could not upload this file."); return null; }
  finally { setUploading(false); }
}
```
Rewrite the existing `upload` to delegate: `async function upload(file: File) { await uploadTo(file, "content_media"); }`.

Add the research editor form (place before the `content` branch's `return` or after it):
```tsx
if (section === "research") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit research" : "New research"} onCancel={onCancel}/><div className="admin-editor-grid"><section>
  <Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/>
  <Field label="Authors" hint="Free-text byline, e.g. Dr. A, Dr. B, and colleagues." value={form.authors} onChange={(value) => set("authors", value)}/>
  <Field label="Abstract" type="textarea" value={form.abstract} onChange={(value) => set("abstract", value)}/>
  <div className="admin-field-grid">
    <Field label="Journal" value={form.journal} onChange={(value) => set("journal", value)}/>
    <Field label="Type" hint="e.g. Paper, Case Report, Review." value={form.category} onChange={(value) => set("category", value)}/>
  </div>
  <div className="admin-field-grid">
    <Field label="Publication date" type="date" value={form.published_date} onChange={(value) => set("published_date", value)}/>
    <Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive']]}/>
  </div>
  <Field label="External paper link" hint="Full https:// link to the published paper." type="url" value={form.link} onChange={(value) => set("link", value)}/>
</section><aside>
  <CoverImagePicker value={String(form.cover_image_url ?? "")} onChange={(url) => set("cover_image_url", url)} upload={(file) => uploadTo(file, "" as never)} uploading={uploading} error={uploadError}/>
  <MediaManager media={(form.research_media as Media[]) ?? []} setMedia={(media) => set("research_media", media)} upload={(file) => uploadTo(file, "research_media")} uploading={uploading} error={uploadError}/>
</aside></div></form>;
```
Fix the cover uploader: `CoverImagePicker` needs the raw upload result, so pass a dedicated function that does not append to any list. Implement `CoverImagePicker` (new component) and give it an upload function that calls `uploadTo(file, undefined)` — adjust `uploadTo`'s signature to accept `key: "content_media" | "research_media" | undefined` and only append when `key` is set (the `if (key)` guard above already handles this; change the type accordingly). Wire the cover picker's `onChange` to the returned `publicUrl`.

- [ ] **Step 9: Add the `CoverImagePicker` component**

```tsx
function CoverImagePicker({ value, onChange, upload, uploading, error }: { value: string; onChange: (url: string) => void; upload: (file: File) => Promise<{ publicUrl: string } | null>; uploading: boolean; error?: string }) {
  return <section className="admin-media admin-cover-picker"><h2>Cover image</h2><p>Shown on the research card and at the top of its page. Upload one, or paste an image URL.</p>
    {value && <div className="admin-cover-preview"><img src={value} alt="Cover preview"/></div>}
    <label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const result = await upload(file); if (result) onChange(result.publicUrl); event.target.value = ""; }}/><IconPlus size={18}/>{uploading ? "Uploading..." : "Upload cover"}</label>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
    <Field label="Or image URL" type="url" value={value} onChange={onChange}/>
    {value && <button type="button" className="admin-delete" onClick={() => onChange("")}>Remove cover</button>}
  </section>;
}
```

- [ ] **Step 10: Save mapping for research**

In `submit`, the current code sends `{ ...form, media: form.content_media }`. Make it send the right gallery per section:
```ts
function submit(event: FormEvent) { event.preventDefault(); onSave({ ...form, media: section === "research" ? form.research_media : form.content_media }); }
```

- [ ] **Step 11: Build, lint, test**

Run build + lint + rendered-route suite. Expected: all pass. Confirm no `messages` / `Contact inbox` string remains:
Run: `grep -rn "messages\|Contact inbox\|Inbox messages" app/components/AdminWorkspace.tsx`
Expected: no matches.

- [ ] **Step 12: Verify in the browser (preview)**

Start the dev server via preview_start (`name` from `.claude/launch.json`; create it if absent per the run skill). Sign-in is required for `/en/admin`; if a staff session is not available in preview, at minimum confirm the workspace compiles and the Research nav item renders on the access/sign-in gate is not possible — instead verify via the earlier build/test. (Full click-through QA happens after the migration is applied to Supabase — rollout step.)

- [ ] **Step 13: Commit**

```bash
git add app/components/AdminWorkspace.tsx
git commit -m "feat(research): admin research list, filters and editor"
```

---

## Task 5: Public detail page — cover + gallery, and styles

**Files:**
- Modify: `app/[locale]/research/[id]/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `Publication.media` and `Publication.imageUrl` (Task 2).
- Produces: cover image in the hero; a gallery section after the abstract.

- [ ] **Step 1: Render the cover image in the hero**

In `ResearchDetailPage`, update the hero to include the cover when present:
```tsx
<header className="research-detail-hero">
  <div className="research-detail-heading"><span className="section-kicker">{paper.category} · {paper.year}</span><h1>{paper.title}</h1></div>
  {paper.imageUrl && <div className="research-detail-cover"><img src={paper.imageUrl} alt="" loading="lazy"/></div>}
</header>
```

- [ ] **Step 2: Add the gallery section after the abstract**

Inside `research-detail-main`, after the abstract `<section>`:
```tsx
{paper.media && paper.media.length > 0 && <section className="research-gallery-section" aria-labelledby="gallery-title"><span className="section-kicker">Figures</span><h2 id="gallery-title">Images</h2><div className="research-gallery-grid">{paper.media.map((item) => <figure key={item.publicUrl} className="research-gallery-item"><img src={item.publicUrl} alt={item.altText || ""} loading="lazy"/>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div></section>}
```

- [ ] **Step 3: Add styles to `globals.css`**

Append theme-aware, RTL-safe styles (logical properties, no letter-spacing). Reuse existing tokens/vars where the file already defines them (match the surrounding `research-*` rules — inspect them first and mirror their variable names):
```css
.research-detail-cover { margin-block-start: 1.25rem; border-radius: 16px; overflow: hidden; }
.research-detail-cover img { display: block; inline-size: 100%; block-size: auto; object-fit: cover; }
.research-gallery-section { margin-block-start: 2rem; }
.research-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-block-start: 1rem; }
.research-gallery-item { margin: 0; border-radius: 12px; overflow: hidden; }
.research-gallery-item img { display: block; inline-size: 100%; block-size: auto; object-fit: cover; }
.research-gallery-item figcaption { padding-block: 0.5rem; font-size: 0.85rem; color: var(--muted, #667); }
/* Admin cover picker */
.admin-cover-preview { margin-block: 0.75rem; border-radius: 10px; overflow: hidden; max-inline-size: 260px; }
.admin-cover-preview img { display: block; inline-size: 100%; block-size: auto; }
```
Before writing, read the existing `.research-detail-*` block in `globals.css` and reuse its exact colour variables (e.g. whatever `--muted`/surface token the file uses) so light/dark both work.

- [ ] **Step 4: Build, lint, test**

Run build + lint + rendered-route suite. Expected: all pass.

- [ ] **Step 5: Verify in the browser (preview)**

With the dev server running, open `/en/research`. Because the DB is empty until the migration is applied, expect the empty state. To confirm the detail rendering compiles, it is sufficient that the build passed; full visual QA of cover/gallery is part of the post-migration rollout QA.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/research/[id]/page.tsx app/globals.css
git commit -m "feat(research): render cover image and figure gallery on detail page"
```

---

## Task 6: Final verification pass

**Files:** none (verification + notes only)

- [ ] **Step 1: Full build**

Run: `$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; npx vinext build`
Expected: success.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: pass.

- [ ] **Step 3: Rendered-route suite**

Run: `node --import ./tests/register-hooks.mjs --test tests/rendered-html.test.mjs`
Expected: all pass.

- [ ] **Step 4: Grep for leftovers**

Run: `grep -rn "contact_messages\|Contact inbox\|Inbox messages" app`
Expected: no matches (the inbox is fully removed from the app surface; the `contact_messages` table itself is left in the DB untouched — out of scope).

- [ ] **Step 5: Update the handoff note**

Add a short section to `HANDOFF.md` noting: research is now DB-backed; migration `0009_research.sql` must be applied to Supabase for research to appear; the external feed is no longer used; images use R2 via `/api/media`. Do not overstate deployment state.

- [ ] **Step 6: Commit**

```bash
git add HANDOFF.md
git commit -m "docs: record research administration handoff"
```

---

## Self-Review

**Spec coverage:**
- Remove inbox → Task 3 (API/perms), Task 4 (UI). ✓
- Research admin CRUD + filter like content → Task 3 (API), Task 4 (list/filters/editor). ✓
- Include already-posted researches → Task 1 (seed 29). ✓
- Image upload + display on research page, R2 + cache → Task 4 (cover + gallery upload via `/api/admin/upload`), Task 5 (render via `/api/media`). ✓
- DB source of truth → Task 1 (schema), Task 2 (reader). ✓

**Placeholder scan:** the one intentional `<<< paste generated seed >>>` marker in Task 1 is filled by Step 2's generator output during execution — it is a generated-content insertion point, not an unresolved TBD. No other placeholders.

**Type consistency:** `uploadTo(file, key)` with `key: "content_media" | "research_media" | undefined`; `upload` delegates with `"content_media"`; cover picker calls with `undefined`. `Media` type reused. `Publication.media` shape (`publicUrl`/`altText`/`caption`) is identical in reader (Task 2), page (Task 5). `researchFilters` keys (`year`/`category`/`status`) consistent across state, memo, and List. `metrics.research` consistent between API (Task 3) and Overview card (Task 4).
