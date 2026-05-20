import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import type { SpotifyTrack } from "../lib/api";

interface Props {
  partyCode: string;
  participantId: string;
  existingSongIds: string[];
  onClose: () => void;
}

export function SongSearch({ partyCode, participantId, existingSongIds, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set(existingSongIds));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const tracks = await api.searchSpotify(q);
        setResults(tracks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addSong(track: SpotifyTrack) {
    setAdding(track.spotifyId);
    setError("");
    try {
      await api.addSong(partyCode, participantId, track);
      setAdded((prev) => new Set([...prev, track.spotifyId]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setAdding(null);
    }
  }

  function fmt(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel — slides up from bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-nero-bg border-t border-white/10 animate-slide-up max-h-[75vh] flex flex-col">

        {/* Search input */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-white/8">
          <svg className="w-4 h-4 text-white/25 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-sm font-medium"
            placeholder="Search Spotify…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-3 shrink-0">
            {loading && (
              <span className="font-mono text-[10px] text-white/25 tracking-widest animate-pulse uppercase">
                Searching
              </span>
            )}
            <button
              onClick={onClose}
              className="font-mono text-[10px] text-white/30 hover:text-white/60 tracking-widest uppercase transition-colors"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Results list */}
        <div className="overflow-y-auto flex-1">
          {error && (
            <p className="px-6 py-4 text-xs text-nero-accent font-mono">{error}</p>
          )}

          {!query && (
            <p className="px-6 py-12 text-center font-mono text-[10px] tracking-[0.3em] text-white/15 uppercase">
              Type to search
            </p>
          )}

          {query && !loading && results.length === 0 && !error && (
            <p className="px-6 py-12 text-center text-white/25 text-sm">No results.</p>
          )}

          {results.map((track) => {
            const isAdded = added.has(track.spotifyId);
            const isAdding = adding === track.spotifyId;

            return (
              <div
                key={track.spotifyId}
                className="flex items-center gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
              >
                {track.albumArt ? (
                  <img src={track.albumArt} alt="" className="w-10 h-10 object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-white/5 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                  <p className="text-xs text-white/40 font-mono truncate mt-0.5">
                    {track.artist} · {track.album}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[10px] text-white/20">{fmt(track.durationMs)}</span>
                  {!track.previewUrl && (
                    <span className="font-mono text-[10px] text-white/15 hidden group-hover:block">
                      no preview
                    </span>
                  )}
                  <button
                    onClick={() => !isAdded && addSong(track)}
                    disabled={isAdded || isAdding}
                    className={`rounded-full text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 border transition-all duration-150 ${
                      isAdded
                        ? "border-white/10 text-white/20 cursor-default"
                        : "border-nero-accent text-nero-accent hover:bg-nero-accent/10"
                    }`}
                  >
                    {isAdding ? "…" : isAdded ? "Added" : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
