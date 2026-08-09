-- A visibly labelled placeholder so the poster archive grid can be reviewed.
-- It uses the normal Posters admin workflow and can be replaced or deleted.
insert into public.content_items (
  id, title, slug, summary, kind, status, access_level, poster_url, level,
  published_at, case_sections
) values (
  '74d3f9b8-9b75-4e8d-9f11-5b8c6d28c402',
  'Example: Outcomes After Thyroid Surgery',
  'example-thyroid-outcomes-poster',
  'A clearly labelled example poster for previewing the archive card layout. Replace or remove it from the Posters section in admin.',
  'poster', 'published', 'public', '/posters/example-thyroid-outcomes-poster.svg',
  'Example poster · Layout preview', '2026-08-01T00:00:00Z',
  '[{"key":"overview","label":"About this example","body":"<p>This placeholder exists only to demonstrate how additional posters appear in the collection grid.</p>"},{"key":"note","label":"Admin note","body":"<p>Replace its image and written details, or delete it, from the Posters section in admin when a real poster is ready.</p>"}]'::jsonb
)
on conflict (id) do nothing;
