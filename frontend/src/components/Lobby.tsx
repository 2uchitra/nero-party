import { useState } from "react";
import { api } from "../lib/api";
import type { Party } from "../lib/api";
import { RingBackground } from "./RingBackground";
import { QueueList } from "./QueueList";
import { SongSearch } from "./SongSearch";

interface Props {
  party: Party;
  participantId: string;
  isHost: boolean;
}

export function Lobby({ party, participantId, isHost }: Props) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

  const queueFull = party.maxSongs != null && party.songs.length >= party.maxSongs;
  const canStart = isHost && party.songs.filter((s) => s.status === "QUEUED").length > 0;

  function copyCode() {
    navigator.clipboard.writeText(party.code);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/party/${party.code}`);
    setCopyLabel("Link copied!");
    setTimeout(() => setCopyLabel("Copy"), 2000);
  }

  async function startParty() {
    setStarting(true);
    setStartError("");
    try {
      await api.startParty(party.code, participantId);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start");
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-nero-bg text-nero-text flex flex-col relative">
      <RingBackground />

      {/* Floating pill nav */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2.5 border border-white/10 rounded-full px-5 py-2.5 bg-black/70 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse-slow" />
          <span className="font-bold text-xs tracking-[0.2em] uppercase text-white/60">
            Lobby
          </span>
        </div>
      </div>

      <div className="relative z-10 flex-1 max-w-lg mx-auto w-full px-6 pt-28 pb-16 space-y-14 animate-fade-in">

        {/* Party name */}
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
            Tonight
          </p>
          <h1 className="font-black text-[clamp(48px,8vw,72px)] leading-[0.9] tracking-tighter uppercase">
            {party.name}
          </h1>
        </div>

        {/* Invite block */}
        <div className="space-y-4">
          <p className="label">Invite Code</p>
          <div className="flex items-center gap-6">
            <span
              className="font-mono font-bold text-5xl tracking-[0.2em] text-nero-accent"
              style={{ animation: "breathe 3s ease-in-out infinite" }}
            >
              {party.code}
            </span>
            <div className="flex gap-2 ml-auto">
              <button onClick={copyCode} className="btn-ghost text-xs px-4 py-2">
                {copyLabel}
              </button>
              <button onClick={copyLink} className="btn-ghost text-xs px-4 py-2">
                Share Link
              </button>
            </div>
          </div>
          {(party.maxSongs || party.timeLimitMinutes) && (
            <p className="font-mono text-[10px] tracking-widest text-white/25 uppercase">
              {party.maxSongs && `${party.songs.length}/${party.maxSongs} songs`}
              {party.maxSongs && party.timeLimitMinutes && "  ·  "}
              {party.timeLimitMinutes && `${party.timeLimitMinutes} min limit`}
            </p>
          )}
        </div>

        {/* Participants */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="label mb-0">Here Now</p>
            <span className="font-mono text-xs text-white/25">{party.participants.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {party.participants.map((p, index) => (
              <div
                key={p.id}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  p.id === participantId
                    ? "border-nero-accent/50 text-white"
                    : "border-white/10 text-white/50"
                }`}
                style={{
                  animation: "chipIn 0.4s ease-out both",
                  animationDelay: `${Math.min(index * 0.07, 0.4)}s`,
                }}
              >
                {p.name}
                {p.isHost && (
                  <span className="ml-1.5 text-nero-accent font-mono">host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="label mb-0">Queue</p>
            <button
              onClick={() => setShowSearch(true)}
              disabled={queueFull}
              className="font-mono text-[10px] tracking-widest uppercase text-nero-accent hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              + Add Song
            </button>
          </div>
          <QueueList
            songs={party.songs}
            participantId={participantId}
            isHost={isHost}
            partyCode={party.code}
            showScores={false}
          />
        </div>

        {/* CTA */}
        <div className="space-y-3">
          {isHost ? (
            <>
              {startError && (
                <p className="text-nero-accent text-xs font-mono">{startError}</p>
              )}
              <button
                onClick={startParty}
                disabled={!canStart || starting}
                className="btn-primary w-full"
              >
                {starting ? "Starting…" : canStart ? "Start the Party" : "Add a song to start"}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="flex items-end gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full bg-white/30"
                    style={{
                      animation: "dotBounce 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] tracking-[0.3em] text-white/25 uppercase">
                Waiting for host to start
              </span>
            </div>
          )}
        </div>
      </div>

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
