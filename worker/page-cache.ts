import { degradationMarker } from "../lib/render-health";
import { putThroughContention, sameObjectContention } from "./r2-put";

// Deliberately still v1 after moving the store from KV to R2. The convention
// is to bump this whenever the cached-route rules change, so entries stored
// under the old semantics are never reused — but a stored document still means
// exactly what it meant before, and the KV namespace that held the v1 entries
// has been deleted, so there is nothing left to collide with. Bumping would
// only guarantee the whole site re-renders at once, which is the exact CPU
// spike the Free plan's 10 ms ceiling cannot absorb. Bump it for a change that
// alters what a stored entry *means*.
const PAGE_CACHE_VERSION = "v1";
const PAGE_CACHE_PREFIX = `page:${PAGE_CACHE_VERSION}:`;
const FRESH_SECONDS = 60;
const STALE_FALLBACK_SECONDS = 24 * 60 * 60;
const PUBLIC_CACHE_CONTROL = `public, max-age=${FRESH_SECONDS}, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${STALE_FALLBACK_SECONDS}`;
// Personal, revalidate before reuse — but storable, which is what keeps a page
// eligible for the browser's back/forward cache. See `restorableDocument`.
const PRIVATE_DOCUMENT_CACHE_CONTROL = "private, no-cache, must-revalidate";

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type PageCacheEnv = {
  /** The `smart-cache` R2 bucket. Rendered documents live under `page:`; the
      vinext data cache shares the bucket under `data:`. */
  CACHE_BUCKET?: R2Bucket;
};

type RenderPage = () => Promise<Response>;

type CloudflareCacheStorage = CacheStorage & { default: Cache };

function defaultCache(): Cache {
  return (caches as CloudflareCacheStorage).default;
}

// Only cache public HTML documents. In particular, never cache authenticated
// screens, API responses, React Server Component requests, or URLs with query
// strings (which would create an unbounded attacker-controlled key space).
const PUBLIC_DOCUMENT = /^\/(?:en|ar)(?:\/(?:about|contact|events(?:\/[^/]+)?|library(?:\/[^/]+)?|news(?:\/[^/]+)?|posters(?:\/[^/]+)?|privacy|research(?:\/[^/]+)?|terms|topics(?:\/[^/]+)?))?\/?$/;

/** A request for one of the public content URLs above, as a document, before
    the caller's own credentials are taken into account. Everything the shared
    page cache needs to be true is checked here; whether this particular reader
    may be served someone else's copy is decided by the caller below. */
function isPublicDocumentPath(request: Request): boolean {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.search || !PUBLIC_DOCUMENT.test(url.pathname)) return false;
  if (request.headers.get("rsc") === "1") return false;
  if (request.headers.has("next-router-state-tree") || request.headers.has("next-router-prefetch")) return false;

  return (request.headers.get("accept") ?? "").includes("text/html");
}

export function isPublicDocumentRequest(request: Request): boolean {
  if (!isPublicDocumentPath(request)) return false;
  // A credentialed reader gets their own render: the stored copy is shared
  // between everyone, so it must never carry a signed-in header or a
  // members-only body.
  return !request.headers.has("authorization") && !request.headers.has("cookie");
}

/**
 * Lets the browser put a signed-in reader's page back the way they left it.
 *
 * A credentialed request skips the shared cache above and is rendered by
 * Next, which marks a dynamic document `no-store`. That header does more than
 * forbid storage: Chrome refuses to keep a `no-store` page in the back/forward
 * cache, so leaving a case and pressing Back tore the whole page down and
 * rebuilt it — every card image requested and decoded again, placeholders
 * shimmering over pictures the browser already held. Anonymous readers never
 * saw it, because their copy comes from the page cache with a `max-age`.
 *
 * `no-cache` keeps the part that matters — a stored copy may not be reused
 * until the server has confirmed it, so no personalized page is ever shown to
 * anyone else or served after a sign-out — while allowing the one reuse that
 * has always been the reader's own: their own history entry, going back to the
 * page they were just looking at.
 */
function restorableDocument(response: Response): Response {
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!/(?:^|,)\s*no-store\b/i.test(cacheControl)) return response;
  if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")) return response;

  // Rebuilt rather than mutated: a Response handed back by another runtime can
  // carry an immutable headers guard, which would throw on `set`.
  const restorable = new Response(response.body, response);
  restorable.headers.set("cache-control", PRIVATE_DOCUMENT_CACHE_CONTROL);
  return restorable;
}

function pageCacheKey(request: Request): string {
  return PAGE_CACHE_PREFIX + new URL(request.url).pathname;
}

function edgeCacheRequest(request: Request): Request {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

function cachedResponse(body: BodyInit | null, contentType: string, state: "HIT" | "STALE"): Response {
  return new Response(body, {
    headers: {
      "cache-control": PUBLIC_CACHE_CONTROL,
      "content-type": contentType,
      "x-sst-page-cache": state,
    },
  });
}

function cacheableRenderedResponse(response: Response): boolean {
  return response.status === 200
    && (response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")
    && !response.headers.has("set-cookie");
}

async function writeCaches(
  request: Request,
  env: PageCacheEnv,
  response: Response,
  marker: number,
): Promise<void> {
  if (!env.CACHE_BUCKET || !response.body || !cacheableRenderedResponse(response)) return;

  const contentType = response.headers.get("content-type") ?? "text/html; charset=utf-8";
  const key = pageCacheKey(request);
  const storedAt = Date.now();

  // Buffered rather than streamed into R2. A vinext document streams with no
  // declared length, and buffering it here is also what makes the degradation
  // check below meaningful: by the time `arrayBuffer()` resolves the render has
  // finished, so `degradationMarker()` has seen every read it is going to.
  // A rendered page is on the order of a hundred kilobytes.
  const body = await response.arrayBuffer();

  // Two readers can finish a background refresh of the same path at the same
  // moment, and R2 rejects the second write to one object instead of queueing
  // it. See ./r2-put.ts.
  try {
    await putThroughContention(env.CACHE_BUCKET, key, body, {
      httpMetadata: { contentType },
      customMetadata: {
        storedAt: String(storedAt),
        // R2 has no TTL of its own. Readers below treat anything past this as
        // absent; the bucket's lifecycle rule reclaims the bytes. See HANDOFF.md.
        expiresAt: String(storedAt + STALE_FALLBACK_SECONDS * 1000),
      },
    });
  } catch (error) {
    if (!sameObjectContention(error)) throw error;
    // Nothing was stored, so there is nothing to undo below and no degraded
    // document to withdraw: whatever the last successful write left addressable
    // was checked when it was written. The reader already has its page; the
    // next one re-renders.
    console.warn(`[page-cache] ${key} not stored: R2 same-object contention outlasted the retries`);
    return;
  }

  // Only now is the page known to be whole. The document streams, so a
  // Supabase read can still fail long after `render()` resolved — the check
  // has to wait until the body has ended, which is what the buffering above
  // guarantees. A section that was dropped from this one response must not be
  // dropped from every response for the next day, so the entry goes back out.
  //
  // Deleting after writing, rather than deciding before, is what makes this
  // safe against a partial write too: whatever happens, no degraded document
  // is left addressable.
  if (degradationMarker() !== marker) {
    await env.CACHE_BUCKET.delete(key);
  }
}

async function renderAndStore(
  request: Request,
  env: PageCacheEnv,
  ctx: WorkerContext,
  render: RenderPage,
): Promise<Response> {
  // Taken before the render begins, so a read that degrades while the shell is
  // still being assembled is counted along with the ones that degrade later.
  const marker = degradationMarker();
  const response = await render();
  if (!cacheableRenderedResponse(response) || !env.CACHE_BUCKET) return response;

  const browserResponse = new Response(response.body, response);
  browserResponse.headers.set(
    "cache-control",
    PUBLIC_CACHE_CONTROL,
  );
  browserResponse.headers.set("x-sst-page-cache", "MISS");

  // Both the browser and the background write get their own branch of the
  // stream. Cloning here rather than in the caller keeps `marker` — which is
  // only meaningful next to the `render()` it was taken around — local.
  ctx.waitUntil(writeCaches(request, env, browserResponse.clone(), marker));
  return browserResponse;
}

async function refreshInBackground(request: Request, env: PageCacheEnv, render: RenderPage): Promise<void> {
  const marker = degradationMarker();
  const response = await render();
  await writeCaches(request, env, response, marker);
}

export async function servePublicDocument(
  request: Request,
  env: PageCacheEnv,
  ctx: WorkerContext,
  render: RenderPage,
): Promise<Response> {
  // Development must render the server document and client bundle from the
  // same source revision. Persisting anonymous HTML across local dev-server
  // restarts can pair an old document with a freshly compiled client chunk,
  // which produces false hydration failures. Production hosts still use the
  // full layered cache below.
  const hostname = new URL(request.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return restorableDocument(await render());
  }

  if (!env.CACHE_BUCKET || !isPublicDocumentRequest(request)) {
    // A public content page rendered for a signed-in reader still has to be
    // restorable from their own history; anything else — an account screen, an
    // API route, an RSC payload — keeps whatever Next decided.
    const response = await render();
    return isPublicDocumentPath(request) ? restorableDocument(response) : response;
  }

  const edgeHit = await defaultCache().match(edgeCacheRequest(request));
  if (edgeHit) {
    const response = new Response(edgeHit.body, edgeHit);
    response.headers.set("x-sst-page-cache", "HIT");
    return response;
  }

  const stored = await env.CACHE_BUCKET.get(pageCacheKey(request));
  const storedAt = Number(stored?.customMetadata?.storedAt);
  const ageSeconds = (Date.now() - storedAt) / 1000;

  // Past the stale window the entry is no longer an answer, only bytes the
  // lifecycle rule has not swept yet. KV expired these for us; R2 does not.
  if (stored && Number.isFinite(ageSeconds) && ageSeconds <= STALE_FALLBACK_SECONDS) {
    const state = ageSeconds <= FRESH_SECONDS ? "HIT" : "STALE";
    const contentType = stored.httpMetadata?.contentType ?? "text/html; charset=utf-8";
    const response = cachedResponse(stored.body, contentType, state);

    // The stale copy is seeded into the edge cache too, not just the fresh one.
    // R2 is a bucket in one region rather than KV's edge-replicated store, so
    // every request that reaches it costs a round trip and — in the stale
    // branch — schedules another render. Holding the answer at the edge for the
    // 60 s `max-age` caps both at one per colo per minute while a refresh lands.
    ctx.waitUntil(defaultCache().put(edgeCacheRequest(request), response.clone()));

    if (state === "STALE") {
      // Serve the last known-good document immediately. If SSR ever crosses
      // the CPU ceiling again, the refresh can fail without taking the site
      // down or destroying the usable stale copy.
      ctx.waitUntil(refreshInBackground(request, env, render));
    }
    return response;
  }

  if (stored) await stored.body.cancel();
  return renderAndStore(request, env, ctx, render);
}
