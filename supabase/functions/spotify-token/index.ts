// Mints a short-lived Spotify app-level access token (client_credentials grant)
// for use by the mobile app's search screen. Requires a valid Supabase user JWT
// (enforced by the platform unless deployed with --no-verify-jwt), so only
// signed-in app users can call it. SPOTIFY_CLIENT_SECRET never leaves this
// function.

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

// Cached across warm invocations of this function instance. Not shared
// across instances/regions, but avoids re-requesting a token on every call
// from the same instance.
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchSpotifyToken(): Promise<{ accessToken: string; expiresAt: number }> {
  const basicAuth = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify token request failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  return {
    accessToken: json.access_token,
    // Refresh a minute early to avoid handing out a token that expires
    // mid-request.
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Server missing SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    if (!cachedToken || cachedToken.expiresAt <= Date.now()) {
      cachedToken = await fetchSpotifyToken();
    }

    return new Response(
      JSON.stringify({
        access_token: cachedToken.accessToken,
        expires_at: cachedToken.expiresAt,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
