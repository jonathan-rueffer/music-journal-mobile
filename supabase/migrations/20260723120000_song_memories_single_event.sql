-- A memory can only belong to one event now (not several) — the same song
-- can still show up under multiple events, but only via separate memories,
-- never one memory carrying more than one event chip. Verified against live
-- data first: no existing song_memory currently has more than one linked
-- event, so the backfill below (pick either linked event) is unambiguous.

alter table song_memories add column event_id uuid references events(id) on delete set null;

update song_memories sm
set event_id = (
  select sme.event_id
  from song_memory_events sme
  where sme.song_memory_id = sm.id
  limit 1
);

drop table song_memory_events;

create index idx_song_memories_event on song_memories(event_id);
