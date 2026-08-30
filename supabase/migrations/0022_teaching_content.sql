-- Teaching & reference material from the legacy ssthyroid.com gallery.
--
-- The old gallery mixed two things the new site had no way to tell apart:
-- clinical cases (a patient, a procedure, an outcome) and teaching material
-- (Thyroid Anatomy, TIRADS scoring, histopathology subtype slide sets). The
-- teaching items file under the same topic taxonomy and are read the same way,
-- so they are ordinary `content_items` — they only need to be separable in the
-- Topics library's format filter.
--
-- This is a flag rather than a new `content_kind` value because teaching-ness
-- is orthogonal to media format: a teaching item can be an article or a video,
-- exactly as a case can. Folding it into `kind` would have forced every
-- `kind === "video"` check in the app to grow a second branch.
alter table public.content_items
  add column if not exists is_teaching boolean not null default false;

comment on column public.content_items.is_teaching is
  'Teaching & reference material rather than a clinical case. Drives the "Teaching & reference" option in the Topics library format filter and the card badge.';

-- Published-content reads always filter on status first, so the flag only ever
-- narrows an already small result set and needs no index of its own.
