const BASE = "http://localhost:3000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export const api = {
  createParty: (body: { name: string; hostName: string; maxSongs?: number; timeLimitMinutes?: number }) =>
    request<{ party: Party; participantId: string }>("/parties", { method: "POST", body: JSON.stringify(body) }),

  getParty: (code: string) =>
    request<Party>(`/parties/${code}`),

  joinParty: (code: string, name: string) =>
    request<{ participant: Participant; party: Party }>(`/parties/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  startParty: (code: string, participantId: string) =>
    request<Party>(`/parties/${code}/start`, { method: "POST", body: JSON.stringify({ participantId }) }),

  addSong: (code: string, participantId: string, track: SpotifyTrack) =>
    request<QueuedSong>(`/parties/${code}/songs`, {
      method: "POST",
      body: JSON.stringify({ participantId, ...track }),
    }),

  removeSong: (code: string, songId: string, participantId: string) =>
    request<{ success: boolean }>(`/parties/${code}/songs/${songId}`, {
      method: "DELETE",
      body: JSON.stringify({ participantId }),
    }),

  rateSong: (code: string, songId: string, participantId: string, score: number) =>
    request<{ success: boolean }>(`/parties/${code}/songs/${songId}/rate`, {
      method: "POST",
      body: JSON.stringify({ participantId, score }),
    }),

  nextSong: (code: string, participantId: string) =>
    request<{ song?: QueuedSong; ended?: boolean; result?: EndResult; party?: Party }>(`/parties/${code}/next`, {
      method: "POST",
      body: JSON.stringify({ participantId }),
    }),

  endParty: (code: string, participantId: string) =>
    request<EndResult>(`/parties/${code}/end`, {
      method: "POST",
      body: JSON.stringify({ participantId }),
    }),

  searchSpotify: (q: string) =>
    request<SpotifyTrack[]>(`/spotify/search?q=${encodeURIComponent(q)}`),
};

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Party {
  id: string;
  code: string;
  name: string;
  status: "WAITING" | "ACTIVE" | "ENDED";
  maxSongs: number | null;
  timeLimitMinutes: number | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  participants: Participant[];
  songs: QueuedSong[];
}

export interface Participant {
  id: string;
  partyId: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
}

export interface QueuedSong {
  id: string;
  partyId: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string | null;
  durationMs: number;
  position: number;
  status: "QUEUED" | "PLAYING" | "PLAYED";
  playedAt: string | null;
  createdAt: string;
  addedBy: Participant;
  ratings: Rating[];
}

export interface Rating {
  id: string;
  songId: string;
  participantId: string;
  score: number;
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

export interface SongScore {
  song: QueuedSong;
  finalScore: number;
  avgRating: number;
  participationRate: number;
}

export interface EndResult {
  winner: QueuedSong | null;
  scores: SongScore[];
}
