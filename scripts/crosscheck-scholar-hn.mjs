import fs from "node:fs";
import path from "node:path";

// Cross-checks the harvested Scholar metadata against CrossRef, the publishers'
// own DOI registry, so author lists / years / journals are verified against
// something other than the source they were scraped from.
// Run with: node scripts/crosscheck-scholar-hn.mjs

const ROOT = "scratch/scholar-hn";
const MAILTO = "research-check@smartsurgicalteam.local"; // CrossRef polite-pool identifier

const papers = fs.readdirSync(ROOT)
  .filter((entry) => fs.statSync(path.join(ROOT, entry)).isDirectory())
  .map((entry) => JSON.parse(fs.readFileSync(path.join(ROOT, entry, "data.json"), "utf8")))
  .sort((a, b) => a.order - b.order);

const flatten = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Rough token overlap, enough to tell "same paper" from "CrossRef guessed wrong".
const similarity = (a, b) => {
  const left = new Set(flatten(a).split(" ").filter((w) => w.length > 3));
  const right = new Set(flatten(b).split(" ").filter((w) => w.length > 3));
  if (!left.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / left.size;
};

// Reduce a name to its surname. CrossRef often stores the family name with the
// middle initial attached ("M. Salih"), so both sides must be reduced the same
// way or nothing ever matches.
const surname = (name) => flatten(name).split(" ").filter(Boolean).pop();
const surnames = (authors) => authors.split(",").map(surname).filter(Boolean);

const results = [];
for (const paper of papers) {
  const url = `https://api.crossref.org/works?rows=3&mailto=${MAILTO}&query.bibliographic=${encodeURIComponent(paper.title)}`;
  let items = [];
  try {
    const response = await fetch(url, { headers: { "User-Agent": `sst-research-check (mailto:${MAILTO})` } });
    items = (await response.json())?.message?.items ?? [];
  } catch (error) {
    results.push({ order: paper.order, title: paper.title, verdict: "LOOKUP-FAILED", detail: error.message });
    console.log(`${String(paper.order).padStart(2)} LOOKUP-FAILED  ${paper.title.slice(0, 55)}`);
    continue;
  }

  const match = items
    .map((item) => ({ item, score: similarity(paper.title, (item.title || [""])[0] || "") }))
    .sort((a, b) => b.score - a.score)[0];

  if (!match || match.score < 0.85) {
    results.push({ order: paper.order, title: paper.title, verdict: "NOT-IN-CROSSREF" });
    console.log(`${String(paper.order).padStart(2)} not-indexed    ${paper.title.slice(0, 55)}`);
    continue;
  }

  const { item } = match;
  const crossrefYear = (item.issued?.["date-parts"]?.[0]?.[0]) ?? null;
  const ourYear = Number(paper.date.slice(0, 4));
  const crossrefAuthors = (item.author || []).map((a) => surname(a.family || "")).filter(Boolean);
  const ourAuthors = surnames(paper.authors);
  const authorHits = ourAuthors.filter((name) => crossrefAuthors.includes(name)).length;
  const authorRatio = ourAuthors.length ? authorHits / ourAuthors.length : 0;
  const journalMatch = similarity(paper.journal, (item["container-title"] || [""])[0] || "") >= 0.5;

  const issues = [];
  if (crossrefYear && Math.abs(crossrefYear - ourYear) > 1) issues.push(`year ours=${ourYear} crossref=${crossrefYear}`);
  if (crossrefAuthors.length && authorRatio < 0.6) issues.push(`authors ${authorHits}/${ourAuthors.length} matched`);
  if (item["container-title"]?.length && !journalMatch) issues.push(`journal ours="${paper.journal}" crossref="${item["container-title"][0]}"`);

  results.push({
    order: paper.order,
    title: paper.title,
    verdict: issues.length ? "CHECK" : "OK",
    issues,
    doi: item.DOI,
    crossrefTitle: (item.title || [""])[0],
    crossrefAuthors: crossrefAuthors.length,
    ourAuthors: ourAuthors.length,
    authorRatio: Number(authorRatio.toFixed(2)),
    crossrefYear,
  });
  console.log(`${String(paper.order).padStart(2)} ${issues.length ? "CHECK        " : "OK           "}  ${paper.title.slice(0, 55)}${issues.length ? `\n     -> ${issues.join("; ")}` : ""}`);
  await new Promise((resolve) => setTimeout(resolve, 400));
}

fs.writeFileSync(path.join(ROOT, "crossref-check.json"), JSON.stringify(results, null, 2));
const tally = results.reduce((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] || 0) + 1 }), {});
console.log(`\n${JSON.stringify(tally)}`);
