import assert from "node:assert/strict";
import test from "node:test";

/**
 * The news rules, tested against the functions themselves.
 *
 * `app/lib/news-data.ts` is deliberately free of server imports so client
 * components can use it — which also means Node can import it directly and
 * strip the types, with no build step and no Worker bundle in the way.
 *
 * These rules used to be covered indirectly, by rendering a labelled
 * placeholder set built to exhibit each one and asserting on the resulting
 * markup. That set was removed once real news was published (spec §15, §19).
 * Asserting on the rules directly is the stronger arrangement: a fixture can
 * only demonstrate the cases someone remembered to build, and it could not
 * reach the malformed input a hand-edited `jsonb` column produces at all.
 */
const {
  categoryLabel,
  isNewsRelationType,
  localizedSections,
  localizedText,
  newsCoverImage,
  newsDate,
  newsGalleryImages,
  newsItemShape,
  newsYear,
  resolveNewsSections,
  NEWS_RELATION_TYPES,
} = await import("../app/lib/news-data.ts");

const section = (label, body, key = "s") => ({ key, label, body });

// ---------------------------------------------------------------------------
// The item-shape rule (spec §2)
// ---------------------------------------------------------------------------

test("an item's shape is derived from what the editor filled in", () => {
  const empty = { sections: [], sectionsAr: [], linkUrl: "" };
  const body = { sections: [section("Heading", "<p>Text</p>")], sectionsAr: [], linkUrl: "" };
  const link = { sections: [], sectionsAr: [], linkUrl: "https://example.org/story" };
  const both = { sections: [section("Heading", "<p>Text</p>")], sectionsAr: [], linkUrl: "https://example.org/story" };

  assert.equal(newsItemShape(body), "article", "a body earns a detail page");
  assert.equal(newsItemShape(link), "link", "a link with no body leaves the site");
  assert.equal(newsItemShape(both), "article", "a body wins: the link becomes an action on the page");
  assert.equal(newsItemShape(empty), "article", "neither is still an article — a thin page beats a card leading nowhere");
});

test("Arabic-only writing still earns a detail page", () => {
  // An item written only in Arabic has no English sections. Reading the shape
  // from `sections` alone would send an Arabic article out to a dead link, or
  // to nothing at all.
  const arabicOnly = { sections: [], sectionsAr: [section("عنوان", "<p>نص</p>")], linkUrl: "" };
  assert.equal(newsItemShape(arabicOnly), "article");

  const arabicPlusLink = { sections: [], sectionsAr: [section("عنوان", "<p>نص</p>")], linkUrl: "https://example.org/x" };
  assert.equal(newsItemShape(arabicPlusLink), "article", "the Arabic body still wins over the link");
});

// ---------------------------------------------------------------------------
// Section resolution
// ---------------------------------------------------------------------------

test("a section reaches the page only with both a heading and a body", () => {
  const resolved = resolveNewsSections([
    { key: "a", label: "Kept", body: "<p>Body</p>" },
    { key: "b", label: "No body", body: "   " },
    { key: "c", label: "", body: "<p>Unheaded prose</p>" },
  ]);
  assert.deepEqual(resolved.map((s) => s.label), ["Kept"]);
});

test("malformed section data is dropped rather than rendered", () => {
  // A hand-edited jsonb column, or a row written before this shape existed.
  // Anything that survives here would print as "undefined" on a clinical page.
  for (const bad of [null, undefined, "a string", 42, { not: "an array" }]) {
    assert.deepEqual(resolveNewsSections(bad), [], `${JSON.stringify(bad) ?? "undefined"} should resolve to no sections`);
  }
  assert.deepEqual(resolveNewsSections([null, "x", 7, [], { label: "O", body: "<p>K</p>" }]).map((s) => s.label), ["O"]);
});

test("a section with no key of its own is still addressable", () => {
  // The key becomes a React key and an anchor; a blank one would collide.
  const resolved = resolveNewsSections([
    { label: "First", body: "<p>1</p>" },
    { key: "   ", label: "Second", body: "<p>2</p>" },
  ]);
  assert.equal(resolved.length, 2);
  assert.notEqual(resolved[0].key, resolved[1].key, "generated keys must be distinct");
  assert.ok(resolved.every((s) => s.key.trim()), "no section may carry a blank key");
});

test("section text is trimmed, so whitespace is not mistaken for content", () => {
  const [only] = resolveNewsSections([{ key: "k", label: "  Spaced  ", body: "  <p>Body</p>  " }]);
  assert.equal(only.label, "Spaced");
  assert.equal(only.body, "<p>Body</p>");
});

// ---------------------------------------------------------------------------
// The Arabic fallback (spec §5) — per field, never per item
// ---------------------------------------------------------------------------

test("Arabic is used when written and English stands in when it is not", () => {
  assert.deepEqual(localizedText("ar", "English", "عربي"), { value: "عربي", translated: true });
  assert.deepEqual(localizedText("ar", "English", ""), { value: "English", translated: false });
  // Whitespace is not a translation.
  assert.deepEqual(localizedText("ar", "English", "   "), { value: "English", translated: false });
  // The English page never reaches for the Arabic field, even when it exists.
  assert.deepEqual(localizedText("en", "English", "عربي"), { value: "English", translated: false });
});

test("the fallback is per field: an Arabic headline does not imply an Arabic body", () => {
  // This is the case the design is explicit about — an item translated only
  // half way must show the Arabic it has and offer the rest to the translator.
  const title = localizedText("ar", "English headline", "عنوان عربي");
  const body = localizedSections("ar", { sections: [section("Heading", "<p>Text</p>")], sectionsAr: [] });

  assert.equal(title.translated, true, "the headline is real Arabic");
  assert.equal(body.translated, false, "the body is not, so it is offered for translation");
  assert.deepEqual(body.sections.map((s) => s.label), ["Heading"], "and it falls back to the English sections");
});

test("Arabic sections are used whole or not at all", () => {
  const arabic = localizedSections("ar", {
    sections: [section("English", "<p>en</p>")],
    sectionsAr: [section("عربي", "<p>ar</p>")],
  });
  assert.equal(arabic.translated, true);
  assert.deepEqual(arabic.sections.map((s) => s.label), ["عربي"]);

  const english = localizedSections("en", {
    sections: [section("English", "<p>en</p>")],
    sectionsAr: [section("عربي", "<p>ar</p>")],
  });
  assert.equal(english.translated, false);
  assert.deepEqual(english.sections.map((s) => s.label), ["English"]);
});

test("a category falls back to its English name, and no category is blank", () => {
  const translated = { id: "1", name: "Event recaps", nameAr: "ملخصات الفعاليات", slug: "event-recaps" };
  const untranslated = { id: "2", name: "Milestones", nameAr: "", slug: "milestones" };

  assert.equal(categoryLabel("ar", translated), "ملخصات الفعاليات");
  assert.equal(categoryLabel("ar", untranslated), "Milestones");
  assert.equal(categoryLabel("en", translated), "Event recaps");
  // An unfiled item has no category at all; the caller substitutes its own
  // label, so this must be empty rather than the string "null".
  assert.equal(categoryLabel("en", null), "");
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

test("a publication date never prints a day early", () => {
  // `new Date("2026-08-26")` is UTC midnight, which is the 25th for every
  // reader west of Greenwich. The formatter parses at midday to avoid it.
  const formatted = newsDate("2026-08-26", "en");
  assert.match(formatted, /26/, `expected the 26th, got "${formatted}"`);
  assert.doesNotMatch(formatted, /25/);
});

test("an undated item formats to nothing rather than to Invalid Date", () => {
  for (const value of ["", "not-a-date"]) {
    const formatted = newsDate(value, "en");
    assert.doesNotMatch(formatted, /Invalid/i, `"${value}" must not print "Invalid Date"`);
  }
});

test("the year is read only from a real date", () => {
  assert.equal(newsYear("2026-08-26"), "2026");
  assert.equal(newsYear(""), "");
  assert.equal(newsYear("soon"), "");
});

// ---------------------------------------------------------------------------
// The cover, and what is left for the gallery (spec §14 deviation 4)
// ---------------------------------------------------------------------------

const image = (name) => ({ publicUrl: `/api/media/${name}.webp`, altText: `${name} alt`, caption: `${name} caption`, kind: "image" });
const pdf = (name) => ({ publicUrl: `/api/media/${name}.pdf`, altText: "", caption: "", kind: "document" });

test("the cover resolves to the item's own photograph, alt text and all", () => {
  const one = image("one");
  const two = image("two");
  const item = { coverUrl: two.publicUrl, media: [one, two] };

  // The point of choosing the cover from the uploads rather than uploading it
  // again: the hero can use that image's own alt text and caption instead of
  // guessing at the first image in the list.
  assert.equal(newsCoverImage(item), two);
  assert.equal(newsCoverImage(item).altText, "two alt");
});

test("an item with no cover has none to resolve", () => {
  assert.equal(newsCoverImage({ coverUrl: "", media: [image("one")] }), null);
});

test("a cover pointing at an image that is gone falls back rather than breaking", () => {
  // Nothing in the editor produces this, but a hand-edited row can: the page
  // must draw its generated cover, not a broken <img>.
  const item = { coverUrl: "/api/media/deleted.webp", media: [image("one")] };
  assert.equal(newsCoverImage(item), null);
  assert.deepEqual(newsGalleryImages(item).map((entry) => entry.publicUrl), ["/api/media/one.webp"]);
});

test("the gallery strip drops the cover, so no photograph is shown twice", () => {
  const [one, two, three] = [image("one"), image("two"), image("three")];
  const item = { coverUrl: two.publicUrl, media: [one, two, three] };
  assert.deepEqual(newsGalleryImages(item), [one, three]);
});

test("an item whose only photograph is the cover has no strip at all", () => {
  const only = image("only");
  assert.deepEqual(newsGalleryImages({ coverUrl: only.publicUrl, media: [only] }), []);
});

test("a PDF is not a photograph and never reaches the strip or the cover", () => {
  // The media manager takes images and PDFs alike; the strip renders <img>, so
  // a document among them would render as a broken image.
  const one = image("one");
  const item = { coverUrl: "", media: [pdf("handout"), one] };
  assert.deepEqual(newsGalleryImages(item), [one]);
  assert.equal(newsCoverImage({ coverUrl: "/api/media/handout.pdf", media: item.media }), null);
});

// ---------------------------------------------------------------------------
// Related records
// ---------------------------------------------------------------------------

test("only the three known relation kinds are accepted", () => {
  for (const kind of NEWS_RELATION_TYPES) assert.equal(isNewsRelationType(kind), true, `${kind} is a real kind`);
  assert.deepEqual([...NEWS_RELATION_TYPES].sort(), ["content", "event", "research"]);
  // A stale or hand-written value must not reach the resolver, which would
  // otherwise render a related card pointing nowhere.
  for (const bad of ["poster", "", null, undefined, 3, {}]) {
    assert.equal(isNewsRelationType(bad), false, `${JSON.stringify(bad) ?? "undefined"} is not a relation kind`);
  }
});
