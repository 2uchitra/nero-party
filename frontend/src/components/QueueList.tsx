import { useState } from "react";
import { api } from "../lib/api";
import type { QueuedSong } from "../lib/api";

interface Props {
  songs: QueuedSong[];
  participantId: string;
  isHost: boolean;
  partyCode: string;
  showScores: boolean;
}

export function QueueList({ songs, participantId, isHost, partyCode, showScores }: Props) {
  const [removing, setRemoving] = useState<string | null>(null);

  const played = songs.filter((s) => s.status === "PLAYED");
  const playing = songs.find((s) => s.status === "PLAYING");
  const queued = songs.filter((s) => s.status === "QUEUED");

  async function remove(songId: string) {
    setRemoving(songId);
    try {
      await api.removeSong(partyCode, songId, participantId);
    } catch {
      // socket song:removed handles state; no-op on error
    } finally {
      setRemoving(null);
    }
  }

  if (songs.length === 0) {
    return (
      <p className="font-mono text-[10px] tracking-[0.3em] text-white/15 uppercase py-4">
        Nothing queued yet
      </p>
    );
  }

  return (
    <div>
      {playing && (
        <SongRow
          song={playing}
          label="▶"
          accent
          participantId={participantId}
          isHost={isHost}
          showScores={showScores}
          removing={removing === playing.id}
          onRemove={remove}
        />
      )}

      {queued.map((song, i) => (
        <SongRow
          key={song.id}
          song={song}
          label={`${i + 1}`}
          participantId={participantId}
          isHost={isHost}
          showScores={showScores}
          removing={removing === song.id}
          onRemove={remove}
        />
      ))}

      {played.length > 0 && (
        <div className="opacity-30 mt-1">
          {played.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              label="✓"
              participantId={participantId}
              isHost={isHost}
              showScores={showScores}
              removing={false}
              onRemove={remove}
              done
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  song: QueuedSong;
  label: string;
  accent?: boolean;
  done?: boolean;
  participantId: string;
  isHost: boolean;
  showScores: boolean;
  removing: boolean;
  onRemove: (id: string) => void;
}

function SongRow({ song, label, accent, done, participantId, isHost, showScores, removing, onRemove }: RowProps) {
  const canRemove = song.status === "QUEUED" && (isHost || song.addedBy.id === participantId);
  const avgRating =
    song.ratings.length > 0
      ? song.ratings.reduce((s, r) => s + r.score, 0) / song.ratings.length
      : 0;

  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-white/5 group transition-colors ${
        accent ? "border-nero-accent/10" : ""
      }`}
    >
      <span
        className={`font-mono text-[10px] w-5 text-center shrink-0 ${
          accent ? "text-nero-accent" : "text-white/20"
        }`}
      >
        {label}
      </span>

      {song.albumArt ? (
        <img src={song.albumArt} alt="" className="w-8 h-8 object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 bg-white/5 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate tracking-tight ${accent ? "text-white" : "text-white/60"}`}>
          {song.title}
        </p>
        <p className="text-[10px] text-white/25 font-mono truncate">{song.artist}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {showScores && song.ratings.length > 0 && (
          <span className="font-mono text-xs font-bold text-nero-gold">{avgRating.toFixed(1)}</span>
        )}
        {!showScores && done && song.ratings.length > 0 && (
          <span className="font-mono text-[10px] text-white/20">{song.ratings.length} rated</span>
        )}
        {canRemove && (
          <button
            onClick={() => onRemove(song.id)}
            disabled={removing}
            className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 text-xs transition-all disabled:opacity-20"
          >
            {removing ? "…" : "✕"}
          </button>
        )}
      </div>
    </div>
  );
}
