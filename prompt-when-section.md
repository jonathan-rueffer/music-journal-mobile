Implement the "When" tag row on the quick-capture screen, per DESIGN.md.

This is the date tag category, labeled "When" (not "Date") since it can hold
an exact day, just a month, or just a year. Maps to memory_date_start,
memory_date_end, and memory_date_precision on song_memories (schema-v3.sql).

## Design: flat Year / Month / Day fields, no pop-up sheet

Earlier drafts used a telescoping breadcrumb picker in a bottom sheet -
scrap that. The final design is much simpler and lives inline, expanding
directly under the "When" row on the capture screen itself (no modal, no
sheet, no separate screen):

- Three fields side by side: Year, Month, Day.
- Year has no default - the user picks one (a simple list/wheel, most
  recent years first).
- Month and Day both default to "Any" (unset/optional). Visually, "Any"
  uses the same dashed-outline, muted-text treatment as other not-yet-
  applied UI in this app - it should look clearly optional, not broken
  or incomplete.
- Tapping any field opens a lightweight picker for just that field (a
  simple list or wheel) - not a multi-level drill-down, not a modal
  sheet. Each field is independent and quick to change.
- A small "Use today" text link sits above the three fields (not a big
  button) - tapping it fills all three fields (year, month, day) to
  today's date at once. It must NOT appear pre-selected/already-applied
  before being tapped - it's a shortcut into the same three fields, not
  a structurally different action or a default state.
- A live summary line below the three fields reflects the current
  precision as the user fills fields in, e.g. "Applies as 'March 2022'"
  if only year+month are set, or the full date if all three are set.
  This replaces any need for a separate "use just X" confirm button per
  level - there is no confirm button anymore. Precision is derived
  directly from which fields are filled in:
  - Year only -> memory_date_precision = 'year', range = Jan 1-Dec 31
    of that year
  - Year + Month -> memory_date_precision = 'month', range = first-last
    day of that month
  - Year + Month + Day -> memory_date_precision = 'day', range = start
    = end = that day
- Applying the tag happens as part of the normal save flow for the tag
  (same as the other four tag categories) - there's no separate confirm
  step specific to When.

## Display

Once applied, the "When" row on the main capture screen shows a single
tag reflecting the chosen precision - e.g. "Today", "March 2022", or
"2019" - not raw date values, using the same solid-fill "applied tag"
style as the other tag categories. Tapping an applied "When" tag should
reopen the Year/Month/Day fields pre-populated with the previously
selected values, so the user can adjust without starting from scratch.

## Visual style

Apply the Polaroid palette from DESIGN.md:
- Warm cream/tan background (#F4EDE0 page, #FFFDF8 field surfaces, #D9CBB0
  borders), consistent with the rest of the app.
- Sunset coral (#D85A30) for the applied "When" tag once a value is set.
- The "Any" state on Month/Day uses a dashed #C2A87E border with muted
  #8A5A3B text, matching the "not yet applied" style used elsewhere.
