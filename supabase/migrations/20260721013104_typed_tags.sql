-- Converts entries.tags from a flat text[] into a jsonb array of
-- {name, tag_type} objects, so tags can be categorized (emotion/date/custom)
-- and rendered as color-coded pills. Existing plain-text tags are migrated
-- with tag_type defaulted to 'custom'.
--
-- Done as add-column -> backfill -> swap, since ALTER COLUMN ... USING does
-- not allow a subquery in the transform expression.

alter table entries add column tags_new jsonb;

update entries
set tags_new = coalesce(
  (
    select jsonb_agg(jsonb_build_object('name', t, 'tag_type', 'custom'))
    from unnest(tags) as t
  ),
  '[]'::jsonb
);

alter table entries drop column tags;
alter table entries rename column tags_new to tags;

alter table entries
  alter column tags set default '[]'::jsonb,
  alter column tags set not null;

comment on column entries.tags is
  'jsonb array of {name: text, tag_type: ''emotion''|''date''|''custom''}';
