# Topic query scalability handoff

**Status:** Proposed; no application code has been changed for this item.  
**Priority:** Optimisation to schedule before the public library becomes large.  
**Scope:** Public topic-card retrieval only. Do not change the user interface,
case-page access rules, or member-only behaviour.

## Executive summary

The Topics experience is already progressive from the visitor's perspective:

- `/en/topics` loads no case cards.
- A visitor selecting a topic requests only
  `/api/topics/:slug/cases`.
- The browser receives only the cards for the selected topic and retains them
  for the remainder of that browser session.
- The endpoint is publicly cacheable for 60 seconds, with a five-minute
  stale-while-revalidate window.

The inefficiency is server-side. `getTopicContent()` currently calls
`cachedCards()`, which obtains every published public card from Supabase, then
filters the resulting JavaScript array by topic. This is inexpensive at the
current catalogue size, but the database read grows with the entire library
rather than the number of cards in the selected topic.

The desired end state is: a request for Salivary Glands causes Supabase to
read only Salivary Glands (including its Parotid and Submandibular children),
while preserving the existing 60-second shared cache and all current page
behaviour.

## Current request path

```text
Visitor selects a topic
  -> browser fetches /api/topics/:slug/cases
  -> getTopicContent([parent slug, child slugs])
  -> cachedCards()
  -> Supabase reads every published, public content_items card
     plus its topics and thumbnail-media metadata
  -> server filters that complete array in JavaScript
  -> browser receives only matching cards
```

### Relevant implementation

| File | Current responsibility |
|---|---|
| `app/components/TopicsExplorer.tsx` | Starts no case request on `/topics`; fetches an unopened topic on selection and keeps it in `casesByTopic` for the session. |
| `app/api/topics/[slug]/cases/route.ts` | Validates the public topic, obtains its parent/child slugs, returns the matching cards and cache headers. |
| `app/[locale]/topics/[slug]/page.tsx` | Server-renders a deep-linked selected topic with its matching cards. |
| `app/lib/content.ts` | Defines `fetchCards`, `cachedCards`, and `getTopicContent`; this is the location of the full-catalogue query. |
| `worker/index.ts` | Uses `VINEXT_CACHE` KV when the production Worker binding exists, providing durable backing for `unstable_cache`. |

The current implementation is intentionally safe for content visibility:
`fetchCards()` filters `status = published` and `access_level = public` before
any response is created. The proposed work must retain those predicates.

## Why this becomes costly as content grows

The browser-side design is good: no unselected topic's cards are sent to a
visitor. The cost is between the Worker and Supabase when the shared cache is
cold or expires.

For example, if a library eventually has 10,000 public items and a selected
topic has 12:

| Stage | Current implementation | Desired implementation |
|---|---|---|
| Supabase rows/embedded metadata read | ~10,000 cards | ~12 cards |
| Worker memory used to filter | Whole card catalogue | Selected topic result |
| Supabase-to-Worker transfer | Whole card catalogue | Selected topic result |
| Browser payload | ~12 cards | ~12 cards |

Likely future effects, especially just after cache expiry or a new Worker
isolate starts, are slower topic opening, higher Supabase egress/read work,
larger Worker memory/CPU use, and a growing chance of hitting platform response
or execution limits. It is **not** a security leak: unselected cards are not
sent to the browser. It is also not an urgent issue at the present catalogue
size.

## Observed baseline (local development, 2026-08-03)

These figures are local only; use production observability before making a
deployment performance claim.

| Check | Result |
|---|---|
| `/en/topics` | 200, ~147 KB response; contains no case title or case-card data. |
| `/api/topics/salivary-glands/cases` | 200, ~2 KB response, about 14 ms locally; returned 3 items. |
| Topic endpoint cache policy | `public, max-age=60, stale-while-revalidate=300`. |
| Browser selection test | Selecting Salivary Glands populated the 3 relevant cards without navigating away. |
| Case media | Gallery images render with `loading="lazy"` and `decoding="async"`; this is separate from the database-query issue. |

## Recommended implementation

### 1. Add a topic-specific database read

Introduce a server-only function such as `fetchTopicCards(topicSlugs: string[])`
in `app/lib/content.ts`. It should query by the selected parent and child topic
slugs in Supabase rather than call `fetchCards()` / `cachedCards()`.

Use one of these approaches, preferring the first if it can preserve the
existing `ContentCard.topics` semantics cleanly with the project's PostgREST
version:

1. Query `content_items` through an inner `content_topics -> topics` relation,
   filtering `topics.slug` to the supplied slugs, while keeping the existing
   public/published predicates and card projection.
2. Use two bounded queries: first query `content_topics` joined to `topics` to
   obtain matching `content_id` values; then query `content_items` with
   `.in('id', ids)` using the existing `CARD_SELECT`. This avoids an N+1 query
   pattern and preserves all topic data embedded in each card.

Do not replace it with one query per content item or a client-side Supabase
query. The service-role client and server-side access control must remain
server-only.

### 2. Cache by topic set, not as one whole catalogue

Normalise the requested slugs before using them as a cache key:

- remove duplicates;
- sort them;
- use the same parent-plus-children set for the API route and topic detail
  route.

Cache each normalised topic set for the existing 60 seconds. Continue to tag
the results with `published-content`, so any future explicit invalidation can
invalidate both individual-card and topic-card entries together. Verify the
exact `unstable_cache` argument-key behaviour in this version of vinext before
relying on it; if arguments are not included in its cache key, create a
per-normalised-key cached wrapper deliberately.

Keep the endpoint's existing HTTP cache header unchanged unless a separate
cache-policy decision is made.

### 3. Add the supporting database index

The existing primary key on `content_topics` is `(content_id, topic_id)`. A
topic-first lookup benefits from an index beginning with `topic_id`.

Create a new Supabase migration that adds:

```sql
create index if not exists content_topics_topic_content_idx
  on public.content_topics (topic_id, content_id);
```

Review the execution plan against production-like data before adding extra
indexes. The `topics.slug` column is already unique, and therefore indexed.

### 4. Preserve the full-catalogue path where it is genuinely needed

`getLibraryContent()` may still need the full public-card catalogue for areas
such as related content. Do not change its public API or force unrelated
features through the topic-specific path. The goal is to make
`getTopicContent()` independent of `cachedCards()`, not to remove the
full-catalogue reader blindly.

## Acceptance criteria

1. `/en/topics` still issues no content query until a topic is selected.
2. `/en/topics/:slug` renders only the requested group and its child-topic
   cards.
3. Switching a topic from the client still requests only that topic endpoint,
   shows the current loading/error UI, and does not refetch a topic already
   held in the browser session.
4. The Supabase query for `getTopicContent()` is constrained by the requested
   topic IDs/slugs; it must not obtain the entire published-card catalogue and
   then call JavaScript `.filter()`.
5. Returned cards retain their existing fields, ordering, thumbnail resolution,
   topic labels, and public-access restrictions.
6. Unknown topic slugs still return the current 404 JSON response.
7. The endpoint keeps `public, max-age=60, stale-while-revalidate=300` unless
   deliberately changed and documented.
8. A published or access-level change is reflected no later than the existing
   cache policy permits; do not introduce a longer accidental stale period.
9. `npm run lint`, `npm run build`, and the rendered-route tests pass.

## Recommended verification plan

### Automated

- Add a focused unit/integration test around the new topic reader. Mock or
  inspect the Supabase query builder sufficiently to prove topic filtering is
  applied before results are mapped.
- Keep the existing rendered-route checks for `/en/topics` and every public
  topic deep link.
- Add an endpoint test asserting that a valid topic returns its own cards and
  an unknown slug returns 404.

### Manual / production-like

1. Populate a non-production Supabase environment with enough content across
   several topics to make the difference visible.
2. Inspect the Supabase query/plan and confirm the new
   `content_topics_topic_content_idx` is used for topic-first lookup.
3. Test `/en/topics`, one direct topic URL, selection between two topics,
   browser back/forward, and a reload on a direct topic URL.
4. Confirm `VINEXT_CACHE` is bound in Cloudflare Workers. Without it,
   `unstable_cache` falls back to per-isolate memory and cache warmth will be
   less consistent across requests.
5. Compare cold and warm Worker timings and database response sizes before and
   after. Record both rather than relying only on localhost timings.

## Non-goals and guardrails

- Do not add Workers KV merely for this change; the Worker already supports
  `VINEXT_CACHE`. Verify that the production binding exists instead.
- Do not cache authentication, member access, saves, progress, or admin data
  in this topic cache.
- Do not change R2 media delivery or lazy image behaviour; those mechanisms
  are already independently working.
- Do not publish or deploy as part of this work unless the client explicitly
  requests it.

## Revisit trigger (decision, 2026-08-03)

Reviewed against the live code; the handoff is accurate. Decision was to **defer
implementation**, because the implementation effort is identical whether done
now or later, and deferring buys real before/after measurements (impossible at
the current catalogue size). Notes for future-you:

- **~100 cases does not force this.** At roughly 100 published public cards the
  full-catalogue read is ~100 small rows — single-digit-millisecond Postgres,
  ~100 KB Supabase-to-Worker transfer once per 60-second cache window per
  isolate. Wasteful in principle, comfortable in practice.
- The proposed `content_topics(topic_id, content_id)` index will likely be
  ignored by the planner at ~100 rows (a sequential scan is faster on a tiny
  table). It earns its keep only at scale, so shipping it early buys nothing.
- **Implement when any of these is true:**
  1. the public catalogue is heading past a few hundred cards;
  2. production cold-cache topic-open timings start creeping up (measure real
     cold vs warm Worker timings — not localhost);
  3. Supabase read/egress on the topic path looks heavy in production
     observability.
- Doing it later is no harder and is actually easier to verify: once real
  content is in, the acceptance plan's before/after comparison becomes possible.

## Handoff checklist for the implementing agent

1. Read `HANDOFF.md` and this document before editing.
2. Inspect the installed Supabase/PostgREST query behaviour in the actual
   environment; do not assume nested relation filter syntax preserves all
   embedded topics.
3. Implement the constrained reader, cache-key separation, and index migration
   together.
4. Update tests and run the verification plan above.
5. Report the exact query shape, cold/warm measurements, cache behaviour, and
   migration name in the final handoff.
