import { supabase } from './supabase';

export type SpotifyTrack = {
  spotifyTrackId: string;
  title: string;
  artist: string;
  album: string | null;
  albumArtUrl: string | null;
  previewUrl: string | null;
  durationMs: number | null;
};

let cachedAppToken: { accessToken: string; expiresAt: number } | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now()) {
    return cachedAppToken.accessToken;
  }

  const { data, error } = await supabase.functions.invoke<{
    access_token: string;
    expires_at: number;
  }>('spotify-token');

  if (error) throw error;
  if (!data?.access_token) throw new Error('spotify-token function returned no access_token.');

  cachedAppToken = { accessToken: data.access_token, expiresAt: data.expires_at };
  return cachedAppToken.accessToken;
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const token = await getAppAccessToken();

  // Apps in Spotify's default "Development Mode" (i.e. not granted Extended
  // Quota) are capped well below the documented default/max for /search —
  // empirically 10 for this app. Values above that return a 400 "Invalid
  // limit" with no indication of what the actual ceiling is.
  const url = `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(trimmed)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify search failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  const items: any[] = json.tracks?.items ?? [];

  return items.map((track) => ({
    spotifyTrackId: track.id,
    title: track.name,
    artist: (track.artists ?? []).map((a: any) => a.name).join(', '),
    album: track.album?.name ?? null,
    albumArtUrl: track.album?.images?.[0]?.url ?? null,
    previewUrl: track.preview_url ?? null,
    durationMs: track.duration_ms ?? null,
  }));
}
