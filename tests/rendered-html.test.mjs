import assert from "node:assert/strict";
import test from "node:test";

async function fetchPath(path, headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", ...headers } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("redirects the bare root to a locale-prefixed path", async () => {
  const response = await fetchPath("/");
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/en$/);
});

test("negotiates locale from Accept-Language, falling back to English", async () => {
  const arabic = await fetchPath("/", { "accept-language": "ar-IQ,ar;q=0.9" });
  assert.match(arabic.headers.get("location") ?? "", /\/ar$/);

  // Sorani is requested as ckb but arrives as ku/ku-IQ from some clients.
  const kurdish = await fetchPath("/", { "accept-language": "ku-IQ,ku;q=0.8" });
  assert.match(kurdish.headers.get("location") ?? "", /\/ckb$/);

  const unsupported = await fetchPath("/", { "accept-language": "fr-FR,fr;q=0.9" });
  assert.match(unsupported.headers.get("location") ?? "", /\/en$/);
});

test("server-renders the English home page", async () => {
  const response = await fetchPath("/en");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"[^>]*dir="ltr"/i);
  assert.match(html, /Head &amp; Neck/);
  assert.match(html, /Explore the Library/);
  assert.match(html, /Browse by Topic/);
  assert.match(html, /Featured Surgery/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("serves both RTL locales with the correct direction and language", async () => {
  const arabic = await fetchPath("/ar");
  assert.equal(arabic.status, 200);
  assert.match(await arabic.text(), /<html[^>]+lang="ar"[^>]*dir="rtl"/i);

  const kurdish = await fetchPath("/ckb");
  assert.equal(kurdish.status, 200);
  assert.match(await kurdish.text(), /<html[^>]+lang="ckb-Arab"[^>]*dir="rtl"/i);
});

test("every locale offers a switcher linking to all three languages", async () => {
  for (const locale of ["en", "ar", "ckb"]) {
    const html = await (await fetchPath(`/${locale}`)).text();
    for (const target of ["/en", "/ar", "/ckb"]) {
      assert.match(html, new RegExp(`href="${target}"`), `${locale} should link to ${target}`);
    }
  }
});
