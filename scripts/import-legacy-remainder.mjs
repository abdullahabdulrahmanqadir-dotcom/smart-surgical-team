// The last tranche of the legacy ssthyroid.com gallery: the 18 posts that were
// never migrated. Run with:
//
//   node scripts/import-legacy-remainder.mjs
//
// It is idempotent — rerunning refreshes only these 18 records.
//
// Eight are clinical cases and are written into the five legacy case columns so
// their section headings stay translatable (a row with `case_sections` set has
// its labels rendered verbatim, which would strand Arabic readers with English
// headings). Ten are teaching & reference material — thyroid anatomy, TIRADS
// scoring, histopathology subtype slide sets — whose headings have no
// translation to inherit, so those use `case_sections` with their own labels
// and carry `is_teaching` (migration 0022).
//
// Prose is the legacy post's own text, folded into the site's canonical case
// sections per the client's 2026-08-06 instruction: no section is invented, and
// a source heading that does not name one of the five is kept inline as a
// lead-in so nothing is lost.
//
// Images are pulled from the local legacy archive when it is present and
// downloaded from the old site's asset host otherwise, then pushed straight to
// R2 — nothing is written to a local `cases/` folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2Bucket = "smart-media";
const legacyAsset = (name) => `https://assets.zyrosite.com/mjE2g8GxZDiv9OBQ/${encodeURIComponent(name)}`;
// Where the offline archive of the old site was taken. Optional: the importer
// falls back to the live asset host, which is what a rerun on another machine
// will do.
const archiveDirectory = "scratch/old/assets";

const p = (text) => `<p>${text}</p>`;
const lead = (label, text) => `<p><b>${label}:</b> ${text}</p>`;

const items = [
  // ---------------------------------------------------------------- cases --
  {
    slug: "dermatofibrosarcoma-protuberans-5-times-recurrence-a-case-report-of-a-61-years-old-male",
    title: "Dermatofibrosarcoma Protuberans with Five Recurrences in a 61-Year-Old Male",
    date: "2025-06-17T00:00:00.000Z",
    topic: "other-skin-malignancies",
    summary:
      "An 61-year-old male from Sulaymaniyah, Iraq, presented with palpable hardness for about 2 months on the left chest wall at the site of previous operation with no significant past medical history. He has undergone 4 previous operations at the same site for the same condition, and also received radiotherapy, not a smoker. With no significant family history of the same condition or other malignancies.",
    summaryFields: {
      presentation:
        lead("Patient information", "An 61-year-old male from Sulaymaniyah, Iraq, presented with palpable hardness for about 2 months on the left chest wall at the site of previous operation with no significant past medical history. He has undergone 4 previous operations at the same site for the same condition, and also received radiotherapy, not a smoker. With no significant family history of the same condition or other malignancies.") +
        lead("Clinical findings", "On inspection of the left anterior chest wall, within the region of the male breast, a linear postoperative scar measuring approximately 10 cm was observed. A second, shorter transverse scar measuring 3–5 cm with a fibrinous base was noted above the primary incision. The overlying skin appeared dry, with erythematous to violaceous plaques, telangiectatic vessels, and a hardened, elevated surface, particularly around areas of prior surgical manipulation. On palpation, two subcutaneous masses were palpable along the horizontal scar. One was located at the lateral edge and the other at the midpoint. Both lesions were firm, irregular, non-tender, and fixed to underlying structures, with poorly defined margins. The lateral mass was slightly larger than the central one. The nipple-areolar complex was absent, consistent with the previous surgical resection. Palpation confirmed adherence of the mass to the underlying pectoral musculature."),
      imaging:
        lead("Diagnostic approach", "In 2003 a small lesion progressively evolved into a vascularized, tender mass exhibiting epidermal atrophy and contact bleeding. Core biopsy showed Dermatofibrosarcoma protuberans. Contrast-enhanced computed tomography (CT) showed localized disease without evidence of metastasis. The patient underwent surgical excision histopathology diagnosis also confirming Dermatofibrosarcoma protuberans, followed by adjuvant radiotherapy consisting of 20 sessions. The patient had previously undergone four local excisions for recurrent DFSP. Notably, these recurrences occurred annually during Ramadan between 2022 and 2024, every time the Histopathological examination confirmed the diagnosis of Dermatofibrosarcoma protuberans, with a fifth time emerging in the pre-Ramadan period of 2025.") +
        p("The most recent lesion prompted delayed post-holiday evaluation. High-resolution ultrasound of the chest wall revealed two focal cystic lesions with internal hyperechoic echoes — one measuring 24 × 10 mm in the lateral aspect corresponding to a skin bulge, and another 15 × 5 mm just medial and inferior to the first, both suspicious for local recurrence. Contrast-enhanced CT scan of the chest and abdomen showed a 4.3 cm left chest wall mass with a 1.2 cm thickness, broad contact with the pectoralis major muscle, and possible muscle invasion. No pathological lymphadenopathy was identified in the axillary or internal mammary chains, and no distant metastasis was detected."),
      procedure:
        lead("Therapeutic intervention", "Due to the aggressive nature and deeper invasion of the fifth recurrence, a more extensive surgical approach was employed. Wide local excision was performed, including en bloc resection of the underlying pectoralis major and minor muscles as well as the fifth rib. Intraoperatively, pleural involvement necessitated the placement of a chest tube for postoperative drainage. The resulting defect was reconstructed using a local rotational flap."),
      histopathology:
        p("Histopathological examination of the excised specimen showed recurrent DFSP. The tumor exhibited no lymphovascular invasion, and resection margins were negative with no evidence of high-grade transformation. Immunohistochemical staining demonstrated diffuse, strong membranous positivity for CD34, while Desmin, SMA, and SOX10 were negative."),
      outcome:
        lead("Follow-up and outcome", "Postoperatively, the patient attended regular follow-up visits to monitor wound healing, flap viability, and shoulder function. The chest tube was removed on postoperative day 2; the closed passive drain was placed and removed after 3 days. The patient was advised to limit ipsilateral shoulder movement for two weeks to facilitate wound healing. Sutures were removed during follow-up, and the recovery period was uneventful. The patient was referred to a multidisciplinary oncology team for further management, including evaluation for systemic therapy and long-term surveillance.") +
        lead("Limitations", "Genetic testing for the COL1A1–PDGFB fusion gene was not performed in this case. Its assessment could have provided additional molecular confirmation and therapeutic insight, particularly regarding eligibility for targeted therapy with imatinib in the context of recurrent disease, but the patient could not do it due to the high cost."),
    },
    media: [
      { file: "134a4375-YX4xwl7XbaukGoXM.JPG", caption: null },
      { file: "134a4388-mv0JyWzlj4iBRj8q.JPG", caption: null },
      { file: "134a4399-AQEZvxaVynSbDreV.JPG", caption: null },
      { file: "134a4394-m6LbxZOr9OSl4PgN.JPG", caption: null },
      { file: "134a4428-YleQkWB5n9tk97Er.JPG", caption: null },
      { file: "134a4402-YbNJMBlZ9bcgBbZW.JPG", caption: null },
      { file: "134a4419-mePJkx2GGVsgw4JQ.JPG", caption: null },
      { file: "134a4426-YBgbM7WyVyFxxNRa.JPG", caption: null },
      { file: "36-3x-dJobrZDG0khbDNQa.jpg", caption: null },
    ],
  },
  {
    slug: "spindle-cell-sarcoma-in-an-86-year-old-male",
    title: "Spindle Cell Sarcoma in an 86-Year-Old Male",
    date: "2025-04-12T00:00:00.000Z",
    topic: "other-skin-malignancies",
    summary:
      "An 86-year-old male presented with a progressively enlarging back mass for the past two months. He was a non-smoker. His past medical history was significant for hypertension (HTN), ischemic heart disease (IHD), and percutaneous coronary intervention (PCI). Additionally, he had undergone femur surgery in the past.",
    summaryFields: {
      presentation:
        lead("Patient information", "An 86-year-old male presented with a progressively enlarging back mass for the past two months. He was a non-smoker. His past medical history was significant for hypertension (HTN), ischemic heart disease (IHD), and percutaneous coronary intervention (PCI). Additionally, he had undergone femur surgery in the past."),
      imaging:
        lead("Laboratory investigations", "Thyroid function tests revealed a mildly suppressed thyroid-stimulating hormone (TSH) level of 0.108 µIU/mL, while free thyroxine (FT4) was within normal limits at 19.8 pmol/L.") +
        lead("Chest CT with IV contrast", "A contrast-enhanced CT scan of the chest was performed to evaluate the posterior back mass. Imaging revealed a well-defined soft tissue density mass located in the right upper back, measuring 8 × 4.5 cm. The lesion was situated in the subcutaneous fat, superficial to and inseparable from the right trapezius muscle. No internal fat or calcification was noted. The mass exhibited mild heterogeneous post-contrast enhancement on the venous phase. The underlying scapula appeared normal. The radiological impression was suggestive of a soft tissue sarcoma, and tissue diagnosis was recommended.") +
        lead("Core needle biopsy", "Under local anesthesia and ultrasound guidance, seven Tru-Cut core biopsies were obtained from the large posterior chest wall mass. Histopathological examination identified the lesion as a spindle cell sarcoma, and further immunohistochemical staining was advised."),
      histopathology:
        p("The biopsy revealed a spindle cell sarcoma with a mitotic rate of 19 per 2 mm², indicating a high proliferative index. No necrosis or lymphovascular invasion was identified. Immunohistochemical analysis was recommended to confirm the diagnosis, including markers such as SS18-SSX, CD99, MUC4, S100, SMA, Desmin, STAT6, and CD34, with the possibility of additional markers if needed. The primary suspicion was monophasic synovial sarcoma, pending further immunostaining for definitive characterization."),
    },
    media: [
      { file: "093a0977-mk3v9R6JbJSrxxlv.jpg", caption: null },
      { file: "093a0979-A3Q2J3j7GLSM7OQ9.jpg", caption: null },
      { file: "093a0978-AR0LbrN1Qqin4len.jpg", caption: null },
      { file: "093a0972-mePxnREgejt94QgQ.jpg", caption: null },
      { file: "093a0980-mjE79nN7JxHX3GOB.jpg", caption: null },
      { file: "093a0974-YbNB9RL43NcP6wrM.jpg", caption: null },
      { file: "093a0981-ALpeo452zRfXVVbg.jpg", caption: null },
      { file: "093a0986-AQExpgqxkaSMg02g.jpg", caption: null },
    ],
  },
  {
    // The legacy post is a Google Drive video embed with no prose at all. The
    // Drive URL will not play in the site's player, so this lands as a draft:
    // it needs its video re-hosted before it can be published.
    slug: "thyroid-nodulectomy",
    title: "Thyroid Nodulectomy",
    date: "2024-05-01T00:00:00.000Z",
    topic: "thyroid-nodules",
    status: "draft",
    summary: "Operative record of a thyroid nodulectomy. The legacy post carried only a video, hosted on Google Drive.",
    summaryFields: {},
    media: [{ file: "photo_2024-06-02_15-36-51-A0xN6rEpvJHk0Rep.jpg", caption: null }],
  },
  {
    slug: "tuberculous-granulomatous-inflammation-of-parathyroid-adenoma-with-primary-hyperparathyroidism",
    title: "Tuberculous Granulomatous Inflammation of Parathyroid Adenoma Manifested as Primary Hyperparathyroidism",
    date: "2023-08-31T00:00:00.000Z",
    topic: "parathyroid",
    summary:
      "A 58-year-old female with a history of recurrent renal calculi presented to the Head and Neck clinic at Smart Health Tower (Sulaimani, Iraq) with complaints of generalized body aches and fatigue for approximately one year. The patient had no notable surgical history or prior infection with tuberculosis (TB).",
    summaryFields: {
      presentation:
        lead("Patient information", "A 58-year-old female with a history of recurrent renal calculi presented to the Head and Neck clinic at Smart Health Tower (Sulaimani, Iraq) with complaints of generalized body aches and fatigue for approximately one year. The patient had no notable surgical history or prior infection with tuberculosis (TB).") +
        lead("Clinical findings", "Physical examination revealed no significant findings, and there was no associated palpable cervical lymphadenopathy."),
      imaging:
        lead("Diagnostic assessment", "Blood analyses revealed elevated parathyroid hormone (PTH) levels (154.7 pg/ml) and serum calcium levels (11.26 mg/dl). A neck ultrasound revealed a multinodular goiter with mildly suspicious (TR3) bilateral homogeneous echo texture nodules measuring 4 mm in the right thyroid gland. The left thyroid gland had a non-suspicious (TR2) nodule measuring 13 × 9 × 8 mm and a mildly suspicious (TR3) nodule measuring 10 × 9 × 7 mm. Additionally, a solid hypoechoic hypovascular nodule of 20 × 7 mm below the left lower pole of the thyroid was identified, which suggested a parathyroid adenoma. No notable cervical lymphadenopathy was observed."),
      procedure:
        lead("Therapeutic intervention", "The patient underwent left thyroid lobectomy and excision of the left parathyroid gland."),
      histopathology:
        p("Histopathological examination revealed a parathyroid adenoma with caseating granulomatous inflammation, suggestive of TB. The left thyroid gland exhibited a nodular goiter with focal lymphocytic thyroiditis. The histopathological analysis was performed using 4-µm-thick paraffin-embedded sections fixed with 10% neutral buffered formalin for 24 hours, followed by staining with hematoxylin and eosin and examination under a light microscope."),
      outcome:
        lead("Follow-up", "The postoperative period was uneventful, and the patient's calcium level decreased to 10 mg/dl. A negative acid-fast bacillus (AFB) test of sputum, along with negative chest X-ray findings, were achieved postoperatively. The patient was subsequently treated for TB with Rifampin (600 mg, twice daily for 6 months). The patient's symptoms, including generalized body aches, resolved following treatment."),
    },
    media: [
      { file: "de94a5a1-2269-4899-b844-722b8919268c-ar0jwg5lpxua1qro-AwvrgzD4v5TOjnjq.jpg", caption: null },
      { file: "6259956a-b70a-47ff-b249-65fcff177347-yrdabg9lz0szlbn3-A1aKq7B50NtnBP1q.jpg", caption: null },
    ],
  },
  {
    slug: "acute-suppurative-thyroiditis-progressing-to-a-thyroid-abscess",
    title: "Acute Suppurative Thyroiditis Progressing to a Thyroid Abscess",
    date: "2022-02-01T00:00:00.000Z",
    topic: "thyroid-nodules",
    summary:
      "A 67-year-old female presented with a painful anterior neck swelling lasting for one week. Her past medical history was notable for diabetes, but family, surgical, and drug histories were unremarkable.",
    summaryFields: {
      presentation:
        lead("Patient information", "A 67-year-old female presented with a painful anterior neck swelling lasting for one week. Her past medical history was notable for diabetes, but family, surgical, and drug histories were unremarkable.") +
        lead("Clinical findings", "The only significant clinical finding was tenderness over the anterior aspect of the neck."),
      imaging:
        lead("Diagnostic assessment", "Laboratory investigations revealed anemia (hemoglobin 8.0 g/dl), low hematocrit (23.8%), and elevated white blood cells (11.5 × 10⁹ cells/cm²). Antero-posterior and lateral cervical X-rays showed a large lesion in the right side of the neck, which displaced the trachea to the left, and multinodular goiter was suspected.") +
        p("On ultrasound examination, the right thyroid lobe was found to be enlarged (150 × 75 × 57 mm) due to a complex, thick-walled mass with echogenic shadow. The mass pushed the right common carotid artery laterally and compressed the trachea medially, with retrosternal extension inferiorly. The left thyroid lobe was slightly smaller (95 × 21 × 19 mm) and had two calcified nodules measuring less than 18 mm. No cervical lymphadenopathy was noted.") +
        p("CT scan of the neck and upper chest revealed a well-defined collection in the right thyroid lobe, with enhancing margins, measuring 7 × 5 cm. The center of the lesion was necrotic and contained gas. There was also diffuse edema around the right thyroid lobe and a shift in the trachea to the left. Several reactive lymph nodes were noted on the right side, all measuring less than 15 mm.") +
        p("Fine needle aspiration cytology (FNAC) revealed contents of a hemorrhagic cyst (Bethesda I), with air being expelled during aspiration. Preoperative laboratory findings included an elevated ESR (>140 mm/hr), CRP (238.50 mg/L), HbA1C (12.5%), random blood sugar (184.2 mg/dl), serum ferritin (1135 ng/ml), and D-Dimer (0.64 μg/dl)."),
      procedure: lead("Therapeutic intervention", "The patient underwent a right thyroid lobectomy."),
      histopathology: p("Histopathological examination confirmed the presence of a thyroid abscess without malignancy."),
      outcome:
        lead("Follow-up", "The patient was discharged from the hospital on the first postoperative day without complications. Six months later, the patient remained free from recurrence."),
    },
    media: [
      { file: "65aba240-96fb-4ea2-b5e9-cbb8bf747709-agbgypvyvqie2bzz-dJoJQ1O1DGcpvwov.jpg", caption: null },
      { file: "98861d07-3d23-4621-92bf-3bb151390740-yd0pobvgzrcov0dg-YZ92BJNOzMIa4KJx.jpg", caption: null },
    ],
  },
  {
    slug: "squamous-cell-carcinoma-of-lower-lip-with-cervical-lymph-node-metastasis",
    title: "Squamous Cell Carcinoma of Lower Lip with Cervical Lymph Node Metastasis",
    date: "2020-02-08T00:00:00.000Z",
    topic: "squamous-cell-carcinoma",
    summary:
      "A 51-year-old female presented to our clinic with a large, painful lesion on her lower lip, which had been slowly increasing in size.",
    summaryFields: {
      presentation:
        lead("Patient information", "A 51-year-old female presented to our clinic with a large, painful lesion on her lower lip, which had been slowly increasing in size.") +
        lead("Medical history", "Past medical history: negative. Past surgical history: negative. Social history: no smoking history.") +
        lead("Clinical findings", "On examination, the patient had a thick, rough scale patch involving the entire lower lip and the angle of the mouth, with signs of crusting and bleeding. There were no signs of squamous cell carcinoma (SCC) elsewhere on the face. On neck examination, palpable lymph nodes were noted in both the submandibular region and the left side of the neck."),
      imaging:
        lead("Diagnostic assessment", "Sonography of the neck revealed pathological lymph nodes in both the right and left submandibular regions, measuring 22 mm and 15 × 12 mm, respectively. Additionally, a left upper cervical pathological lymph node was identified, measuring 20 × 13 mm. CT scan of the head, neck, chest, and upper abdomen revealed a bulky lower lip cutaneous neoplasia with muscle invasion, along with bilateral locoregional cervical suspicious lymph nodes and bilateral axillary and abdominal suspicious lymph nodes."),
      histopathology:
        p("FNAC of the lower lip lesion confirmed squamous cell carcinoma. FNAC of cervical lymph nodes confirmed metastatic squamous cell carcinoma. Axillary FNAC was negative for malignancy but showed non-necrotizing granulomatous lymphadenitis."),
      outcome: lead("Treatment", "Due to the extensive disease, the patient was managed with palliative care."),
    },
    media: [
      { file: "1-avljqx19rqi95nv5-mePLq8XQb5hyq5lZ.jpg", caption: null },
      { file: "3-y4l49gxyvqs7volk-AVLJZqBpOkiy2gOQ.jpg", caption: null },
      { file: "2-yz92qpxpapfxg82g-YBgp9P1eKZI86ob5.jpg", caption: null },
    ],
  },
  {
    slug: "hyperfunctioning-papillary-thyroid-carcinoma",
    title: "Hyperfunctioning Papillary Thyroid Carcinoma",
    date: "2016-01-01T00:00:00.000Z",
    topic: "papillary-carcinoma",
    summary:
      "A 40-year-old male presented with symptoms of palpitations, excessive sweating, and weight loss for a one-month duration. The patient reported no significant past medical history, surgical history, or family history.",
    summaryFields: {
      presentation:
        lead("Patient information", "A 40-year-old male presented with symptoms of palpitations, excessive sweating, and weight loss for a one-month duration. The patient reported no significant past medical history, surgical history, or family history.") +
        lead("Clinical findings", "Upon examination, the patient showed symptoms consistent with hyperthyroidism but did not display any visible thyroid mass or notable cervical lymphadenopathy."),
      imaging:
        lead("Diagnostic assessment", "Laboratory results showed elevated serum thyroid hormone levels, indicating hyperthyroidism. Ultrasound of the neck revealed multinodular goiter with several hypoechoic nodules within the thyroid, most notably a hyperfunctioning nodule. A fine needle aspiration (FNA) biopsy of the nodule confirmed the presence of papillary thyroid carcinoma."),
      procedure:
        lead("Therapeutic intervention", "The patient underwent a total thyroidectomy followed by central neck dissection to remove affected lymph nodes."),
      histopathology:
        p("The histopathological examination revealed hyperfunctioning papillary thyroid carcinoma with minimal vascular invasion and no evidence of distant metastasis."),
      outcome:
        lead("Follow-up", "Post-operative recovery was uneventful, and the patient was started on levothyroxine therapy for thyroid hormone replacement. He was scheduled for regular follow-up with serial neck ultrasound and serum thyroglobulin levels to monitor for recurrence."),
    },
    media: [{ file: "fdced194-93b2-4180-aa2c-d636b58279ec-ykbjwgew5dubgdng-mP4plj2j2Vtzrzl5.jpg", caption: null }],
  },
  {
    slug: "48-year-old-female-with-neck-swelling",
    title: "48-Year-Old Female Complaining of Neck Swelling",
    date: "2022-03-03T00:00:00.000Z",
    topic: "thyroglossal-cyst",
    summary:
      "Well defined 2-3mm wall thickness complex cyst of 32*25*18mm in Lt side of midline level of hypoid bone to the upper part of thyroid cartilage, contain 19*12*15mm well defined lobulated surface iso echoic to thyroid tissue mural nodule with microcalcification and mildly vascular on color doppler.",
    summaryFields: {
      imaging:
        p("Well defined 2–3 mm wall thickness complex cyst of 32 × 25 × 18 mm in the left side of midline, level of the hyoid bone to the upper part of the thyroid cartilage, containing a 19 × 12 × 15 mm well defined lobulated surface, iso echoic to thyroid tissue mural nodule with microcalcification and mildly vascular on color doppler.") +
        p("Vascular mural nodule with RI 1.2."),
    },
    media: [
      { file: "265ee488-9dc3-4c75-8b35-75c461e78a21-mv0jbkxg1vu5oegr-mP4pljLBlDux3rgl.jpg", caption: "Well defined 2-3mm wall thickness complex cyst of 32*25*18mm in Lt side of midline level of hypoid bone to the upper part of thyroid cartilage, contain 19*12*15mm well defined lobulated surface iso echoic to thyroid tissue mural nodule with microcalcification and mildly vascular on color doppler." },
      { file: "1-A3Qp6zpZ88tVn3aP.webp", caption: null },
      { file: "1-YZ92BJXqlPc9WEek.webp", caption: "Vascular mural nodule with RI 1.2" },
    ],
  },

  // ------------------------------------------------- teaching & reference --
  {
    slug: "thyroid-anatomy",
    title: "Thyroid Anatomy",
    date: "2020-02-08T00:00:00.000Z",
    topic: "thyroid-parathyroid",
    teaching: true,
    summary:
      "The thyroid gland is endocrine producing thyroid hormone, located in mid line of anterior neck, lies in the visceral space completely enveloped by pre-tracheal fascia, extends from level C5 to T1 and lies anterior to the thyroid- cricoid cartilages and the first 5-6 tracheal rings.",
    sections: [
      {
        key: "anatomy",
        label: "Anatomy",
        body: p("The thyroid gland is endocrine producing thyroid hormone, located in mid line of anterior neck, lies in the visceral space completely enveloped by pre-tracheal fascia, extends from level C5 to T1 and lies anterior to the thyroid-cricoid cartilages and the first 5–6 tracheal rings."),
      },
      {
        key: "ultrasound",
        label: "On ultrasound",
        body:
          "<ul><li>H shaped organ, upper pole round and low pole tapered.</li><li>Well defined smooth, regular surface.</li><li>Homogenous texture with mildly hyperechogenic in compare to the strap muscle.</li><li>4–6 cm in length and &lt;2 cm in diameter.</li></ul>",
      },
    ],
    media: [
      { file: "1-mp4pw1wnyahw5vgr-mjE2g3bqO0Cyl0Nv.jpg", caption: null },
      { file: "0-m7vp9gqworujvxgo-AQEJP5Wpe4T2y07p.jpg", caption: null },
    ],
  },
  {
    slug: "thyroid-imaging-reporting-and-data-system-tirads",
    title: "Thyroid Imaging, Reporting and Data System (TIRADS)",
    date: "2023-01-01T00:00:00.000Z",
    topic: "thyroid-nodules",
    teaching: true,
    summary:
      "Ultrasound features: Scoring is determined five categories. The higher the cumulative score, the higher the TR and the high the likelihood of malignancy.",
    sections: [
      {
        key: "ultrasound-features",
        label: "Ultrasound features",
        body:
          p("Scoring is determined by five categories. The higher the cumulative score, the higher the TR and the higher the likelihood of malignancy. One score is assigned from each of the following categories.") +
          "<p><b>Margin</b> (choose one)</p><ul><li>smooth: 0 points</li><li>ill-defined: 0 points</li><li>lobulated/irregular: 2 points</li><li>extra-thyroidal extension: 3 points</li></ul>" +
          "<p><b>Composition</b> (choose one)</p><ul><li>cystic or completely cystic: 0 points</li><li>spongiform: 0 points</li><li>mixed cystic and solid: 1 point</li><li>solid or almost completely solid: 2 points</li></ul>" +
          "<p><b>Echogenicity</b> (choose one)</p><ul><li>anechoic: 0 points</li><li>hyper- or isoechoic: 1 point</li><li>hypoechoic: 2 points</li><li>markedly hypoechoic: 3 points</li></ul>" +
          "<p><b>Shape</b> (choose one)</p><ul><li>wider than tall: 0 points</li><li>taller than wide: 3 points</li></ul>" +
          "<p><b>Echogenic foci</b> (choose one or more)</p><ul><li>none: 0 points</li><li>comet-tail artifact: 0 points</li><li>macrocalcifications: 1 point</li><li>peripheral/rim calcifications: 2 points</li><li>microcalcification: 3 points</li></ul>",
      },
      {
        key: "scoring",
        label: "Scoring and classification",
        body:
          "<ul><li><b>TR1</b>: 0 points (benign)</li><li><b>TR2</b>: 2 points (not suspicious)</li><li><b>TR3</b>: 3 points (mildly suspicious)</li><li><b>TR4</b>: 4–6 points (moderately suspicious)</li><li><b>TR5</b>: ≥7 points (highly suspicious)</li></ul>",
      },
      {
        key: "examples",
        label: "Worked examples",
        body: p("The gallery shows twelve graded nodules, each captioned with the features that produced its TR score."),
      },
    ],
    media: [
      { file: "1-amqnweoze9t4k7lo-mxBroqr5yWhopD9J.webp", caption: null },
      { file: "1-A3Qp6zpZ88tVn3aP.webp", caption: "Picture 1 — Well defined thin wall cystic nodule with internal debris and comet tail artifact." },
      { file: "1-YZ92BJXqlPc9WEek.webp", caption: "Picture 2 — Well defined thin wall small ~4mm cystic nodule with comet tail artifact, normal surrounding thyroid tissue TR1." },
      { file: "1-A85pQJpQ1pt7lKx6.webp", caption: "Picture 3 — Well defined thin wall small ~4mm cystic nodule with comet tail artifact, normal surrounding thyroid tissue TR1." },
      { file: "1-AE0pQDpw80u9NBJy.webp", caption: "Picture 4 — Well defined thin wall cystic nodule with internal echo and fluid debris level TR1." },
      { file: "1-YD0pQ2p4lbHV6o0X.webp", caption: "Picture 5 — Well defined thin wall 45*24 22mm cystic nodule TR1." },
      { file: "1-A3Qp6zp2BLCoD8WO.webp", caption: "Picture 6" },
      { file: "1-dJoJQ1NjkySb1XzB.webp", caption: "Picture 7 — Well defined complex mainly cystic nodule in Rt lobe TR2 (solid part isoechoic without micro or macrocalcification)." },
      { file: "1-YleMg1MZwkIvjGM9.webp", caption: "Picture 8 — Well define smooth regular surface solid isoechoic to thyroid tissue nodule in Rt lobe low third without micro or macrocalcification TR3." },
      { file: "1-mp8ngxn4DRtJJy1j.webp", caption: "Picture 9 — Well defined solid hypoechoic TR4 nodule." },
      { file: "1-mP4pljpZ4jIoE2l1.webp", caption: "Picture 10 — Solid hypoechoic nodule with lobulated surface, micro and macrocalcification TR5." },
      { file: "1-dWxl3N0N6vH6noDq.webp", caption: "Picture 11 — Small solid lobulated surface hypoechoic nodule with microcalcification TR5." },
      { file: "1-dOqbnLbl67c6gGEp.webp", caption: "Picture 12" },
    ],
  },
  {
    slug: "ectopic-thyroid-tissue-radiology",
    title: "Ectopic Thyroid Tissue",
    date: "2023-06-13T00:00:00.000Z",
    topic: "thyroglossal-cyst",
    teaching: true,
    summary: "Ectopic thyroid can be described as functional thyroid tissue that is located anywhere other than its normal anatomic position.",
    sections: [
      {
        key: "overview",
        label: "Overview",
        body:
          p("Ectopic thyroid can be described as functional thyroid tissue that is located anywhere other than its normal anatomic position.") +
          p("Ectopic thyroid tissue is typically located along the path of thyroid gland descent; rarely it can be found in the mediastinum, heart, diaphragm, and esophagus.") +
          p("The prevalence of ectopic thyroid tissue is about 1 in 100,000–300,000 people, and that increases to 1 in 4,000–8,000 patients with thyroid pathology."),
      },
    ],
    media: [
      { file: "0-meplqwnn1mtegdv1-AMqnQO485Dcgbg6B.jpg", caption: "Picture 1 — Well defined 9*6*5mm solid iso echoic mildly vascular nodule seen sublingual in 9y old male." },
      { file: "2-m7vp9goo8qhx90wl-dOqbnL4vQvhoD1pg.jpg", caption: "Picture 2 — Similar feature nodule 18*15*15mm nodule in 13y male Sublingual." },
      { file: "3-ybnagwxxdxhnknj0-mv0jrv7K3eUnaZLK.jpg", caption: "Picture 3 — Well defined 18*14*11mm solid mildly hypoechoic nodule on supper surface of hyoid bone in 7 y old male." },
      { file: "4-ykbjwd99w0cvdp81-mnl3ga9qv3Sklnzj.webp", caption: "Picture 4 — Well defined elongated solid iso echoic mildly vascular nodule in mid line over the thyroid cartilage 31*15*6mm in 13 y male." },
    ],
  },
  {
    slug: "thyroglossal-duct-cyst-tgdc",
    title: "Thyroglossal Duct Cyst (TGDC)",
    date: "2019-08-31T00:00:00.000Z",
    topic: "thyroglossal-cyst",
    teaching: true,
    summary: "The most common congenital cervical anomaly, with a 7% population prevalence, forming anywhere along the thyroid's route of migration between the tongue and the inferior neck.",
    sections: [
      {
        key: "overview",
        label: "Overview",
        body:
          "<ul><li>The most common congenital cervical anomaly.</li><li>7% of population prevalence.</li><li>They form in midline anywhere along the thyroid's route of migration between the tongue and the inferior neck.</li><li>A TGDC is an embryologic remnant that forms due to the failure of closure of the thyroglossal duct.</li><li>It is closely related to the hyoid bone.</li></ul>" +
          p("About 20% to 25% are at the suprahyoid level, 15% to 20% at the level of the hyoid, and 25% to 65% present at the infrahyoid level."),
      },
    ],
    media: [
      { file: "2-yz92qzv5ydcvkw2p-mv0jrv25ozHLWlWM.webp", caption: null },
      { file: "2-yz92qzv5ydcvkw2p-YZ92BJxMxOSerR0p.webp", caption: "Picture 1 — Well defined thin wall <2mm cystic lesion contain fine echo no solid part thin partial septum in 53y old female at level of hyoid bone, 38*27*28mm." },
      { file: "3-dwxlq25xdbhnpvgk-AzGrg63kEEtxpzLX.webp", caption: null },
      { file: "4-agbgyaq7nkipxg8v-AwvrgzD5XaUe5REO.webp", caption: "Picture 2 — A well defined about 2mm wall thickness 21*15*12mm cystic nodule seen in midline of neck level of hyoid bone with internal debris and mild peripheral vascularity, complicated/infected TGDC." },
      { file: "6-yx4pvne63nsx8jby-AE0pQDaz2Juwkal3.webp", caption: "Picture 3 — Well defined thin wall cystic nodule in between hyoid bone an upper margin of thyroid cartilage 20*14*9mm, in 40y old lady." },
    ],
  },
  {
    slug: "agenesis-of-thyroid-gland",
    title: "Agenesis of Thyroid Gland",
    date: "2019-02-07T00:00:00.000Z",
    topic: "thyroglossal-cyst",
    teaching: true,
    summary: "Thyroid agenesis is the complete absence of the thyroid gland from birth.",
    sections: [
      {
        key: "overview",
        label: "Overview",
        body:
          p("Thyroid agenesis is the complete absence of the thyroid gland from birth.") +
          p("Congenital hypothyroidism is a condition that results from inadequate thyroid hormone production from birth; the worldwide incidence is 1:3,000 to 1:4,000. The condition can be categorized in terms of etiology as thyroid agenesis (22–42%), ectopic thyroid gland (35–42%), or gland in situ abnormalities (24–36%)."),
      },
      {
        key: "hemi-agenesis",
        label: "Hemi-agenesis",
        body:
          p("Thyroid hemi-agenesis is defined as the lack of development of one thyroid lobe, or one thyroid lobe and the thyroid isthmus.") +
          p("Hemi-agenesis of the thyroid gland is a rare condition — only 300 cases had been reported up to 2010, and it was first reported by Handsfield-Jones in 1866.") +
          p("In the general population the prevalence estimated from screening ultrasound studies is approximately 0.06% (ranging 0.05% to 0.2%), with the left thyroid lobe being more common. It is more common in females, with a 3:1 female to male ratio. The higher frequency of hemi-agenesis occurs in the left lobe in 80% of the reported cases and is associated with isthmus agenesis in 50% of the cases."),
      },
    ],
    media: [
      { file: "0-m2w49gpne2s57opq-AGBGQZVRnptxJjnP.jpg", caption: null },
      { file: "1-a0xn9gkozzfy80wq-d95pQbPLlzfrJVND.jpg", caption: "Picture 1 — The thyroid gland not seen in normal position and no ectopic thyroid tissue, small anechoic hypo-vascular cystic nodule seen in Rt lobe bed." },
      { file: "2-mxbrbw5ondcojywd-mnl3gaE1pgSkEN63.jpg", caption: "Picture 2 — 37 y old female, mildly enlarged Rt lobe of thyroid gland, congenital agenesis of the isthmus and Lt lobe. Small thin wall anechoic hypo-vascular cystic nodule of 3*3*2mm seen in Lt lobe bed." },
      { file: "3-ar0jwabnnkuwyooq-YbNa7KM6bvHq6N4e.jpg", caption: "Picture 3 — Female 38y old, normal Rt lobe and isthmus with agenesis of Lt lobe." },
      { file: "4-aqejwbjqwqubl2x4-YbNa7KM3oKIab8LL.jpg", caption: "Picture 4 — Agenesis of the Rt lobe and isthmus, normal Lt lobe size." },
    ],
  },
  // The five histopathology entries below are slide sets: the legacy post
  // carried its title and its images and no prose at all. Their single section
  // says exactly that rather than inventing a description.
  {
    slug: "anaplastic-thyroid-carcinoma-with-squamous-cell-carcinoma-component",
    title: "Anaplastic Thyroid Carcinoma with Squamous Cell Carcinoma Component",
    date: "2023-12-30T00:00:00.000Z",
    topic: "anaplastic-carcinoma",
    teaching: true,
    summary: "Histopathology slide set: anaplastic thyroid carcinoma with a squamous cell carcinoma component.",
    sections: [
      { key: "histopathology", label: "Histopathology", body: p("Slide set illustrating anaplastic thyroid carcinoma with a squamous cell carcinoma component.") },
    ],
    media: [
      { file: "eda211e9-011e-4312-a4d4-1419c089a492-avljqgopzac8gojg-YKbJGBNgppI1DKVB.jpg", caption: null },
      { file: "d2ba1245-ec94-4f86-9db6-8fc88f8a6135-ylembgo0e8fp3eex-YyvogNP2lpCyVlNg.jpg", caption: null },
      { file: "6a3a7a46-8569-4ee4-a90e-0a4e7e2ad816-yanbqep8oaukqqj1-m6LvQ6DM7pU4Xn8y.jpg", caption: null },
      { file: "8a719b1f-5241-477c-938b-802f7eae57e4-ykbjwgzyync85dvq-dJoJQ1BogbSBwgQP.jpg", caption: null },
      { file: "df9a4e86-aba1-4f93-b6ee-ea0cd5b4e0c6-mv0jbremorhlzknn-mk3DgeyNzzcBEyP4.jpg", caption: null },
      { file: "60aeb707-1f59-45ef-a043-d2dc21119437-mp8nbga0qpcj0ggw-AE0pQDMVDGuLDx4P.jpg", caption: null },
    ],
  },
  {
    slug: "thyroid-containing-thymus-thymus-containing-parathyroid-and-ultimobranchial-body",
    title: "Thyroid Containing Thymus, Thymus Containing Parathyroid and Ultimobranchial Body",
    date: "2023-12-30T00:00:00.000Z",
    topic: "thyroid-parathyroid",
    teaching: true,
    summary: "Histopathology slide set: thyroid containing thymus, thymus containing parathyroid, and ultimobranchial body.",
    sections: [
      { key: "histopathology", label: "Histopathology", body: p("Slide set illustrating thyroid containing thymus, thymus containing parathyroid, and the ultimobranchial body.") },
    ],
    media: [
      { file: "3-yx4pvek6els6nkv5-mxBroqxPbDFRBq70.jpg", caption: null },
      { file: "4-meplqqz8qzile5j4-A0xNzE4MZ4fgzK8N.jpg", caption: null },
      { file: "2-m7vp9q4nxxtan2o5-YBgp9Poko6Hp02ZB.jpg", caption: null },
    ],
  },
  {
    slug: "papillary-thyroid-carcinoma-with-fibromatosis-desmoid-like-stroma",
    title: "Papillary Thyroid Carcinoma with Fibromatosis (Desmoid)-Like Stroma",
    date: "2023-12-30T00:00:00.000Z",
    topic: "papillary-carcinoma",
    teaching: true,
    summary: "Histopathology slide set: papillary thyroid carcinoma with fibromatosis (desmoid)-like stroma.",
    sections: [
      { key: "histopathology", label: "Histopathology", body: p("Slide set illustrating papillary thyroid carcinoma with fibromatosis (desmoid)-like stroma.") },
    ],
    media: [
      { file: "6090b45e-36a1-4525-9ed9-e9fcef9f2589-mp4pwlqkqpfo8qeq-YanBE43knjiypL8B.jpg", caption: null },
      { file: "9a8b543b-9a53-4716-8622-016b71cb40ce-mp4pwlyeo6hoga2r-YZ92BJlKR9C5PKLO.jpg", caption: null },
      { file: "e8d28e90-77b0-448a-ba5b-8cba71f30cb1-awvrbg6jq4hpxl8x-AwvrgzXN3Jfy9wrz.jpg", caption: null },
      { file: "c59ec272-e967-4e73-b4f6-7d1472edf44e-ybgpw92495i5v1nq-m2W4NvMeWyI7K2aP.jpg", caption: null },
      { file: "e8d39f72-7ac3-470c-8455-a19cc30eb8cd-dwxlq38bwxc6799x-YX4Pe6Ge0gC9xLjk.jpg", caption: null },
    ],
  },
  {
    slug: "warthin-like-subtype-of-papillary-thyroid-carcinoma",
    title: "Warthin-Like Subtype of Papillary Thyroid Carcinoma",
    date: "2023-12-30T00:00:00.000Z",
    topic: "papillary-carcinoma",
    teaching: true,
    summary: "Histopathology slide set: the Warthin-like subtype of papillary thyroid carcinoma.",
    sections: [
      { key: "histopathology", label: "Histopathology", body: p("Slide set illustrating the Warthin-like subtype of papillary thyroid carcinoma.") },
    ],
    media: [
      { file: "d34d9334-aac0-45f4-a635-be7fb749be90-m2w49x68rbcnlnea-mnl3ganE5LTNnXN6.jpg", caption: null },
      { file: "9f8baed9-e65e-4c16-a37d-22d9ec0b6f15-m2w49x6nbvi9lbq8-AR0J8EwLonT02KzQ.jpg", caption: null },
      { file: "794a76f6-9930-4224-b0f1-49700712c672-mnl3bkbv0gu1jqpv-ALpJyaqP0jH9vMZK.jpg", caption: null },
      { file: "0955cd61-cb9a-4263-8ded-49c0afb15c85-yd0poxzen9i9vqej-YleMg1O2Z7uv5Ra1.jpg", caption: null },
      { file: "4ad416d6-fbeb-468b-9e3c-d2f71d7bed88-ykbjwg9nbkiagdoo-YZ92BJa64RtPkOJR.jpg", caption: null },
    ],
  },
  {
    slug: "tall-cell-subtype-of-papillary-thyroid-carcinoma",
    title: "Tall Cell Subtype of Papillary Thyroid Carcinoma",
    date: "2023-10-30T00:00:00.000Z",
    topic: "papillary-carcinoma",
    teaching: true,
    summary: "Histopathology slide set: the tall cell subtype of papillary thyroid carcinoma.",
    sections: [
      { key: "histopathology", label: "Histopathology", body: p("Slide set illustrating the tall cell subtype of papillary thyroid carcinoma.") },
    ],
    media: [
      { file: "eda211e9-011e-4312-a4d4-1419c089a492-avljqgopzac8gojg-YKbJGBNgppI1DKVB.jpg", caption: null },
      { file: "4864c8b0-eeb1-4efc-a25b-46e73bf947c2-mxbrbkyol2snzdob-AR0J8EVONWh5l0rP.jpg", caption: null },
      { file: "52315029-05a7-4c30-b595-5c43852ac706-yg2lqke6xxiggadp-AE0pQDvWLDHpWagn.jpg", caption: null },
      { file: "a5ff39c6-ce84-4749-86d8-6068583dbf97-a0xn9xlzneuldknb-A85pQJre33U1KgQQ.jpg", caption: null },
    ],
  },
];

function putToR2(storagePath, bytes, filename, contentType) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sst-r2-"));
  const tempFile = path.join(tempDirectory, filename);
  try {
    fs.writeFileSync(tempFile, bytes);
    // Wrangler is invoked through its own entrypoint rather than `npx`. Going
    // through cmd.exe on Windows meant quoting every argument, and npx read the
    // quoted package name as a version tag ("Invalid tag name").
    const args = ["r2", "object", "put", `${r2Bucket}/${storagePath}`, "--file", tempFile, "--content-type", contentType, "--remote"];
    execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], { stdio: "inherit" });
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

const contentTypeFor = (filename) => {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

async function uploadMedia(item) {
  const records = [];
  for (const [index, image] of item.media.entries()) {
    const local = path.join(archiveDirectory, image.file);
    let bytes;
    if (fs.existsSync(local)) {
      bytes = fs.readFileSync(local);
    } else {
      const response = await fetch(legacyAsset(image.file), { headers: { "user-agent": "Mozilla/5.0" } });
      if (!response.ok) throw new Error(`Could not download ${image.file}: ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
    }
    // Mirrors the Admin upload route: R2 stores the bytes and /api/media serves
    // them. Do not use Supabase Storage for editorial media.
    const storagePath = `topics/${item.topic}/${item.slug}/${image.file}`;
    putToR2(storagePath, bytes, image.file, contentTypeFor(image.file));
    records.push({
      storage_path: storagePath,
      public_url: `/api/media/${storagePath}`,
      kind: "image",
      alt_text: image.caption || item.title,
      caption: image.caption,
      sort_order: index,
    });
  }
  return records;
}

const { data: topics, error: topicError } = await supabase.from("topics").select("id,slug,parent_id");
if (topicError) throw topicError;

for (const item of items) {
  const topic = topics.find((candidate) => candidate.slug === item.topic);
  if (!topic) throw new Error(`Topic ${item.topic} does not exist.`);
  // Filed under its sub-topic and that sub-topic's parent, the pairing
  // migration 0012 applies, so group tabs and sub-topic filters both match.
  const topicIds = [topic.id, topic.parent_id].filter(Boolean);
  const media = await uploadMedia(item);
  const fields = item.summaryFields ?? {};

  const payload = {
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    kind: "case_article",
    status: item.status ?? "published",
    access_level: "public",
    is_teaching: Boolean(item.teaching),
    reading_minutes: 2,
    level: item.teaching ? "Teaching & reference" : "Clinical case",
    published_at: item.date,
    updated_at: new Date().toISOString(),
    thumbnail_source: media.length ? "image" : "youtube",
    thumbnail_media_path: media.length ? media[0].storage_path : null,
    body_html: null,
    // Cases keep their headings translatable by leaving `case_sections` null and
    // writing the five legacy columns; teaching items need their own headings.
    case_sections: item.sections ?? null,
    case_presentation: fields.presentation ?? null,
    case_imaging: fields.imaging ?? null,
    case_procedure: fields.procedure ?? null,
    case_histopathology: fields.histopathology ?? null,
    case_outcome: fields.outcome ?? null,
  };

  const { data: saved, error } = await supabase.from("content_items").upsert(payload, { onConflict: "slug" }).select("id").single();
  if (error) throw new Error(`${item.slug}: ${error.message}`);

  for (const table of ["content_topics", "content_media"]) {
    const { error: removeError } = await supabase.from(table).delete().eq("content_id", saved.id);
    if (removeError) throw removeError;
  }
  const { error: topicInsertError } = await supabase.from("content_topics").insert(topicIds.map((topic_id) => ({ content_id: saved.id, topic_id })));
  if (topicInsertError) throw topicInsertError;
  if (media.length) {
    const { error: mediaInsertError } = await supabase.from("content_media").insert(media.map((entry) => ({ ...entry, content_id: saved.id })));
    if (mediaInsertError) throw mediaInsertError;
  }
  console.log(`Imported${item.teaching ? " (teaching)" : ""}${item.status === "draft" ? " (draft)" : ""}: ${item.title}`);
}

console.log(`\nDone — ${items.length} records.`);
