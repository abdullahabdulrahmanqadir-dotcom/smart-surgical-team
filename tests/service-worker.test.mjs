import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const workerCache = await readFile(new URL("../worker/page-cache.ts", import.meta.url), "utf8");

/** The PUBLIC_DOCUMENT literal, as written, from either file. */
function publicDocumentRule(text) {
  const match = text.match(/^const PUBLIC_DOCUMENT = (\/.+\/);$/m);
  assert.ok(match, "PUBLIC_DOCUMENT should be a single-line regex literal");
  return match[1];
}

test("offline cache is restricted to public documents and public media", () => {
  assert.match(source, /PUBLIC_DOCUMENT/);
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /!url\.search/);
  assert.match(source, /\/api\/media\//);
  assert.doesNotMatch(source, /cache\.put\([^\n]*(?:profile|admin|sign-in|sign-up)/);
});

test("a failed navigation keeps the last known-good device copy", () => {
  // An Error 1102 or a 5xx must not replace a page that worked.
  assert.match(source, /return response\.ok \? response : \(cached \|\| response\)/);
  assert.match(source, /if \(cached\) return cached/);
  assert.match(source, /has not been saved on this device yet/);
});

test("a good page is served even when it must not be stored", () => {
  // `mayStore` rejects `no-store` and `private`. Those say "do not keep this",
  // not "this is wrong" — so the response is still served, just not cached.
  //
  // Answering them from the cache instead, as an unguarded `return cached ||
  // response` does, hands back content the server has already stopped sending,
  // for as long as the entry survives. That is how withdrawn news items kept
  // appearing on a device after they were removed from the site.
  assert.doesNotMatch(source, /^\s*return cached \|\| response;\s*$/m,
    "an unstorable but successful response must not fall back to the cache");
  assert.match(source, /return response\.ok \? response/);
});

test("a version bump withdraws every cache the worker no longer names", () => {
  // Renaming the caches is how content already sitting on a reader's device is
  // taken back: `activate` deletes every `sst-` cache that is not a current
  // name. Without this, a bump would leave the old pages addressable.
  assert.match(source, /const CACHE_NAMES = new Set\(\[PAGE_CACHE, ASSET_CACHE\]\)/);
  assert.match(source, /names\.filter\(\(name\) => name\.startsWith\("sst-"\) && !CACHE_NAMES\.has\(name\)\)\.map\(\(name\) => caches\.delete\(name\)\)/);
  // Both cache names must carry the version, or a bump renames nothing.
  assert.match(source, /const PAGE_CACHE = `sst-pages-\$\{VERSION\}`/);
  assert.match(source, /const ASSET_CACHE = `sst-assets-\$\{VERSION\}`/);
});

test("the edge cache and the device cache agree on what a public document is", () => {
  // Two copies of the same rule, in a Worker module and a classic service
  // worker that cannot import it. They must not drift: a section added to one
  // and not the other is cached at the edge but has no offline copy, or the
  // reverse — and either way it silently behaves unlike the rest of the site.
  assert.equal(publicDocumentRule(source), publicDocumentRule(workerCache));
  // Every public section belongs to the rule, news included.
  for (const section of ["about", "contact", "events", "library", "news", "posters", "privacy", "research", "terms", "topics"]) {
    assert.ok(publicDocumentRule(source).includes(section), `PUBLIC_DOCUMENT should cover ${section}`);
  }
});
