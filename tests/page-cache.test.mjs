import assert from "node:assert/strict";
import test from "node:test";
import { isPublicDocumentRequest, servePublicDocument } from "../worker/page-cache.ts";

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

class MemoryKv {
  entries = new Map();

  async getWithMetadata(key) {
    const entry = this.entries.get(key);
    if (!entry) return { value: null, metadata: null };
    return { value: new Response(entry.body).body, metadata: entry.metadata };
  }

  async put(key, value, options) {
    this.entries.set(key, {
      body: await new Response(value).arrayBuffer(),
      metadata: options.metadata,
    });
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

test("a rendered document is shared through KV, promoted to edge cache, and refreshed stale-while-revalidate", async () => {
  edgeCache.clear();
  const kv = new MemoryKv();
  let renders = 0;
  const render = async () => new Response(`<html>render-${++renders}</html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

  const missContext = context();
  const miss = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, missContext, render);
  assert.equal(miss.headers.get("x-sst-page-cache"), "MISS");
  assert.match(miss.headers.get("cache-control"), /max-age=60/);
  assert.match(await miss.text(), /render-1/);
  await Promise.all(missContext.pending);

  const kvContext = context();
  const kvHit = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, kvContext, render);
  assert.equal(kvHit.headers.get("x-sst-page-cache"), "HIT");
  assert.match(await kvHit.text(), /render-1/);
  await Promise.all(kvContext.pending);

  const edgeHit = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, context(), render);
  assert.equal(edgeHit.headers.get("x-sst-page-cache"), "HIT");
  assert.match(await edgeHit.text(), /render-1/);
  assert.equal(renders, 1);

  edgeCache.clear();
  const stored = kv.entries.get("page:v1:/en");
  stored.metadata.storedAt = Date.now() - 61_000;
  const staleContext = context();
  const stale = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, staleContext, render);
  assert.equal(stale.headers.get("x-sst-page-cache"), "STALE");
  assert.match(await stale.text(), /render-1/);
  await Promise.all(staleContext.pending);
  assert.equal(renders, 2);
});
