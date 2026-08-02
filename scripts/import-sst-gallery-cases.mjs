import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// The first tranche of the legacy gallery migration. Run with:
// node scripts/import-sst-gallery-cases.mjs
// It is deliberately idempotent, so rerunning refreshes only these five cases.
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const legacyAsset = (name) => `https://assets.zyrosite.com/mjE2g8GxZDiv9OBQ/${name}`;
const r2Bucket = "smart-media";

const cases = [
  {
    slug: "left-parotid-av-malformation-in-a-32-year-old-male",
    title: "Left Parotid AV Malformation in a 32-Year-Old Male",
    date: "2026-07-15T09:00:00.000Z",
    topic: "parotid",
    videoUrl: "https://youtu.be/RY6VOAO5B8s",
    summary: "A 32-year-old male with a four-year left preauricular swelling and pulsatile tinnitus was found to have a parotid arteriovenous malformation.",
    media: ["hani-XLARFc8jmWN7CBYF.jpg", "134a8979-eYojVnABMpSv5AWo.JPG", "134a8983-P6b9q2xda3ePBMHM.JPG", "134a9105-hQ23lhYuufByAHl8.JPG", "134a9073-ZOr80O0gSPEImFtv.JPG"],
    sections: {
      presentation: "A 32-year-old male presented with a left preauricular swelling that had progressively changed in size over four years, accompanied by pulsatile tinnitus. He reported no known drug allergies and denied recent flu-like symptoms.",
      imaging: "Laboratory studies, including blood count, thyroid and renal function, glucose and viral screening, were unremarkable. Ultrasound showed an ill-defined hypoechoic hypervascular nodule (about 38 × 20 × 23 mm) in the posterior medial left parotid with dilated tortuous vessels. MRI demonstrated a left preauricular AVM supplied by branches of the left external carotid artery, with associated inflammatory change in the external auditory canal and mastoid air cells.",
      procedure: "A left parotidectomy was performed under general anaesthesia through a lazy-S incision. The facial nerve and major branches were identified and preserved, haemostasis was secured, and a corrugated drain was placed.",
      histopathology: "Parotid tissue showed benign salivary gland tissue with reactive lymph nodes and a vascular malformation in the soft tissue. No malignancy was identified.",
      outcome: "Recovery was stable without significant complications. The patient was discharged with follow-up for the surgical site and possible recurrence of symptoms.",
    },
  },
  {
    slug: "recurrent-multifocal-pleomorphic-adenoma-of-the-right-parotid-gland-in-a-37-year-old-male",
    title: "Recurrent Multifocal Pleomorphic Adenoma of the Right Parotid Gland in a 37-Year-Old Male",
    date: "2025-12-02T00:00:00.000Z",
    topic: "parotid",
    videoUrl: "https://youtu.be/PmAP7FSg3oY",
    summary: "A recurrent multifocal right parotid pleomorphic adenoma was managed with total parotidectomy while preserving the facial nerve.",
    media: ["photo_5258212857613061675_y-ouszlzczsNNzSIKw.jpg", "134a6544-dl12ddc7AK4bQKqx.JPG", "134a6543-1zk3ZeYnadh2IZNQ.JPG", "134a6542-eOZug5NUDwAZh1YZ.JPG", "134a6563-EwahId4qIxxvkAi3.JPG"],
    sections: {
      presentation: "A 37-year-old male had a painless right infra-auricular swelling that had gradually enlarged over three years. He had undergone surgery in the same region about 15 years earlier, raising concern for recurrent parotid neoplasm.",
      imaging: "Ultrasound identified multiple adjacent mildly vascular hypoechoic nodules in the superficial and deep lobes of the right parotid, the largest 21 × 17 × 11 mm, with small subcutaneous extensions. MRI showed a 5.2 × 2.4 × 1.8 cm multiloculated superficial-lobe lesion with peripheral enhancement and internal cystic components. FNA was Milan category IVA benign and suggestive of pleomorphic adenoma.",
      procedure: "A right total parotidectomy was undertaken to remove the multifocal nodules while preserving the facial nerve. Careful dissection was required because of scarring from the earlier operation; there were no intraoperative complications.",
      histopathology: "The specimen contained multiple pleomorphic adenomas (benign mixed tumours) in the right parotid. No malignant transformation was identified.",
      outcome: "Recovery was uncomplicated, with no facial weakness or neuropraxia. The wound healed well and long-term surveillance was recommended because late recurrence remains possible.",
    },
  },
  {
    slug: "massive-multinodular-goiter-with-retrosternal-extension-in-a-patient-with-long-standing-thyroid-disease-copy",
    title: "Massive Multinodular Goiter With Retrosternal Extension in a Patient With Long-Standing Thyroid Disease",
    date: "2025-12-02T00:00:00.000Z",
    topic: "goiter",
    videoUrl: "https://youtu.be/E2Oka_cLLX8",
    summary: "A massive multinodular goiter with retrosternal extension and compressive symptoms was treated by thyroidectomy, with benign nodular disease on histology.",
    media: ["photo_5258212857613061676_y-KErAqLhXTcJAgWvV.jpg", "134a6521-U5Z8zK3z7Z3bxVrJ.JPG", "134a6520-yJC8ssVNl82R8lbK.JPG", "134a6519-dVaLTyRzjcwVSYXb.JPG", "134a6518-c3qnZhXzONV6Vyfw.JPG", "134a6522-qm35wnFxyVmVn0RO.JPG"],
    sections: {
      presentation: "A middle-aged patient with a 10-year thyroid history presented with progressive neck swelling and dysphagia. He also had hypertension and heart disease, used carbimazole, propranolol, concor and torsicalm, and reported no prior surgery or drug allergies.",
      imaging: "TSH 1.57 uIU/mL, FT4 8.54 pmol/L and TRAb below 0.800 IU/L supported a non-autoimmune pattern; thyroglobulin was above 500 ng/mL and calcium was normal. Ultrasound showed marked bilateral thyroid enlargement with multiple TR3 nodules and retrosternal extension. CT confirmed a large heterogeneous multinodular thyroid mass with calcification, cystic degeneration and extension nearly to the tracheal carina.",
      procedure: "Because of the retrosternal extension, compressive symptoms and risk of progression, thyroidectomy was performed. Intraoperative findings were consistent with a massive bilateral goiter with deep mediastinal descent.",
      histopathology: "Histology showed thyroid follicular nodular disease with benign secondary changes and no malignancy.",
      outcome: "Postoperative recovery was smooth, with improved airway symptoms and no reported hypocalcaemia or nerve injury. Thyroid hormone replacement and continued surveillance were advised.",
    },
  },
  {
    slug: "vascular-malformation-mimicking-parathyroid-adenoma-in-a-16-year-old-female-with-elevated-pth",
    title: "Vascular Malformation Mimicking Parathyroid Adenoma in a 16-Year-Old Female with Elevated PTH",
    date: "2025-12-02T00:00:00.000Z",
    topic: "parathyroid",
    videoUrl: "https://youtu.be/6GIpVRZOoUM",
    summary: "A cervical vascular malformation mimicked parathyroid adenoma in a 16-year-old with elevated PTH but normal calcium.",
    media: ["photo_5258212857613061677_y-Bm9hTKZ0bcOKKELV.jpg"],
    sections: {
      presentation: "A 16-year-old female presented with a one-year history of anterior neck swelling and intermittent pain, without dysphagia, dyspnoea or voice change. Her medical and surgical history was unremarkable.",
      imaging: "Thyroid function was normal, but PTH was 183 pg/mL with normal calcium (9.17 mg/dL). Ultrasound showed a 49 × 16 × 12 mm lobulated posterior right-thyroid mass with low-flow vascularity, considered parathyroid lesion versus vascular malformation. CT demonstrated a cystic superoposterior right-thyroid lesion with calcification plus enhancing posterior-triangle lesions, features most consistent with a posterior cervical vascular malformation with phleboliths.",
      procedure: "A right-sided parathyroid exploration targeting upper and lower glands was planned because of the biochemical concern, with concurrent left thyroid nodulectomy for a TR3 nodule.",
      histopathology: "The left nodule was a benign hyperplastic follicular nodule with oncocytic change. The right-sided specimen was a vascular malformation containing a small normal parathyroid gland; no malignancy was found.",
      outcome: "The final diagnosis was benign cervical vascular malformation rather than parathyroid adenoma, emphasising the need to reconcile biochemical results with contradictory imaging.",
    },
  },
  {
    slug: "right-submandibular-sialolithiasis-with-non-specific-sialadenitis-copy-copy",
    title: "Right Submandibular Sialolithiasis with Non-Specific Sialadenitis",
    date: "2025-11-10T00:00:00.000Z",
    topic: "submandibular",
    videoUrl: "https://youtu.be/LoeSC5Vmubo",
    summary: "A 48-year-old man with chronic right submandibular swelling had obstructive sialadenitis from a hilar stone and underwent gland excision.",
    media: ["6b78a1a2-711b-4138-bd57-8ed4fd2fb976-bWCTTgWaV8zEXT1M.jpg", "134a4284-NsIiIXZd1ceoKrdR.JPG", "134a4283-fqtBT0u9eGxt49R0.JPG", "134a4304-IBBcSzxNjmIrMTm0.JPG"],
    sections: {
      presentation: "A 48-year-old man with hypertension and no diabetes or other systemic illness presented with chronic right submandibular swelling. Constitutional symptoms and relevant drug or exposure history were not reported.",
      imaging: "Neck ultrasound showed a mildly enlarged heterogeneous right submandibular gland, a 6 mm echogenic hilar focus consistent with a sialolith, mild ductal dilatation and inflammatory change, and reactive cervical nodes with preserved architecture. The remaining salivary glands, thyroid and laboratory studies were normal.",
      procedure: "The diagnosis was obstructive sialadenitis caused by a hilar sialolith. The patient underwent right submandibular gland excision under general anaesthesia; no complications were reported.",
      histopathology: "Histology confirmed non-specific chronic sialadenitis due to stone-related ductal obstruction, with no malignancy.",
      outcome: "The legacy record did not document the postoperative course. Standard postoperative assessment and follow-up of the wound, nerve function and reactive lymphadenopathy were planned.",
    },
  },
];

async function uploadMedia(caseItem) {
  const records = [];
  for (const [sortOrder, filename] of caseItem.media.entries()) {
    const response = await fetch(legacyAsset(filename));
    if (!response.ok) throw new Error(`Could not download ${filename}: ${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";")[0] || (filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    // This mirrors the Admin upload route: R2 stores bytes and /api/media
    // serves them. Do not use Supabase Storage for editorial media.
    const storagePath = `topics/${caseItem.topic}/${caseItem.slug}/${filename}`;
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sst-r2-"));
    const tempFile = path.join(tempDirectory, filename);
    try {
      fs.writeFileSync(tempFile, Buffer.from(await response.arrayBuffer()));
      const args = ["wrangler", "r2", "object", "put", `${r2Bucket}/${storagePath}`, "--file", tempFile, "--content-type", contentType, "--remote"];
      if (process.platform === "win32") {
        execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npx ${args.map((value) => `"${value}"`).join(" ")}`], { stdio: "inherit" });
      } else {
        execFileSync("npx", args, { stdio: "inherit" });
      }
    } finally {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
    records.push({ storage_path: storagePath, public_url: `/api/media/${storagePath}`, kind: "image", alt_text: caseItem.title, caption: null, sort_order: sortOrder });
  }
  return records;
}

const { data: topics, error: topicError } = await supabase.from("topics").select("id,slug");
if (topicError) throw topicError;

for (const caseItem of cases) {
  const topicId = topics.find((topic) => topic.slug === caseItem.topic)?.id;
  if (!topicId) throw new Error(`Topic ${caseItem.topic} does not exist.`);
  const media = await uploadMedia(caseItem);
  const payload = {
    title: caseItem.title, slug: caseItem.slug, summary: caseItem.summary, kind: "video", video_url: caseItem.videoUrl, status: "published", access_level: "public",
    reading_minutes: 2, level: "Clinical case", published_at: caseItem.date, updated_at: new Date().toISOString(),
    thumbnail_source: "image", thumbnail_media_path: media[0].storage_path, body_html: null,
    case_presentation: `<p>${caseItem.sections.presentation}</p>`, case_imaging: `<p>${caseItem.sections.imaging}</p>`,
    case_procedure: `<p>${caseItem.sections.procedure}</p>`, case_histopathology: `<p>${caseItem.sections.histopathology}</p>`, case_outcome: `<p>${caseItem.sections.outcome}</p>`,
  };
  const { data: saved, error } = await supabase.from("content_items").upsert(payload, { onConflict: "slug" }).select("id").single();
  if (error) throw new Error(`${caseItem.slug}: ${error.message}`);
  const { data: oldMedia, error: oldMediaError } = await supabase.from("content_media").select("storage_path").eq("content_id", saved.id);
  if (oldMediaError) throw oldMediaError;
  for (const table of ["content_topics", "content_media"]) {
    const { error: removeError } = await supabase.from(table).delete().eq("content_id", saved.id);
    if (removeError) throw removeError;
  }
  const { error: topicInsertError } = await supabase.from("content_topics").insert({ content_id: saved.id, topic_id: topicId });
  if (topicInsertError) throw topicInsertError;
  const { error: mediaInsertError } = await supabase.from("content_media").insert(media.map((item) => ({ ...item, content_id: saved.id })));
  if (mediaInsertError) throw mediaInsertError;
  const legacySupabasePaths = (oldMedia ?? []).map((item) => item.storage_path).filter((item) => item.startsWith("legacy-gallery/"));
  if (legacySupabasePaths.length) {
    const { error: deleteError } = await supabase.storage.from("sst-content").remove(legacySupabasePaths);
    if (deleteError) throw new Error(`Could not remove the superseded Supabase media: ${deleteError.message}`);
  }
  console.log(`Imported: ${caseItem.title}`);
}
