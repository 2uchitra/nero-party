import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import type { Party, EndResult, QueuedSong } from "../lib/api";
import { HeatRating } from "./HeatRating";
import { SongSearch } from "./SongSearch";

interface Props {
  party: Party;
  participantId: string;
  isHost: boolean;
  onEnd: (result: EndResult) => void;
  onPartyUpdate: (party: Party) => void;
}

const standingsColors = ["#ef4444", "#f97316", "#facc15"];

export function ActiveParty({ party, participantId, isHost, onEnd, onPartyUpdate }: Props) {
  const [showSearch, setShowSearch] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [endError, setEndError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const currentSong = party.songs.find((s) => s.status === "PLAYING") ?? null;
  const [renderedSong, setRenderedSong] = useState<QueuedSong | null>(currentSong);
  const [animPhase, setAnimPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (currentSong?.id === renderedSong?.id) return;
    setAnimPhase("out");
    const timer = setTimeout(() => {
      setRenderedSong(currentSong);
      setAnimPhase("in");
    }, 300);
    return () => clearTimeout(timer);
  }, [currentSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const queueFull = party.maxSongs != null && party.songs.length >= party.maxSongs;

  const currentRating = renderedSong ? (myRatings[renderedSong.id] ?? 0) : 0;
  const avgRating =
    renderedSong && renderedSong.ratings.length > 0
      ? renderedSong.ratings.reduce((s, r) => s + r.score, 0) / renderedSong.ratings.length
      : 0;

  // Live leaderboard: only played/playing songs that have received ratings
  const leaderboard = party.songs
    .filter((s) => (s.status === "PLAYING" || s.status === "PLAYED") && s.ratings.length > 0)
    .map((s) => ({
      ...s,
      avg: s.ratings.reduce((sum, r) => sum + r.score, 0) / s.ratings.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  // Right-column ordering: playing first, then queued, then played
  const playingSongs = party.songs.filter((s) => s.status === "PLAYING");
  const queuedSongs  = party.songs.filter((s) => s.status === "QUEUED");
  const playedSongs  = party.songs.filter((s) => s.status === "PLAYED");
  const orderedSongs = [...playingSongs, ...queuedSongs, ...playedSongs];

  async function rate(score: number) {
    if (!renderedSong) return;
    const songId = renderedSong.id;
    setMyRatings((prev) => ({ ...prev, [songId]: score }));
    try {
      await api.rateSong(party.code, songId, participantId, score);
    } catch {
      setMyRatings((prev) => { const c = { ...prev }; delete c[songId]; return c; });
    }
  }

  async function removeSong(songId: string) {
    setRemoving(songId);
    try { await api.removeSong(party.code, songId, participantId); }
    catch { /* socket handles optimistic rollback */ }
    finally { setRemoving(null); }
  }

  async function nextSong() {
    setAdvancing(true); setEndError("");
    try {
      const result = await api.nextSong(party.code, participantId);
      if (result.ended && result.result) {
        onEnd(result.result);
      } else if (result.party) {
        onPartyUpdate(result.party);
      }
    } catch (err) {
      setEndError(err instanceof Error ? err.message : "Failed");
    } finally { setAdvancing(false); }
  }

  async function endParty() {
    setEndError("");
    try { const result = await api.endParty(party.code, participantId); onEnd(result); }
    catch (err) { setEndError(err instanceof Error ? err.message : "Failed"); }
  }

  return (
    <div className="h-screen bg-nero-bg text-nero-text flex flex-col overflow-hidden relative">

      {/* Ambient glow from album art */}
      {renderedSong?.albumArt && (
        <div
          className="fixed inset-0 pointer-events-none transition-all duration-1000 z-0"
          style={{
            backgroundImage: `url(${renderedSong.albumArt})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(80px) saturate(0.3)",
            opacity: 0.06,
            transform: "scale(1.15)",
          }}
        />
      )}

      {/* ── TOP BAR ── */}
      <header className="relative z-10 flex items-center justify-between px-8 h-14 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-nero-accent animate-pulse shrink-0" />
          <span className="font-bold text-xs tracking-[0.2em] uppercase text-white/70 truncate max-w-[200px]">
            {party.name}
          </span>
          <span className="w-px h-3 bg-white/15 shrink-0" />
          <span className="font-mono text-[10px] text-white/40 shrink-0">
            {party.participants.length} listening
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/20 uppercase shrink-0">
          {party.code}
        </span>
      </header>

      {/* ── TWO-COLUMN BODY ── */}
      <div className="flex-1 flex min-h-0 relative z-10">

        {/* LEFT COLUMN — 60% — Now Playing */}
        <div className="w-[60%] flex flex-col overflow-hidden shrink-0">

          {/* Scrollable top — album grows to fill available space */}
          <div className="flex-1 overflow-hidden px-6 pt-3 pb-0 flex flex-col min-h-0">

            {renderedSong ? (
              <>
                {/* Now Playing label + EQ bars */}
                <div className="flex items-center gap-3 shrink-0 mb-1.5">
                  <p className="font-mono text-[10px] tracking-[0.35em] text-nero-accent uppercase">
                    Now Playing
                  </p>
                  <EqBars />
                </div>

                {/* Animated block — flex-1 so album grows to fill remaining space */}
                <div
                  key={renderedSong.id}
                  className="flex-1 flex flex-col min-h-0"
                  style={{
                    animation: animPhase === "out"
                      ? "slideOutLeft 300ms ease-in both"
                      : "slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
                  }}
                >
                  {/* Jukebox album frame — fluid height, fills available space */}
                  <div className="flex-1 flex justify-center items-center min-h-0 mb-1">
                    <div
                      className="relative"
                      style={{
                        padding: "3px",
                        background: "linear-gradient(145deg, #d0d0d0 0%, #505050 30%, #e8e8e8 55%, #303030 80%, #a0a0a0 100%)",
                        borderRadius: "6px",
                        animation: "neonPulse 2.5s ease-in-out infinite",
                        height: "100%",
                        aspectRatio: "1 / 1",
                        maxHeight: "310px",
                        minHeight: "160px",
                      }}
                    >
                      {renderedSong.albumArt ? (
                        <img
                          src={renderedSong.albumArt}
                          alt=""
                          className="block object-cover w-full h-full"
                          style={{ borderRadius: "3px" }}
                        />
                      ) : (
                        <div className="bg-white/5 w-full h-full" style={{ borderRadius: "3px" }} />
                      )}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          inset: "3px",
                          borderRadius: "3px",
                          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)",
                        }}
                      />
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(0,255,180,0.9)", borderTopLeftRadius: "3px" }} />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: "rgba(0,255,180,0.9)", borderTopRightRadius: "3px" }} />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: "rgba(0,255,180,0.9)", borderBottomLeftRadius: "3px" }} />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(0,255,180,0.9)", borderBottomRightRadius: "3px" }} />
                    </div>
                  </div>

                  {/* Song title / artist */}
                  <div className="text-center shrink-0 mb-1">
                    <h2 className="font-black text-xl leading-tight tracking-tight uppercase break-words">
                      {renderedSong.title}
                    </h2>
                    <p className="text-white/50 text-sm mt-0.5 font-medium truncate">
                      {renderedSong.artist}
                    </p>
                    <p className="text-white/20 text-[9px] mt-0.5 font-mono tracking-widest uppercase">
                      Added by {renderedSong.addedBy.name}
                    </p>
                  </div>

                  {/* Spotify embed */}
                  <iframe
                    src={`https://open.spotify.com/embed/track/${renderedSong.spotifyId}?utm_source=generator&theme=0`}
                    width="100%"
                    height="80"
                    className="shrink-0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    style={{ border: 0, borderRadius: 8 }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/20 font-mono text-[10px] tracking-[0.3em] uppercase">
                  Queue empty
                </p>
              </div>
            )}
          </div>

          {/* Heat rating — pinned below album block, compact */}
          {renderedSong && (
            <div className="shrink-0 px-6 pt-1.5 pb-1 border-t border-white/5 flex flex-col">
              <p className="label mb-0">Rate the Heat</p>
              <HeatRating
                currentScore={currentRating}
                onRate={rate}
                avgRating={avgRating}
                totalRatings={renderedSong.ratings.length}
                participantCount={party.participants.length}
                large
              />
            </div>
          )}

          {/* LIVE STANDINGS — pinned to bottom, flush */}
          {leaderboard.length > 0 && (
            <div className="shrink-0 px-6 pt-1.5 pb-1.5 border-t border-white/[0.07] space-y-0.5">
              <p className="label mb-0.5">Live Standings</p>
              {leaderboard.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 py-0.5">
                  <span
                    className="font-mono text-xs w-4 text-center shrink-0 font-black"
                    style={{ color: standingsColors[i] ?? "rgba(255,255,255,0.2)" }}
                  >
                    {i + 1}
                  </span>
                  {s.albumArt && (
                    <img src={s.albumArt} alt="" className="w-5 h-5 object-cover shrink-0 rounded-sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold uppercase tracking-tight truncate ${i === 0 ? "text-white/90" : "text-white/45"}`}>
                      {s.title}
                    </p>
                  </div>
                  <span
                    className="font-mono text-xs font-black shrink-0 tabular-nums"
                    style={{ color: standingsColors[i] ?? "rgba(255,255,255,0.3)" }}
                  >
                    {s.avg.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* HOST CONTROLS — pinned to bottom */}
          {isHost && (
            <div className="shrink-0 px-6 py-2 border-t border-white/[0.07] space-y-2">
              {endError && (
                <p className="text-nero-accent text-xs font-mono font-bold">{endError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={nextSong}
                  disabled={advancing}
                  className="btn-primary flex-1"
                >
                  {advancing ? "…" : "Next Song"}
                </button>
                <button onClick={endParty} className="btn-ghost">
                  End Party
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Jukebox Queue */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#060606] relative" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>

          {/* Subtle scanline texture */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.007) 3px, rgba(255,255,255,0.007) 4px)",
            }}
          />

          {/* Jukebox header */}
          <div
            className="relative z-10 shrink-0 flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(150,150,150,0.1)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[9px] tracking-[0.35em] uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Selections
              </span>
              <span
                className="font-mono text-[9px]"
                style={{ color: "rgba(255,255,255,0.1)" }}
              >
                {orderedSongs.length > 0 ? `· ${orderedSongs.length}` : ""}
              </span>
            </div>
            <button
              onClick={() => setShowSearch(true)}
              disabled={queueFull}
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: "rgba(0,255,150,0.75)" }}
            >
              <span className="text-sm leading-none">⊕</span>
              <span>Insert</span>
            </button>
          </div>

          {/* Song list */}
          <div className="flex-1 overflow-y-auto min-h-0 relative z-10">
            {orderedSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div
                  className="font-mono text-[9px] tracking-[0.35em] uppercase"
                  style={{ color: "rgba(255,255,255,0.12)" }}
                >
                  No selections
                </div>
                <div
                  className="font-mono text-[8px] tracking-[0.2em] uppercase"
                  style={{ color: "rgba(0,255,150,0.2)" }}
                >
                  ↑ Insert a song
                </div>
              </div>
            ) : (
              orderedSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  queuePosition={queuedSongs.findIndex((s) => s.id === song.id) + 1}
                  participantId={participantId}
                  isHost={isHost}
                  removing={removing === song.id}
                  onRemove={removeSong}
                />
              ))
            )}
          </div>

          {/* Listening */}
          <div
            className="relative z-10 shrink-0 px-5 py-4 space-y-2"
            style={{ borderTop: "1px solid rgba(150,150,150,0.08)" }}
          >
            <p className="label mb-0">Listening</p>
            <div className="flex flex-wrap gap-1.5">
              {party.participants.map((p) => (
                <div
                  key={p.id}
                  className="rounded-sm px-2 py-0.5 text-[10px] font-mono font-medium border"
                  style={{
                    borderColor: p.id === participantId ? "rgba(0,255,150,0.3)" : "rgba(255,255,255,0.08)",
                    color: p.id === participantId ? "rgba(0,255,150,0.8)" : "rgba(255,255,255,0.35)",
                    background: p.id === participantId ? "rgba(0,255,150,0.04)" : "transparent",
                  }}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* VISUALIZER — in layout flow, never overlaps content */}
      <AudioVisualizer />

      {showSearch && (
        <SongSearch
          partyCode={party.code}
          participantId={participantId}
          existingSongIds={party.songs.map((s) => s.spotifyId)}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AudioVisualizer() {
  const bars = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        id: i,
        duration: 0.25 + (i % 8) * 0.08,
        delay: (i % 13) * 0.04,
      })),
    []
  );
  return (
    <div className="shrink-0 w-full h-20 flex items-end gap-px pointer-events-none z-0 overflow-hidden relative">
      {bars.map((b) => (
        <div
          key={b.id}
          className="flex-1"
          style={{
            height: "100%",
            background: "linear-gradient(to top, rgba(34,197,94,0.55), rgba(0,200,255,0.18), transparent)",
            transformOrigin: "bottom",
            transform: "scaleY(0.05)",
            animation: `vizBar ${b.duration}s ease-in-out ${b.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function EqBars() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[0.6, 1, 0.75, 0.5].map((h, i) => (
        <div
          key={i}
          className="w-[2px] bg-nero-accent/60 origin-bottom"
          style={{
            height: `${h * 100}%`,
            animation: `eqBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

interface SongCardProps {
  song: QueuedSong;
  queuePosition: number;
  participantId: string;
  isHost: boolean;
  removing: boolean;
  onRemove: (id: string) => void;
}

function SongCard({ song, queuePosition, participantId, isHost, removing, onRemove }: SongCardProps) {
  const isPlaying = song.status === "PLAYING";
  const isPlayed  = song.status === "PLAYED";
  const canRemove = song.status === "QUEUED" && (isHost || song.addedBy.id === participantId);
  const songAvg =
    song.ratings.length > 0
      ? song.ratings.reduce((s, r) => s + r.score, 0) / song.ratings.length
      : null;

  const slotBorder = isPlaying
    ? "rgba(0,255,130,0.75)"
    : isPlayed
    ? "rgba(255,255,255,0.12)"
    : "rgba(180,130,25,0.45)";
  const slotColor = isPlaying
    ? "rgba(0,255,130,0.95)"
    : isPlayed
    ? "rgba(255,255,255,0.22)"
    : "rgba(190,140,30,0.75)";

  return (
    <div
      className="relative group"
      style={{
        opacity: isPlayed ? 0.45 : 1,
        borderBottom: "1px solid",
        borderImage: isPlaying
          ? "linear-gradient(to right, rgba(0,255,130,0.35), rgba(0,255,130,0.1), transparent) 1"
          : "linear-gradient(to right, rgba(160,160,160,0.09), rgba(160,160,160,0.04), transparent) 1",
      }}
    >
      {/* Now-playing glow wash */}
      {isPlaying && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(0,255,130,0.08), rgba(0,255,130,0.03), transparent)",
          }}
        />
      )}

      <div className="relative flex items-center gap-3 px-4 py-3">
        {/* Jukebox slot */}
        <div
          className="shrink-0 flex items-center justify-center font-mono font-bold"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "2px",
            border: `1px solid ${slotBorder}`,
            color: slotColor,
            background: isPlaying ? "rgba(0,255,130,0.07)" : "transparent",
            boxShadow: isPlaying ? `0 0 8px rgba(0,255,130,0.22), inset 0 0 4px rgba(0,255,130,0.08)` : "none",
            fontSize: "10px",
          }}
        >
          {isPlaying ? "▶" : isPlayed ? "✓" : queuePosition}
        </div>

        {/* Album art */}
        {song.albumArt ? (
          <img
            src={song.albumArt}
            alt=""
            className="shrink-0 object-cover"
            style={{ width: "36px", height: "36px", borderRadius: "1px" }}
          />
        ) : (
          <div className="shrink-0 bg-white/5" style={{ width: "36px", height: "36px", borderRadius: "1px" }} />
        )}

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold truncate uppercase tracking-tight"
            style={{ color: isPlaying ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)" }}
          >
            {song.title}
          </p>
          <p className="text-[9px] font-mono truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
            {song.artist}
          </p>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isPlaying && <EqBars />}
          {isPlayed && songAvg !== null && (
            <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: "#ffd700" }}>
              {songAvg.toFixed(1)}
            </span>
          )}
          {canRemove && (
            <button
              onClick={() => onRemove(song.id)}
              disabled={removing}
              className="opacity-0 group-hover:opacity-100 transition-all disabled:opacity-20 text-[10px]"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {removing ? "…" : "✕"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
