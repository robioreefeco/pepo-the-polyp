import { useEffect, useState } from "react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776988304049.png";

const EMOJIS = ["🌊", "🪸", "🧬", "🐠", "✨"];

const PARTICLES: { emoji: string; x: number; y: number; size: number; delay: number; dur: number; drift: number }[] = [
  { emoji: "🌊", x: 8,  y: 12, size: 2.2, delay: 0,    dur: 3.8, drift: 18 },
  { emoji: "🪸", x: 88, y: 8,  size: 2.6, delay: 0.3,  dur: 4.2, drift: -14 },
  { emoji: "🧬", x: 14, y: 72, size: 2.0, delay: 0.6,  dur: 3.5, drift: 22 },
  { emoji: "🐠", x: 80, y: 75, size: 2.4, delay: 0.9,  dur: 4.5, drift: -18 },
  { emoji: "✨", x: 50, y: 6,  size: 1.8, delay: 1.1,  dur: 3.2, drift: 10 },
  { emoji: "🌊", x: 92, y: 42, size: 1.6, delay: 0.4,  dur: 4.8, drift: -20 },
  { emoji: "🪸", x: 5,  y: 45, size: 2.8, delay: 0.8,  dur: 3.9, drift: 16 },
  { emoji: "🐠", x: 35, y: 90, size: 2.0, delay: 1.4,  dur: 4.1, drift: -12 },
  { emoji: "✨", x: 72, y: 88, size: 2.2, delay: 0.2,  dur: 3.6, drift: 14 },
  { emoji: "🧬", x: 60, y: 15, size: 1.9, delay: 1.6,  dur: 4.4, drift: -16 },
  { emoji: "✨", x: 22, y: 28, size: 1.5, delay: 0.7,  dur: 3.3, drift: 20 },
  { emoji: "🌊", x: 48, y: 82, size: 2.5, delay: 1.2,  dur: 4.0, drift: -10 },
];

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("out"),  2400);
    const t3 = setTimeout(() => onDone(),          3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const containerOpacity = phase === "out" ? 0 : 1;
  const pepoScale        = phase === "in"  ? 0.6 : 1;
  const pepoOpacity      = phase === "in"  ? 0   : 1;

  return (
    <div
      onClick={onDone}
      data-testid="splash-screen"
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "radial-gradient(ellipse at 50% 60%, #001a26 0%, #000a10 60%, #000408 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", userSelect: "none",
        opacity: containerOpacity,
        transition: phase === "out" ? "opacity 0.8s cubic-bezier(0.4,0,0.2,1)" : "none",
        overflow: "hidden",
      }}
    >
      {/* Floating emoji particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top:  `${p.y}%`,
            fontSize: `${p.size}rem`,
            animation: `floatDrift ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
            "--drift": `${p.drift}px`,
            opacity: 0.85,
            filter: "drop-shadow(0 0 8px rgba(131,238,240,0.4))",
          } as React.CSSProperties}
        >
          {p.emoji}
        </span>
      ))}

      {/* Pepo image */}
      <div style={{
        transform: `scale(${pepoScale})`,
        opacity: pepoOpacity,
        transition: "transform 0.8s cubic-bezier(0.34,1.56,0.64,1), opacity 0.6s ease-out",
        filter: "drop-shadow(0 0 40px rgba(131,238,240,0.35)) drop-shadow(0 0 80px rgba(131,238,240,0.15))",
        position: "relative", zIndex: 2,
        marginBottom: 12,
      }}>
        <img
          src={pepoPng}
          alt="Pepo the Polyp"
          style={{ width: 240, height: "auto", display: "block" }}
          draggable={false}
        />
      </div>

      {/* Title */}
      <div style={{
        opacity: pepoOpacity,
        transition: "opacity 0.6s ease-out 0.15s",
        textAlign: "center",
        position: "relative", zIndex: 2,
      }}>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 800,
          fontSize: "clamp(1.3rem, 4vw, 2rem)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg, #83eef0 0%, #a8f5f7 40%, #56cfb2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 6,
        }}>
          Pepo the Polyp
        </div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(0.65rem, 2vw, 0.85rem)",
          color: "rgba(131,238,240,0.55)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}>
          MesoReef DAO · Coral Knowledge Network
        </div>
        <div style={{
          marginTop: 10,
          fontSize: "1.35rem",
          letterSpacing: "0.3em",
          animation: "pulseEmoji 1.6s ease-in-out infinite",
        }}>
          {EMOJIS.join("")}
        </div>
      </div>

      {/* Tap hint */}
      <div style={{
        position: "absolute", bottom: 28,
        fontFamily: "Inter, sans-serif",
        fontSize: "0.65rem",
        color: "rgba(131,238,240,0.3)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        opacity: phase === "hold" ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}>
        tap to continue
      </div>

      <style>{`
        @keyframes floatDrift {
          from { transform: translateY(0px) translateX(0px) rotate(-3deg); }
          to   { transform: translateY(-22px) translateX(var(--drift)) rotate(5deg); }
        }
        @keyframes pulseEmoji {
          0%, 100% { transform: scale(1);    opacity: 0.85; }
          50%       { transform: scale(1.12); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
