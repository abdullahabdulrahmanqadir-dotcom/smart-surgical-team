/* Smart Surgical Team public/offline cache.
 * Keep this a classic service worker: every browser can register it without
 * loading the application's React bundle first. */
// Bumped to v2 on 2026-08-26: the public-document rule below now also covers
// /:locale/news, and an installed worker keeps serving the old rule from its
// old caches until the name changes.
// Bumped to v3 on 2026-08-29 with the navigation fix below. The rename is the
// point, not a formality: devices that browsed the news section while it ran on
// placeholder items still hold those pages in `sst-pages-v2`, and `activate`
// deletes every `sst-` cache that is not a current name. Without the bump those
// readers keep their withdrawn copies.
const VERSION = "v3";
const PAGE_CACHE = `sst-pages-${VERSION}`;
const ASSET_CACHE = `sst-assets-${VERSION}`;
const CACHE_NAMES = new Set([PAGE_CACHE, ASSET_CACHE]);

const PUBLIC_DOCUMENT = /^\/(?:en|ar)(?:\/(?:about|contact|events(?:\/[^/]+)?|library\/[^/]+|news(?:\/[^/]+)?|posters(?:\/[^/]+)?|privacy|research(?:\/[^/]+)?|terms|topics(?:\/[^/]+)?))?\/?$/;
const PRECACHE = ["/en", "/ar", "/sst-mark.png", "/favicon.svg", "/manifest.webmanifest"];

function mayStore(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const cacheControl = response.headers.get("cache-control") || "";
  return !/(?:^|,)\s*(?:private|no-store)\b/i.test(cacheControl);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGE_CACHE);
    await Promise.allSettled(PRECACHE.map(async (path) => {
      const request = new Request(path, { credentials: "omit", cache: "reload" });
      const response = await fetch(request);
      if (mayStore(response)) await cache.put(request, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("sst-") && !CACHE_NAMES.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();

    // The first page loaded before this service worker controlled the tab.
    // Save that open public page now so first-time visitors also get an exact
    // offline copy, not only the two locale home pages from PRECACHE.
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const pageCache = await caches.open(PAGE_CACHE);
    await Promise.allSettled(windows.map(async (client) => {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin || url.search || !PUBLIC_DOCUMENT.test(url.pathname)) return;
      const request = new Request(url.toString(), { credentials: "omit", cache: "reload" });
      const response = await fetch(request);
      if (mayStore(response)) await pageCache.put(request, response);
    }));
  })());
});

async function publicNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(request);

  try {
    const response = await fetch(request);
    if (mayStore(response)) {
      await cache.put(request, response.clone());
      return response;
    }
    // A response that simply must not be *stored* — `no-store`, `private` — is
    // still the truth, and is served as it is. Only an unsuccessful one falls
    // back to the last known-good page, which is what this branch is for: an
    // Error 1102 or a 5xx must not replace a page that worked.
    //
    // Returning `cached` for any unstorable response, as this once did, meant a
    // good 200 marked `no-store` was answered from the cache instead — serving
    // content the server had already stopped sending, indefinitely.
    return response.ok ? response : (cached || response);
  } catch {
    if (cached) return cached;
    const localeFallback = new URL(request.url).pathname.startsWith("/ar") ? "/ar" : "/en";
    const home = await cache.match(localeFallback);
    if (home) return home;
    return new Response("You are offline and this page has not been saved on this device yet.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

async function immutableAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (mayStore(response)) await cache.put(request, response.clone());
  return response;
}

async function revisableAsset(event) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then(async (response) => {
    if (mayStore(response)) await cache.put(event.request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Query-bearing documents and all account/admin screens remain network-only.
    if (!url.search && PUBLIC_DOCUMENT.test(url.pathname)) event.respondWith(publicNavigation(request));
    return;
  }

  // RSC/API/auth data must never be persisted in a device-wide public cache.
  if (request.headers.get("rsc") === "1" || request.headers.has("next-router-state-tree")) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(immutableAsset(request));
    return;
  }

  const publicMediaApi = url.pathname.startsWith("/api/media/") || url.pathname.startsWith("/api/research-cover/");
  const publicStaticAsset = ["image", "font", "style", "script"].includes(request.destination) && !url.pathname.startsWith("/api/");
  if (publicMediaApi || publicStaticAsset) event.respondWith(revisableAsset(event));
});
