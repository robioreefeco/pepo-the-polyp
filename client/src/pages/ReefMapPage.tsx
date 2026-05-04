import { Suspense, lazy } from "react";
import { useLocation } from "wouter";

const ReefMap = lazy(() =>
  import("@/components/ReefMap").then((m) => ({ default: m.ReefMap }))
);

function MapLoadingScreen() {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "#00080c",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#83eef0" strokeWidth="1.8"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
            stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span style={{ color: "#83eef0", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Regen Reef Network Map
        </span>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "2px solid #83eef0", borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ReefMapPage() {
  const [, navigate] = useLocation();

  return (
    <>
      <div
        data-testid="reef-map-page-bg"
        style={{ position: "fixed", inset: 0, background: "#00080c", zIndex: 50 }}
      />
      <Suspense fallback={<MapLoadingScreen />}>
        <ReefMap
          compact={true}
          expanded={true}
          onExpandChange={(open) => {
            if (!open) navigate("/");
          }}
        />
      </Suspense>
    </>
  );
}
