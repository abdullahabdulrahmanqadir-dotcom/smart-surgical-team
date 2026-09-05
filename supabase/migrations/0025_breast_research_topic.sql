-- Breast joins the research taxonomy.
--
-- `/research` was scoped to the team's head & neck output, and the breast work
-- from Dr. Abdulwahid's profile was deliberately left out. That decision is
-- reversed: the breast papers are the team's output too, and he is already
-- credited on the site as a head, neck and breast surgeon.
--
-- Breast arrives as a seventh major topic rather than as subtopics grafted onto
-- an existing one, because the topic drives the generated cover colour — a
-- separate topic is what makes the breast body of work read as its own group in
-- the archive grid. Its `rose` palette is added to app/lib/research-palettes.ts
-- in the same change; the six head & neck topics already hold the other six.
--
-- The last subtopic, 'Breast region & axilla', carries the papers whose lesion
-- is in the breast region rather than in breast tissue — intermammary and
-- inframammary pilonidal sinus, an axillary anatomical variant, chest wall
-- tuberculosis. Mixing those into 'Benign breast disease' would make that
-- filter dishonest, and the tree already has this exact shape: 'Pilonidal sinus
-- of the head & neck' sits beside 'Facial lesions & reconstruction'.
--
-- Safe to re-run: every insert is `on conflict (slug) do nothing`, so a re-run
-- never overwrites a name or palette the admin has since edited.

insert into public.research_topics (parent_id, name, slug, palette, sort_order) values
  (null, 'Breast', 'breast', 'rose', 7)
on conflict (slug) do nothing;

insert into public.research_topics (parent_id, name, slug, palette, sort_order)
select parent.id, child.name, child.slug, parent.palette, child.sort_order
from (values
  ('breast', 'Breast cancer & malignancy',         'breast-malignancy',   1),
  ('breast', 'Granulomatous mastitis',             'granulomatous-mastitis', 2),
  ('breast', 'Benign breast disease',              'benign-breast',       3),
  ('breast', 'Accessory & ectopic breast tissue',  'accessory-breast',    4),
  ('breast', 'Breast surgery & reconstruction',    'breast-surgery',      5),
  ('breast', 'Breast region & axilla',             'breast-region-axilla', 6)
) as child(parent_slug, name, slug, sort_order)
join public.research_topics parent on parent.slug = child.parent_slug and parent.parent_id is null
on conflict (slug) do nothing;
