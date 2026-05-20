import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Party, EndResult, SongScore } from "../lib/api";
import { RingBackground } from "./RingBackground";

function deriveEndResult(party: Party): EndResult {
  const played = party.songs.filter((s) => s.status === "PLAYED" || s.status === "PLAYING");
  if (played.length === 0) return { winner: null, scores: [] };
  const n = Math.max(party.participants.length, 1);
  const scores: SongScore[] = played
    .map((song) => {
      if (song.ratings.length === 0) return { song, finalScore: 0, avgRating: 0, participationRate: 0 };
      const avgRating = song.ratings.reduce((s, r) => s + r.score, 0) / song.ratings.length;
      const participationRate = song.ratings.length / n;
      return { song, finalScore: avgRating * (0.8 + 0.2 * participationRate), avgRating, participationRate };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
  return { winner: scores[0].song, scores };
}

interface Props {
  party: Party;
  endResult: EndResult | null;
}

type Phase = "dark" | "label" | "winner" | "scores";

async function extractAlbumColors(imageUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const SIZE = 20;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve([]); return; }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        const buckets = new Map<string, number>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const brightness = (r + g + b) / 3;
          if (brightness < 25 || brightness > 230) continue;
          if (Math.max(r, g, b) - Math.min(r, g, b) < 35) continue;
          const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }

        resolve(
          [...buckets.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([key]) => {
              const [r, g, b] = key.split(",").map(Number);
              return `rgb(${r},${g},${b})`;
            })
        );
      } catch {
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}

export function WinnerReveal({ party, endResult }: Props) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("dark");
  const [displayTitle, setDisplayTitle] = useState("");
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [confettiColors, setConfettiColors] = useState<string[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("label"), 1000);
    const t2 = setTimeout(() => setPhase("winner"), 2200);
    const t3 = setTimeout(() => setPhase("scores"), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const result = useMemo(
    () => endResult ?? deriveEndResult(party),
    // recompute only when endResult changes; party data is stable at reveal time
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endResult]
  );
  const winner = result.winner;
  const scores = result.scores;

  useEffect(() => {
    if (!winner?.albumArt) return;
    extractAlbumColors(winner.albumArt).then((colors) => {
      if (colors.length >= 2) setConfettiColors(colors);
    });
  }, [winner?.albumArt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix #1: capture title at effect time; use typewriterDone state for cursor
  // instead of string-length comparison (which can race with async state updates).
  useEffect(() => {
    if (phase !== "winner" || !winner) return;
    const title = winner.title;
    setDisplayTitle("");
    setTypewriterDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayTitle(title.slice(0, i));
      if (i >= title.length) {
        clearInterval(interval);
        setTypewriterDone(true);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const confettiBase = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      width: 4 + Math.random() * 6,
      height: 3 + Math.random() * 5,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      isCircle: i % 3 === 0,
    })),
    []
  );

  const palette = confettiColors.length >= 2
    ? confettiColors
    : ["#ffd700", "#ffd700", "rgba(255,255,255,0.85)", "#ffd700"];

  const show = (p: Phase) => {
    const order: Phase[] = ["dark", "label", "winner", "scores"];
    return order.indexOf(phase) >= order.indexOf(p);
  };

  return (
    // Fix #3: overflow-x-hidden (not overflow-hidden) so the page can scroll
    // vertically when content (300px art + scoreboard + button) exceeds viewport.
    <div className="min-h-screen bg-nero-bg text-nero-text flex flex-col items-center px-6 py-16 relative overflow-x-hidden">
      <RingBackground />

      {show("label") && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 40% 60% at 50% -10%, rgba(255,215,0,0.08) 0%, transparent 70%)",
            animation: "spotlight 1s ease-out both",
          }}
        />
      )}

      {show("winner") && winner?.albumArt && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
          style={{
            backgroundImage: `url(${winner.albumArt})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(100px) saturate(0.2)",
            opacity: 0.07,
            transform: "scale(1.2)",
          }}
        />
      )}

      {show("winner") && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
          style={{
            background: "radial-gradient(ellipse 50% 35% at 50% 45%, rgba(255,215,0,0.06) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Fix #5 & #6: z-[2] puts confetti above the black bg but below content at z-10 */}
      {show("winner") && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2]">
          {confettiBase.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                top: "-20px",
                width: p.width,
                height: p.height,
                backgroundColor: palette[p.id % palette.length],
                borderRadius: p.isCircle ? "50%" : "2px",
                animation: `confettiFall ${p.duration}s ease-in ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Fix #2: reduced tracking so short party names don't spread awkwardly */}
      <div className="relative z-10 w-full max-w-md text-center">

        <div
          className={`transition-all duration-600 ${
            show("label") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] text-white/30 uppercase mb-2 truncate">
            {party.name}
          </p>
          <p className="font-mono text-[10px] tracking-[0.3em] text-nero-gold/60 uppercase">
            The Winner
          </p>
        </div>

        {winner && (
          <div
            className={`mt-8 transition-opacity duration-700 ${
              show("winner") ? "opacity-100" : "opacity-0"
            }`}
          >
            {winner.albumArt && (
              <div
                style={{
                  animation: show("winner")
                    ? "crownDrop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both"
                    : "none",
                }}
              >
                <img
                  src={winner.albumArt}
                  alt=""
                  className="w-[300px] h-[300px] object-cover mx-auto mb-8 rounded-md"
                  style={{
                    boxShadow: "0 0 80px rgba(255,215,0,0.25), 0 0 160px rgba(255,215,0,0.08)",
                  }}
                />
              </div>
            )}

            <h1
              className="font-black text-[clamp(40px,8vw,64px)] leading-[0.9] tracking-tighter uppercase break-words"
              style={{ color: "#f5f0e8" }}
            >
              {displayTitle}
              {/* Fix #1: cursor keyed to typewriterDone, not string-length comparison */}
              {!typewriterDone && (
                <span style={{ animation: "blink 0.6s step-end infinite" }}>|</span>
              )}
            </h1>
            <p className="text-white/50 text-lg font-semibold mt-3">{winner.artist}</p>

            {scores[0] && (
              <div className="inline-flex items-center gap-3 mt-5 px-5 py-2 border border-nero-gold/20 rounded-full">
                <span className="font-mono text-[10px] text-nero-gold/50 tracking-widest uppercase">Score</span>
                <span className="font-mono font-bold text-xl text-nero-gold">
                  {scores[0].finalScore.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {!winner && show("winner") && (
          <p className="mt-10 font-black text-4xl text-white/20 uppercase tracking-tighter">
            No songs were played
          </p>
        )}

        <div
          className={`mt-12 transition-opacity duration-700 ${
            show("scores") ? "opacity-100" : "opacity-0"
          }`}
        >
          {scores.length > 1 && (
            <div className="border-t border-white/[0.08] pt-8 text-left">
              <p className="label text-center mb-6">Final Standings</p>
              {scores.map((s, i) => {
                const isWinner = i === 0;
                // Fix #4: "X/Y voted" instead of percentage
                const votedDisplay = `${s.song.ratings.length}/${party.participants.length} voted`;
                return (
                  <div
                    key={s.song.id}
                    className={`flex items-center gap-3 py-3 border-b border-white/5 ${
                      isWinner ? "border-nero-gold/10" : ""
                    }`}
                    style={{
                      animation: "slideInUp 0.4s ease-out both",
                      animationDelay: `${i * 0.12}s`,
                    }}
                  >
                    <span
                      className={`font-mono text-xs w-5 shrink-0 font-bold ${
                        isWinner ? "text-nero-gold" : "text-white/20"
                      }`}
                    >
                      {i + 1}
                    </span>

                    {s.song.albumArt && (
                      <img src={s.song.albumArt} alt="" className="w-8 h-8 object-cover shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-bold truncate uppercase tracking-tight ${
                          isWinner ? "text-white/90" : "text-white/50"
                        }`}
                      >
                        {s.song.title}
                      </p>
                      <p className="text-[10px] text-white/25 font-mono truncate">{s.song.artist}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className="font-mono font-bold text-sm"
                        style={{
                          color: i === 0 ? "#ef4444" : i === 1 ? "#f97316" : i === 2 ? "#facc15" : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {s.finalScore.toFixed(2)}
                      </p>
                      <p className="font-mono text-[10px] text-white/20">
                        {s.avgRating.toFixed(1)} avg · {votedDisplay}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fix #3: mb-4 ensures button isn't cut off at page bottom */}
          <button
            onClick={() => navigate("/")}
            className="btn-ghost mt-10 mb-4 text-xs tracking-widest uppercase"
          >
            Start a New Party
          </button>
        </div>
      </div>
    </div>
  );
}
