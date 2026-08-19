const PAGE_CACHE_VERSION = "v1";
const PAGE_CACHE_PREFIX = `page:${PAGE_CACHE_VERSION}:`;
const FRESH_SECONDS = 60;
const STALE_FALLBACK_SECONDS = 24 * 60 * 60;
const PUBLIC_CACHE_CONTROL = `public, max-age=${FRESH_SECONDS}, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${STALE_FALLBACK_SECONDS}`;

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
const PUBLIC_DOCUMENT = /^\/(?:en|ar)(?:\/(?:about|contact|events(?:\/[^/]+)?|library\/[^/]+|posters(?:\/[^/]+)?|privacy|research(?:\/[^/]+)?|terms|topics(?:\/[^/]+)?))?\/?$/;

export function isPublicDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.search || !PUBLIC_DOCUMENT.test(url.pathname)) return false;
  if (request.headers.has("authorization") || request.headers.has("cookie")) return false;
  if (request.headers.get("rsc") === "1") return false;
  if (request.headers.has("next-router-state-tree") || request.headers.has("next-router-prefetch")) return false;

  return (request.headers.get("accept") ?? "").includes("text/html");
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

async function writeCaches(request: Request, env: PageCacheEnv, response: Response): Promise<void> {
  if (!env.VINEXT_CACHE || !response.body || !cacheableRenderedResponse(response)) return;

  const contentType = response.headers.get("content-type") ?? "text/html; charset=utf-8";
  const metadata: PageCacheMetadata = { storedAt: Date.now(), contentType };

  // Write one stream on the expensive render path. The first KV hit promotes
  // it into the regional Cache API; avoiding a second tee here reduces CPU and
  // backpressure on the request that had to render the page.
  await env.VINEXT_CACHE.put(pageCacheKey(request), response.body, {
    expirationTtl: STALE_FALLBACK_SECONDS,
    metadata,
  });
}

async function renderAndStore(request: Request, env: PageCacheEnv, render: RenderPage): Promise<Response> {
  const response = await render();
  if (!cacheableRenderedResponse(response) || !env.VINEXT_CACHE) return response;

  const browserResponse = new Response(response.body, response);
  browserResponse.headers.set(
    "cache-control",
    PUBLIC_CACHE_CONTROL,
  );
  browserResponse.headers.set("x-sst-page-cache", "MISS");

  // The caller clones this response before returning it, so both the browser
  // and the background cache write can consume their own stream branch.
  return browserResponse;
}

async function refreshInBackground(request: Request, env: PageCacheEnv, render: RenderPage): Promise<void> {
  const response = await render();
  await writeCaches(request, env, response);
}

export async function servePublicDocument(
  request: Request,
  env: PageCacheEnv,
  ctx: WorkerContext,
  render: RenderPage,
): Promise<Response> {
  if (!env.VINEXT_CACHE || !isPublicDocumentRequest(request)) return render();

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

  const rendered = await renderAndStore(request, env, render);
  if (rendered.headers.get("x-sst-page-cache") === "MISS") {
    ctx.waitUntil(writeCaches(request, env, rendered.clone()));
  }
  return rendered;
}
