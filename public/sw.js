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
// Bumped to v4 on 2026-08-30 with the navigation rewrite below. Writes used to
// be awaited on the response path, so a write cut short by a closing tab could
// leave a partial document behind; nothing under the old rules is reused.
const VERSION = "v4";
// Deliberately still v4 after the immutable rule in `revisableAsset` below.
// A bump withdraws every cache this worker no longer names, which here would
// throw away the stored pictures the change exists to stop re-fetching. No
// entry changes meaning: the bytes at a media URL were already immutable, the
// worker had simply been asking anyway.

// A stalled connection used to mean an indefinitely blank window: the fetch
// never settled, so neither the network's page nor the saved one was shown, and
// nothing told the reader to try again. Past this point the saved copy is
// served and the network keeps running to refresh it for next time.
const NETWORK_TIMEOUT_MS = 4000;
const PAGE_CACHE = `sst-pages-${VERSION}`;
const ASSET_CACHE = `sst-assets-${VERSION}`;
const CACHE_NAMES = new Set([PAGE_CACHE, ASSET_CACHE]);

const PUBLIC_DOCUMENT = /^\/(?:en|ar)(?:\/(?:about|contact|events(?:\/[^/]+)?|library(?:\/[^/]+)?|news(?:\/[^/]+)?|posters(?:\/[^/]+)?|privacy|research(?:\/[^/]+)?|terms|topics(?:\/[^/]+)?))?\/?$/;
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

/**
 * Saving a page must never be able to fail the navigation that produced it.
 *
 * This was `await cache.put(...)` on the response path, and the reader saw both
 * consequences. The document had to arrive in full and be written to disk
 * before the browser was handed a single byte, so a streamed page painted only
 * at the end; and a rejected write — a full quota, storage denied in a private
 * window — threw into the offline branch below, answering a perfectly good 200
 * with the offline page. Both read as a page that came up empty for no reason.
 */
function storeInBackground(event, cache, request, response) {
  event.waitUntil(cache.put(request, response).catch(() => undefined));
}

/** Resolves with `fallback` if `promise` has not settled within the timeout. */
function withTimeout(promise, fallback) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), NETWORK_TIMEOUT_MS);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function publicNavigation(event) {
  const request = event.request;
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request).then((response) => {
    if (mayStore(response)) storeInBackground(event, cache, request, response.clone());
    return response;
  });
  // Whichever branch below consumes this promise handles its rejection. The
  // no-op keeps it from being reported as unhandled in the case where the
  // timeout wins the race and nothing is awaiting it on this turn.
  network.catch(() => undefined);

  try {
    // Without a saved copy there is no alternative to fall back to, so never
    // cut the network short: a slow first visit still has to be waited out.
    const response = cached ? await withTimeout(network, cached) : await network;
    if (response === cached) return cached;
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
    return offlineDocument(request);
  }
}

/**
 * The last resort: offline, and this page has never been saved on this device.
 *
 * It used to be one line of `text/plain`, which in a browser window is
 * indistinguishable from the site having loaded and rendered nothing — the
 * exact failure this file exists to prevent. A page that says what happened and
 * carries its own retry button is the difference between a reader who tries
 * again and one who assumes the site is broken.
 */
function offlineDocument(request) {
  const arabic = new URL(request.url).pathname.startsWith("/ar");
  const copy = arabic
    ? { lang: "ar", dir: "rtl", title: "لا يوجد اتصال بالإنترنت", body: "لم يتم حفظ هذه الصفحة على هذا الجهاز بعد. تحقق من اتصالك ثم حاول مرة أخرى.", retry: "إعادة المحاولة" }
    : { lang: "en", dir: "ltr", title: "You are offline", body: "This page has not been saved on this device yet. Check your connection and try again.", retry: "Try again" };

  const html = `<!doctype html><html lang="${copy.lang}" dir="${copy.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${copy.title}</title><style>
body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 2rem; background: #faf7f1; color: #40322a; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
main { max-width: 26rem; }
h1 { margin: 0 0 .75rem; font-size: 1.5rem; font-weight: 600; }
p { margin: 0 0 1.75rem; color: #6b5b4e; }
button { padding: .7rem 1.6rem; border: 0; border-radius: 999px; background: #167a78; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
@media (prefers-color-scheme: dark) { body { background: #1b1512; color: #f5efe6; } p { color: #b9a99b; } button { background: #4aa9a5; color: #0b2321; } }
</style></head><body><main><h1>${copy.title}</h1><p>${copy.body}</p><button type="button" onclick="location.reload()">${copy.retry}</button></main></body></html>`;

  return new Response(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

async function immutableAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (mayStore(response)) await cache.put(request, response.clone());
  return response;
}

/** True for a response whose bytes can never change at this URL. */
function isImmutable(response) {
  return /(?:^|,)\s*immutable\b/i.test(response.headers.get("cache-control") || "");
}

async function revisableAsset(event) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(event.request);
  // Uploaded media is written under a new timestamped key rather than
  // overwritten, and `/api/media` says exactly that with `immutable`.
  // Revalidating one is pure waste, and it was not free: every visit to a case
  // grid put a request on the network for every picture in it, dozens that
  // could only ever come back "unchanged", and a reader returning from a case
  // paid for the whole grid a second time. A stored copy that declares itself
  // immutable is simply served.
  if (cached && isImmutable(cached)) return cached;
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
    if (!url.search && PUBLIC_DOCUMENT.test(url.pathname)) event.respondWith(publicNavigation(event));
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
