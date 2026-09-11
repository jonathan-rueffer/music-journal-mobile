-- Replaces the single typed `tags` jsonb column with the four DESIGN.md tag
-- categories (location, emotions, custom_tags, fuzzy memory-date range).
-- Matches schema-entries-v2.sql. Existing rows are backfilled, not dropped.

alter table entries add column location text;
alter table entries add column emotions text[] default '{}';
alter table entries add column custom_tags text[] default '{}';
alter table entries add column memory_date_start date;
alter table entries add column memory_date_end date;
alter table entries add column memory_date_precision text
  check (memory_date_precision in ('day', 'month', 'year'));

-- Backfill emotions/custom_tags from the old typed-tags jsonb.
update entries
set emotions = coalesce(
      (select array_agg(t ->> 'name')
       from jsonb_array_elements(tags) as t
       where t ->> 'tag_type' = 'emotion'),
      '{}'
    ),
    custom_tags = coalesce(
      (select array_agg(t ->> 'name')
       from jsonb_array_elements(tags) as t
       where t ->> 'tag_type' = 'custom'),
      '{}'
    );

-- Best-effort backfill of old date-type tags into memory_date_*: old date tags
-- were freeform text with no enforced format, so only ones that already
-- happen to be ISO 'YYYY-MM-DD' are migrated as exact days. Anything else
-- (e.g. "12/12/12") is ambiguous and is left unmigrated (memory_date_* stays
-- null) rather than guessed at.
update entries
set memory_date_start = sub.d,
    memory_date_end = sub.d,
    memory_date_precision = 'day'
from (
  select e.id, (t ->> 'name')::date as d
  from entries e, jsonb_array_elements(e.tags) as t
  where t ->> 'tag_type' = 'date'
    and t ->> 'name' ~ '^\d{4}-\d{2}-\d{2}$'
) as sub
where entries.id = sub.id;

-- tags (typed jsonb) is fully superseded by the four columns above.
-- entry_date is dropped too: schema-entries-v2.sql has no equivalent column,
-- since created_at now covers "when the entry was written" and
-- memory_date_* covers "what date the memory is about" as a distinct,
-- optional concept.
alter table entries drop column tags;
alter table entries drop column entry_date;

create index idx_entries_location on entries(location);
create index idx_entries_emotions on entries using gin(emotions);
create index idx_entries_custom_tags on entries using gin(custom_tags);
create index idx_entries_memory_date on entries(memory_date_start, memory_date_end);
