-- Keep the case taxonomy aligned with the diagnosis each record ultimately
-- presents. The broad groups remain unchanged and every case below receives
-- one focused subtopic plus that subtopic's parent topic.

-- The only case filed as "Sarcoma" was ultimately diagnosed as a poorly
-- differentiated sebaceous carcinoma with sarcomatoid differentiation. Keep
-- a restrained catch-all for uncommon malignant skin/soft-tissue diagnoses
-- instead of creating a one-case pathology bucket.
update public.topics
set name = 'Other Skin Malignancies',
    slug = 'other-skin-malignancies'
where slug = 'sarcoma';

insert into public.topics (name, slug, parent_id, sort_order)
select 'Other Skin Malignancies', 'other-skin-malignancies', parent.id, 44
from public.topics as parent
where parent.slug = 'skin-soft-tissue'
on conflict (slug) do update set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

-- Re-file only the audited exceptions. This deliberately avoids touching the
-- correctly classified cases or rebuilding the whole join table.
with assignment(content_slug, topic_slug) as (
  values
    ('vascular-malformation-mimicking-parathyroid-adenoma-in-a-16-year-old-female-with-elevated-pth', 'vascular-malformations'),
    ('parathyroid-carcinoma-and-papillary-thyroid-carcinoma-in-a-case-of-recurrent-multinodular-goiter', 'parathyroid'),
    ('management-of-a-58-year-old-female-with-recurrent-multinodular-goiter-mng', 'revision-thyroid-surgery'),
    ('recurrent-multinodular-goiter-in-a-61-year-old-female', 'revision-thyroid-surgery'),
    ('right-submandibular-region-dermoid-cyst', 'congenital-neck-cysts'),
    ('right-wle-of-type-1-first-branchial-cyst-in-12yrs-old-male', 'congenital-neck-cysts'),
    ('scc-case-for-98yrs-female-wle-flap-under-local-anesthesia-and-sedation', 'squamous-cell-carcinoma'),
    ('case-of-large-ulcerated-recurrent-scc-on-the-left-shoulder-wle-flap-was-done', 'squamous-cell-carcinoma'),
    ('case-of-excisional-biopsy-preformed-for-a-cystic-lesion-on-the-right-cheek', 'benign-soft-tissue'),
    ('case-of-wle-done-for-right-ear-lobe-scc', 'basal-cell-carcinoma')
), affected as (
  select content.id
  from assignment
  join public.content_items as content on content.slug = assignment.content_slug
)
delete from public.content_topics
where content_id in (select id from affected);

with assignment(content_slug, topic_slug) as (
  values
    ('vascular-malformation-mimicking-parathyroid-adenoma-in-a-16-year-old-female-with-elevated-pth', 'vascular-malformations'),
    ('parathyroid-carcinoma-and-papillary-thyroid-carcinoma-in-a-case-of-recurrent-multinodular-goiter', 'parathyroid'),
    ('management-of-a-58-year-old-female-with-recurrent-multinodular-goiter-mng', 'revision-thyroid-surgery'),
    ('recurrent-multinodular-goiter-in-a-61-year-old-female', 'revision-thyroid-surgery'),
    ('right-submandibular-region-dermoid-cyst', 'congenital-neck-cysts'),
    ('right-wle-of-type-1-first-branchial-cyst-in-12yrs-old-male', 'congenital-neck-cysts'),
    ('scc-case-for-98yrs-female-wle-flap-under-local-anesthesia-and-sedation', 'squamous-cell-carcinoma'),
    ('case-of-large-ulcerated-recurrent-scc-on-the-left-shoulder-wle-flap-was-done', 'squamous-cell-carcinoma'),
    ('case-of-excisional-biopsy-preformed-for-a-cystic-lesion-on-the-right-cheek', 'benign-soft-tissue'),
    ('case-of-wle-done-for-right-ear-lobe-scc', 'basal-cell-carcinoma')
), resolved as (
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

-- This one-off bucket described a cheek skin cyst, not salivary disease. Its
-- case now sits under the existing benign soft-tissue grouping.
delete from public.topics where slug = 'apocrine-cyst';
