-- Keep the admin topic picker aligned with the public curriculum taxonomy.
-- Safe to run on an existing project: records are inserted or updated by slug.

insert into public.topics (name, slug, description, sort_order)
values
  ('Thyroid & Parathyroid', 'thyroid-parathyroid', 'Thyroid and parathyroid surgery.', 10),
  ('Salivary Glands', 'salivary-glands', 'Parotid and submandibular gland surgery.', 20),
  ('Neck & Lymphatic Surgery', 'neck-lymphatic', 'Neck dissection, staging and nodal disease.', 30),
  ('Skin & Soft Tissue', 'skin-soft-tissue', 'Head and neck skin and soft-tissue surgery.', 40)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.topics (name, slug, parent_id, sort_order)
select child.name, child.slug, parent.id, child.sort_order
from (
  values
    ('Papillary Carcinoma', 'papillary-carcinoma', 'thyroid-parathyroid', 11),
    ('Follicular Carcinoma', 'follicular-carcinoma', 'thyroid-parathyroid', 12),
    ('Medullary Carcinoma', 'medullary-carcinoma', 'thyroid-parathyroid', 13),
    ('Goiter', 'goiter', 'thyroid-parathyroid', 14),
    ('Thyroglossal Cyst', 'thyroglossal-cyst', 'thyroid-parathyroid', 15),
    ('Parathyroid', 'parathyroid', 'thyroid-parathyroid', 16),
    ('Parotid', 'parotid', 'salivary-glands', 21),
    ('Submandibular', 'submandibular', 'salivary-glands', 22),
    ('Lymph Nodes', 'lymph-nodes', 'neck-lymphatic', 31),
    ('Neck Masses', 'neck-masses', 'neck-lymphatic', 32),
    ('Skin Lesions', 'skin-lesions', 'skin-soft-tissue', 41)
) as child(name, slug, parent_slug, sort_order)
join public.topics as parent on parent.slug = child.parent_slug
on conflict (slug) do update set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;
