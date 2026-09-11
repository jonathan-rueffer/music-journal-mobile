-- Music memory app — schema v3
-- Reflects the pivot: tag-focused capture, event-as-a-tag, no photos,
-- no separate "title" field (the app is no longer about titled journal
-- entries — a memory is a song plus tags plus an optional note).
--
-- Supersedes schema-entries-v2.sql. Run as a migration against the
-- existing entries table, not a drop-and-recreate, if real data exists.

-- ============================================================
-- EVENTS — created implicitly the first time a user types a new
-- event name while tagging a song memory. No separate creation flow,
-- no photo, no independent note field — just a name, scoped per user.
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
-- SONG_MEMORIES — replaces the old "entries" table.
-- Dropped: title (no longer a titled-entry app).
-- Body/note is fully optional.
-- ============================================================
create table song_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  song_id uuid not null references songs(id),

  note text,  -- fully optional, collapsed by default in the UI

  location text,                 -- freeform, single value
  emotions text[] default '{}',  -- freeform, can hold multiple values
  custom_tags text[] default '{}',

  -- "When" tag: normalized range so day/month/year precision can all
  -- be sorted and filtered the same way. All nullable — optional tag.
  memory_date_start date,
  memory_date_end date,
  memory_date_precision text check (memory_date_precision in ('day', 'month', 'year')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_song_memories_user on song_memories(user_id);
create index idx_song_memories_song on song_memories(song_id);
create index idx_song_memories_location on song_memories(location);
create index idx_song_memories_emotions on song_memories using gin(emotions);
create index idx_song_memories_custom_tags on song_memories using gin(custom_tags);
create index idx_song_memories_memory_date on song_memories(memory_date_start, memory_date_end);

alter table song_memories enable row level security;

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


-- ============================================================
-- SONG_MEMORY_EVENTS — the many-to-many junction. Applying the
-- "event" tag while tagging a song is what inserts a row here.
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
