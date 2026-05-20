import { env } from "../env.js";

let accessToken: string | null = null;
let tokenExpiresAt = 0;

function clearToken() {
  accessToken = null;
  tokenExpiresAt = 0;
}

async function fetchNewToken(): Promise<string> {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("[spotify] SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is not set");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[spotify] Auth failed (HTTP ${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  return fetchNewToken();
}

export interface SpotifyTrack {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string | null;
  durationMs: number;
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  try {
    const token = await getAccessToken();
    console.log(`[spotify] searchTracks using token: ${token.slice(0, 10)}...`);

    const params = new URLSearchParams({ q: query, type: "track", limit: "10", market: "US" });
    const url = `https://api.spotify.com/v1/search?${params}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`[spotify] Spotify API response status: ${res.status}`);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[spotify] Spotify API error body: ${body}`);
      // A 401 means the token was revoked or expired server-side before our cached expiry;
      // clear it so the next request fetches a fresh one.
      if (res.status === 401) {
        clearToken();
        console.error(`[spotify] Search got 401 — token cleared for retry.`);
      }
      throw new Error(`Spotify search failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      tracks: { items: Array<{
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { name: string; images: Array<{ url: string }> };
        preview_url: string | null;
        duration_ms: number;
      }>};
    };

    return data.tracks.items.map((track) => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images[0]?.url ?? "",
      previewUrl: track.preview_url,
      durationMs: track.duration_ms,
    }));
  } catch (err) {
    console.error("[spotify] searchTracks threw:", err);
    throw err;
  }
}

export async function checkHealth(): Promise<{ credentialsLoaded: boolean; tokenValid: boolean }> {
  const credentialsLoaded = Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
  if (!credentialsLoaded) return { credentialsLoaded: false, tokenValid: false };

  try {
    await getAccessToken();
    return { credentialsLoaded: true, tokenValid: true };
  } catch {
    return { credentialsLoaded: true, tokenValid: false };
  }
}
