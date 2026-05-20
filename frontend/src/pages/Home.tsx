import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { RingBackground } from "../components/RingBackground";

type Tab = "create" | "join";

export function Home() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("create");

  const [partyName, setPartyName] = useState("");
  const [hostName, setHostName] = useState("");
  const [maxSongs, setMaxSongs] = useState("");
  const [timeLimit, setTimeLimit] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { party, participantId } = await api.createParty({
        name: partyName.trim(),
        hostName: hostName.trim(),
        maxSongs: maxSongs ? parseInt(maxSongs) : undefined,
        timeLimitMinutes: timeLimit ? parseInt(timeLimit) : undefined,
      });
      sessionStorage.setItem(`participant:${party.code}`, participantId);
      navigate(`/party/${party.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    setLoading(true);
    setError("");
    try {
      const { participant, party } = await api.joinParty(code, joinName.trim());
      sessionStorage.setItem(`participant:${party.code}`, participant.id);
      navigate(`/party/${party.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-nero-bg text-nero-text flex flex-col relative">
      <RingBackground />

      {/* Floating pill nav */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2.5 border border-white/10 rounded-full px-5 py-2.5 bg-black/70 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-nero-accent" />
          <span className="font-bold text-xs tracking-[0.2em] uppercase text-white/80">
            Nero Party
          </span>
        </div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">
        {/* Headline */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="font-black text-[clamp(72px,12vw,120px)] leading-[0.9] tracking-tighter text-white uppercase transition-[letter-spacing] duration-500 ease-out hover:tracking-wide cursor-default select-none">
            Nero
            <br />
            Party
          </h1>
          <p className="mt-6 text-white/40 text-sm tracking-widest uppercase font-medium">
            Queue songs · Listen together · Crown the winner
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm animate-slide-up">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-10 border-b border-white/10">
            {(["create", "join"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 pb-3 text-sm font-bold tracking-widest uppercase transition-all duration-200 ${
                  tab === t
                    ? "text-white border-b-2 border-nero-accent -mb-px"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "create" ? (
            <form onSubmit={handleCreate} className="space-y-8">
              <div>
                <label className="label">Party Name</label>
                <input
                  className="input-field"
                  placeholder="Late Night Sessions"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Your Name</label>
                <input
                  className="input-field"
                  placeholder="DJ Nero"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  required
                />
              </div>

              {/* Optional rules */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label">Max Songs</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="No limit"
                    min="1"
                    max="50"
                    value={maxSongs}
                    onChange={(e) => setMaxSongs(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Time Limit (min)</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="No limit"
                    min="5"
                    max="180"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-nero-accent text-xs font-mono">{error}</p>}

              <button
                type="submit"
                disabled={loading || !partyName.trim() || !hostName.trim()}
                className="btn-primary w-full group"
              >
                <span className="flex items-center justify-center gap-2.5">
                  <span className="inline-block text-white/40 transition-transform duration-[1200ms] ease-in-out group-hover:rotate-[360deg]">
                    ⏺
                  </span>
                  {loading ? "Creating…" : "Create Party"}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-8">
              <div>
                <label className="label">Invite Code</label>
                <input
                  className="input-field font-mono tracking-[0.3em] text-nero-accent text-center text-2xl font-bold uppercase"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="label">Your Name</label>
                <input
                  className="input-field"
                  placeholder="Night Owl"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-nero-accent text-xs font-mono">{error}</p>}

              <button
                type="submit"
                disabled={loading || joinCode.length < 6 || !joinName.trim()}
                className="btn-primary w-full"
              >
                {loading ? "Joining…" : "Join Party"}
              </button>
            </form>
          )}
        </div>


      </main>
    </div>
  );
}
