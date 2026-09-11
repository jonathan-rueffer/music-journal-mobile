# Music Journal

A mobile app for tagging songs with the memories they carry (e.g., when you heard
it, where you were, how it felt, what chapter of life it belongs to). Not officially deployed yet.

Personal project, rebuilt from an earlier single-user web app
([JuniorIS](https://github.com/Jonathan765/JuniorIS)) into a small-scale, zer-cost,
multi-user mobile app with real authentication and per-user data isolation.

## Stack

| Layer | Choice |
|---|---|
| Mobile app | Expo (React Native + TypeScript) |
| Auth | Spotify OAuth via Supabase Auth |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Serverless | Supabase Edge Function (Deno) |

## Technical Components

- **OAuth token lifecycle management** — Supabase's built-in Spotify
  provider doesn't auto-refresh the underlying Spotify access token, so a
  refresh flow was built as a Supabase Edge Function, keeping the Spotify
  Client Secret server-side and out of the mobile bundle entirely.
- **Row-Level Security as the only access boundary** — there's no backend
  server sitting between the app and the database. The Expo app talks to
  Supabase directly via its client SDK, and Postgres RLS policies (scoped to
  `auth.uid()`) are what actually enforce that users can only see their own
  data.
- **Schema modeling for a many-to-many, implicitly-created object** — an
  "event" (a life period like *freshman year of college*) is created the
  first time a user tags a song with a new event name, with no separate
  creation flow. Modeled as its own table linked to song memories through a
  junction table, so the same song can belong to multiple events and the
  same event can hold many songs.
- **A deterministic, storage-free color system** for freeform emotion tags —
  since users can type any word, colors are derived by hashing the word into
  a small set of tone-matched families rather than requiring a lookup table
  or manual curation.
- **Shared, deduplicated metadata cache** — song metadata from the Spotify
  API is cached once per track and shared across all users, avoiding
  redundant API calls as the user base grows.

## Scope

Deliberately small: ~15 invite-only users, Spotify-only auth, and every
piece of the stack on a free tier. Design tradeoffs and the full schema
rationale are documented in [`DESIGN_2.md`](./DESIGN_2.md) and
[`schema.sql`](./schema.sql).

## Project structure

```
App.tsx              # Navigation root
screens/              # Top-level screens (capture, home, search, detail views)
components/           # Reusable UI (tag rows, cards, pickers)
lib/                  # Supabase client, auth, and data-access helpers
supabase/functions/   # Edge Function for Spotify token minting/refresh
supabase/migrations/  # Database schema history
schema.sql             # Current database schema
```
