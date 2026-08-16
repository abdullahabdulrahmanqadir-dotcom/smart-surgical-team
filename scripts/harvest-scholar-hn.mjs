import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Harvests the head & neck subset of Dr. Abdulwahid's Google Scholar profile into
// scratch/scholar-hn/<NNN-slug>/data.json, newest publication first.
// The candidate ids come from scratch/scholar-hn/candidates.txt (one `id|year|title` per line).
// Run with: node scripts/harvest-scholar-hn.mjs [startIndex] [count]

const USER = "U8XZfrsAAAAJ";
const ROOT = "scratch/scholar-hn";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const candidates = fs.readFileSync(path.join(ROOT, "candidates.txt"), "utf8")
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [id, year, ...rest] = line.split("|");
    return { id: id.trim(), year: year.trim(), label: rest.join("|").trim() };
  });

const start = Number(process.argv[2] ?? 0);
const count = Number(process.argv[3] ?? candidates.length);
const batch = candidates.slice(start, start + count);

const decode = (value) => value
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  .replace(/\s+/g, " ")
  .trim();

const slug = (title) => title.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .split("-").slice(0, 7).join("-");

// Scholar prints dates as YYYY, YYYY/M or YYYY/M/D — normalise to a full ISO date
// so the site can sort on it, defaulting missing parts to the 1st.
const isoDate = (raw) => {
  if (!raw) return null;
  const [y, m = "1", d = "1"] = raw.split("/");
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

for (const [offset, candidate] of batch.entries()) {
  const index = start + offset + 1;
  const url = `https://scholar.google.com/citations?view_op=view_citation&hl=en&user=${USER}&citation_for_view=${USER}:${candidate.id}`;
  const html = execFileSync("curl", ["-s", "-A", UA, url], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

  const titleBlock = html.match(/id="gsc_oci_title">([\s\S]*?)<\/div><\/div>/);
  if (!titleBlock) {
    console.error(`  ${index} ${candidate.id}: no title block (blocked or empty response)`);
    continue;
  }
  const title = decode(titleBlock[1]);
  const link = (html.match(/class="gsc_oci_title_link" href="([^"]+)"/) || [])[1] || "";

  // Each field lives in its own .gs_scl block, but the value div nests further
  // divs (the abstract, the "Cited by N" link), so slice per block rather than
  // trying to match a balanced </div></div>.
  const fields = {};
  const table = html.slice(html.indexOf('id="gsc_oci_table"'));
  for (const block of table.split('<div class="gs_scl">').slice(1)) {
    const field = block.match(/<div class="gsc_oci_field">([\s\S]*?)<\/div>/);
    // The value div carries extra attributes on some rows (the abstract is
    // <div id="gsc_oci_descr" class="gsc_oci_value">), so match, don't indexOf.
    const value = block.match(/<div [^>]*class="gsc_oci_value"/);
    if (!field || !value) continue;
    fields[decode(field[1])] = decode(block.slice(value.index));
  }

  const record = {
    scholar_id: candidate.id,
    order: index,
    title,
    authors: fields.Authors || "",
    journal: fields.Journal || fields.Book || fields.Conference || fields.Source || fields.Publisher || "",
    volume: fields.Volume || "",
    issue: fields.Issue || "",
    pages: fields.Pages || "",
    date: isoDate(fields["Publication date"]),
    raw_date: fields["Publication date"] || "",
    link: decode(link),
    abstract: fields.Description || "",
    // Read the count from the raw anchor: the decoded value concatenates the
    // per-year histogram onto it ("Cited by 1" + "2026" + "1" -> "120261").
    citations: Number((html.match(/>Cited by (\d+)</) || [])[1] ?? 0),
  };

  const folder = path.join(ROOT, `${String(index).padStart(3, "0")}-${slug(title)}`);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "data.json"), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`  ${index} ${record.date}  ${title.slice(0, 70)}`);
}
