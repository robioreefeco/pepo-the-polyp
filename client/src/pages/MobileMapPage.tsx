import { Suspense, lazy, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Globe, Layers } from "lucide-react";

const ReefMap = lazy(() => import("@/components/ReefMap").then((m) => ({ default: m.ReefMap })));

const GCRMN_COLORS: Record<string, string> = {
  "Australia":   "#ff9f43",
  "Brazil":      "#54a0ff",
  "Caribbean":   "#48dbfb",
  "EAS":         "#ff6b9d",
  "ETP":         "#feca57",
  "Pacific":     "#1dd1a1",
  "ROPME":       "#c56cf0",
  "RSGA":        "#ff6348",
  "South Asia":  "#badc58",
  "WIO":         "#7ed6df",
};

const GCRMN_LONG: Record<string, string> = {
  "Australia":   "Australia & Pacific Islands",
  "Brazil":      "Brazil",
  "Caribbean":   "Caribbean",
  "EAS":         "East Asian Seas",
  "ETP":         "Eastern Tropical Pacific",
  "Pacific":     "Pacific",
  "ROPME":       "Red Sea / Arabian Gulf",
  "RSGA":        "Red Sea & Gulf of Aden",
  "South Asia":  "South Asia",
  "WIO":         "Western Indian Ocean",
};

const CONSERVATION_LINKS = [
  { label: "GCRMN", desc: "Global Coral Reef Monitoring Network", href: "https://gcrmn.net/", color: "#1dd1a1" },
  { label: "Coral Reef Alliance", desc: "Science-based reef conservation", href: "https://coralreefs.org/", color: "#48dbfb" },
  { label: "KAUST KCRI", desc: "Red Sea coral research", href: "https://www.kaust.edu.sa/en/innovate/kcri", color: "#c56cf0" },
  { label: "GBRMPA", desc: "Great Barrier Reef Marine Park Authority", href: "https://www2.gbrmpa.gov.au/", color: "#feca57" },
  { label: "Healthy Reefs", desc: "Mesoamerican Reef report card", href: "https://www.healthyreefs.org/en", color: "#54a0ff" },
  { label: "Corals of the World", desc: "Species database & reef imagery", href: "https://www.coralsoftheworld.org/page/home/", color: "#ff9f43" },
];

interface MapMarker { id: string; displayName: string; avatarUrl: string; latitude: number; longitude: number; orcidId: string; }

function MetricCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 0,
      background: `${color}12`,
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: "10px 8px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    }}>
      {icon}
      <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "Inter,sans-serif", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, color: `${color}99`, fontFamily: "Inter,sans-serif", textAlign: "center", lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

export function MobileMapPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"legend" | "links" | "alerts">("legend");

  const { data: markers = [] } = useQuery<MapMarker[]>({
    queryKey: ["/api/map/markers"],
    refetchInterval: 60_000,
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "#00080c",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        background: "rgba(0,19,28,0.97)",
        borderBottom: "1px solid rgba(131,238,240,0.12)",
        flexShrink: 0,
      }}>
        <button
          data-testid="mobile-map-back"
          onClick={() => navigate("/")}
          style={{
            background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.18)",
            borderRadius: 10, padding: "8px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            color: "#83eef0cc", fontSize: 12, fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} color="#83eef0" /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#83eef0", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Regen Reef Network Map
          </div>
          <div style={{ fontSize: 9.5, color: "#d4e9f355", marginTop: 1 }}>
            Esri Ocean · Allen Coral Atlas · GCRMN · NOAA CRW
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ position: "relative", height: 340, flexShrink: 0 }}>
        <Suspense fallback={
          <div style={{ height: "100%", background: "#00131c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #83eef0", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }}/>
          </div>
        }>
          <ReefMap compact={false} />
        </Suspense>
      </div>

      {/* ── Metrics row ── */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 16px",
        background: "rgba(0,13,20,0.97)",
        borderBottom: "1px solid rgba(131,238,240,0.08)",
        flexShrink: 0,
      }}>
        <MetricCard icon={<Users size={14} color="#83eef0"/>} value={markers.length} label="Members" color="#83eef0" />
        <MetricCard icon={<Globe size={14} color="#1dd1a1"/>} value={10} label="GCRMN Zones" color="#1dd1a1" />
        <MetricCard icon={<Layers size={14} color="#c56cf0"/>} value={3} label="Active Layers" color="#c56cf0" />
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(131,238,240,0.1)",
        background: "rgba(0,13,20,0.97)", flexShrink: 0,
      }}>
        {(["legend", "links", "alerts"] as const).map((tab) => {
          const labels = { legend: "GCRMN Regions", links: "Conservation", alerts: "Heat Stress" };
          return (
            <button
              key={tab}
              data-testid={`mobile-map-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "10px 4px",
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === tab ? "#83eef0" : "transparent"}`,
                color: activeTab === tab ? "#83eef0" : "#d4e9f355",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.04em", textTransform: "uppercase",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Tab content (scrollable) ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        background: "rgba(0,13,20,0.97)",
        paddingBottom: "max(80px, calc(env(safe-area-inset-bottom) + 72px))",
      }}>
        {activeTab === "legend" && (
          <div style={{ padding: "14px 16px" }}>
            {/* Member pins */}
            <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Map Key</div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 13, height: 13, borderRadius: "50%", background: "#83eef0", border: "2px solid #83eef0", display: "inline-block" }}/>
                <span style={{ fontSize: 11, color: "#d4e9f3bb" }}>DAO Member</span>
              </div>
            </div>

            {/* GCRMN regions */}
            <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>GCRMN Regions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {Object.entries(GCRMN_COLORS).map(([key, color]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 14, height: 9, borderRadius: 2, flexShrink: 0,
                    background: color + "40", border: `1.5px solid ${color}`,
                    display: "inline-block",
                  }}/>
                  <span style={{ fontSize: 10.5, color: "#d4e9f3bb", lineHeight: 1.3 }}>
                    {GCRMN_LONG[key] ?? key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "links" && (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Partner Organisations
            </div>
            {CONSERVATION_LINKS.map(({ label, desc, href, color }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`mobile-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: `${color}0d`, border: `1px solid ${color}25`,
                  borderRadius: 12, padding: "12px 14px", textDecoration: "none",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d4e9f3ee" }}>{label}</div>
                  <div style={{ fontSize: 10.5, color: "#d4e9f355", marginTop: 2 }}>{desc}</div>
                </div>
                <span style={{ fontSize: 14, color: `${color}99` }}>↗</span>
              </a>
            ))}
          </div>
        )}

        {activeTab === "alerts" && (
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              NOAA Coral Reef Watch
            </div>
            <a
              href="https://coralreefwatch.noaa.gov/product/5km/index_5km_dhw.php"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="mobile-link-noaa-dhw"
              style={{
                display: "block",
                background: "rgba(220,50,50,0.07)",
                border: "1px solid rgba(220,85,85,0.3)",
                borderRadius: 14, padding: "14px",
                textDecoration: "none", marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e08888" }}>Degree Heating Weeks (5 km)</span>
                <span style={{ fontSize: 10, color: "#e05555aa" }}>Weekly ↗</span>
              </div>
              <p style={{ fontSize: 11, color: "#d4e9f377", lineHeight: 1.6, margin: "0 0 12px" }}>
                DHW tracks accumulated thermal stress on coral reefs. Bleaching risk starts at 4°C-weeks; severe mortality risk above 8°C-weeks.
              </p>
              {/* Alert scale */}
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { label: "Watch", color: "#feca57", note: "DHW ≥ 1" },
                  { label: "Warning", color: "#ff9f43", note: "DHW ≥ 4" },
                  { label: "Alert 1", color: "#ff6348", note: "DHW ≥ 8" },
                  { label: "Alert 2", color: "#c0392b", note: "DHW ≥ 16" },
                ].map(({ label, color, note }) => (
                  <div key={label} style={{
                    flex: 1,
                    background: `${color}22`,
                    border: `1px solid ${color}66`,
                    borderRadius: 8,
                    padding: "6px 4px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color }}>{label}</div>
                    <div style={{ fontSize: 8, color: `${color}99`, marginTop: 2 }}>{note}</div>
                  </div>
                ))}
              </div>
            </a>

            {/* Data sources */}
            <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Map Data Sources
            </div>
            {[
              { label: "Esri Ocean Basemap", href: "https://www.arcgis.com" },
              { label: "Allen Coral Atlas", href: "https://allencoralatlas.org" },
              { label: "GCRMN Regions", href: "https://gcrmn.net" },
              { label: "NOAA Coral Reef Watch", href: "https://coralreefwatch.noaa.gov" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(131,238,240,0.06)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 12, color: "#d4e9f388" }}>{label}</span>
                <span style={{ fontSize: 11, color: "#83eef055" }}>↗</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
