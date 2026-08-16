import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Replaces the contents of `researches` with the head & neck subset of Dr.
// Abdulwahid's Google Scholar profile, harvested into scratch/scholar-hn/.
//
// It is a reconciliation rather than a wipe-and-reload: rows whose title already
// matches a harvested paper are updated in place so their id and the
// cover_image_url we sourced by hand survive. Only rows with no match in the
// head & neck list are deleted.
//
// Run with: node scripts/import-scholar-hn.mjs [--apply]   (default is a dry run)

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const apply = process.argv.includes("--apply");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ROOT = "scratch/scholar-hn";
const papers = fs.readdirSync(ROOT)
  .filter((entry) => fs.statSync(path.join(ROOT, entry)).isDirectory())
  .map((entry) => JSON.parse(fs.readFileSync(path.join(ROOT, entry, "data.json"), "utf8")))
  .sort((a, b) => a.order - b.order);

// Titles differ between Scholar records and existing rows only by punctuation
// and non-breaking hyphens, so compare on a flattened form.
const normalise = (title) => title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// A few rows were imported under an earlier wording of the same paper. Without
// these the reconciliation would delete the old row and insert a fresh one,
// silently dropping the cover image that was sourced for it by hand.
const ALIASES = new Map([
  ["warthin like variant of papillary thyroid carcinoma", "warthin like subtype of papillary thyroid carcinoma"],
  [
    "thyroid hemiagenesis with papillary thyroid carcinoma a case report and literature review",
    "thyroid hemiagenesis with papillary carcinoma a case report with literature review",
  ],
]);
const canonical = (title) => ALIASES.get(normalise(title)) ?? normalise(title);

const payloadFor = (paper) => ({
  title: paper.title,
  authors: paper.authors,
  abstract: paper.abstract,
  journal: paper.journal,
  category: "Publication",
  link: paper.link,
  published_date: paper.date,
  status: "published",
});

const { data: existing, error: readError } = await supabase.from("researches").select("id,title,cover_image_url");
if (readError) throw new Error(readError.message);

const byTitle = new Map(existing.map((row) => [canonical(row.title), row]));
const wanted = new Set(papers.map((paper) => canonical(paper.title)));

const toUpdate = papers.filter((paper) => byTitle.has(canonical(paper.title)));
const toInsert = papers.filter((paper) => !byTitle.has(canonical(paper.title)));
const toDelete = existing.filter((row) => !wanted.has(canonical(row.title)));

console.log(`${papers.length} head & neck papers on disk.`);
console.log(`  update in place: ${toUpdate.length} (keeps id + cover image)`);
console.log(`  insert new:      ${toInsert.length}`);
console.log(`  delete:          ${toDelete.length}`);
console.log("\nrows to delete:");
for (const row of toDelete) {
  console.log(`  ${row.id}  ${row.cover_image_url ? "[has cover] " : "            "}${row.title.slice(0, 74)}`);
}

if (!apply) {
  console.log("\nDry run — nothing written. Re-run with --apply to execute.");
  process.exit(0);
}

for (const paper of toUpdate) {
  const row = byTitle.get(canonical(paper.title));
  const { error } = await supabase.from("researches").update(payloadFor(paper)).eq("id", row.id);
  if (error) console.error(`  FAILED update ${row.id}: ${error.message}`);
}
console.log(`updated ${toUpdate.length} rows.`);

for (const paper of toInsert) {
  const { error } = await supabase.from("researches").insert(payloadFor(paper));
  if (error) console.error(`  FAILED insert "${paper.title.slice(0, 60)}": ${error.message}`);
}
console.log(`inserted ${toInsert.length} rows.`);

if (toDelete.length) {
  const { error } = await supabase.from("researches").delete().in("id", toDelete.map((row) => row.id));
  if (error) console.error(`  FAILED delete: ${error.message}`);
  else console.log(`deleted ${toDelete.length} rows.`);
}

const { count } = await supabase.from("researches").select("*", { count: "exact", head: true });
console.log(`\nresearches now holds ${count} rows.`);
