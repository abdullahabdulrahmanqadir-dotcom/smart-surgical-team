-- One-time correction of the legacy import order.
--
-- The gallery cases were imported from the hospital records back to front, so
-- the row that was inserted last is in fact the oldest case. Listings sort on
-- published_at descending, which put the archive upside down.
--
-- This mirrors published_at across the existing rows: the timestamps stay the
-- same set of values, they are simply handed to the opposite rows. Nothing in
-- the application changes, so anything published from now on receives a fresh
-- now() timestamp — later than every value below — and correctly appears as
-- the newest item.
--
-- Safe to run once. Re-running would flip the archive back again.

with ordered as (
  select
    id,
    published_at,
    row_number() over (order by published_at asc, created_at asc, id asc) as asc_rank,
    row_number() over (order by published_at desc, created_at desc, id desc) as desc_rank
  from public.content_items
  where published_at is not null
),
swapped as (
  select a.id, b.published_at as new_published_at
  from ordered a
  join ordered b on b.desc_rank = a.asc_rank
)
update public.content_items as c
set published_at = s.new_published_at
from swapped as s
where c.id = s.id
  and c.published_at is distinct from s.new_published_at;
