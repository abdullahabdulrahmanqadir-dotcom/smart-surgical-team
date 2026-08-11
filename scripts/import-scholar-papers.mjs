import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Bulk-imports Dr. Abdulwahid's Google Scholar papers, harvested one-by-one
// into scratch/scholar-test/<NN-slug>/data.json, straight into the
// `researches` table (bypassing the one-at-a-time admin form).
// Run with: node scripts/import-scholar-papers.mjs [--dry-run]
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const root = "scratch/scholar-test";
const folders = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const papers = folders.map((folder) => {
  const data = JSON.parse(fs.readFileSync(path.join(root, folder, "data.json"), "utf8"));
  return {
    folder,
    title: data.title,
    authors: data.authors,
    abstract: data.abstract,
    journal: data.journal,
    category: "Publication",
    link: data.link,
    published_date: data.date,
    status: "published",
  };
});

const { data: existingRows, error: existingError } = await supabase.from("researches").select("title");
if (existingError) throw new Error(existingError.message);
const existingTitles = new Set(existingRows.map((row) => row.title.trim().toLowerCase()));

const toInsert = papers.filter((paper) => !existingTitles.has(paper.title.trim().toLowerCase()));
const skipped = papers.filter((paper) => existingTitles.has(paper.title.trim().toLowerCase()));

console.log(`${papers.length} papers found, ${toInsert.length} new, ${skipped.length} already in the database.`);
for (const paper of skipped) console.log(`  skip: ${paper.folder}`);

if (dryRun) {
  console.log("Dry run — nothing written.");
  process.exit(0);
}

for (const paper of toInsert) {
  const { folder, ...payload } = paper;
  const { error } = await supabase.from("researches").insert(payload);
  if (error) {
    console.error(`  FAILED: ${folder}: ${error.message}`);
    continue;
  }
  console.log(`  inserted: ${folder}`);
}

console.log("Done.");
