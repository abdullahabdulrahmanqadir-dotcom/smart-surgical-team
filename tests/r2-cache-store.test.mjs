/**
 * `R2CacheStore` is what lets vinext's `KVCacheHandler` — written against the
 * Workers KV API — keep the site's read-through Supabase cache in R2 instead.
 * The handler is unmodified upstream code, so these tests pin the two places
 * where R2 does not behave like KV and the façade has to make up the
 * difference: expiry, which R2 has no notion of, and list metadata, which R2
 * only returns when asked for.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { R2CacheStore } from "../worker/r2-cache-store.ts";
import { MemoryR2 } from "./memory-r2.mjs";

test("a value round-trips as text and as an ArrayBuffer", async () => {
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:cache:home", '{"kind":"APP_PAGE"}');
  assert.equal(await store.get("data:cache:home"), '{"kind":"APP_PAGE"}');

  const buffer = await store.get("data:cache:home", { type: "arrayBuffer" });
  assert.equal(new TextDecoder().decode(buffer), '{"kind":"APP_PAGE"}');

  assert.equal(await store.get("data:cache:missing"), null);
});

test("an expired entry reads as absent and is reaped", async () => {
  // R2 has no `expirationTtl`. Without this the handler would keep serving a
  // cache entry the KV namespace would have dropped weeks earlier.
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:cache:stale", "value", { expirationTtl: 60 });
  const stored = bucket.objects.get("data:cache:stale");
  stored.customMetadata.expiresAt = String(Date.now() - 1000);

  assert.equal(await store.get("data:cache:stale"), null);
  // The delete is deliberately not awaited by `get`, so give it a turn.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(bucket.objects.has("data:cache:stale"), false, "the bytes go back too");
});

test("an entry with no TTL never expires on its own", async () => {
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:__tag:published-news", String(Date.now()));
  assert.notEqual(await store.get("data:__tag:published-news"), null);
});

test("list returns each key's stored metadata, which is how path invalidation finds tags", async () => {
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:cache:a", "a", { metadata: { tags: ["published-content"] } });
  await store.put("data:cache:b", "b", { metadata: { tags: ["_N_T_/en/news"] } });
  await store.put("page:v1:/en", "not the data cache");

  const listed = await store.list({ prefix: "data:cache:" });
  assert.equal(listed.list_complete, true);
  assert.deepEqual(listed.keys.map((key) => key.name), ["data:cache:a", "data:cache:b"]);
  assert.deepEqual(listed.keys[0].metadata, { tags: ["published-content"] });
  assert.deepEqual(listed.keys[1].metadata, { tags: ["_N_T_/en/news"] });
});

test("list pages through a cursor and hides expired keys", async () => {
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  for (const suffix of ["a", "b", "c"]) await store.put(`data:cache:${suffix}`, suffix);
  bucket.objects.get("data:cache:b").customMetadata = { expiresAt: String(Date.now() - 1000) };

  const first = await store.list({ prefix: "data:cache:", limit: 2 });
  assert.equal(first.list_complete, false);
  // `b` is expired, so a two-key page comes back holding only `a`.
  assert.deepEqual(first.keys.map((key) => key.name), ["data:cache:a"]);

  const second = await store.list({ prefix: "data:cache:", limit: 2, cursor: first.cursor });
  assert.equal(second.list_complete, true);
  assert.deepEqual(second.keys.map((key) => key.name), ["data:cache:c"]);
});

test("metadata too large for R2 is dropped rather than failing the write", async () => {
  // The handler already tolerates an entry with no tag metadata — it picks the
  // tags back up on the next `set`. Losing the write instead would lose the
  // cache entry itself.
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:cache:huge", "value", { metadata: { tags: [ "x".repeat(4000) ] } });
  assert.equal(await store.get("data:cache:huge"), "value");
  assert.equal(bucket.objects.get("data:cache:huge").customMetadata.metadata, undefined);
});

test("unparseable metadata degrades to none instead of throwing", async () => {
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:cache:corrupt", "value", { metadata: { tags: ["published-events"] } });
  bucket.objects.get("data:cache:corrupt").customMetadata.metadata = "{not json";

  const listed = await store.list({ prefix: "data:cache:" });
  assert.equal(listed.keys[0].metadata, undefined);
});

test("delete removes the key", async () => {
  const bucket = new MemoryR2();
  const store = new R2CacheStore(bucket);

  await store.put("data:cache:gone", "value");
  await store.delete("data:cache:gone");
  assert.equal(await store.get("data:cache:gone"), null);
});
