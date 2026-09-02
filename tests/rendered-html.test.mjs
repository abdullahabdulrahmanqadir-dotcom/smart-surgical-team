import assert from "node:assert/strict";
import test from "node:test";

async function fetchPath(path, headers = {}, init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { ...init, headers: { accept: "text/html", ...headers, ...(init.headers ?? {}) } }),
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

  // Kurdish is no longer offered; those clients fall back to English.
  const kurdish = await fetchPath("/", { "accept-language": "ku-IQ,ku;q=0.8" });
  assert.match(kurdish.headers.get("location") ?? "", /\/en$/);

  const unsupported = await fetchPath("/", { "accept-language": "fr-FR,fr;q=0.9" });
  assert.match(unsupported.headers.get("location") ?? "", /\/en$/);
});

test("retired Kurdish URLs redirect onto their English equivalent", async () => {
  // Without an explicit rule these fall through to locale negotiation, which
  // reads "ckb" as a path segment and produces /en/ckb/… — a 404 for every
  // bookmark and indexed link the locale left behind.
  for (const [from, to] of [
    ["/ckb", "/en"],
    ["/ckb/topics", "/en/topics"],
    ["/ckb/topics/thyroid-parathyroid", "/en/topics/thyroid-parathyroid"],
  ]) {
    const response = await fetchPath(from);
    assert.equal(response.status, 308, `${from} should redirect permanently`);
    assert.match(response.headers.get("location") ?? "", new RegExp(`${to}$`), `${from} -> ${to}`);
  }
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
  // Was /Introducing the clinic/ — that was the section's uppercase kicker,
  // removed along with the other 28 decorative ones. The section it guarded is
  // still here, so the assertion moves to its actual heading.
  assert.match(html, /Meet Smart Surgical Team/);
  assert.doesNotMatch(html, /Discover the people, expertise and care behind our clinic\./);
  assert.match(html, /youtube-nocookie\.com\/embed\/gUKXoL-zXdM\?playsinline=1&amp;rel=0&amp;enablejsapi=1/);
  assert.doesNotMatch(html, /gUKXoL-zXdM\?[^"']*start=/);
  assert.match(html, /href="\/en\/sign-up"/);
  assert.doesNotMatch(html, /class="cta-form"|homepage-join/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("public hubs expose unique localized SEO metadata and optimized imagery", async () => {
  const routes = ["", "/about", "/contact", "/topics", "/events", "/posters", "/research", "/privacy", "/terms"];

  for (const locale of ["en", "ar"]) {
    const titles = new Set();
    const descriptions = new Set();

    for (const route of routes) {
      const path = `/${locale}${route}`;
      const response = await fetchPath(path);
      assert.equal(response.status, 200, `${path} renders`);
      const html = await response.text();
      const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] ?? "";

      assert.ok(title, `${path} has a title`);
      assert.ok(description, `${path} has a description`);
      assert.ok(!titles.has(title), `${path} has a unique title`);
      assert.ok(!descriptions.has(description), `${path} has a unique description`);
      assert.match(html, new RegExp(`<link rel="canonical" href="[^"]+${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
      assert.match(html, new RegExp(`hrefLang="x-default" href="[^"]+/en${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));

      titles.add(title);
      descriptions.add(description);
    }
  }

  const home = await (await fetchPath("/en")).text();
  assert.match(home, /gtag\('consent','default'.*analytics_storage:'denied'/);
  assert.match(home, /og-team\.jpg/);
  assert.match(home, /hero-histology-(?:thyroid|trachea|artery|vessels)\.webp/);

  const events = await (await fetchPath("/en/events")).text();
  assert.match(events, /smart-health-tower-events-hero\.webp/);
});

test("renders the public staff directory with its local portraits", async () => {
  const response = await fetchPath("/en/about");
  assert.equal(response.status, 200);
  const html = await response.text();

  for (const [name, portrait] of [
    ["Prof. Abdulwahid M. Salih", "/staff/Prof. Abdulwahid M. Salih.avif"],
    ["Shko H. Hassan", "/staff/Shko H. Hassan.avif"],
    ["Mohammed L. Ahmad", "/staff/Mohammed L. Ahmad.avif"],
    ["Abdullah O. Hassan", "/staff/Abdullah O. Hassan.avif"],
  ]) {
    assert.ok(html.includes(name), `${name} should appear in the staff directory`);
    assert.ok(html.includes(portrait), `${name} should use their local portrait`);
  }

  // These people remain in TEAM_GROUPS for author matching, but were
  // deliberately removed from the public About roster.
  for (const name of ["Hardi M. Zahir", "Imad S. Sedeeq", "Kaihan A. Najar", "Ahmad L. Ali"]) {
    assert.ok(!html.includes(name), `${name} should remain hidden from the public directory`);
  }
});

test("account deletion requires an authenticated session", async () => {
  const response = await fetchPath("/api/profile", { "content-type": "application/json" }, { method: "DELETE" });
  assert.equal(response.status, 401);
});

test("mobile translation fallback rejects malformed requests before calling its provider", async () => {
  const response = await fetchPath(
    "/api/translate",
    { "content-type": "application/json", accept: "application/json" },
    { method: "POST", body: JSON.stringify({ texts: [] }) },
  );
  assert.equal(response.status, 400);
});

test("renders the bilingual clinical poster archive", async () => {
  for (const [locale, heading] of [["en", "Clinical posters"], ["ar", "ملصقات سريرية"]]) {
    const response = await fetchPath(`/${locale}/posters`);
    assert.equal(response.status, 200);
    const html = await response.text();
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
    assert.match(main, new RegExp(heading));
    assert.match(main, /emc-salivary-glands-cohort\.webp/);
    assert.match(main, /2020[–-]2025/);
    assert.match(html, new RegExp(`href="/${locale}/posters"`));
    assert.doesNotMatch(main, /class="posters-hero"/);
    assert.match(main, new RegExp(`href="/${locale}/posters/epithelial-myoepithelial-carcinoma-salivary-glands"`));
    assert.match(main, new RegExp(`href="/${locale}/posters/example-thyroid-outcomes-poster"`));
    assert.match(main, /class="poster-card"/);
    assert.doesNotMatch(main, /Open each poster at full resolution/);
    assert.doesNotMatch(main, /POSTER COLLECTION/);
  }
});

test("opens a poster detail page with its image and written sections", async () => {
  const response = await fetchPath("/en/posters/epithelial-myoepithelial-carcinoma-salivary-glands");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Rare Insights: Epithelial-Myoepithelial Carcinoma/);
  assert.match(html, /Study overview/);
  assert.match(html, /Key findings/);
  assert.match(html, /emc-salivary-glands-cohort\.webp/);
  assert.match(html, /Back to all posters/);
  assert.match(html, /poster-image-viewer/);
  assert.doesNotMatch(html, /class="btn btn-outline poster-original"/);
  assert.doesNotMatch(html, /target="_blank"[^>]*aria-label="Open full-resolution poster"/);
});

test("serves both RTL locales with the correct direction and language", async () => {
  const arabic = await fetchPath("/ar");
  assert.equal(arabic.status, 200);
  assert.match(await arabic.text(), /<html[^>]+lang="ar"[^>]*dir="rtl"/i);
});

test("renders exactly one shared footer, locale-correct and free of dropped copy", async () => {
  for (const locale of ["en", "ar"]) {
    const html = await (await fetchPath(`/${locale}`)).text();

    // The footer was extracted out of the home page into SiteFooter. A second
    // one reappearing means the inline copy came back.
    const footers = html.match(/class="site-footer"/g) ?? [];
    assert.equal(footers.length, 1, `${locale} should render one footer`);

    // The brief rules out a join-focused CTA.
    assert.doesNotMatch(html, /Join free/i, `${locale} must not offer "Join free"`);

    // The pre-i18n design hardcoded a Kurdish column onto every page; the
    // locale switcher replaced it, and Kurdish is no longer a locale at all.
    assert.doesNotMatch(html, /footer-kr/, `${locale} must not carry the old Kurdish column`);

    // Links must stay inside the active locale.
    assert.match(html, new RegExp(`href="/${locale}/topics"`), `${locale} links to its own topics`);
  }
});

test("every locale offers a switcher linking to both languages", async () => {
  for (const locale of ["en", "ar"]) {
    const html = await (await fetchPath(`/${locale}`)).text();
    for (const target of ["/en", "/ar"]) {
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
  // Preserve the approved thyroid and parotid artwork; lower cards use the
  // shared lymph and skin glyphs rather than their older standalone assets.
  assert.match(html, /\/topic-icons\/thyroid-sst-cropped\.webp/);
  assert.match(html, /\/topic-icons\/parotid-sst-cropped\.webp/);
  assert.doesNotMatch(html, /\/topic-icons\/(?:lymph-nodes-tabler|skin-tabler)\.svg/);
  assert.match(html, /M4 8\.1h16M4 10\.8h16/);
});

test("bare topic index opens on the whole head and neck, with no topic chosen", async () => {
  for (const locale of ["en", "ar"]) {
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
    assert.match(html, /\/topic-icons\/thyroid-sst-cropped\.webp/);
    assert.match(html, /\/topic-icons\/parotid-sst-cropped\.webp/);

    // The map waits for a click: no region is focused, so the case library and
    // its filters stay closed and the reader is prompted to choose a region.
    assert.doesNotMatch(html, /class="content-map[^"]*is-focused/, `${locale} starts on the overview`);
    assert.match(html, /class="content-prompt"/, `${locale} prompts for a region`);
    // Against the visible markup, not the whole document: React serialises the
    // entire dictionary into the RSC payload, so every UI string in the site
    // appears inside a <script> on every page whether it is rendered or not.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, "");
    assert.doesNotMatch(visible, /Case library/);
    assert.doesNotMatch(html, /class="content-search"/);
    assert.doesNotMatch(html, /class="content-case-grid"/);
    assert.doesNotMatch(html, /class="content-topic-option is-active/, `${locale} preselects no topic`);

    // Every region stays reachable without client JS having run, each labelled
    // and with a leader running out to one side or the other.
    assert.equal(
      (html.match(/class="content-map-callout content-map-callout--(?:left|right)"/g) ?? []).length,
      4,
      `${locale} renders a labelled callout per region`,
    );
    const labels = locale === "ar"
      ? [
          "الغدة الدرقية وجارات الدرقية",
          "الغدد اللعابية",
          "جراحة العنق والجهاز اللمفاوي",
          "الجلد والأنسجة الرخوة",
        ]
      : ["Thyroid &amp; Parathyroid", "Salivary Glands", "Neck &amp; Lymphatic Surgery", "Skin &amp; Soft Tissue"];
    for (const label of labels) {
      assert.ok(
        html.includes(`<span class="content-map-tag" aria-hidden="true">${label}</span>`),
        `${locale} labels ${label}`,
      );
    }
    assert.doesNotMatch(html, /\b\d+ lessons\b/i);
    assert.doesNotMatch(html, />Parathyroid · Thyroid<|>Oral Cavity · Larynx</);
  }
});

test("every topic detail route streams its searchable admin-managed content library", async () => {
  // [slug, English heading, Arabic heading, a current database-aligned subtopic]
  const routes = [
    ["thyroid-parathyroid", "Thyroid &amp; Parathyroid", "الغدة الدرقية وجارات الدرقية", "Papillary Thyroid Carcinoma"],
    ["salivary-glands", "Salivary Glands", "الغدد اللعابية", "Pleomorphic Adenoma"],
    ["neck-lymphatic", "Neck &amp; Lymphatic Surgery", "جراحة العنق والجهاز اللمفاوي", "Congenital Neck Cysts"],
    ["skin-soft-tissue", "Skin &amp; Soft Tissue", "الجلد والأنسجة الرخوة", "Squamous Cell Carcinoma"],
  ];

  for (const locale of ["en", "ar"]) {
    for (const [slug, englishHeading, arabicHeading, condition] of routes) {
      const response = await fetchPath(`/${locale}/topics/${slug}`);
      assert.equal(response.status, 200, `${locale}/${slug} should resolve`);
      const html = await response.text();
      const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;

      assert.match(html, new RegExp(locale === "ar" ? arabicHeading : englishHeading));
      assert.equal((main.match(/content-case-card is-skeleton/g) ?? []).length, 3, `${locale}/${slug} renders its loading shape while the library streams`);
      assert.match(html, /class="content-filter-control content-search"/, `${locale}/${slug} streams content search`);
      assert.equal((html.match(/class="content-filter-control content-select"/g) ?? []).length, 3, `${locale}/${slug} streams three filters`);
      assert.match(html, new RegExp(condition), `${locale}/${slug} lists ${condition}`);
      assert.match(
        html,
        locale === "ar" ? /لا يوجد محتوى يطابق هذا البحث\./ : /No content matches this search\./,
        `${locale}/${slug} streams a locale-correct empty state when no database binding is supplied`,
      );
      assert.doesNotMatch(html, /class="content-case-card"/, `${locale}/${slug} does not invent case records`);
      assert.match(html, new RegExp(`href="/${locale}/topics"`));
    }
  }
});

test("topic routes do not render placeholder case records", async () => {
  const html = await (await fetchPath("/en/topics/thyroid-parathyroid")).text();
  assert.doesNotMatch(html, /Recurrent Papillary Thyroid Carcinoma/);
  assert.doesNotMatch(html, /Example cases from the team/);
});

test("thyroid detail keeps the approved topic and case artwork", async () => {
  const html = await (await fetchPath("/en/topics/thyroid-parathyroid")).text();
  assert.match(html, /\/topic-icons\/thyroid-sst-cropped\.webp/);
  assert.match(html, /\/topic-icons\/parathyroid-sst-cropped\.webp/);
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

test("events hub and its two initial records are available in every locale", async () => {
  for (const locale of ["en", "ar"]) {
    const hub = await fetchPath(`/${locale}/events`);
    assert.equal(hub.status, 200);
    const html = await hub.text();
    assert.match(html, locale === "ar" ? /القمة الثانية للغدة الدرقية في الشرق الأوسط/ : /Second Middle East Thyroid Summit/);
    assert.match(html, locale === "ar" ? /القمة الأولى للغدة الدرقية في الشرق الأوسط/ : /First Middle East Thyroid Summit/);
    // The built-in fallback records and their UI chrome follow the active locale.
    assert.match(html, locale === "ar" ? /فعالية سابقة/ : /Past event/);
    assert.match(html, new RegExp(`href="/${locale}/events/second-middle-east-thyroid-summit"`));

    const detail = await fetchPath(`/${locale}/events/second-middle-east-thyroid-summit`);
    assert.equal(detail.status, 200);
    const detailHtml = await detail.text();
    assert.match(detailHtml, locale === "ar" ? /التسجيل عبر موقع القمة/ : /Register on MET site/);
    assert.match(detailHtml, locale === "ar" ? /جلسات علمية بقيادة الخبراء/ : /Expert-led scientific panels/);
    assert.match(detailHtml, locale === "ar" ? /محاكاة اجتماعات فريق الأورام/ : /Tumour board simulations/);
    assert.match(detailHtml, /mets\.smarthealth\.group\/register/);
    assert.doesNotMatch(detailHtml, /\$100|\$75|\$30/);
  }
});

test("unknown event slugs return not found", async () => {
  const response = await fetchPath("/en/events/not-an-event");
  assert.equal(response.status, 404);
});

// ---------------------------------------------------------------------------
// News
//
// News is database-backed and has no fallback content. This suite runs without
// Supabase credentials, so `canUseDatabase()` is false and every read returns
// an empty list — which is exactly the contract worth pinning here: the routes,
// the shell, the empty state and the SEO surface must all hold up with nothing
// published, and **nothing may be invented to fill the gap**.
//
// The labelled placeholder set that these tests were originally written
// against was removed on 2026-08-29 (spec §15, §19). The rules it used to
// demonstrate through fixtures — the item-shape rule, the per-field Arabic
// fallback, section resolution, date handling — are now tested directly
// against `app/lib/news-data.ts` in `tests/news-rules.test.mjs`, which is
// stronger: they are asserted on the functions themselves rather than inferred
// from rendered markup.
// ---------------------------------------------------------------------------

test("the news feed renders in both locales with nothing published", async () => {
  for (const locale of ["en", "ar"]) {
    const response = await fetchPath(`/${locale}/news`);
    assert.equal(response.status, 200, `${locale} feed should render`);
    const html = await response.text();

    // The page shell is present regardless of content.
    assert.match(html, /class="news-feed"/);
    assert.match(html, /id="news-feed-heading"/);
    // With no items there is no lead story, no grid and no chip row: a chip
    // that can only ever produce an empty feed is worse than no chip.
    assert.doesNotMatch(html, /class="news-lead(?: |")/);
    assert.doesNotMatch(html, /class="news-grid"/);
    assert.doesNotMatch(html, /class="news-chips"/);
    // The empty state is explicit and in the reader's language.
    assert.match(html, /class="news-empty"/);
    assert.match(html, locale === "ar" ? /لا توجد أخبار بعد/ : /No news yet/);
    // The header still offers News as its own destination.
    assert.match(html, new RegExp(`href="/${locale}/news"`));
  }
});

test("an empty news feed invents nothing to fill itself", async () => {
  // The guard that matters after removing the placeholder set: no example
  // headline, no placeholder disclaimer and no example slug may survive
  // anywhere in the bundle's output. A silent reintroduction of stand-in
  // content on a clinical site is the failure this test exists to catch.
  for (const locale of ["en", "ar"]) {
    const html = await (await fetchPath(`/${locale}/news`)).text();
    assert.doesNotMatch(html, /Example:/, `${locale} feed must carry no example headline`);
    assert.doesNotMatch(html, /This is a placeholder/, `${locale} feed must carry no placeholder note`);
    assert.doesNotMatch(html, /example-(summit|press|publication|arabic|body)/, `${locale} feed must link no example slug`);
  }
  // The homepage banner is driven by the pinned item, so it must be absent too
  // rather than falling back to a stand-in announcement.
  const home = await (await fetchPath("/en")).text();
  assert.doesNotMatch(home, /data-news-banner/);
});

test("the news feed keeps its own localized SEO metadata", async () => {
  // Metadata is code, not content, so it must survive an empty database.
  const english = await (await fetchPath("/en/news")).text();
  assert.match(english, /<title>[^<]*News[^<]*<\/title>/i);
  const arabic = await (await fetchPath("/ar/news")).text();
  assert.match(arabic, /<html[^>]+lang="ar"[^>]*dir="rtl"/i);
  assert.match(arabic, /<title>[^<]*الأخبار[^<]*<\/title>/);
});

test("news item routes 404 rather than rendering an empty shell", async () => {
  // Both an invented slug and a slug that used to belong to the placeholder
  // set: with nothing published, every item URL must be a genuine 404.
  for (const slug of ["not-a-news-item", "example-summit-recap"]) {
    const response = await fetchPath(`/en/news/${slug}`);
    assert.equal(response.status, 404, `/en/news/${slug} should not resolve`);
  }
});

test("the sitemap advertises the news feed but no unpublished item", async () => {
  const sitemap = await (await fetchPath("/sitemap.xml", { accept: "application/xml" })).text();
  // The feed itself is code-defined, so it is listed in both locales.
  assert.match(sitemap, /\/en\/news<\/loc>/);
  assert.match(sitemap, /\/ar\/news<\/loc>/);
  // Item URLs come from the database. With nothing published, none may appear.
  assert.doesNotMatch(sitemap, /\/news\/[a-z0-9-]+<\/loc>/);
});

test("an unmatched path renders a real 404 rather than a bare body", async () => {
  // The runtime answers a path that matches no route with nine bytes of plain
  // text and no layout, because the request never reaches the app tree. A
  // catch-all under [locale] puts it back inside the tree so the not-found
  // boundary can render, and must not cost the page its 404 status.
  for (const [path, marker] of [
    ["/en/no-such-page", "This page does not exist"],
    ["/ar/no-such-page", "هذه الصفحة غير موجودة"],
  ]) {
    const response = await fetchPath(path);
    assert.equal(response.status, 404, `${path} must still be a 404`);
    const html = await response.text();
    assert.match(html, /class="not-found-inner"/, `${path} renders the not-found page`);
    assert.ok(html.includes(marker), `${path} renders it in its own language`);
    assert.match(html, /class="site-footer/, `${path} keeps the site chrome`);
    assert.match(html, /name="robots" content="noindex/, `${path} stays out of the index`);
  }
});

test("the catch-all does not shadow a real route", async () => {
  // A concrete segment must beat the catch-all, or every page becomes a 404.
  for (const path of [
    "/en", "/en/about", "/en/contact", "/en/topics", "/en/topics/thyroid-parathyroid",
    "/en/research", "/en/posters", "/en/news", "/en/events", "/en/library",
    "/en/privacy", "/en/terms", "/en/sign-in", "/en/sign-up", "/ar", "/ar/topics",
  ]) {
    assert.equal((await fetchPath(path)).status, 200, `${path} should still resolve`);
  }
});

test("the library index lists the catalogue instead of 404ing", async () => {
  // /library/<slug> pages are in the sitemap; the parent path used to be a
  // dead end, so a trimmed URL led nowhere.
  for (const [locale, heading] of [["en", "Case library"], ["ar", "مكتبة الحالات"]]) {
    const response = await fetchPath(`/${locale}/library`);
    assert.equal(response.status, 200);
    const visible = (await response.text()).replace(/<script[\s\S]*?<\/script>/g, "");
    assert.ok(visible.includes(heading), `${locale} library index renders its heading`);
  }
});

test("a two-day event prints one month name, in the right place per locale", async () => {
  // The range was stitched from two formatted dates, so the month landed on
  // the end date only: "27–August 28, 2026".
  const english = await (await fetchPath("/en/events")).text();
  assert.doesNotMatch(english, /\d+–[A-Z][a-z]+ \d+, \d{4}/, "no day–Month day, year ranges");
  assert.match(english, /August 27\s*–\s*28, 2026/);

  const arabic = await (await fetchPath("/ar/events")).text();
  assert.match(arabic, /27–28 أغسطس 2026/);
});

test("events stand down to an archive when nothing is upcoming", async () => {
  // Both seeded summits are in the past, so the page must not promise a
  // calendar, must not badge a past event as featured, and must not print the
  // same summit twice.
  const visible = (await (await fetchPath("/en/events")).text()).replace(/<script[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(visible, /class="featured-event"/, "no featured slot without an upcoming event");
  assert.ok(visible.includes("Conferences and workshops"), "the hero reads as an archive");
  assert.doesNotMatch(visible, /New events,/, "the forward-looking hero is gone");
  assert.equal(
    (visible.match(/Second Middle East Thyroid Summit/g) ?? []).length,
    1,
    "the summit appears once, not as featured and again in the list",
  );
});

test("event type and format are translated everywhere they appear", async () => {
  // `typeLabel` lived inside the explorer, so the featured card and the detail
  // page printed the stored English key straight onto the Arabic site.
  const visible = (await (await fetchPath("/ar/events")).text()).replace(/<script[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(visible, />Summit</, "no untranslated event type");
  assert.doesNotMatch(visible, />in person</, "no untranslated event format");

  const detail = (await (await fetchPath("/ar/events/second-middle-east-thyroid-summit")).text())
    .replace(/<script[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(detail, />Summit</, "the detail page translates its type too");
});

test("no national flag stands in for a language", async () => {
  const html = await (await fetchPath("/en")).text();
  assert.doesNotMatch(html, /language-flag|flag-us|flag-iraq/);
  assert.match(html, /language-trigger-text/);
});

test("the Arabic site spells Smart Health Tower one way", async () => {
  // Three spellings were in use, including a half-translated "برج الصحة Smart".
  const html = await (await fetchPath("/ar")).text();
  assert.doesNotMatch(html, /برج الصحة|برج سمارت/);
  assert.match(html, /Smart Health Tower/);
});
