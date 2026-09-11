Update the entries schema and add a DESIGN.md documenting the UX rework.

## 1. Schema migration

The `entries` table needs to change to match `schema-entries-v2.sql` in this
repo. Write this as a proper migration (e.g. a new file in your migrations
folder), not a raw overwrite — the table may already exist with test data
in it, so use `ALTER TABLE` statements rather than dropping and recreating.

Changes needed:
- Replace the old generic `tags text[]` column with three separate fields:
  - `location text` — freeform, single value
  - `emotions text[] default '{}'` — freeform, can hold multiple values
  - `custom_tags text[] default '{}'` — freeform, general-purpose tags
- Add fuzzy-date support for the "date" tag category:
  - `memory_date_start date`
  - `memory_date_end date`
  - `memory_date_precision text check (memory_date_precision in ('day', 'month', 'year'))`
  - These represent the date range the memory refers to (not when the
    entry was written — that's still `created_at`). Exact days store
    `start = end`. A year-only tag stores Jan 1–Dec 31 of that year. A
    month-only tag stores the first–last day of that month.
  - When the user picks the "today" quick-pick option, set
    `memory_date_precision` to `'day'` — same as if they'd manually picked
    today's date from the calendar. There's no separate precision value
    for "used the shortcut" vs. "picked it manually."
- Add indexes: a plain index on `location`, GIN indexes on `emotions` and
  `custom_tags` for filtering, and an index on
  `(memory_date_start, memory_date_end)` for date-range queries.
- Keep RLS policies and the `updated_at` trigger as they are in
  `schema-entries-v2.sql` — just confirm they still apply after the
  migration.

No new lookup/suggestion table is needed for location/emotion/custom
autocomplete — query each user's own distinct past values for suggestions
at this scale (~15 users).

## 2. Add DESIGN.md

`DESIGN.md` is provided alongside this prompt — place it at the repo root
as-is. Read it before building any screens for the entry-creation flow or
entry list, and treat it as the source of truth for these UX decisions
over anything implied elsewhere. If anything in it seems to conflict with
the current schema or CLAUDE.md, flag that rather than silently picking
one.
