-- Pivot from "titled journal entries" to "song memories tagged with events".
-- Matches schema-v3.sql. Run as a migration against the existing `entries`
-- table (rename + column changes), not a drop-and-recreate — real data
-- exists. Note: `title` has no equivalent in the new model (DESIGN_2.md:
-- "There is no title field on a memory") and is dropped; `body` carries
-- forward as the now-optional `note`.

-- ============================================================
-- EVENTS — new table, created implicitly by the app the first time a
-- user tags a song memory with a new event name.
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
-- SONG_MEMORIES — rename of entries. Drops title, renames body -> note
-- (now optional). location/emotions/custom_tags/memory_date_* already
-- exist from the prior migration and carry over unchanged.
-- ============================================================
alter table entries rename to song_memories;
alter table song_memories drop column title;
alter table song_memories rename column body to note;
alter table song_memories alter column note drop not null;

alter index idx_entries_user rename to idx_song_memories_user;
alter index idx_entries_song rename to idx_song_memories_song;
alter index idx_entries_location rename to idx_song_memories_location;
alter index idx_entries_emotions rename to idx_song_memories_emotions;
alter index idx_entries_custom_tags rename to idx_song_memories_custom_tags;
alter index idx_entries_memory_date rename to idx_song_memories_memory_date;

alter policy "users can view their own entries" on song_memories
  rename to "users can view their own song memories";
alter policy "users can insert their own entries" on song_memories
  rename to "users can insert their own song memories";
alter policy "users can update their own entries" on song_memories
  rename to "users can update their own song memories";
alter policy "users can delete their own entries" on song_memories
  rename to "users can delete their own song memories";

alter trigger set_entries_updated_at on song_memories
  rename to set_song_memories_updated_at;

-- ============================================================
-- SONG_MEMORY_EVENTS — many-to-many junction. Applying the "event" tag
-- while tagging a song memory is what inserts a row here.
-- ============================================================
create table song_memory_events (
  song_memory_id uuid not null references song_memories(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  primary key (song_memory_id, event_id)
);

alter table song_memory_events enable row level security;

create policy "users can view their own links"
  on song_memory_events for select using (
    exists (select 1 from song_memories sm where sm.id = song_memory_id and sm.user_id = auth.uid())
  );

create policy "users can insert their own links"
  on song_memory_events for insert with check (
    exists (select 1 from song_memories sm where sm.id = song_memory_id and sm.user_id = auth.uid())
  );

create policy "users can delete their own links"
  on song_memory_events for delete using (
    exists (select 1 from song_memories sm where sm.id = song_memory_id and sm.user_id = auth.uid())
  );
