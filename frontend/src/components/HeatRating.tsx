import type { CSSProperties } from "react";
import { useState } from "react";

interface Props {
  currentScore: number;
  onRate: (score: number) => void;
  disabled?: boolean;
  avgRating?: number;
  totalRatings?: number;
  participantCount?: number;
  large?: boolean;
}

const labels = ["", "Ice Cold", "Meh", "Decent", "Hot", "Inferno"];
const heatColors = ["", "#60a5fa", "#4ade80", "#facc15", "#f97316", "#ef4444"];
const heatEmojis = ["", "❄️", "🌊", "✨", "🔥", "💥"];

export function HeatRating({ currentScore, onRate, disabled, avgRating, totalRatings, participantCount, large }: Props) {
  const [hover, setHover] = useState(0);
  const [burstIndex, setBurstIndex] = useState(0);
  const active = hover || currentScore;

  function handleRate(n: number) {
    setBurstIndex(n);
    onRate(n);
    setTimeout(() => setBurstIndex(0), 400);
  }

  function buttonStyle(n: number): CSSProperties {
    if (n > active) {
      return {
        borderColor: large ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.1)",
        color: large ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.2)",
        background: "transparent",
      };
    }
    const col = heatColors[active] ?? "#ffffff";
    const isSelected = n === active;
    return {
      borderColor: col,
      color: col,
      backgroundColor: `${col}18`,
      boxShadow: isSelected && large
        ? `0 0 0 2px ${col}, 0 0 22px ${col}cc, 0 0 50px ${col}55, inset 0 0 18px ${col}22`
        : isSelected
        ? `0 0 16px ${col}50`
        : undefined,
    };
  }

  if (large) {
    return (
      <div className="flex flex-col gap-2 min-h-0 py-1">
        {/* Emoji indicator row */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center justify-center" style={{ width: "60px", height: "22px" }}>
              <span
                style={{
                  fontSize: "18px",
                  lineHeight: 1,
                  opacity: n === active ? 1 : 0,
                  transform: n === active ? "scale(1) translateY(0)" : "scale(0.5) translateY(4px)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                  filter: n === active ? `drop-shadow(0 0 6px ${heatColors[n]})` : "none",
                }}
              >
                {heatEmojis[n]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1" style={{ width: "60px" }}>
              <div className="relative" style={{ width: "54px", height: "54px" }}>
                {/* Pulsing glow ring for selected button */}
                {n === currentScore && (
                  <div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      inset: "-5px",
                      border: `1.5px solid ${heatColors[n]}`,
                      boxShadow: `0 0 12px ${heatColors[n]}80, 0 0 24px ${heatColors[n]}40`,
                      animation: "ratingRingPulse 1.5s ease-in-out infinite",
                    }}
                  />
                )}
                <button
                  disabled={disabled}
                  onClick={() => handleRate(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  title={labels[n]}
                  className="rounded-full border font-black font-mono transition-all duration-200 disabled:cursor-default"
                  style={{
                    width: "54px",
                    height: "54px",
                    fontSize: "17px",
                    ...buttonStyle(n),
                    ...(burstIndex === n ? { animation: "ratingBurst 0.35s ease-out" } : {}),
                  }}
                >
                  {n}
                </button>
              </div>
              <span
                className="font-mono text-[8px] tracking-wide text-center leading-tight uppercase"
                style={{ color: n <= active ? (heatColors[active] ?? "rgba(255,255,255,0.5)") + "aa" : "rgba(255,255,255,0.2)" }}
              >
                {labels[n]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 h-5">
          {totalRatings !== undefined && totalRatings > 0 ? (
            <>
              <span className="font-mono font-bold text-sm text-nero-gold tabular-nums">
                {avgRating?.toFixed(1)}
              </span>
              <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
                avg · {totalRatings}{participantCount ? `/${participantCount}` : ""} rated
              </span>
            </>
          ) : (
            <span className="font-mono text-[10px] text-white/15 tracking-widest uppercase">
              Be the first to rate
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex flex-col items-center gap-1 w-10">
            <button
              disabled={disabled}
              onClick={() => handleRate(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              title={labels[n]}
              className="w-10 h-10 rounded-full border text-sm font-bold font-mono transition-all duration-150 disabled:cursor-default"
              style={{
                ...buttonStyle(n),
                ...(burstIndex === n ? { animation: "ratingBurst 0.35s ease-out" } : {}),
              }}
            >
              {n}
            </button>
            <span
              className="text-[9px] font-mono tracking-wide text-center leading-tight transition-colors"
              style={{ color: n <= active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}
            >
              {labels[n]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 h-5">
        {totalRatings !== undefined && totalRatings > 0 ? (
          <>
            <span className="font-mono font-bold text-sm text-nero-gold tabular-nums">
              {avgRating?.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
              avg &nbsp;·&nbsp; {totalRatings}
              {participantCount ? `/${participantCount}` : ""} rated
            </span>
          </>
        ) : (
          <span className="font-mono text-[10px] text-white/15 tracking-widest uppercase">
            Be the first to rate
          </span>
        )}
      </div>
    </div>
  );
}
