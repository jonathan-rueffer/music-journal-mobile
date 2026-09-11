# Design decisions — music memory app

This supersedes any earlier DESIGN.md. The app pivoted from a straightforward
"journal entries about songs" concept to a tag-focused memory explorer built
around songs and the life events they connect to. This file is the source of
truth for that current design, and aligns with schema-v3.sql — if a future
change conflicts with something here, update both together rather than
letting them drift apart.

## Core concept

The app is a central place to store and explore the memories you associate
with songs. The primary act is tagging a song with context (when, where, how
it felt, what chapter of life it belongs to) — not writing about it. Writing
is a fully optional add-on, not the main event.

There is no title field on a memory. This isn't a titled-journal-entry app —
a memory is a song plus tags plus an optional note, nothing more.

## Object model (see schema-v3.sql)

Two independent object types, linked many-to-many:

- **Song memory** (`song_memories` table) — the atomic unit. A specific song
  (`song_id`) plus whatever context you attach to it: tags and an optional
  `note`. Can exist entirely on its own with no event attached — a song
  memory never requires a bigger story around it.
- **Event** (`events` table) — a life period or occasion (e.g. "freshman
  year college", "walking to robotics in high school"). Not a
  separately-managed object with its own creation flow — see "Event is
  just a tag" below. Scoped per user, name is unique per user.

The link between them is the `song_memory_events` junction table. A song
memory can link to zero, one, or several events; the same song can
legitimately appear under multiple events (a song from "freshman year" can
also belong to "songs that get me through finals"). Tags and emotions on a
song memory and on any event it belongs to are independent and can diverge
freely — a song tagged "anxious" can sit inside an otherwise "nostalgic"
event without that being a contradiction to resolve.

## Event is just a tag

There is no separate "create an event" flow. Event is a fifth tag category,
applied to a song exactly the same way as location, emotion, or custom tags:
type a name, and if it matches an existing row in `events` it links to it
(inserts into `song_memory_events`); if it's new, the `events` row is
created implicitly at the same time. This keeps event-linking from feeling
like a structurally different action from ordinary tagging — the user is
always just tagging a song, even though underneath it's touching two tables.

Because of this, there's no "Song" vs "Event" badge or type distinction
anywhere in the UI. An event's own page (reachable by tapping an applied
event tag) shows its linked songs, functioning as a natural "browse by
event" view — but it isn't a separately-authored object with its own photo
or creation screen. The `events` table itself has no photo or note field,
by design — see schema-v3.sql.

## Capture flow: single screen, tag-focused, text optional

Creating a memory is one screen, not a multi-step wizard:

1. Pick a song (search).
2. Tag rows, in this order: Event, When, Location, Emotion, Custom.
   Every row is optional. Maps to: Event -> song_memory_events / events,
   When -> memory_date_start/end/precision, Location -> location,
   Emotion -> emotions, Custom -> custom_tags.
3. "Add a note" sits below the tags, collapsed by default (tap to expand).
   Maps to song_memories.note. Writing is the least prominent element on
   the screen, on purpose.
4. Save is enabled as soon as a song is picked — everything else, including
   every tag, is skippable. Only song_id is required on song_memories.

No photo capture for now — dropped entirely from the MVP scope (was
considered for both events and songs; cut for both to keep the first
version simple). No title field either — see Core concept above.

## Tag adding: search over your own history

Tapping "+ add" on any tag row opens a search field, not a fixed list. It
filters your own previously-used values for that category as you type
(for Event: matching rows from the user's own `events`; for Location/
Emotion/Custom: distinct past values from the user's own `song_memories`),
sorted by how often you've used them, with a "Create '<what you typed>'"
option surfacing when nothing matches. Same interaction for all five tag
categories — no special-casing needed, and no separate lookup/suggestion
table required at this user scale (~15 users).

## Applied vs. suggested tags must look visually distinct

This distinction matters and should not be blurred:

- Applied tag (already part of this memory): solid color fill, a visible
  X to remove it.
- Suggested-but-not-applied tag (a shortcut to something you've used
  before, shown proactively to speed up tagging): dashed outline, muted
  text color, no X. Tapping it applies it — until then it is not part of
  the memory.

A brand-new memory should show no solid-filled tags at all — only
dashed "add" affordances and, optionally, a couple of dashed suggestion
chips per category (most recent/frequent values). Never pre-fill a tag as
if it were already decided; that misrepresents what the user has actually
told the app.

## "When" (the date tag)

Labeled "When," not "Date" — "Date" implies a specific day is expected,
which isn't true here; entries can be tagged with just a year or just a
month.

Input is a drill-down picker, not a fixed set of quick-pick buttons:
- A "Today" shortcut sits above everything else, for the common case of
  logging something happening right now — no drilling required.
- Below that, a year list to start from. Selecting a year shows a
  "Use just '<year>'" confirm action plus a month grid to narrow further.
  Selecting a month shows the same confirm-at-this-level action plus a day
  grid. The user can stop at any level.
- The precision picked this way (day / month / year) maps directly to
  `memory_date_precision` in schema-v3.sql; the underlying stored range
  (`memory_date_start` / `memory_date_end`) narrows as the user drills
  deeper (a year-only tag stores Jan 1-Dec 31 of that year, etc.). Using
  the "Today" shortcut sets the same 'day' precision as manually picking
  today's date from the calendar — there is no separate state for "used
  the shortcut."

## Browsing

Three entry points, all first-class:
- By event — an event's page lists every song memory linked to it via
  song_memory_events.
- By individual song memory — chronological or filtered by tag.
- By song — every memory/event referencing a specific song (via song_id),
  across the user's whole history.

## Visual style notes

The functional mockups so far are intentionally neutral (matching the tool
they were built in), not a final visual identity. Directional notes worth
carrying into actual implementation:
- A distinct icon per tag category row (not just a text label) breaks up
  what would otherwise be a repetitive stack of identical-looking rows.
- Warmer, less default-blue accent choices suit a personal memory app
  better than a neutral corporate palette — pick real brand colors
  deliberately rather than defaulting to whatever the component library
  ships with.
- Rounded, soft corners and generous spacing throughout; avoid a dense,
  flat, form-like feel given how personal the content is.
- This level of polish (real typography, transitions, micro-animations on
  tagging) is Claude Code's responsibility to actually design, not just
  wire up functionally — call this out explicitly when prompting so visual
  design doesn't become an afterthought behind the functional work.

## Visual style: Polaroid / vintage-Instagram palette

The color palette is Polaroid-themed — warm, vintage camera tones, in the
spirit of the old (pre-2016) Instagram logo's sunset gradient and brown
leather camera body. This is a deliberate departure from a neutral
corporate palette; it should read as nostalgic and warm throughout, not
just accented with a warm color on an otherwise neutral theme.

Core palette:

RoleColorHexUse
BackgroundCream#F4EDE0Page background
SurfaceWarm white#FFFDF8Cards
Primary textLeather brown#5A3B26Headings
Secondary textMid brown#8A5A3BLabels, secondary copy
BorderWarm tan#D9CBB0Card borders, dashed "add" chip outlines
Primary accentSunset coral#D85A30Save button, "Today" shortcut, primary actions
Event tagGolden mustard#E0A034Event chips
Location tagFaded teal#3E7A72Location chips

Only one accent-filled primary action per screen (matching the existing
UI restraint principle) — the coral save/confirm action should stand alone
per screen, not compete with other coral-filled elements.

## Emotion tag colors: a scalable, deterministic system

Emotions are freeform text with no limit on how many distinct words a user
creates, so colors can't be manually assigned one-by-one. The system:

Tier 1 — curated valence lexicon. A small bundled list maps common
emotion words to a family based on their emotional tone, reusing the
palette above rather than introducing new hues:


Warm, high-energy positive (happy, excited, elated) -> coral family
Warm, calm positive (nostalgic, content, grateful) -> mustard/gold family
Cool, calm (peaceful, relaxed, serene) -> teal family
Cool, low-energy negative (sad, lonely, wistful) -> muted blue-slate family
Intense negative (angry, anxious, stressed) -> deep rust family


Tier 2 — deterministic shade within the family. Within a matched
family, hash the exact word to pick a specific shade, so related words
(e.g. "happy" and "excited") read as clearly part of the same family while
still being visually distinguishable from each other. This requires no
storage — the same word always produces the same color as a pure function
of the text.

Fallback for unrecognized words. Any emotion not in the lexicon
auto-assigns to a muted neutral family via the same hashing approach — no
prompt to the user, no extra lookup table or schema needed. This keeps the
whole emotion-coloring system fully deterministic and storage-free,
consistent with emotions being plain freeform text in song_memories.

Other visual style notes

A distinct icon per tag category row (not just a text label) breaks up
what would otherwise be a repetitive stack of identical-looking rows.
Rounded, soft corners and generous spacing throughout; avoid a dense,
flat, form-like feel given how personal the content is.
This level of polish (exact palette application, transitions,
micro-animations on tagging) is Claude Code's responsibility to actually
design, not just wire up functionally — call this out explicitly when
prompting so visual design doesn't become an afterthought behind the
functional work.

## Explicitly not in scope right now

- Titles on memories
- Photos (event or song level)
- Any auth method other than Spotify
- Offline support / local sync
- Push notifications
- Social features (sharing memories, following other users)
