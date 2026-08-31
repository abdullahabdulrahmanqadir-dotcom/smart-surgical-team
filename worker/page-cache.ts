import { degradationMarker } from "../lib/render-health";

// Deliberately still v1 after adding /:locale/news to PUBLIC_DOCUMENT below.
// The convention is to bump this whenever the cached-route rules change, so
// entries stored under the old semantics are never reused — but here the change
// only widens which paths qualify. Keys are the prefix plus the pathname, so no
// existing entry changes meaning, and no /news entry can exist under v1 because
// isPublicDocumentRequest rejected those requests until now. Bumping would
// discard every cached page and re-render the whole site at once, which is the
// exact CPU spike the Free plan's 10 ms ceiling cannot absorb. Bump it for a
// change that alters what a stored entry *means*.
const PAGE_CACHE_VERSION = "v1";
const PAGE_CACHE_PREFIX = `page:${PAGE_CACHE_VERSION}:`;
const FRESH_SECONDS = 60;
const STALE_FALLBACK_SECONDS = 24 * 60 * 60;
const PUBLIC_CACHE_CONTROL = `public, max-age=${FRESH_SECONDS}, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${STALE_FALLBACK_SECONDS}`;
// Personal, revalidate before reuse — but storable, which is what keeps a page
// eligible for the browser's back/forward cache. See `restorableDocument`.
const PRIVATE_DOCUMENT_CACHE_CONTROL = "private, no-cache, must-revalidate";

type PageCacheMetadata = {
  storedAt: number;
  contentType: string;
};

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type PageCacheEnv = {
  VINEXT_CACHE?: KVNamespace;
};

type RenderPage = () => Promise<Response>;

type CloudflareCacheStorage = CacheStorage & { default: Cache };

function defaultCache(): Cache {
  return (caches as CloudflareCacheStorage).default;
}

// Only cache public HTML documents. In particular, never cache authenticated
// screens, API responses, React Server Component requests, or URLs with query
// strings (which would create an unbounded attacker-controlled key space).
const PUBLIC_DOCUMENT = /^\/(?:en|ar)(?:\/(?:about|contact|events(?:\/[^/]+)?|library\/[^/]+|news(?:\/[^/]+)?|posters(?:\/[^/]+)?|privacy|research(?:\/[^/]+)?|terms|topics(?:\/[^/]+)?))?\/?$/;

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
  if (!env.VINEXT_CACHE || !response.body || !cacheableRenderedResponse(response)) return;

  const contentType = response.headers.get("content-type") ?? "text/html; charset=utf-8";
  const metadata: PageCacheMetadata = { storedAt: Date.now(), contentType };
  const key = pageCacheKey(request);

  // Write one stream on the expensive render path. The first KV hit promotes
  // it into the regional Cache API; avoiding a second tee here reduces CPU and
  // backpressure on the request that had to render the page.
  await env.VINEXT_CACHE.put(key, response.body, {
    expirationTtl: STALE_FALLBACK_SECONDS,
    metadata,
  });

  // Only now is the page known to be whole. The document streams, so a
  // Supabase read can still fail long after `render()` resolved — the check
  // has to wait until the body has ended, which is what the `put` above
  // awaits. A section that was dropped from this one response must not be
  // dropped from every response for the next day, so the entry goes back out.
  //
  // Deleting after writing, rather than deciding before, is what makes this
  // safe against a partial write too: whatever happens, no degraded document
  // is left addressable.
  if (degradationMarker() !== marker) {
    await env.VINEXT_CACHE.delete(key);
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
  if (!cacheableRenderedResponse(response) || !env.VINEXT_CACHE) return response;

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
  if (!env.VINEXT_CACHE || !isPublicDocumentRequest(request)) {
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

  const kvHit = await env.VINEXT_CACHE.getWithMetadata<PageCacheMetadata>(pageCacheKey(request), { type: "stream" });
  if (kvHit.value && kvHit.metadata) {
    const ageSeconds = (Date.now() - kvHit.metadata.storedAt) / 1000;
    const state = ageSeconds <= FRESH_SECONDS ? "HIT" : "STALE";
    const response = cachedResponse(kvHit.value, kvHit.metadata.contentType, state);

    if (state === "HIT") {
      ctx.waitUntil(defaultCache().put(edgeCacheRequest(request), response.clone()));
    } else {
      // Serve the last known-good document immediately. If SSR ever crosses
      // the CPU ceiling again, the refresh can fail without taking the site
      // down or destroying the usable stale copy.
      ctx.waitUntil(refreshInBackground(request, env, render));
    }
    return response;
  }

  return renderAndStore(request, env, ctx, render);
}
