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
  assert.match(html, /Latest Post/);
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

test("renders exactly one shared footer, locale-correct and free of dropped copy", async () => {
  for (const locale of ["en", "ar", "ckb"]) {
    const html = await (await fetchPath(`/${locale}`)).text();

    // The footer was extracted out of the home page into SiteFooter. A second
    // one reappearing means the inline copy came back.
    const footers = html.match(/class="site-footer"/g) ?? [];
    assert.equal(footers.length, 1, `${locale} should render one footer`);

    // The brief rules out a join-focused CTA.
    assert.doesNotMatch(html, /Join free/i, `${locale} must not offer "Join free"`);

    // The pre-i18n design hardcoded a Sorani column onto every page; the
    // locale switcher replaces it.
    assert.doesNotMatch(html, /footer-kr/, `${locale} must not carry the old Kurdish column`);

    // Links must stay inside the active locale.
    assert.match(html, new RegExp(`href="/${locale}/topics"`), `${locale} links to its own topics`);
  }
});

test("every locale offers a switcher linking to all three languages", async () => {
  for (const locale of ["en", "ar", "ckb"]) {
    const html = await (await fetchPath(`/${locale}`)).text();
    for (const target of ["/en", "/ar", "/ckb"]) {
      assert.match(html, new RegExp(`href="${target}"`), `${locale} should link to ${target}`);
    }
  }
});

test("home page topic cards use the shared taxonomy and link to real routes", async () => {
  const html = await (await fetchPath("/en")).text();

  for (const slug of [
    "thyroid-parathyroid",
    "salivary-glands",
    "neck-lymphatic",
    "skin-soft-tissue",
  ]) {
    assert.match(html, new RegExp(`href="/en/topics/${slug}"`));
  }

  assert.doesNotMatch(html, /\b(?:9|12|16|18) lessons\b/i);
  assert.match(html, /href="\/en\/topics"/);
});

test("bare topic index renders the content browser with the default case library", async () => {
  for (const locale of ["en", "ar", "ckb"]) {
    const response = await fetchPath(`/${locale}/topics`);
    assert.equal(response.status, 200);
    const html = await response.text();

    // Four published groups, each a crawlable deep-link into its own library.
    assert.equal(
      (html.match(/class="content-topic-option(?:[ "])/g) ?? []).length,
      4,
      `${locale} should render the four topic selectors`,
    );
    assert.match(html, new RegExp(`href="/${locale}/topics/thyroid-parathyroid"`));
    assert.match(html, new RegExp(`href="/${locale}/topics/neck-lymphatic"`));

    assert.doesNotMatch(html, /Upper Aerodigestive Tract/);
    assert.match(html, /\/topic-icons\/thyroid-sst-cropped\.png/);
    assert.match(html, /\/topic-icons\/parotid-sst-cropped\.png/);
    // The refreshed browser opens the first public topic immediately and
    // exposes the searchable, filterable case library without client JS.
    assert.match(html, /Case library/);
    assert.match(html, /class="content-search"/);
    assert.equal((html.match(/class="content-select"/g) ?? []).length, 3, `${locale} renders three filters`);
    assert.match(html, /class="content-case-grid"/);
    assert.match(html, /class="content-case-card"/);
    assert.doesNotMatch(html, /\b\d+ lessons\b/i);
    assert.doesNotMatch(html, />Parathyroid · Thyroid<|>Oral Cavity · Larynx</);
  }
});

test("every topic detail route renders a searchable case library", async () => {
  // [slug, heading, a condition it lists, a case title fragment]
  const routes = [
    ["thyroid-parathyroid", "Thyroid &amp; Parathyroid", "Papillary Carcinoma", "Recurrent Papillary Thyroid Carcinoma"],
    ["salivary-glands", "Salivary Glands", "Submandibular", "Recurrent Multifocal Pleomorphic Adenoma"],
    ["neck-lymphatic", "Neck &amp; Lymphatic Surgery", "Neck Masses", "Lymphangioma"],
    ["skin-soft-tissue", "Skin &amp; Soft Tissue", "Skin Lesions", "Right Lower Eyelid Basal Cell Carcinoma"],
  ];

  for (const locale of ["en", "ar", "ckb"]) {
    for (const [slug, heading, condition, caseTitle] of routes) {
      const response = await fetchPath(`/${locale}/topics/${slug}`);
      assert.equal(response.status, 200, `${locale}/${slug} should resolve`);
      const html = await response.text();

      assert.match(html, new RegExp(heading));
      // Conditions are now filter options, with case cards shown in the active
      // topic's library rather than a condition-tab rail.
      assert.match(html, /class="content-search"/, `${locale}/${slug} renders case search`);
      assert.equal((html.match(/class="content-select"/g) ?? []).length, 3, `${locale}/${slug} renders three filters`);
      assert.match(html, new RegExp(condition), `${locale}/${slug} lists ${condition}`);
      assert.match(html, /class="content-case-grid"/, `${locale}/${slug} shows the case grid`);
      assert.match(html, /class="content-case-card"/, `${locale}/${slug} shows case cards`);
      assert.match(html, new RegExp(caseTitle), `${locale}/${slug} shows its example case`);
      assert.match(html, new RegExp(`href="/${locale}/topics"`));
    }
  }
});

test("the thyroid route surfaces a real example case under papillary carcinoma", async () => {
  const html = await (await fetchPath("/en/topics/thyroid-parathyroid")).text();
  assert.match(html, /Recurrent Papillary Thyroid Carcinoma/);
  // Example cases must be labelled as placeholder previews, not real library content.
  assert.match(html, /Example cases from the team/);
});

test("thyroid detail uses the supplied, centred transparent anatomical artwork", async () => {
  const html = await (await fetchPath("/en/topics/thyroid-parathyroid")).text();
  assert.match(html, /\/topic-icons\/thyroid-sst-cropped\.png/);
  assert.match(html, /\/topic-icons\/parathyroid-sst-cropped\.png/);
  assert.doesNotMatch(html, /_next\/image|_vinext\/image/);
});

test("unknown topic slugs return not found", async () => {
  const response = await fetchPath("/en/topics/not-a-topic");
  assert.equal(response.status, 404);
});

test("unpublished topic groups are not reachable on the public site", async () => {
  const response = await fetchPath("/en/topics/upper-aerodigestive");
  assert.equal(response.status, 404);
});
