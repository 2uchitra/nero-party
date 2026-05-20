import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";
import { api } from "../lib/api";
import type { Party, Participant, QueuedSong, Rating, EndResult } from "../lib/api";
import { Lobby } from "../components/Lobby";
import { ActiveParty } from "../components/ActiveParty";
import { WinnerReveal } from "../components/WinnerReveal";

export function PartyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [party, setParty] = useState<Party | null>(null);
  const [endResult, setEndResult] = useState<EndResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const upperCode = (code ?? "").toUpperCase();
  const participantId = sessionStorage.getItem(`participant:${upperCode}`) ?? "";

  useEffect(() => {
    if (!upperCode) return;

    api.getParty(upperCode)
      .then((p) => { setParty(p); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });

    // Named handlers — required so socket.off() removes exactly these listeners,
    // not all listeners for the event (important in React StrictMode double-mount).
    function joinRoom() {
      socket.emit("join-party", { partyCode: upperCode });
    }
    function onPartyState(p: Party) {
      setParty(p);
    }
    function onParticipantJoined({ party: p }: { participant: Participant; party: Party }) {
      setParty(p);
    }
    function onSongAdded({ song }: { song: QueuedSong }) {
      setParty((prev) => prev ? { ...prev, songs: [...prev.songs, song] } : prev);
    }
    function onSongRemoved({ songId }: { songId: string }) {
      setParty((prev) => prev ? { ...prev, songs: prev.songs.filter((s) => s.id !== songId) } : prev);
    }
    function onRatingUpdated({ songId, ratings }: { songId: string; ratings: Rating[] }) {
      setParty((prev) =>
        prev
          ? { ...prev, songs: prev.songs.map((s) => s.id === songId ? { ...s, ratings } : s) }
          : prev
      );
    }
    function onPartyStarted({ party: p }: { party: Party; serverTime: number }) {
      setParty(p);
    }
    // party:updated fires whenever the song advances; replaces old song:playing
    function onPartyUpdated(p: Party) {
      if (p) setParty(p);
    }
    // party:ended carries the full ended party so all clients can hydrate at once
    function onPartyEnded({ result, party: p }: { result: EndResult; party: Party | null }) {
      setEndResult(result);
      if (p) setParty(p);
      else setParty((prev) => prev ? { ...prev, status: "ENDED" } : prev);
    }

    // Re-join the room on every (re)connect so missed-room-after-reconnect never happens
    socket.on("connect", joinRoom);
    socket.on("party:state", onPartyState);
    socket.on("participant:joined", onParticipantJoined);
    socket.on("song:added", onSongAdded);
    socket.on("song:removed", onSongRemoved);
    socket.on("rating:updated", onRatingUpdated);
    socket.on("party:started", onPartyStarted);
    socket.on("party:updated", onPartyUpdated);
    socket.on("party:ended", onPartyEnded);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off("party:state", onPartyState);
      socket.off("participant:joined", onParticipantJoined);
      socket.off("song:added", onSongAdded);
      socket.off("song:removed", onSongRemoved);
      socket.off("rating:updated", onRatingUpdated);
      socket.off("party:started", onPartyStarted);
      socket.off("party:updated", onPartyUpdated);
      socket.off("party:ended", onPartyEnded);
      socket.emit("leave-party", { partyCode: upperCode });
    };
  }, [upperCode]);

  if (loading) return <LoadingScreen />;
  if (!party) return <ErrorScreen message={error || "Party not found"} onBack={() => navigate("/")} />;

  const isHost = party.participants.find((p) => p.id === participantId)?.isHost ?? false;

  if (party.status === "ENDED") {
    return <WinnerReveal party={party} endResult={endResult} />;
  }

  if (party.status === "WAITING") {
    return <Lobby party={party} participantId={participantId} isHost={isHost} />;
  }

  return (
    <ActiveParty
      party={party}
      participantId={participantId}
      isHost={isHost}
      onEnd={(result) => {
        setEndResult(result);
        setParty((prev) => (prev ? { ...prev, status: "ENDED" } : prev));
      }}
      onPartyUpdate={setParty}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-nero-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-px h-10 bg-nero-accent mx-auto animate-pulse" />
        <p className="font-mono text-xs tracking-[0.3em] text-white/30 uppercase">Loading</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-nero-bg flex items-center justify-center px-4">
      <div className="text-center space-y-5">
        <p className="font-black text-3xl text-white/40 uppercase tracking-tighter">Party not found</p>
        <p className="text-white/30 text-sm font-mono">{message}</p>
        <button onClick={onBack} className="btn-ghost text-sm">
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
