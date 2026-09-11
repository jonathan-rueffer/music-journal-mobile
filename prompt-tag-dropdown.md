Implement the autocomplete dropdown for the Event, Location, Emotion, and
Custom tag rows on the quick-capture screen, per DESIGN.md's tag-adding
approach. Same inline pattern as the "When" fields — no modal or sheet.

## Behavior

Tapping a tag row's "+ add" turns it into a text input. Directly below the
input, a dropdown list appears and updates live:

- Empty input: show a small "Recent" heading, then the user's most
  recently-used values for that category (query the user's own past
  song_memories/events, no separate suggestions table needed at this
  scale).
- As the user types: switch to showing values that match the input
  (substring match), sorted by how often the user has used them, most-used
  first.
- If nothing matches what's typed, show a "Create '<input>'" row at the
  bottom of the list.
- Tapping any row (a suggestion or "Create") applies that value as a tag
  and closes the dropdown, returning to the normal tag-row display.

## Visual style

- The input and dropdown should look like one connected control, not an
  input with a separate floating menu: dropdown sits flush against the
  input's bottom edge, no gap, matching border color continuing from the
  input into the list (flat top corners on the dropdown, rounded bottom
  corners only).
- While a value is being typed, bold the matching substring within each
  suggestion in the accent coral color (#D85A30) — e.g. typing "dor" bolds
  "Dor" within "Dormroom" — so the match is visually obvious, not just
  textually present.
- Show each suggestion's usage count as a small muted number on the right
  (e.g. "6x"), not a badge — quiet, secondary information.
- The "Create '<input>'" row uses the coral accent color for both its icon
  and text, visually distinguishing it as an action rather than another
  selectable value, while still living in the same list.
- Palette: cream/warm-white surfaces (#F4EDE0 / #FFFDF8), warm tan borders
  (#D9CBB0), coral accent (#D85A30) for focus border, matched text, and
  the "Create" row — consistent with the rest of DESIGN.md's palette.

This same dropdown pattern applies identically across all four tag
categories (Event, Location, Emotion, Custom) — no need to build four
separate implementations, just one reusable component parameterized by
which category's past values it queries.
