-- Location becomes multi-value, matching emotions/custom_tags — same
-- pattern (add array column, backfill, drop old column, swap index).

alter table song_memories add column locations text[] default '{}';

update song_memories
set locations = case when location is null then '{}' else array[location] end;

alter table song_memories alter column locations set not null;

drop index idx_song_memories_location;
alter table song_memories drop column location;

create index idx_song_memories_locations on song_memories using gin(locations);
