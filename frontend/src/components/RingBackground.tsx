import { useEffect, useState } from "react";

export function RingBackground() {
  const [spunUp, setSpunUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSpunUp(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const cwAnim  = spunUp ? "spinCW  30s linear infinite" : "spinCW  3s ease-in forwards";
  const ccwAnim = spunUp ? "spinCCW 30s linear infinite" : "spinCCW 3s ease-in forwards";

  const cwRings  = [140, 420, 700, 980];
  const ccwRings = [280, 560, 840, 1120, 1260];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">

      {/* Warm pulsing glow at center — record platter */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 320px at 50% 50%, rgba(255,190,70,0.14) 0%, rgba(255,130,20,0.06) 55%, transparent 100%)",
          animation: "pulseGlow 4s ease-in-out infinite",
        }}
      />

      {/* Clockwise rings */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.15, transformOrigin: "50% 50%", animation: cwAnim }}
      >
        {cwRings.map((r) => (
          <circle key={r} cx="50%" cy="50%" r={r} fill="none" stroke="white" strokeWidth="0.85" />
        ))}
      </svg>

      {/* Counter-clockwise rings */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.15, transformOrigin: "50% 50%", animation: ccwAnim }}
      >
        {ccwRings.map((r) => (
          <circle key={r} cx="50%" cy="50%" r={r} fill="none" stroke="white" strokeWidth="0.85" />
        ))}
      </svg>

      {/* Record label ring */}
      <div
        className="absolute"
        style={{
          width: "96px",
          height: "96px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,190,60,0.22) 0%, rgba(200,120,20,0.1) 60%, transparent 100%)",
          border: "1px solid rgba(255,180,50,0.2)",
          animation: "pulseGlow 4s ease-in-out infinite",
        }}
      />
      {/* Spindle */}
      <div
        className="absolute"
        style={{
          width: "14px",
          height: "14px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "rgba(255,185,55,0.55)",
          boxShadow: "0 0 10px rgba(255,180,50,0.6)",
        }}
      />

      {/* Orbiting dots — CW container */}
      <div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 50%", animation: cwAnim }}
      >
        {/* Dot 1 — r=420, 3 o'clock */}
        <div
          className="absolute rounded-full"
          style={{
            width: "12px",
            height: "12px",
            background: "white",
            opacity: 0.75,
            left: "calc(50% + 420px)",
            top: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 14px 4px rgba(255,255,255,0.35)",
          }}
        />
        {/* Dot 3 — r=280, 9 o'clock */}
        <div
          className="absolute rounded-full"
          style={{
            width: "6px",
            height: "6px",
            background: "white",
            opacity: 0.65,
            left: "calc(50% - 280px)",
            top: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 8px 2px rgba(255,255,255,0.25)",
          }}
        />
      </div>

      {/* Dot 2 — CCW, r=700 */}
      <div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 50%", animation: ccwAnim }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: "10px",
            height: "10px",
            background: "white",
            opacity: 0.7,
            left: "calc(50% + 700px)",
            top: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 12px 3px rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}
