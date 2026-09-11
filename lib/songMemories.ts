import { supabase } from './supabase';
import type { SpotifyTrack } from './spotify';
import { findOrCreateEvent, type EventRef } from './events';

export type Song = {
  id: string;
  spotify_track_id: string;
  title: string;
  artist: string;
  album: string | null;
  album_art_url: string | null;
  preview_url: string | null;
  duration_ms: number | null;
  cached_at: string;
};

export type MemoryDatePrecision = 'day' | 'month' | 'year';

export type MemoryDate = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  precision: MemoryDatePrecision;
};

export type SongMemory = {
  id: string;
  user_id: string;
  song_id: string;
  note: string | null;
  locations: string[];
  emotions: string[];
  custom_tags: string[];
  memory_date_start: string | null;
  memory_date_end: string | null;
  memory_date_precision: MemoryDatePrecision | null;
  created_at: string;
  updated_at: string;
  songs: Song;
  event: EventRef | null;
};

// songs only has SELECT and INSERT RLS policies (it's an append-only shared
// cache, never mutated) — no UPDATE policy. A plain .upsert() would issue an
// UPDATE on the conflict path and get silently blocked by RLS, so this does
// an explicit select-then-insert instead, with a re-fetch if another user's
// insert wins the race on the unique spotify_track_id constraint.
export async function upsertSong(track: SpotifyTrack): Promise<Song> {
  const { data: existing, error: selectError } = await supabase
    .from('songs')
    .select()
    .eq('spotify_track_id', track.spotifyTrackId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as Song;

  const { data: inserted, error: insertError } = await supabase
    .from('songs')
    .insert({
      spotify_track_id: track.spotifyTrackId,
      title: track.title,
      artist: track.artist,
      album: track.album,
      album_art_url: track.albumArtUrl,
      preview_url: track.previewUrl,
      duration_ms: track.durationMs,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raceWinner, error: refetchError } = await supabase
        .from('songs')
        .select()
        .eq('spotify_track_id', track.spotifyTrackId)
        .single();
      if (refetchError) throw refetchError;
      return raceWinner as Song;
    }
    throw insertError;
  }

  return inserted as Song;
}

export async function createSongMemory(params: {
  userId: string;
  songId: string;
  note: string | null;
  locations: string[];
  emotions: string[];
  customTags: string[];
  memoryDate: MemoryDate | null;
  eventName: string | null;
}): Promise<SongMemory> {
  const event = params.eventName ? await findOrCreateEvent(params.userId, params.eventName) : null;

  const { data, error } = await supabase
    .from('song_memories')
    .insert({
      user_id: params.userId,
      song_id: params.songId,
      event_id: event?.id ?? null,
      note: params.note,
      locations: params.locations,
      emotions: params.emotions,
      custom_tags: params.customTags,
      memory_date_start: params.memoryDate?.start ?? null,
      memory_date_end: params.memoryDate?.end ?? null,
      memory_date_precision: params.memoryDate?.precision ?? null,
    })
    .select('*, songs(*)')
    .single();

  if (error) throw error;

  return { ...data, event } as SongMemory;
}

// Editing reuses the exact same fields createSongMemory takes (including
// songId — the edit flow's swap button can still change the underlying
// song), just targeting an existing row instead of inserting one.
export async function updateSongMemory(
  memoryId: string,
  params: {
    userId: string;
    songId: string;
    note: string | null;
    locations: string[];
    emotions: string[];
    customTags: string[];
    memoryDate: MemoryDate | null;
    eventName: string | null;
  }
): Promise<SongMemory> {
  const event = params.eventName ? await findOrCreateEvent(params.userId, params.eventName) : null;

  const { data, error } = await supabase
    .from('song_memories')
    .update({
      song_id: params.songId,
      event_id: event?.id ?? null,
      note: params.note,
      locations: params.locations,
      emotions: params.emotions,
      custom_tags: params.customTags,
      memory_date_start: params.memoryDate?.start ?? null,
      memory_date_end: params.memoryDate?.end ?? null,
      memory_date_precision: params.memoryDate?.precision ?? null,
    })
    .eq('id', memoryId)
    .select('*, songs(*)')
    .single();

  if (error) throw error;

  return { ...data, event } as SongMemory;
}

export async function listMySongMemories(): Promise<SongMemory[]> {
  const { data, error } = await supabase
    .from('song_memories')
    .select('*, songs(*), event:events(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SongMemory[];
}

export async function listSongMemoriesByEvent(eventId: string): Promise<SongMemory[]> {
  const { data, error } = await supabase
    .from('song_memories')
    .select('*, songs(*), event:events(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SongMemory[];
}

export async function listSongMemoriesBySong(songId: string): Promise<SongMemory[]> {
  const { data, error } = await supabase
    .from('song_memories')
    .select('*, songs(*), event:events(*)')
    .eq('song_id', songId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SongMemory[];
}

export type FrequencyEntry = { value: string; count: number };

export function toFrequencyList(values: string[]): FrequencyEntry[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const key = raw.toLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { value: raw, count: 1 });
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

// Tag history/frequency across the signed-in user's own song memories (RLS
// already scopes this to auth.uid()). Small enough at this scale to fetch
// in full and tally client-side, rather than a dedicated lookup table.
export async function listMyTagHistory(): Promise<{
  locations: FrequencyEntry[];
  emotions: FrequencyEntry[];
  customTags: FrequencyEntry[];
  events: FrequencyEntry[];
}> {
  const { data, error } = await supabase
    .from('song_memories')
    .select('locations, emotions, custom_tags, event:events(name)');
  if (error) throw error;

  const rows = data as unknown as {
    locations: string[];
    emotions: string[];
    custom_tags: string[];
    event: { name: string } | null;
  }[];

  return {
    locations: toFrequencyList(rows.flatMap((r) => r.locations)),
    emotions: toFrequencyList(rows.flatMap((r) => r.emotions)),
    customTags: toFrequencyList(rows.flatMap((r) => r.custom_tags)),
    events: toFrequencyList(rows.filter((r) => r.event).map((r) => r.event!.name)),
  };
}
