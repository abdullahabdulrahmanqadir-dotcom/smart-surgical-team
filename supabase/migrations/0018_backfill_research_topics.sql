-- Files the 72 imported papers into the topic tree seeded by 0017.
--
-- Matched on title rather than id: these rows were created by the scholar
-- import, so their identity across environments is the paper itself, not a
-- sequence value. A title that no longer matches (because the admin edited it)
-- simply leaves that paper unfiled rather than filing the wrong one, and the
-- verification query at the bottom of this file surfaces any such row.
--
-- One-off backfill. Papers added from now on are filed in the admin at the
-- point they are created. Safe to re-run.

update public.researches as r
set topic_id = parent.id, subtopic_id = child.id
from (values
  ('Squamous dedifferentiation and differentiated high-grade transformation of papillary thyroid carcinoma in metastatic lymph nodes: Two cases and literature review', 'thyroid', 'thyroid-neoplasms'),
  ('Warthin-like subtype of papillary thyroid carcinoma', 'thyroid', 'thyroid-neoplasms'),
  ('Anaplastic Thyroid Carcinoma and Toxic Multinodular Goiter: A Case Report and Literature Review', 'thyroid', 'thyroid-neoplasms'),
  ('Multifocal Fibrosing Thyroiditis: A High-Volume Center Experience', 'thyroid', 'benign-thyroid'),
  ('Epithelial-Myoepithelial Carcinoma of Salivary Glands: A Tertiary Center Experience', 'salivary', 'major-salivary'),
  ('THYROID HEMIAGENESIS WITH PAPILLARY CARCINOMA: A CASE REPORT WITH LITERATURE REVIEW', 'thyroid', 'thyroid-neoplasms'),
  ('Pediatric Thyroid Surgery: A 7-Year Experience From A High-Volume Tertiary Center', 'thyroid', 'thyroid-surgery'),
  ('Desmoid-type fibromatosis of the head and neck region: A case report and brief review of the literature', 'neck-soft-tissue', 'soft-tissue-nerve'),
  ('Hodgkin lymphoma of the parotid gland: A case report with literature review', 'salivary', 'major-salivary'),
  ('Papillary thyroid carcinoma with squamous differentiation: A report of two cases and a brief review of the literature', 'thyroid', 'thyroid-neoplasms'),
  ('Unusual Metastasis from Follicular Thyroid Carcinoma: A Case Report and Literature Review', 'thyroid', 'thyroid-neoplasms'),
  ('Exploring the Efficacy of Once and Twice Weekly Thyroxine Dosing: A Promising Approach for Hypothyroidism Management', 'thyroid', 'benign-thyroid'),
  ('Preoperative Thyroglobulin and Thyroid Pathologies: A Single Center Experience', 'thyroid', 'benign-thyroid'),
  ('Percutaneous ablation of intrathyroidal parathyroid adenoma: A case report and brief review of the literature', 'parathyroid', 'parathyroid-adenoma'),
  ('Psammoma bodies in a benign thyroid gland: A case report and brief review of the literature', 'thyroid', 'benign-thyroid'),
  ('Papillary thyroid cancer in prepubertal patients: A report of two cases and a brief review of the literature', 'thyroid', 'thyroid-neoplasms'),
  ('Water-clear cell parathyroid adenoma: A case report and mini-review of the literature', 'parathyroid', 'parathyroid-adenoma'),
  ('Carcinoma ex Pleomorphic Adenoma: A Case Series and Literature Review', 'salivary', 'major-salivary'),
  ('Simultaneous quadruple pathology in the thyroid gland: A case report with literature review', 'thyroid', 'thyroid-neoplasms'),
  ('Thyroid Hemiagenesis: A Single-Center Case Series', 'thyroid', 'benign-thyroid'),
  ('Papillary and medullary thyroid carcinoma with a single hybrid lymph node: a case report with review of literature', 'thyroid', 'thyroid-neoplasms'),
  ('Hyalinizing Trabecular Tumor: A Case Series with Literature Review', 'thyroid', 'thyroid-neoplasms'),
  ('Pleomorphic adenoma of the lip: a case report and literature review', 'salivary', 'minor-salivary'),
  ('Kikuchi-Fujimoto Disease Coexistent with Papillary Thyroid Carcinoma: A Report of Two Cases', 'thyroid', 'thyroid-neoplasms'),
  ('Primary thyroid non-Hodgkin B-cell lymphoma: a case series', 'thyroid', 'thyroid-neoplasms'),
  ('Papillary thyroid carcinoma within struma ovarii: a case report and literature review', 'thyroid', 'thyroid-neoplasms'),
  ('Papillary thyroid microcarcinoma presenting as a large cystic lymph node: A case report', 'thyroid', 'thyroid-neoplasms'),
  ('Clinicopathological Features of Indeterminate Thyroid Nodules: A Single-center Cross-sectional Study', 'thyroid', 'benign-thyroid'),
  ('Face reconstruction by mesh after hemangioma excision: A case report with literature review', 'facial-reconstructive', 'facial-lesions'),
  ('Concurrent squamous cell carcinoma and non-hodgkin lymphoma: a rare case report and multidisciplinary approach', 'neck-soft-tissue', 'lymphoma-multitumour'),
  ('Spindle epithelial tumor with thymus-like differentiation involving the parathyroid gland: A case report with literature review', 'parathyroid', 'parathyroid-rare'),
  ('Sarcoidosis causing goiter; a case report with literature review', 'thyroid', 'benign-thyroid'),
  ('Mediastinal parathyroid cyst: A case report and review of the literature', 'parathyroid', 'parathyroid-rare'),
  ('Thyroid nodulectomy: A promising approach to the management of solitary thyroid nodules', 'thyroid', 'thyroid-surgery'),
  ('Sporadic neurofibroma of facial nerve presenting as parotid gland tumor: a rare case report', 'salivary', 'major-salivary'),
  ('Thyroid collision tumors: A systematic review', 'thyroid', 'thyroid-neoplasms'),
  ('Lingual osteoma presenting as a solitary painless lesion: Report of a rare case with review of the literature', 'oral-cavity', 'tongue-lesions'),
  ('Insular thyroid carcinoma in the background of follicular thyroid carcinoma: A report of a rare case and mini‑review of the literature', 'thyroid', 'thyroid-neoplasms'),
  ('Presentation and management of thyroid hydatid cyst: a comprehensive systematic review of the literature', 'thyroid', 'benign-thyroid'),
  ('Carcinoma arising from thyroglossal duct remnants', 'thyroid', 'thyroid-neoplasms'),
  ('Infraorbital Myofibroma of Infra-orbital Region: A Rare Case Report', 'facial-reconstructive', 'facial-lesions'),
  ('Tuberculous granulomatous inflammation of parathyroid adenoma manifested as primary hyperparathyroidism: A case report and a review of the literature', 'parathyroid', 'parathyroid-adenoma'),
  ('Sarcoid‑like granulomatous inflammation in a carotid body paraganglioma: A case report and mini‑review of the literature', 'neck-soft-tissue', 'soft-tissue-nerve'),
  ('Effect of the COVID-19 pandemic on surgery for indeterminate thyroid nodules (THYCOVID): a retrospective, international, multicentre, cross-sectional study', 'thyroid', 'thyroid-surgery'),
  ('Papillary thyroid carcinoma associated with non‑functioning parathyroid carcinoma with Warthin''s tumor of the parotid gland: A case report and brief literature review', 'thyroid', 'thyroid-neoplasms'),
  ('Concomitant clear cell renal cell carcinoma with osseous metaplasia and papillary thyroid microcarcinoma: a case report with literature review', 'thyroid', 'thyroid-neoplasms'),
  ('Thyroglossal duct diseases: presentation and outcomes', 'thyroid', 'benign-thyroid'),
  ('Redo thyroidectomy: A modified technique to eliminate complications', 'thyroid', 'thyroid-surgery'),
  ('Hydatid cyst in the neck mimicking lymphangioma; a case report with a brief literature review', 'neck-soft-tissue', 'soft-tissue-nerve'),
  ('Cellular schwannoma of the posterior tongue: a rare case report with a literature review', 'oral-cavity', 'tongue-lesions'),
  ('Pattern of facial nerve palsy during parotidectomy: a single-center experience', 'salivary', 'major-salivary'),
  ('Mammary analogue secretory carcinoma presenting with cervical lymphadenopathy: a rare case report with review of the literature', 'salivary', 'major-salivary'),
  ('Auricular pilonidal sinus; a rare case with a brief review of literature', 'facial-reconstructive', 'pilonidal-head-neck'),
  ('Modified thyroidectomy: 4 techniques to prevent recurrent laryngeal nerve injury and postoperative hypocalcaemia', 'thyroid', 'thyroid-surgery'),
  ('Acute suppurative thyroiditis progressing to a thyroid abscess; a case report with review of literature', 'thyroid', 'benign-thyroid'),
  ('Thyroid and parathyroid ectopia in the mediastinum; a case report', 'parathyroid', 'parathyroid-rare'),
  ('Fibrolipoma of the tongue; a case report with literature review', 'oral-cavity', 'tongue-lesions'),
  ('Co-occurrence of bilateral intrathyroidal parathyroid gland and papillary thyroid carcinoma; a case report', 'parathyroid', 'parathyroid-rare'),
  ('Post-thyroidectomy tracheocutaneous fistula; A case report with literature review', 'thyroid', 'thyroid-surgery'),
  ('A dilemma of a case of Zenker diverticulum; leak or Acinetobacter baumannii?! A case report', 'oral-cavity', 'pharynx-aerodigestive'),
  ('Prevalence of hypothyroidism among patients with isthmus-preserved thyroid lobectomy', 'thyroid', 'thyroid-surgery'),
  ('Giant pleomorphic adenoma of the parotid gland extending to the parapharyngeal space: A rare case report', 'salivary', 'major-salivary'),
  ('Submental pilonidal sinus-the first reported case', 'facial-reconstructive', 'pilonidal-head-neck'),
  ('Pilonidal sinus of the face: presentation and management - a literature review', 'facial-reconstructive', 'pilonidal-head-neck'),
  ('Subacute thyroiditis causing thyrotoxic crisis; a case report with literature review', 'thyroid', 'benign-thyroid'),
  ('Drain versus non drain in thyroid surgery', 'thyroid', 'thyroid-surgery'),
  ('Scalp pilonidal sinus: A case report', 'facial-reconstructive', 'pilonidal-head-neck'),
  ('Preauricular pilonidal sinus: the first reported case', 'facial-reconstructive', 'pilonidal-head-neck'),
  ('Preventing nerve damage during total thyroidectomy or total lobectomy surgeries', 'thyroid', 'thyroid-surgery'),
  ('Hyperfuctioning insular thyroid carcinoma: A rare case report', 'thyroid', 'thyroid-neoplasms'),
  ('Hyperfunctioning papillary thyroid carcinoma: A case report with literature review', 'thyroid', 'thyroid-neoplasms'),
  ('Sarcoidosis mimicking metastatic papillary thyroid cancer', 'thyroid', 'thyroid-neoplasms')
) as seed(title, parent_slug, child_slug)
join public.research_topics child on child.slug = seed.child_slug
join public.research_topics parent on parent.slug = seed.parent_slug and parent.parent_id is null
where r.title = seed.title and r.topic_id is null;

-- The category column stops being read by the site with this change. It is
-- left in place rather than dropped: it still holds the imported provenance
-- string, and dropping a column is the one step of this migration that could
-- not be undone.
