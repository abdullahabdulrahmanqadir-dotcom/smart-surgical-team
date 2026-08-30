/**
 * Behavioural tests for the navigation path in `public/sw.js`.
 *
 * The sibling `service-worker.test.mjs` reads the source and asserts on the
 * rules it states. This file runs it: the failures that sent readers a blank
 * window were not visible in the shape of the code, only in what it did when
 * storage was full or the connection stalled.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

const ORIGIN = "https://ssthyroid.com";
const PAGE = "https://ssthyroid.com/en/about";

/** A minimal ServiceWorkerGlobalScope: enough of one for the fetch handler. */
function loadWorker({ fetchImpl, cacheEntries = new Map(), putImpl } = {}) {
  const listeners = {};
  const cache = {
    match: async (request) => cacheEntries.get(typeof request === "string" ? request : request.url),
    put: async (request, response) => {
      if (putImpl) return putImpl(request, response);
      cacheEntries.set(typeof request === "string" ? request : request.url, response);
    },
  };
  const scope = {
    self: {
      addEventListener: (name, fn) => { listeners[name] = fn; },
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [] },
      location: { origin: ORIGIN },
    },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: fetchImpl,
    Response, Request, URL, setTimeout, clearTimeout, console,
  };
  scope.globalThis = scope;
  vm.createContext(scope);
  vm.runInContext(source, scope);
  return { listeners, cacheEntries };
}

/** Dispatches a navigation and returns what the browser would be handed. */
function navigate(listeners, url = PAGE) {
  const request = new Request(url, { headers: { accept: "text/html" } });
  Object.defineProperty(request, "mode", { value: "navigate" });
  const pending = [];
  let responded;
  listeners.fetch({
    request,
    respondWith: (promise) => { responded = promise; },
    waitUntil: (promise) => pending.push(promise),
  });
  assert.ok(responded, "a public navigation should be answered by the worker");
  return { responded, settled: () => Promise.allSettled(pending) };
}

const html = (body, headers = {}) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html", "cache-control": "public, max-age=60", ...headers } });

test("a full storage quota does not cost the reader the page", async () => {
  // `await cache.put(...)` on the response path meant a rejected write — a full
  // quota, storage denied in a private window — threw into the offline branch,
  // answering a good 200 with the offline page.
  const { listeners } = loadWorker({
    fetchImpl: async () => html("<html>fresh</html>"),
    putImpl: async () => { throw new Error("QuotaExceededError"); },
  });
  const nav = navigate(listeners);
  const response = await nav.responded;
  await nav.settled();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html>fresh</html>");
});

test("the response is not held back by the cache write", async () => {
  // Awaiting the write meant the whole document had to arrive and be written to
  // disk before the browser saw a single byte, so a streamed page painted only
  // at the end.
  let release;
  const write = new Promise((resolve) => { release = resolve; });
  const { listeners } = loadWorker({
    fetchImpl: async () => html("<html>fresh</html>"),
    putImpl: () => write,
  });
  const nav = navigate(listeners);
  const winner = await Promise.race([
    nav.responded.then(() => "response"),
    new Promise((resolve) => setTimeout(() => resolve("still waiting on the write"), 300)),
  ]);
  release();
  assert.equal(winner, "response");
});

test("a stalled connection falls back to the saved page instead of hanging", async () => {
  const { listeners } = loadWorker({
    fetchImpl: () => new Promise(() => {}),
    cacheEntries: new Map([[PAGE, html("<html>saved</html>")]]),
  });
  const started = Date.now();
  const response = await navigate(listeners).responded;
  assert.equal(await response.text(), "<html>saved</html>");
  assert.ok(Date.now() - started >= 3800, "should wait for the network before giving up on it");
});

test("offline with nothing saved is a page that explains itself", async () => {
  // A line of `text/plain` in a browser window is indistinguishable from the
  // site having loaded and rendered nothing.
  const { listeners } = loadWorker({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); } });
  const response = await navigate(listeners).responded;
  const body = await response.text();
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.match(body, /Try again/);
  assert.match(body, /location\.reload/);
});

test("the Arabic offline page is Arabic and right-to-left", async () => {
  const { listeners } = loadWorker({ fetchImpl: async () => { throw new TypeError("Failed to fetch"); } });
  const body = await (await navigate(listeners, `${ORIGIN}/ar`).responded).text();
  assert.match(body, /dir="rtl"/);
  assert.match(body, /إعادة المحاولة/);
});

test("a 5xx does not replace a page that worked", async () => {
  const { listeners } = loadWorker({
    fetchImpl: async () => new Response("boom", { status: 502, headers: { "content-type": "text/html" } }),
    cacheEntries: new Map([[PAGE, html("<html>saved</html>")]]),
  });
  const response = await navigate(listeners).responded;
  assert.equal(await response.text(), "<html>saved</html>");
});

test("a successful no-store page is served, never answered from the cache", async () => {
  const { listeners } = loadWorker({
    fetchImpl: async () => html("<html>private</html>", { "cache-control": "no-store" }),
    cacheEntries: new Map([[PAGE, html("<html>saved</html>")]]),
  });
  const response = await navigate(listeners).responded;
  assert.equal(await response.text(), "<html>private</html>");
});
