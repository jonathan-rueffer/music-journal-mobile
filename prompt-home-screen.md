Implement the home screen, per DESIGN.md.

## Layout, top to bottom

1. Title: "Your memories"
2. Search bar (searches songs, tags, and event names)
3. One row containing: two view tabs on the left ("By event" / "All
   memories"), a "Filter" control on the right
4. The main content area, which changes based on the active tab (see below)
5. A floating "add memory" button (coral, circular, plus icon) that opens
   the quick-capture flow

## Views

Only two top-level views — do not build a third "By song" tab. Reaching a
specific song's page (showing every memory/event linked to it via
song_memories.song_id) happens by tapping that song's name or art from
anywhere in the app (an entry row, an event's song list, search results) —
it's a drill-down destination, not a primary nav tab.

- **By event** (default view): a 2-column grid of event cards, one per row
  in `events` that has at least one linked song_memory. Each card shows:
  - A 2x2 mini collage of album art from up to 4 of that event's linked
    songs (via song_memory_events -> song_memories -> songs.album_art_url).
    If fewer than 4 songs, leave remaining collage cells as a plain
    neutral fill (#F1EFE8), not blank/broken.
  - The event's name
  - A count of linked songs ("7 songs")
  Tapping a card opens that event's detail page (songs listed below the
  event, per the earlier event detail page design).

- **All memories**: a flat, reverse-chronological list of song_memories,
  grouped under date section headers (e.g. "July 2026", "2022") rather
  than one undifferentiated list. Each row shows: small album art, song
  title + artist, the linked event's name as a secondary line if one
  exists, and a left-border color accent + small pill reflecting the
  memory's primary emotion tag (reusing the emotion color system from
  DESIGN.md). Tapping a row opens that memory's detail/edit view.

## Filter control

Tapping "Filter" opens a small menu with exactly three options: Location,
Emotion, Custom — not a horizontal row of every possible tag value. Do NOT
show Location/Emotion/Custom as filter options while "By event" is the
active tab — per DESIGN.md, events don't carry their own tags (only their
linked songs do), so filtering by these facets only applies to "All
memories."

Tapping one of the three (e.g. "Emotion") opens the same
recent-plus-matching search interface already built for tag-adding, reused
here to pick a value to filter by rather than to apply. Once a value is
picked, show it as an applied filter chip (solid fill, with an X to
remove) next to the Filter control, and narrow the "All memories" list to
matching song_memories.

Multiple filters can be active at once (e.g. Emotion=Nostalgic AND
Location=Dorm room) — narrow the list to memories matching all active
filters, not any.

## Visual style

Apply the Polaroid palette from DESIGN.md throughout: cream page background
(#F4EDE0), warm-white cards (#FFFDF8), tan borders (#D9CBB0), coral accent
for the active tab and the add button (#D85A30). The active tab uses solid
coral fill; the inactive tab and the Filter control use the neutral
bordered/unfilled treatment.
