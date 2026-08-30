// Corrections to the 2026-08-30 legacy import, found by auditing the imported
// records back against the archived source pages. Idempotent.
//
//  1. dermatofibrosarcoma… lost the source post's whole "Figure Legend" block
//     (Figure 1 A–E, Figure 2 A–B) when its prose was folded into the five
//     canonical sections. The nine gallery images carry no per-image captions
//     in the source and there are only seven legend entries, so the legend
//     cannot be split across them without guessing. It is restored as text, in
//     the source's own order (Follow-up, Figure legend, Limitations), as an
//     inline lead-in — the same treatment "Limitations" already gets.
//  2. thyroglossal-duct-cyst-tgdc showed the same picture twice: the post's
//     cover is a second Zyro rendition of an image already in its body
//     (asset 2-yz92qzv5ydcvkw2p). The cover rendition is dropped.
//  3. The TIRADS record carried a "Worked examples" section that was written
//     here, not taken from the source. Removed — the captions carry it.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---- 1. DFSP figure legend ------------------------------------------------
const dfsp = "dermatofibrosarcoma-protuberans-5-times-recurrence-a-case-report-of-a-61-years-old-male";
const followUp =
  "<p><b>Follow-up and outcome:</b> Postoperatively, the patient attended regular follow-up visits to monitor wound healing, flap viability, and shoulder function. The chest tube was removed on postoperative day 2; the closed passive drain was placed and removed after 3 days. The patient was advised to limit ipsilateral shoulder movement for two weeks to facilitate wound healing. Sutures were removed during follow-up, and the recovery period was uneventful. The patient was referred to a multidisciplinary oncology team for further management, including evaluation for systemic therapy and long-term surveillance.</p>";
const figureLegend =
  "<p><b>Figure legend:</b></p>" +
  "<p><b>Figure 1.</b></p><ul>" +
  "<li><b>(A)</b> Preoperative clinical image showing the left anterior chest wall with post-surgical scarring, dermal atrophy, and subtle violaceous discoloration overlying the recurrent lesion site.</li>" +
  "<li><b>(B)</b> Intraoperative view following wide local excision, revealing exposure of the underlying pectoral muscles with tumor invasion extending to the chest wall.</li>" +
  "<li><b>(C)</b> Resected specimen including the mass and overlying skin and subcutaneous tissue (left), excised fifth rib (center), adherent deep tissue and pectoralis muscle (right).</li>" +
  "<li><b>(D)</b> Immediate postoperative result following wide local excision and reconstruction with local advancement flap. A drain is visible at the inferior margin of the incision.</li>" +
  "<li><b>(E)</b> Postoperative follow-up showing flap viability, intact sutures, and early stages of wound healing with no evidence of complications.</li>" +
  "</ul>" +
  "<p><b>Figure 2.</b> <b>(A)</b> CT scan — axial native and <b>(B)</b> contrast enhanced show an enhancing soft tissue density in the left breast (red arrows) invading pectoral muscles, without rib destruction, no axillary lymph nodes enlargement.</p>";
const limitations =
  "<p><b>Limitations:</b> Genetic testing for the COL1A1–PDGFB fusion gene was not performed in this case. Its assessment could have provided additional molecular confirmation and therapeutic insight, particularly regarding eligibility for targeted therapy with imatinib in the context of recurrent disease, but the patient could not do it due to the high cost.</p>";

{
  const { error } = await supabase.from("content_items")
    .update({ case_outcome: followUp + figureLegend + limitations, updated_at: new Date().toISOString() })
    .eq("slug", dfsp);
  if (error) throw error;
  console.log("1. restored the Figure Legend on", dfsp);
}

// ---- 2. TGDC duplicate rendition -----------------------------------------
{
  const slug = "thyroglossal-duct-cyst-tgdc";
  const duplicate = "2-yz92qzv5ydcvkw2p-mv0jrv25ozHLWlWM.webp";
  const keep = "2-yz92qzv5ydcvkw2p-YZ92BJxMxOSerR0p.webp";
  const { data: item, error: readError } = await supabase.from("content_items")
    .select("id,thumbnail_media_path,content_media(id,storage_path,sort_order)").eq("slug", slug).single();
  if (readError) throw readError;
  const dupRow = item.content_media.find((m) => m.storage_path.endsWith(duplicate));
  if (!dupRow) console.log("2. TGDC duplicate already removed");
  else {
    const keepRow = item.content_media.find((m) => m.storage_path.endsWith(keep));
    const { error: delError } = await supabase.from("content_media").delete().eq("id", dupRow.id);
    if (delError) throw delError;
    // The thumbnail pointed at the rendition just deleted; move it to the one kept.
    if (item.thumbnail_media_path === dupRow.storage_path) {
      const { error: thumbError } = await supabase.from("content_items")
        .update({ thumbnail_media_path: keepRow.storage_path, updated_at: new Date().toISOString() }).eq("id", item.id);
      if (thumbError) throw thumbError;
    }
    // Close the gap left in sort_order so the gallery stays 0..n-1.
    const remaining = item.content_media.filter((m) => m.id !== dupRow.id).sort((a, b) => a.sort_order - b.sort_order);
    for (const [index, row] of remaining.entries()) {
      const { error } = await supabase.from("content_media").update({ sort_order: index }).eq("id", row.id);
      if (error) throw error;
    }
    console.log(`2. dropped the duplicate rendition from ${slug} (now ${remaining.length} images)`);
  }
}

// ---- 3. TIRADS authored section ------------------------------------------
{
  const slug = "thyroid-imaging-reporting-and-data-system-tirads";
  const { data: item, error: readError } = await supabase.from("content_items").select("id,case_sections").eq("slug", slug).single();
  if (readError) throw readError;
  const kept = (item.case_sections ?? []).filter((section) => section.key !== "examples");
  if (kept.length === (item.case_sections ?? []).length) console.log("3. TIRADS authored section already removed");
  else {
    const { error } = await supabase.from("content_items").update({ case_sections: kept, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) throw error;
    console.log(`3. removed the authored "Worked examples" section from ${slug}`);
  }
}
