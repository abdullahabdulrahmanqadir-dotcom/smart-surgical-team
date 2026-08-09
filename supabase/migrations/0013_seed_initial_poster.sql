-- Posters share the established content publishing workflow: status, ordering,
-- contributors, rich-text sections and media permissions all stay consistent.
insert into public.content_items (
  id, title, slug, summary, kind, status, access_level, poster_url, level,
  published_at, case_sections
) values (
  '90e22640-c65f-4d07-a979-74cbb079bbdc',
  'Rare Insights: Epithelial-Myoepithelial Carcinoma of Salivary Glands',
  'epithelial-myoepithelial-carcinoma-salivary-glands',
  'A single-centre Iraqi cohort examining the clinical presentation, surgical management and short-term outcomes of this ultra-rare salivary gland tumour.',
  'poster', 'published', 'public', '/posters/emc-salivary-glands-cohort.jpg',
  '5-patient cohort study · 2020–2025', '2026-08-09T00:00:00Z',
  '[{"key":"overview","label":"Study overview","body":"<p>This single-centre cohort describes five patients treated for epithelial-myoepithelial carcinoma of the salivary glands between 2020 and 2025.</p>"},{"key":"findings","label":"Key findings","body":"<p>The cohort showed no recurrence during a mean follow-up of 24 months, with 100% patient survival and no nodal or distant metastases identified.</p>"}]'::jsonb
)
on conflict (id) do nothing;
