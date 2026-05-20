/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        nero: {
          bg: "#000000",
          surface: "#0a0a0a",
          border: "#1c1c1c",
          muted: "#2a2a2a",
          text: "#ffffff",
          dim: "#666666",
          accent: "#22c55e",
          "accent-dim": "#16a34a",
          gold: "#ffd700",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-gold": "glowGold 2s ease-in-out infinite alternate",
        "winner-in": "winnerIn 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowGold: {
          from: { textShadow: "0 0 20px rgba(255,215,0,0.3)" },
          to: { textShadow: "0 0 60px rgba(255,215,0,0.7), 0 0 100px rgba(255,215,0,0.3)" },
        },
        winnerIn: {
          from: { opacity: "0", transform: "scale(0.85) translateY(30px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
