/**
 * A page rendered with a section missing must not become the site's answer for
 * everyone until the entry expires.
 *
 * `app/lib/content.ts` and its siblings degrade rather than fail: a Supabase
 * read that throws gives the caller an empty list and the page renders without
 * that section. Right for one response, wrong to publish — and
 * `worker/page-cache.ts` publishes it, for up to `STALE_FALLBACK_SECONDS`.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { servePublicDocument } from "../worker/page-cache.ts";
import { noteDegradedRead } from "../lib/render-health.ts";

class MemoryEdgeCache {
  entries = new Map();
  async match(request) { return this.entries.get(request.url)?.clone(); }
  async put(request, response) { this.entries.set(request.url, new Response(await response.arrayBuffer(), response)); }
  clear() { this.entries.clear(); }
}

class MemoryKv {
  entries = new Map();
  async getWithMetadata(key) {
    const entry = this.entries.get(key);
    if (!entry) return { value: null, metadata: null };
    return { value: new Response(entry.body).body, metadata: entry.metadata };
  }
  async put(key, value, options) {
    this.entries.set(key, { body: await new Response(value).arrayBuffer(), metadata: options.metadata });
  }
  async delete(key) { this.entries.delete(key); }
}

const edgeCache = new MemoryEdgeCache();
globalThis.caches = { default: edgeCache };

const publicRequest = (path = "/en") => new Request(`https://example.com${path}`, { headers: { accept: "text/html" } });

function context() {
  const pending = [];
  return { pending, waitUntil: (promise) => pending.push(promise) };
}

const KEY = "page:v1:/en";

test("a page whose content read failed is served but not stored", async () => {
  edgeCache.clear();
  const kv = new MemoryKv();
  const ctx = context();

  // The read fails part-way through the render, exactly as it does in
  // production: `render()` has already resolved with the shell by then.
  const render = async () => {
    noteDegradedRead();
    return new Response("<html>missing its research list</html>", { headers: { "content-type": "text/html; charset=utf-8" } });
  };

  const response = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, ctx, render);
  // The reader still gets a page. Degrading is the point; publishing it is not.
  assert.equal(response.status, 200);
  assert.match(await response.text(), /missing its research list/);

  await Promise.all(ctx.pending);
  assert.equal(kv.entries.has(KEY), false, "a degraded render must leave nothing addressable");
});

test("a page that degrades only after the shell has flushed is still caught", async () => {
  edgeCache.clear();
  const kv = new MemoryKv();
  const ctx = context();

  // The document streams, so a read can fail long after the response object
  // exists. Checking at `render()` time would miss this one.
  const render = async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<html>shell"));
        setTimeout(() => {
          noteDegradedRead();
          controller.enqueue(new TextEncoder().encode("</html>"));
          controller.close();
        }, 10);
      },
    });
    return new Response(stream, { headers: { "content-type": "text/html; charset=utf-8" } });
  };

  await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, ctx, render);
  await Promise.all(ctx.pending);
  assert.equal(kv.entries.has(KEY), false, "the check must wait for the body to end");
});

test("a clean render is still cached", async () => {
  edgeCache.clear();
  const kv = new MemoryKv();
  const ctx = context();
  const render = async () => new Response("<html>whole</html>", { headers: { "content-type": "text/html; charset=utf-8" } });

  const response = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, ctx, render);
  assert.equal(response.headers.get("x-sst-page-cache"), "MISS");
  await Promise.all(ctx.pending);
  assert.equal(kv.entries.has(KEY), true, "nothing degraded, so the page belongs in the cache");
});

test("a degraded background refresh withdraws the stale entry rather than renewing it", async () => {
  edgeCache.clear();
  const kv = new MemoryKv();

  let renders = 0;
  const render = async () => {
    renders += 1;
    if (renders > 1) noteDegradedRead();
    return new Response(`<html>render-${renders}</html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  };

  const first = context();
  await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, first, render);
  await Promise.all(first.pending);
  assert.equal(kv.entries.has(KEY), true);

  edgeCache.clear();
  kv.entries.get(KEY).metadata.storedAt = Date.now() - 61_000;

  const second = context();
  const stale = await servePublicDocument(publicRequest(), { VINEXT_CACHE: kv }, second, render);
  // Serving the stale copy is right — it is the last page known to be whole.
  assert.equal(stale.headers.get("x-sst-page-cache"), "STALE");
  assert.match(await stale.text(), /render-1/);

  await Promise.all(second.pending);
  assert.equal(renders, 2);
  assert.equal(kv.entries.has(KEY), false, "a degraded refresh must not extend the entry's life");
});
