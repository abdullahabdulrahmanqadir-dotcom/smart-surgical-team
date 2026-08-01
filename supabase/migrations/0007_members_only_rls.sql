-- Close the members-only read gap.
--
-- `content_items` gained an `access_level` column in 0003, but the select
-- policy written in 0001 still only checked `status = 'published'`. Because the
-- anon key is shipped to the browser, anyone could read every members-only case
-- article in full — body_html and all five case-summary fields — straight from
-- the REST endpoint, bypassing /api/library/[id] and MemberContentGate
-- entirely. `content_media` (0003) already got this right; these tables did not.
--
-- The public site is unaffected: app/lib/content.ts reads through the
-- service-role client, which is not subject to row-level security. Only
-- untrusted anon/authenticated callers are constrained here.

drop policy if exists "published content is readable" on public.content_items;
create policy "published public content is readable" on public.content_items
  for select using (status = 'published' and access_level = 'public');

drop policy if exists "chapters are readable for published content" on public.content_chapters;
create policy "chapters are readable for published public content" on public.content_chapters
  for select using (exists (
    select 1 from public.content_items
    where id = content_id and status = 'published' and access_level = 'public'
  ));

-- The join tables leak which contributors and topics a members-only item is
-- filed under. The rows are only ids, but there is no reason to expose them.
drop policy if exists "content topics are readable" on public.content_topics;
create policy "content topics are readable for published public content" on public.content_topics
  for select using (exists (
    select 1 from public.content_items
    where id = content_id and status = 'published' and access_level = 'public'
  ));

drop policy if exists "content contributors are readable" on public.content_contributors;
create policy "content contributors are readable for published public content" on public.content_contributors
  for select using (exists (
    select 1 from public.content_items
    where id = content_id and status = 'published' and access_level = 'public'
  ));
