import fs from "node:fs"; import path from "node:path";
import { execFileSync } from "node:child_process";

// Cross-checks the harvested breast papers against a source other than the one
// they were scraped from: the publishers' own registered metadata in CrossRef.
//
// Two lessons from the head & neck run are baked in. CrossRef stores names
// inconsistently — the middle initial is often glued onto the family name, and
// some records have given/family swapped outright — so an author comparison has
// to reduce both sides to a bag of name tokens rather than trusting `family`.
// And a plain title query frequently returns a *similarly titled different
// paper*, so where the publisher link embeds a DOI we ask CrossRef for that DOI
// directly and only fall back to searching when it does not.
//
// Run with: node scripts/crosscheck-scholar-breast.mjs

const ROOT = "scratch/scholar-breast";
const MAILTO = "sst-metadata-check (mailto:info@smartsurgicalteam.com)";
const papers = fs.readdirSync(ROOT).filter((e) => fs.statSync(path.join(ROOT, e)).isDirectory())
  .map((e) => JSON.parse(fs.readFileSync(path.join(ROOT, e, "data.json"), "utf8")))
  .sort((a, b) => a.order - b.order);

const norm = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const bigrams = (s) => { const t = norm(s); const g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2)); return g; };
const sim = (a, b) => { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let i = 0; for (const g of A) if (B.has(g)) i++; return (2 * i) / (A.size + B.size); };
// Reduce a name to its meaningful tokens, dropping initials. Both sides get the
// same treatment so a swapped given/family pair still overlaps.
const tokens = (s) => new Set(norm(s).split(" ").filter((w) => w.length >= 3));

/** Publisher URLs that carry the DOI in the path, so we can skip searching. */
const doiFromLink = (link) => {
  let m;
  if ((m = link.match(/spandidos-publications\.com\/(10\.\d{4,9}\/[^?#]+)/))) return m[1];
  if ((m = link.match(/academic\.oup\.com\/omcr\/article[^/]*\/\d+\/\d+\/(oma?e?\d+)/))) return `10.1093/omcr/${m[1]}`;
  if ((m = link.match(/karger\.com\/[^/]+\/article[^/]*\/[\d/]+\/\d+\/(\d{9})\.pdf/))) return `10.1159/${m[1]}`;
  if ((m = link.match(/\/(10\.\d{4,9}\/[^?#\s]+)/))) return m[1];
  return null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TMP = path.join(ROOT, "cr-tmp.json");
const fetchJson = (url) => {
  execFileSync("curl", ["-s", "-A", MAILTO, "-o", TMP, url]);
  try { return JSON.parse(fs.readFileSync(TMP, "utf8")); } catch { return null; }
};

const compare = (paper, item) => {
  const crTitle = (item.title || [""])[0] || "";
  const crJournal = (item["container-title"] || [""])[0] || "";
  const crYear = item.issued?.["date-parts"]?.[0]?.[0] ?? null;
  const crTokens = new Set();
  for (const a of item.author || []) for (const t of tokens(`${a.family || ""} ${a.given || ""}`)) crTokens.add(t);
  const mine = paper.authors.split(/,\s*/).map((n) => [...tokens(n)]).filter((t) => t.length);
  const matched = mine.filter((t) => t.some((w) => crTokens.has(w))).length;
  const flags = [];
  if (crYear && Math.abs(crYear - Number(paper.date.slice(0, 4))) > 1) flags.push(`YEAR ${crYear} vs ${paper.date.slice(0, 4)}`);
  if (crJournal && sim(crJournal, paper.journal) < 0.55) flags.push(`JOURNAL "${crJournal}" vs "${paper.journal}"`);
  if (mine.length && matched === 0) flags.push("NO AUTHOR OVERLAP");
  return {
    doi: item.DOI, crTitle, crJournal, crYear,
    titleSim: Number(sim(paper.title, crTitle).toFixed(3)),
    authorMatch: `${matched}/${mine.length}`,
    flags,
  };
};

const results = [];
for (const paper of papers) {
  await sleep(700);
  const hinted = doiFromLink(paper.link);
  let item = null; let via = "";
  if (hinted) {
    const body = fetchJson(`https://api.crossref.org/works/${encodeURIComponent(hinted)}`);
    if (body?.message?.DOI) { item = body.message; via = "doi-from-link"; }
  }
  if (!item) {
    // Constrain the search by author as well as title: on its own, a title query
    // returns CrossRef's nearest neighbour, which is often a different paper.
    const body = fetchJson(`https://api.crossref.org/works?rows=10&query.bibliographic=${encodeURIComponent(paper.title)}&query.author=Salih`);
    const best = (body?.message?.items || []).map((it) => ({ it, s: sim(paper.title, (it.title || [""])[0] || "") })).sort((a, b) => b.s - a.s)[0];
    if (best && best.s >= 0.85) { item = best.it; via = "title+author search"; }
    else {
      const plain = fetchJson(`https://api.crossref.org/works?rows=10&query.bibliographic=${encodeURIComponent(paper.title)}`);
      const b2 = (plain?.message?.items || []).map((it) => ({ it, s: sim(paper.title, (it.title || [""])[0] || "") })).sort((a, b) => b.s - a.s)[0];
      if (b2 && b2.s >= 0.85) { item = b2.it; via = "title search"; }
      else {
        results.push({ order: paper.order, title: paper.title, journal: paper.journal, verdict: "NOT-INDEXED", nearest: b2 ? `${(b2.it.title || [""])[0]} (${b2.s.toFixed(2)})` : null });
        console.log(String(paper.order).padStart(2), "NOT-INDEXED  |", paper.journal, "|", paper.title.slice(0, 46));
        continue;
      }
    }
  }
  const cmp = compare(paper, item);
  const verdict = cmp.flags.length ? `FLAG: ${cmp.flags.join("; ")}` : "OK";
  results.push({ order: paper.order, title: paper.title, via, verdict, ...cmp });
  console.log(String(paper.order).padStart(2), verdict.padEnd(10).slice(0, 60), "| t", cmp.titleSim, "| auth", cmp.authorMatch, "|", cmp.doi);
}
fs.writeFileSync(path.join(ROOT, "crossref-check.json"), `${JSON.stringify(results, null, 1)}\n`);
fs.rmSync(TMP, { force: true });
const tally = (p) => results.filter(p).length;
console.log(`\nOK ${tally((r) => r.verdict === "OK")}   FLAG ${tally((r) => r.verdict.startsWith("FLAG"))}   NOT-INDEXED ${tally((r) => r.verdict === "NOT-INDEXED")}`);
