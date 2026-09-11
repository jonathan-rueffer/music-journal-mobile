-- Music Journal — Schema for Supabase (Postgres)
-- Target: ~15 users, Spotify-only auth, zero-cost hosting
--
-- NOTE: auth.users is created automatically by Supabase when someone signs in
-- with Spotify. Don't create your own users/password table — extend it with
-- a "profiles" table instead.

-- ============================================================
-- PROFILES — one row per user, extends Supabase's built-in auth.users
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  spotify_id text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs in for the first time
-- (pulls Spotify display name / avatar out of the auth metadata Supabase stores)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, spotify_id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'provider_id',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;

create policy "users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update using (auth.uid() = id);


-- ============================================================
-- SONGS — shared cache of Spotify track metadata (one row per track,
-- referenced by any number of users' song memories — avoids re-hitting
-- the Spotify API every time a memory is viewed)
-- ============================================================
create table songs (
  id uuid primary key default gen_random_uuid(),
  spotify_track_id text unique not null,
  title text not null,
  artist text not null,
  album text,
  album_art_url text,
  preview_url text,
  duration_ms integer,
  cached_at timestamptz not null default now()
);

alter table songs enable row level security;

-- Everyone (any signed-in user) can read the shared song cache
create policy "authenticated users can read songs"
  on songs for select using (auth.role() = 'authenticated');

-- Anyone signed in can add a song to the cache the first time it's referenced
create policy "authenticated users can insert songs"
  on songs for insert with check (auth.role() = 'authenticated');


-- ============================================================
-- Keep updated_at current on edit (shared by song_memories)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- EVENTS — a life period or occasion (see DESIGN_2.md). Not a
-- separately-managed object with its own creation flow: "event" is a
-- fifth tag category, created implicitly the first time a user types a
-- new event name while tagging a song memory. No photo, no note field.
-- ============================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table events enable row level security;

create policy "users can view their own events"
  on events for select using (auth.uid() = user_id);

create policy "users can insert their own events"
  on events for insert with check (auth.uid() = user_id);

create policy "users can delete their own events"
  on events for delete using (auth.uid() = user_id);


-- ============================================================
-- SONG_MEMORIES — the atomic unit (see DESIGN_2.md). A song plus
-- whatever context is attached to it: tags and an optional note. No
-- title — this isn't a titled-journal-entry app. Four of the five tag
-- categories live directly on this row (location/emotions/custom_tags/
-- memory_date_*); the fifth, event, is a direct nullable FK — a memory can
-- belong to at most one event (not several). The same song can still be
-- tagged under multiple events, just via separate memories.
-- No lookup/suggestion table for any tag category — at this scale,
-- autocomplete is just a query over each user's own past distinct values.
-- ============================================================
create table song_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  song_id uuid not null references songs(id),
  event_id uuid references events(id) on delete set null,

  note text,  -- fully optional, collapsed by default in the UI

  locations text[] default '{}', -- multi-value, same pattern as emotions/custom_tags
  emotions text[] default '{}',
  custom_tags text[] default '{}',

  -- "When" tag: normalized range so day/month/year precision can all be
  -- sorted and filtered the same way. All nullable — optional tag.
  memory_date_start date,
  memory_date_end date,
  memory_date_precision text check (memory_date_precision in ('day', 'month', 'year')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_song_memories_user on song_memories(user_id);
create index idx_song_memories_song on song_memories(song_id);
create index idx_song_memories_event on song_memories(event_id);
create index idx_song_memories_locations on song_memories using gin(locations);
create index idx_song_memories_emotions on song_memories using gin(emotions);
create index idx_song_memories_custom_tags on song_memories using gin(custom_tags);
create index idx_song_memories_memory_date on song_memories(memory_date_start, memory_date_end);

alter table song_memories enable row level security;

-- This is the important one: without a backend enforcing "only your own
-- memories", these policies are the only thing stopping user A from reading
-- or editing user B's journal.
create policy "users can view their own song memories"
  on song_memories for select using (auth.uid() = user_id);

create policy "users can insert their own song memories"
  on song_memories for insert with check (auth.uid() = user_id);

create policy "users can update their own song memories"
  on song_memories for update using (auth.uid() = user_id);

create policy "users can delete their own song memories"
  on song_memories for delete using (auth.uid() = user_id);

create trigger set_song_memories_updated_at
  before update on song_memories
  for each row execute procedure public.set_updated_at();
