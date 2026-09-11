-- Updated `entries` table — replaces the version in the original schema.sql
-- Reflects: freeform location/emotion/custom tags (with app-side suggestions
-- drawn from the user's own past entries, no separate lookup table needed
-- at this scale), and a fuzzy date range for the "date" tag category.

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  song_id uuid not null references songs(id),

  title text not null,          -- starts as keyword-suggested, user-editable
  body text not null,

  -- Location: freeform, single value, suggestions drawn from past entries
  location text,

  -- Emotion: freeform, can layer multiple (e.g. "nostalgic" + "happy")
  emotions text[] default '{}',

  -- Custom: freeform general-purpose tags, same pattern as emotions
  custom_tags text[] default '{}',

  -- Date being tagged (the moment the memory refers to — distinct from
  -- created_at, which is when the entry was actually written).
  -- Stored as a normalized range so exact days and fuzzy years/months can
  -- be sorted and filtered the same way. All nullable — the date tag is
  -- optional metadata, not required to save an entry.
  memory_date_start date,
  memory_date_end date,
  memory_date_precision text check (memory_date_precision in ('day', 'month', 'year')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_entries_user on entries(user_id);
create index idx_entries_song on entries(song_id);
create index idx_entries_location on entries(location);
create index idx_entries_emotions on entries using gin(emotions);
create index idx_entries_custom_tags on entries using gin(custom_tags);
create index idx_entries_memory_date on entries(memory_date_start, memory_date_end);

alter table entries enable row level security;

create policy "users can view their own entries"
  on entries for select using (auth.uid() = user_id);

create policy "users can insert their own entries"
  on entries for insert with check (auth.uid() = user_id);

create policy "users can update their own entries"
  on entries for update using (auth.uid() = user_id);

create policy "users can delete their own entries"
  on entries for delete using (auth.uid() = user_id);

create trigger set_entries_updated_at
  before update on entries
  for each row execute procedure public.set_updated_at();
