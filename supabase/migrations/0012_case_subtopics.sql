-- Rebuild the sub-topic taxonomy around the cases that actually exist.
--
-- The imported cases were filed inconsistently: many carried only a parent
-- topic, several carried a sub-topic that did not describe the case, and the
-- taxonomy itself held buckets with no content (follicular carcinoma, medullary
-- carcinoma) while the recurring patterns in the archive — vascular
-- malformations, pleomorphic adenoma, revision thyroid surgery — had no bucket
-- at all.
--
-- This migration:
--   1. reshapes the sub-topic list to the groupings found in the 59 cases,
--   2. clears every existing case→topic assignment,
--   3. re-files each case under exactly one sub-topic, with its parent topic
--      attached automatically so group-level filtering keeps working.
--
-- Keep this file in step with TOPIC_GROUPS in app/lib/topics.ts.

-- 1. Sub-topics -------------------------------------------------------------

insert into public.topics (name, slug, parent_id, sort_order)
select child.name, child.slug, parent.id, child.sort_order
from (
  values
    ('Papillary Thyroid Carcinoma',        'papillary-carcinoma',         'thyroid-parathyroid', 11),
    ('Multinodular Goiter',                'goiter',                      'thyroid-parathyroid', 12),
    ('Thyroglossal & Ectopic Thyroid',     'thyroglossal-cyst',           'thyroid-parathyroid', 13),
    ('Parathyroid Disease',                'parathyroid',                 'thyroid-parathyroid', 14),
    ('Thyroid Nodules & Cysts',            'thyroid-nodules',             'thyroid-parathyroid', 15),
    ('Anaplastic & Aggressive Carcinoma',  'anaplastic-carcinoma',        'thyroid-parathyroid', 16),
    ('Revision & Post-Operative Thyroid',  'revision-thyroid-surgery',    'thyroid-parathyroid', 17),
    ('Pleomorphic Adenoma',                'pleomorphic-adenoma',         'salivary-glands',     21),
    ('Other Benign Salivary Tumours',      'benign-salivary-tumours',     'salivary-glands',     22),
    ('Salivary Gland Malignancy',          'salivary-malignancy',         'salivary-glands',     23),
    ('Sialolithiasis & Sialadenitis',      'sialolithiasis-sialadenitis', 'salivary-glands',     24),
    ('Vascular & Lymphatic Malformations', 'vascular-malformations',      'neck-lymphatic',      31),
    ('Congenital Neck Cysts',              'congenital-neck-cysts',       'neck-lymphatic',      32),
    ('Lymphoma',                           'lymphoma',                    'neck-lymphatic',      33),
    ('Squamous Cell Carcinoma',            'squamous-cell-carcinoma',     'skin-soft-tissue',    41),
    ('Basal Cell Carcinoma',               'basal-cell-carcinoma',        'skin-soft-tissue',    42),
    ('Benign Soft-Tissue Lesions',         'benign-soft-tissue',          'skin-soft-tissue',    43)
) as child(name, slug, parent_slug, sort_order)
join public.topics as parent on parent.slug = child.parent_slug
on conflict (slug) do update set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

-- Retired buckets: either empty (no case in the archive) or replaced by a
-- grouping that describes the pathology rather than the anatomical site.
delete from public.topics
where slug in (
  'follicular-carcinoma', 'medullary-carcinoma',
  'parotid', 'submandibular',
  'lymph-nodes', 'neck-masses',
  'skin-lesions'
);

-- 2 & 3. Re-file every case -------------------------------------------------

delete from public.content_topics;

with assignment(content_slug, topic_slug) as (
  values
    -- Thyroid & Parathyroid
    ('parathyroid-carcinoma-and-papillary-thyroid-carcinoma-in-a-case-of-recurrent-multinodular-goiter', 'papillary-carcinoma'),
    ('recurrent-papillary-thyroid-carcinoma-with-bilateral-lateral-cervical-lymph-node-metastasis', 'papillary-carcinoma'),
    ('papillary-thyroid-carcinoma-with-coexisting-right-branchial-cleft-cyst-in-a-29-year-old-male', 'papillary-carcinoma'),
    ('papillary-thyroid-carcinoma-in-a-pregnant-patient-with-long-standing-graves-disease', 'papillary-carcinoma'),
    ('elevated-thyroglobulin-in-postoperative-follow-up-of-metastatic-papillary-thyroid-carcinoma-ptc', 'papillary-carcinoma'),
    ('ptc-total-thyroidectomy-and-central-and-lateral-ln-neck-dissection', 'papillary-carcinoma'),

    ('massive-multinodular-goiter-with-retrosternal-extension-in-a-patient-with-long-standing-thyroid-', 'goiter'),
    ('long-standing-neck-swelling-due-to-multinodular-goiter-with-retrosternal-extension', 'goiter'),
    ('management-of-a-58-year-old-female-with-recurrent-multinodular-goiter-mng', 'goiter'),
    ('cystic-nodule-with-multinodular-goiter-and-branchial-cleft-cyst', 'goiter'),
    ('recurrent-multinodular-goiter-in-a-61-year-old-female', 'goiter'),

    ('papillary-thyroid-carcinoma-with-thyroglossal-duct-cyst-malignancy-in-a-49-year-old-male', 'thyroglossal-cyst'),
    ('papillary-thyroid-carcinoma-ptc-arising-from-thyroglossal-duct-cyst-tgdc', 'thyroglossal-cyst'),
    ('asymptomatic-thyroglossal-duct-cyst-in-a-20-years-old-male', 'thyroglossal-cyst'),
    ('management-of-a-complicated-thyroglossal-duct-cyst-in-a-5-year-old-child', 'thyroglossal-cyst'),
    ('hypothyroidism-and-ectopic-thyroid-tissue-in-a-22-year-old-female', 'thyroglossal-cyst'),
    ('ectopic-thyroid-tissue-in-a-35-year-old-female', 'thyroglossal-cyst'),

    ('vascular-malformation-mimicking-parathyroid-adenoma-in-a-16-year-old-female-with-elevated-pth', 'parathyroid'),
    ('management-of-a-50-year-old-female-with-palpitation-weight-loss-eye-protrusion-and-incidental-pa', 'parathyroid'),
    ('parathyroid-cyst-in-a-46-year-old-female', 'parathyroid'),

    ('tender-left-thyroid-swelling-due-to-hemorrhagic-cyst-in-a-hyperplastic-nodule-a-benign-mimic-of', 'thyroid-nodules'),
    ('exophytic-thyroid-mass-mimicking-paraganglioma-in-a-48-year-old-female', 'thyroid-nodules'),
    ('a-46-year-old-female-presented-with-a-3-month-history-of-anterior-neck-swelling', 'thyroid-nodules'),
    ('anterior-neck-swelling-in-a-3-year-old-female', 'thyroid-nodules'),

    ('anaplastic-thyroid-carcinoma-with-high-grade-papillary-components-in-a-72-year-old-female', 'anaplastic-carcinoma'),
    ('incidental-finding-of-anaplastic-thyroid-carcinoma-in-a-67-year-old-female', 'anaplastic-carcinoma'),

    ('recurrent-multinodular-goiter-in-a-patient-with-prior-thyroid-surgery', 'revision-thyroid-surgery'),
    ('recurrent-multinodular-goiter-post-thyroid-surgery', 'revision-thyroid-surgery'),
    ('post-thyroidectomy-sinus-formation-in-a-34-year-old-female', 'revision-thyroid-surgery'),

    -- Salivary Glands
    ('recurrent-multifocal-pleomorphic-adenoma-of-the-right-parotid-gland-in-a-37-year-old-male', 'pleomorphic-adenoma'),
    ('left-infra-auricular-mass-diagnosed-as-pleomorphic-adenoma', 'pleomorphic-adenoma'),
    ('pleomorphic-adenoma-of-the-right-parotid-gland-in-a-51-year-old-female-with-multinodular-goiter', 'pleomorphic-adenoma'),
    ('pleomorphic-adenoma-of-the-right-parotid-gland', 'pleomorphic-adenoma'),

    ('lipoma-of-the-left-parotid-gland-in-a-38-year-old-male', 'benign-salivary-tumours'),
    ('benign-oncocytic-neoplasm-of-the-right-parotid-gland-in-a-45-year-old-male', 'benign-salivary-tumours'),
    ('management-of-a-58-year-old-male-with-a-right-preauricular-mass', 'benign-salivary-tumours'),
    ('management-of-a-74-year-old-female-with-hyperthyroidism-and-right-preauricular-swelling', 'benign-salivary-tumours'),
    ('right-submandibular-mass-oncocytic-cyst', 'benign-salivary-tumours'),

    ('recurrent-suspicion-following-low-grade-mucoepidermoid-carcinoma-of-the-left-parotid-in-a-22-yea', 'salivary-malignancy'),
    ('high-grade-adenocarcinoma-of-the-parotid-gland-with-cervical-lymph-node-metastasis', 'salivary-malignancy'),

    ('right-submandibular-sialolithiasis-with-non-specific-sialadenitis-copy-copy', 'sialolithiasis-sialadenitis'),
    ('retention-mucous-cyst-ranula-with-nonspecific-sialadenitis-in-a-38-year-old-female', 'sialolithiasis-sialadenitis'),

    -- Neck & Lymphatic
    ('left-parotid-av-malformation-in-a-32-year-old-male', 'vascular-malformations'),
    ('lymphangioma-of-the-left-neck-in-a-56-year-old-male', 'vascular-malformations'),
    ('right-sided-cervical-lymphangioma-in-a-35-year-old-female-excision-and-benign-outcome', 'vascular-malformations'),
    ('vascular-malformation-of-the-right-nasal-wall-and-cheek', 'vascular-malformations'),
    ('hemangioma-in-a-16-year-old-female', 'vascular-malformations'),
    ('vascular-malformation-with-discordant-ultrasound-features-in-a-12-year-old-boy', 'vascular-malformations'),

    ('management-of-a-40-year-old-male-with-an-infected-second-branchial-cleft-cyst', 'congenital-neck-cysts'),
    ('dermoid-cyst-with-inflammation-in-a-21-year-old-male', 'congenital-neck-cysts'),

    ('hodgkin-s-lymphoma-in-a-27-year-old-female', 'lymphoma'),
    ('non-hodgkin-s-lymphoma-in-an-85-year-old-male', 'lymphoma'),

    -- Skin & Soft Tissue
    ('recurrent-moderately-differentiated-squamous-cell-carcinoma-of-the-lower-lip-in-a-58-year-old-ma', 'squamous-cell-carcinoma'),
    ('right-nasal-squamous-cell-carcinoma-with-postoperative-surveillance-and-supra-omohyoid-neck-diss', 'squamous-cell-carcinoma'),
    ('recurrent-poorly-differentiated-squamous-cell-carcinoma-of-the-lower-lip-in-a-66-year-old-male', 'squamous-cell-carcinoma'),

    ('right-lower-eyelid-basal-cell-carcinoma-treated-with-wide-local-excision-and-nasolabial-transpos', 'basal-cell-carcinoma'),
    ('left-preauricular-basal-cell-carcinoma', 'basal-cell-carcinoma'),

    ('management-of-a-22-year-old-male-with-a-swelling-in-the-right-post-auricular-region', 'benign-soft-tissue'),
    ('neurofibroma-of-the-tongue-in-a-14-year-old-female', 'benign-soft-tissue')
),
-- Each case is filed under its sub-topic and, so that group-level filters and
-- the topic landing pages keep matching, under that sub-topic's parent as well.
resolved as (
  select content.id as content_id, sub.id as topic_id
  from assignment
  join public.content_items as content on content.slug = assignment.content_slug
  join public.topics as sub on sub.slug = assignment.topic_slug
  union
  select content.id, sub.parent_id
  from assignment
  join public.content_items as content on content.slug = assignment.content_slug
  join public.topics as sub on sub.slug = assignment.topic_slug
  where sub.parent_id is not null
)
insert into public.content_topics (content_id, topic_id)
select content_id, topic_id from resolved
on conflict do nothing;
