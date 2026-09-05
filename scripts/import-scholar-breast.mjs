import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Adds the breast subset of Dr. Abdulwahid's Google Scholar profile to
// `researches`, harvested into scratch/scholar-breast/ and filed under the
// Breast topic created by migration 0025.
//
// Purely additive, unlike scripts/import-scholar-hn.mjs: it never deletes, so
// the 73 head & neck rows are untouched. A row whose normalised title already
// matches a harvested paper is updated in place rather than inserted again, so
// re-running is safe and an id (and anything hand-attached to it, such as
// research_media) survives.
//
// Run with: node scripts/import-scholar-breast.mjs [--apply]   (default: dry run)

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const apply = process.argv.includes("--apply");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ROOT = "scratch/scholar-breast";

// Which subtopic each paper belongs under, keyed by Scholar id rather than by
// title or folder order so a re-harvest cannot silently re-file anything.
const SUBTOPIC = {
  // Breast cancer & malignancy
  "69ZgNCALVd0C": "breast-malignancy", // Breast edema and Peau d'Orange (pT4b/pT4d)
  "pS0ncopqnHgC": "breast-malignancy", // Breast sarcoma with unusual metastasis
  "EPG8bYD4jVwC": "breast-malignancy", // Breast cancer in young women
  "ziOE8S1-AIUC": "breast-malignancy", // Primary breast lymphoma
  "WAzi4Gm8nLoC": "breast-malignancy", // Invasive pleomorphic lobular carcinoma
  "F2UWTTQJPOcC": "breast-malignancy", // Male breast cancer
  "FiDNX6EVdGUC": "breast-malignancy", // Giant malignant phyllodes tumour
  "ce2CqMG-AY4C": "breast-malignancy", // Primary breast osteosarcoma
  "HGTzPopzzJcC": "breast-malignancy", // Ovarian metastasis from lobular breast carcinoma
  "q-HalDI95KYC": "breast-malignancy", // Breast carcinoma within fibroadenoma
  "kw52XkFRtyQC": "breast-malignancy", // Carcinoma in situ raised from fibroadenoma
  "nVrZBo8bIpAC": "breast-malignancy", // Synchronous IDC with clear cell RCC
  "nZcligLrVowC": "breast-malignancy", // Bilateral invasive ductal carcinoma
  "sNmaIFBj_lkC": "breast-malignancy", // Paget's disease in a male with IDC
  "Ri6SYOTghG4C": "breast-malignancy", // Intermammary breast cancer
  "_axFR9aDTf0C": "breast-malignancy", // Metastasis to the contralateral axilla
  "WqliGbK-hY8C": "breast-malignancy", // Metaplastic breast carcinoma
  "wKETBy42zhYC": "breast-malignancy", // Breastfeeding impact on cancer in women

  // Granulomatous mastitis — enough of the team's output to stand alone
  "pAkWuXOU-OoC": "granulomatous-mastitis", // In accessory breast
  "uVUOdF_882EC": "granulomatous-mastitis", // With erythema nodosum
  "1DsIQWDZLl8C": "granulomatous-mastitis", // Co-existing with breast cancer
  "7BrZ7Jt4UNcC": "granulomatous-mastitis", // In accessory breast tissue
  "cK4Rrx0J3m0C": "granulomatous-mastitis", // Multi-infections and comorbidities
  "BzfGm06jWhQC": "granulomatous-mastitis", // Masking ductal carcinoma in situ
  "sJsF-0ZLhtgC": "granulomatous-mastitis", // Management, single institution
  "wMgC3FpKEyYC": "granulomatous-mastitis", // Clinical and hormonal profiles

  // Benign breast disease
  "O0nohqN1r9EC": "benign-breast", // Primary hydatid cyst of the breast
  "-jrNzM816MMC": "benign-breast", // Unilateral breast Darier disease
  "-7ulzOJl1JYC": "benign-breast", // Desmoid-type fibromatosis, case series
  "9pM33mqn1YgC": "benign-breast", // Desmoid fibromatosis, case report
  "UeHWp8X0CEIC": "benign-breast", // Spontaneous infarction of fibroadenoma
  "43bX7VzcjpAC": "benign-breast", // ICD migration mimicking breast cancer

  // Accessory & ectopic breast tissue
  "mWEH9CqjF64C": "accessory-breast", // Axillary fibroadenoma
  "prdVHNxh-e8C": "accessory-breast", // Nipple adenoma in accessory breasts
  "6ZxmRoH8BuwC": "accessory-breast", // Fibroadenoma in axillary accessory breast

  // Breast surgery & reconstruction
  "5bg8sr1QxYwC": "breast-surgery", // 'Umbrella' breast-conserving technique
  "HbR8gkJAVGIC": "breast-surgery", // Reduction and reconstruction mammoplasty

  // Breast region & axilla — the lesion is in the region, not in breast tissue
  "WC9gN4BGCRcC": "breast-region-axilla", // Axillary pilonidal sinus
  "1yWc8FF-_SYC": "breast-region-axilla", // Epidermal inclusion cyst, axillary node
  "7wO8s98CvbsC": "breast-region-axilla", // Intermammary epidermoid cyst
  "Ug5p-4gJ2f0C": "breast-region-axilla", // Chest wall TB mimicking gynecomastia
  "EYYDruWGBe4C": "breast-region-axilla", // Bilateral inframammary pilonidal sinus
  "IUKN3-7HHlwC": "breast-region-axilla", // Pilonidal sinus of breast
  "nrtMV_XWKgEC": "breast-region-axilla", // Langer's axillary arch
  "W5xh706n7nkC": "breast-region-axilla", // Intermammary pilonidal sinus, first series
  "qjMakFHDy7sC": "breast-region-axilla", // Intermammary pilonidal sinus
};

const papers = fs.readdirSync(ROOT)
  .filter((entry) => fs.statSync(path.join(ROOT, entry)).isDirectory())
  .map((entry) => JSON.parse(fs.readFileSync(path.join(ROOT, entry, "data.json"), "utf8")))
  .sort((a, b) => a.order - b.order);

// Refuse to write a partial set rather than importing whatever happens to be on
// disk: a half-finished harvest would otherwise look like a successful import.
const unfiled = papers.filter((paper) => !SUBTOPIC[paper.scholar_id]);
if (unfiled.length) {
  console.error(`Harvested papers with no subtopic assigned:\n${unfiled.map((p) => `  ${p.scholar_id}  ${p.title}`).join("\n")}`);
  process.exit(1);
}
const missing = Object.keys(SUBTOPIC).filter((id) => !papers.some((paper) => paper.scholar_id === id));
if (missing.length) {
  console.error(`Assigned but not harvested: ${missing.join(", ")}`);
  process.exit(1);
}

const { data: topics, error: topicError } = await supabase.from("research_topics").select("id,slug,parent_id,name");
if (topicError) throw new Error(topicError.message);
const breast = topics.find((topic) => topic.slug === "breast" && !topic.parent_id);
if (!breast) throw new Error("The Breast topic is missing — apply supabase/migrations/0025_breast_research_topic.sql first.");
const subtopicBySlug = new Map(topics.filter((topic) => topic.parent_id === breast.id).map((topic) => [topic.slug, topic]));
for (const slug of new Set(Object.values(SUBTOPIC))) {
  if (!subtopicBySlug.has(slug)) throw new Error(`Subtopic "${slug}" is missing under Breast — apply migration 0025.`);
}

// Titles differ between Scholar records and existing rows only by punctuation
// and non-breaking hyphens, so compare on a flattened form.
const normalise = (title) => title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const { data: existing, error: readError } = await supabase.from("researches").select("id,title");
if (readError) throw new Error(readError.message);
const byTitle = new Map(existing.map((row) => [normalise(row.title), row]));

const payloadFor = (paper) => ({
  title: paper.title,
  authors: paper.authors,
  abstract: paper.abstract,
  journal: paper.journal,
  category: "Publication",
  link: paper.link,
  published_date: paper.date,
  status: "published",
  topic_id: breast.id,
  subtopic_id: subtopicBySlug.get(SUBTOPIC[paper.scholar_id]).id,
});

const inserts = [];
const updates = [];
for (const paper of papers) {
  const match = byTitle.get(normalise(paper.title));
  (match ? updates : inserts).push({ paper, row: match });
}

console.log(`${papers.length} harvested   ${inserts.length} to insert   ${updates.length} already present (update in place)`);
for (const { paper } of inserts) console.log(`  + ${paper.date}  [${SUBTOPIC[paper.scholar_id]}]  ${paper.title.slice(0, 58)}`);
for (const { paper, row } of updates) console.log(`  ~ ${paper.date}  id ${row.id}  ${paper.title.slice(0, 58)}`);

if (!apply) {
  console.log("\nDry run — nothing written. Re-run with --apply.");
  process.exit(0);
}

for (const { paper } of inserts) {
  const { error } = await supabase.from("researches").insert(payloadFor(paper));
  if (error) throw new Error(`insert "${paper.title}": ${error.message}`);
}
for (const { paper, row } of updates) {
  const { error } = await supabase.from("researches").update(payloadFor(paper)).eq("id", row.id);
  if (error) throw new Error(`update ${row.id} "${paper.title}": ${error.message}`);
}
console.log(`\nWrote ${inserts.length} inserts and ${updates.length} updates.`);
