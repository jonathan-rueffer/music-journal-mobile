# Music Journal — Mobile Rebuild

## What this is
Rebuilding an existing single-user web app (JuniorIS) into a small-scale,
multi-user mobile app. Originally a "journal entries about songs" app; it
pivoted (see DESIGN_2.md) into a tag-focused memory explorer — the primary
act is tagging a song with context (when, where, how it felt, what event/life
period it belongs to), with writing as a fully optional add-on rather than
the main event.

## Scope (deliberately small)
- Target: ~15 users, invite-only in practice (not a public launch)
- Auth: **Spotify accounts only** — no email/password, no other social logins
- Hosting/infra: **zero cost** — every piece of the stack should stay on free tiers
- Platform: mobile (iOS + Android) via Expo / React Native

## Stack
- **Auth + Database + Storage:** Supabase (free tier)
  - Spotify OAuth is Supabase's *built-in* social provider — do not hand-roll
    the OAuth flow.
  - Supabase does **not** auto-refresh the Spotify provider token — a
    refresh flow needs to be built (likely as a Supabase Edge Function),
    using the Spotify Client Secret server-side only.
- **Mobile app:** Expo (React Native)
- **Database access pattern:** mobile app talks to Supabase directly via its
  client SDK for most reads/writes. Row-Level Security (RLS) is what
  enforces "users only see their own data" — there is intentionally no
  separate backend server sitting in front of Supabase for this.

## Database
Schema lives in `schema.sql` in this repo. Key tables:
- `profiles` — extends Supabase's built-in `auth.users`, auto-populated via
  trigger on first Spotify sign-in
- `songs` — shared cache of Spotify track metadata across all users (avoid
  redundant Spotify API calls)
- `song_memories` — the atomic unit: a song plus tags plus an optional note.
  No title. RLS-scoped to `auth.uid()`.
- `events` — a life period/occasion, created implicitly the first time a
  user tags a song memory with a new event name (no separate creation flow)
- `song_memory_events` — many-to-many junction linking memories to events

Five tag categories apply to a song memory — `event` (via the junction
table), `location`, `emotions`, `custom_tags`, and a fuzzy `memory_date_*`
range ("When") — see **DESIGN_2.md** for the full UX rationale (this
supersedes the earlier DESIGN.md). No separate lookup/suggestion table at
this scale; autocomplete queries each user's own past distinct values
directly.

## Environment variables
Names only — actual values live in `.env` (gitignored), never in this file
or in chat:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (safe client-side)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key (safe
  client-side)
- `SPOTIFY_CLIENT_ID` — Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` — Spotify app client secret (server-side /
  Edge Function only — never bundled into the mobile app)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role/secret key (server-side
  / Edge Function only — bypasses RLS, never bundled into the mobile app)

## Manual setup already done (outside this repo)
- [ ] Spotify Developer app registered, Client ID/Secret obtained
- [ ] Supabase project created
- [ ] Spotify enabled as an auth provider in Supabase (Authentication →
      Providers), with Supabase's callback URL added to the Spotify app's
      Redirect URIs
- [ ] `schema.sql` run in the Supabase SQL Editor
- [ ] Redirect URL scheme for the Expo app (e.g. `musicjournal://auth-callback`)
      decided and added to Supabase's allowed Redirect URLs

(Update the checkboxes above as these get done — or let Claude Code confirm
status against the actual Supabase project during setup.)

## Not in scope for now
- Titles on memories (see DESIGN_2.md — deliberately dropped)
- Photos (event or song level)
- Offline support / local sync
- Push notifications
- Social features (sharing memories, following other users)
- Any auth method other than Spotify

## Reference
Original single-user web version: FastAPI + React + PostgreSQL, at
https://github.com/Jonathan765/JuniorIS
