// Generates the seed `insert` SQL for public.researches from the live
// smarthealth.group feed, applying the same filter the site used before research
// moved into the database (active + Dr. Abdulwahid + not in the excluded set).
//
// Usage: node scripts/generate-research-seed.mjs > research-seed.sql
//
// The database becomes the source of truth after this one-time import, so this
// script exists only for reproducibility of migration 0009's seed block.

const EXCLUDED = new Set(["giant malignant phyllodes tumor with ulceration: a case report and brief review of the literature"]);
const decode = (s) => s
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const plain = (h = "") => decode(h.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const journalFromLink = (link) =>
  /pagepressjournals\.org\/jbr/i.test(link) ? "Journal of Biological Research"
  : /academic\.oup\.com\/rescon/i.test(link) ? "Research Connections"
  : /academic\.oup\.com\/jscr/i.test(link) ? "Journal of Surgical Case Reports"
  : /sciencedirect\.com\/science\/article\/pii\/S2949916X/i.test(link) ? "Journal of Medicine, Surgery, and Public Health"
  : "Journal website";
const readableAuthors = (a) => (a && a === a.toUpperCase() ? a.toLocaleLowerCase().replace(/\b[a-z]/g, (c) => c.toLocaleUpperCase()) : a);
const q = (v) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const res = await fetch("https://smarthealth.group/api/api/Researches/GetResearchsGrouped?skip=0&take=100");
const data = await res.json();
const items = (data.groups ?? []).flatMap((g) => g.items ?? []).filter((i) => i.isActive && i.link && i.title);
const papers = items.filter((i) =>
  /abdulwahid/i.test(`${i.authorsFreeText ?? ""} ${(i.authors ?? []).map((a) => a.userProfileName ?? "").join(" ")}`) &&
  !EXCLUDED.has(i.title.trim().toLocaleLowerCase()));

const rows = papers.map((i) => {
  const raw = i.publishYearString ?? (i.publishYear ? i.publishYear.slice(0, 10) : "");
  const authors = readableAuthors(i.authorsFreeText ?? "Smart Health research team");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : /^\d{4}$/.test(raw) ? `${raw}-01-01` : null;
  return `  (${i.id}, ${q(i.title)}, ${q(authors)}, ${q(plain(i.abstract))}, ${q(journalFromLink(i.link))}, ${q(i.englishCategory ?? "Publication")}, ${q(i.link)}, ${day ? q(day) : "null"}, 'published', ${q(i.imageUrl ?? "")})`;
});

console.log(`-- Generated from the live feed on ${new Date().toISOString().slice(0, 10)}. ${rows.length} papers as shown on the site.`);
console.log("insert into public.researches (id, title, authors, abstract, journal, category, link, published_date, status, cover_image_url) values");
console.log(rows.join(",\n") + "\non conflict (id) do nothing;");
