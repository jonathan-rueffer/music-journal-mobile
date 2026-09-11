# Design decisions — entry creation & entry list

This documents the UX choices made for the entry-creation flow and the
entry list view, and the reasoning behind them. Treat this as the source
of truth for these screens — if a future change conflicts with something
here, update this file rather than letting the two drift apart.

## Entry creation: a 3-step flow

Creating an entry is split into three separate screens, each with a
progress indicator at the top:

1. **Select a song** — search and pick the track this entry is about.
2. **Write the entry** — the journal text itself. This step should feel
   like a blank slate: no visible chrome competing with the writing.
3. **Title & tags** — name the entry and apply the four tag categories
   (below), then save.

Splitting these into distinct steps (rather than one long form) keeps each
screen focused on a single decision, and lets step 2 stay visually
uncluttered since none of the metadata UI is on screen while writing.

## Four tag categories

Each category uses a different input pattern, chosen to match how fuzzy or
precise that data actually is:

- **Location** — freeform text field with autocomplete suggestions drawn
  from the user's own previously-used locations. Single value per entry.
  No fixed preset list — people's locations are too personal and varied
  for presets to hold up.
- **Date** — represents *when the memory took place*, not when the entry
  was written (that's handled separately by `created_at`). Three ways to
  set it:
  - A **"today" quick-pick** for the common case of journaling about the
    present moment.
  - A **full calendar picker** for an exact past day.
  - **Reduced-precision options** for tagging just a month or just a year,
    for memories that don't have (or don't need) a specific day attached.
  Picking "today" via the quick-pick sets the same precision (`day`) as
  manually selecting today's date on the calendar — there's no separate
  state for "used the shortcut."
- **Emotion** — freeform text with autocomplete suggestions from the
  user's own past entries, not a fixed preset list. Can hold multiple
  values on one entry (a memory can be both nostalgic and happy at once).
- **Custom** — freeform tags for anything that doesn't fit the other three
  categories. Same input pattern as emotion.

Location and emotion both intentionally avoid fixed presets: suggestions
should come from the user's own history, not a preset list the app ships
with. At this user scale, this needs no separate lookup table — query each
user's own distinct past values for the relevant field to populate
autocomplete.

## Color-coding as a through-line

Whatever color an emotion tag is displayed with when it's applied during
entry creation should be the *same* color used to represent that emotion
everywhere else it appears — most importantly, as a small pill and a
subtle left-border accent on that entry's card in the list view.

The goal: the entry list should be scannable as an emotional timeline at a
glance, without needing to read each entry's text or tap into it. This
only works if the color mapping is consistent across screens rather than
assigned per-view.

## Album art

Every place a song is shown — entry cards in the list, the entry detail
view, and the song picker during entry creation — should use the real
Spotify album art (`songs.album_art_url`), not a placeholder or generic
music icon. It's the strongest visual anchor tying an entry back to its
song and is worth the extra fetch/cache versus a generic fallback.

## Entry list: filtering

The list view includes filter chips (e.g. "All", a specific emotion,
"this month") above the entry list. These should be combinable — a user
should be able to filter by an emotion *and* a time range at once, not
just one filter category at a time. This matters more as the four tag
categories accumulate real data; a single-filter-at-a-time list stops
being useful quickly once someone has more than a handful of entries.

## Reference mockups

Two mockups were used as visual reference for this design:
- The **entry creation, step 3** screen: title field, then each of the
  four tag categories in its own labeled row, ending in a save button.
- The **entry list** screen: cards showing album art, song title/artist,
  an emotion pill, a subtle color-matched left border, filter chips at
  the top, and a persistent floating add button.
