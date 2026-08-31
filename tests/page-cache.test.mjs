import assert from "node:assert/strict";
import test from "node:test";
import { isPublicDocumentRequest, servePublicDocument } from "../worker/page-cache.ts";
import { MemoryR2, ageObject } from "./memory-r2.mjs";

class MemoryEdgeCache {
  entries = new Map();

  async match(request) {
    return this.entries.get(request.url)?.clone();
  }

  async put(request, response) {
    const body = await response.arrayBuffer();
    this.entries.set(request.url, new Response(body, response));
  }

  clear() {
    this.entries.clear();
  }
}

const edgeCache = new MemoryEdgeCache();
globalThis.caches = { default: edgeCache };

function publicRequest(path = "/en") {
  return new Request(`https://example.com${path}`, { headers: { accept: "text/html" } });
}

function context() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) { pending.push(promise); },
  };
}

const KEY = "page:v1:/en";

test("only public, anonymous document requests are cacheable", () => {
  assert.equal(isPublicDocumentRequest(publicRequest("/en/topics")), true);
  assert.equal(isPublicDocumentRequest(publicRequest("/ar/events/summit")), true);
  // News is cached on the same terms as every other public section.
  assert.equal(isPublicDocumentRequest(publicRequest("/en/news")), true);
  assert.equal(isPublicDocumentRequest(publicRequest("/ar/news/example-summit-recap")), true);
  assert.equal(isPublicDocumentRequest(publicRequest("/en/sign-in")), false);
  assert.equal(isPublicDocumentRequest(publicRequest("/api/profile")), false);
  assert.equal(isPublicDocumentRequest(publicRequest("/en?preview=1")), false);
  assert.equal(isPublicDocumentRequest(new Request("https://example.com/en", { headers: { accept: "text/html", cookie: "session=secret" } })), false);
  assert.equal(isPublicDocumentRequest(new Request("https://example.com/en", { headers: { accept: "text/x-component", rsc: "1" } })), false);
});

test("a rendered document is shared through R2, promoted to edge cache, and refreshed stale-while-revalidate", async () => {
  edgeCache.clear();
  const bucket = new MemoryR2();
  let renders = 0;
  const render = async () => new Response(`<html>render-${++renders}</html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

  const missContext = context();
  const miss = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, missContext, render);
  assert.equal(miss.headers.get("x-sst-page-cache"), "MISS");
  assert.match(miss.headers.get("cache-control"), /max-age=60/);
  assert.match(await miss.text(), /render-1/);
  await Promise.all(missContext.pending);

  const bucketContext = context();
  const bucketHit = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, bucketContext, render);
  assert.equal(bucketHit.headers.get("x-sst-page-cache"), "HIT");
  assert.match(await bucketHit.text(), /render-1/);
  await Promise.all(bucketContext.pending);

  const edgeHit = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, context(), render);
  assert.equal(edgeHit.headers.get("x-sst-page-cache"), "HIT");
  assert.match(await edgeHit.text(), /render-1/);
  assert.equal(renders, 1);

  edgeCache.clear();
  ageObject(bucket, KEY, 61);
  const staleContext = context();
  const stale = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, staleContext, render);
  assert.equal(stale.headers.get("x-sst-page-cache"), "STALE");
  assert.match(await stale.text(), /render-1/);
  await Promise.all(staleContext.pending);
  assert.equal(renders, 2);
});

test("a stale answer is held at the edge so R2 and the renderer are hit once, not once per reader", async () => {
  // R2 sits in one region, unlike KV's edge-replicated store, so a stale entry
  // that was never promoted would cost every reader in the colo a round trip
  // and a scheduled re-render until the refresh landed.
  edgeCache.clear();
  const bucket = new MemoryR2();
  let renders = 0;
  const render = async () => new Response(`<html>render-${++renders}</html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

  const first = context();
  await (await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, first, render)).text();
  await Promise.all(first.pending);

  edgeCache.clear();
  ageObject(bucket, KEY, 61);

  const staleContext = context();
  const stale = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, staleContext, render);
  assert.equal(stale.headers.get("x-sst-page-cache"), "STALE");
  await stale.text();
  await Promise.all(staleContext.pending);

  const repeat = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, context(), render);
  assert.equal(repeat.headers.get("x-sst-page-cache"), "HIT", "the second reader is answered from the edge");
  assert.equal(renders, 2, "and does not schedule a second refresh");
});

test("an entry past the stale window is re-rendered rather than served", async () => {
  // KV expired these for us. R2 has no TTL, so the age check in the Worker is
  // the only thing standing between a reader and a day-old page.
  edgeCache.clear();
  const bucket = new MemoryR2();
  let renders = 0;
  const render = async () => new Response(`<html>render-${++renders}</html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

  const first = context();
  await (await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, first, render)).text();
  await Promise.all(first.pending);

  edgeCache.clear();
  ageObject(bucket, KEY, 24 * 60 * 60 + 60);

  const ctx = context();
  const response = await servePublicDocument(publicRequest(), { CACHE_BUCKET: bucket }, ctx, render);
  assert.equal(response.headers.get("x-sst-page-cache"), "MISS");
  assert.match(await response.text(), /render-2/);
  await Promise.all(ctx.pending);
});

test("a signed-in reader's public page stays restorable from their own history", async () => {
  // The shared cache is skipped for a credentialed request, and Next marks the
  // render `no-store`. Chrome refuses to keep a `no-store` page in the
  // back/forward cache, so leaving a case and pressing Back tore the topic grid
  // down and rebuilt it, re-requesting and re-decoding every card image.
  // `no-cache` still forbids reuse without revalidation; it only lets the
  // reader's own history entry come back.
  const signedIn = new Request("https://example.com/en/topics/thyroid-parathyroid", {
    headers: { accept: "text/html", cookie: "sb-access-token=secret" },
  });
  const render = async () => new Response("<html>signed in</html>", {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store, must-revalidate" },
  });

  const response = await servePublicDocument(signedIn, { CACHE_BUCKET: new MemoryR2() }, context(), render);
  assert.equal(response.headers.get("cache-control"), "private, no-cache, must-revalidate");
  assert.equal(response.headers.get("x-sst-page-cache"), null);
  assert.equal(await response.text(), "<html>signed in</html>");
});

test("only public content pages are made restorable", async () => {
  const env = { CACHE_BUCKET: new MemoryR2() };
  const render = async () => new Response("<html>account</html>", {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store, must-revalidate" },
  });

  for (const path of ["/en/profile", "/en/admin", "/en/sign-in", "/api/profile"]) {
    const request = new Request(`https://example.com${path}`, { headers: { accept: "text/html", cookie: "sb-access-token=secret" } });
    const response = await servePublicDocument(request, env, context(), render);
    assert.equal(response.headers.get("cache-control"), "no-store, must-revalidate", `${path} must not be storable`);
  }

  // Nor is a JSON or RSC response ever touched, whatever its path.
  const rsc = new Request("https://example.com/en/topics", { headers: { accept: "text/x-component", rsc: "1" } });
  const rscResponse = await servePublicDocument(rsc, env, context(), async () =>
    new Response("payload", { headers: { "content-type": "text/x-component", "cache-control": "no-store" } }));
  assert.equal(rscResponse.headers.get("cache-control"), "no-store");
});
