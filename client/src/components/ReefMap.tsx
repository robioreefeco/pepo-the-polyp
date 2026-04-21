import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, X, Users, BadgeCheck, Globe, Layers } from "lucide-react";
import type { Feature } from "geojson";

// ─── Fix Leaflet default icon paths broken by Vite ────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── GCRMN region colour palette ─────────────────────────────────────────────
const GCRMN_COLORS: Record<string, string> = {
  "Australia":    "#ff9f43",
  "Brazil":       "#54a0ff",
  "Caribbean":    "#48dbfb",
  "EAS":          "#ff6b9d",
  "ETP":          "#feca57",
  "Pacific":      "#1dd1a1",
  "ROPME":        "#c56cf0",
  "RSGA":         "#ff6348",
  "South Asia":   "#badc58",
  "WIO":          "#7ed6df",
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

// ─── Custom coral-teal member pin ─────────────────────────────────────────────
function makePin(hasOrcid = false) {
  const border = hasOrcid ? "#A6CE39" : "#83eef0";
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#83eef0;
      border:2.5px solid ${border};
      box-shadow:0 0 6px #83eef088, 0 2px 6px #00000055;
    "></div>`,
  });
}

// ─── Auto-fit to member markers ───────────────────────────────────────────────
function FitBounds({ markers }: { markers: { latitude: number; longitude: number }[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (markers.length === 0 || fitted.current) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
    map.fitBounds(bounds.pad(0.5), { maxZoom: 6 });
    fitted.current = true;
  }, [markers, map]);
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MapMarker {
  id: string;
  displayName: string;
  avatarUrl: string;
  latitude: number;
  longitude: number;
  orcidId: string;
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
function gcrmnStyle(feature?: Feature) {
  const name = (feature?.properties as any)?.region ?? "";
  const color = GCRMN_COLORS[name] ?? "#83eef0";
  return { color, weight: 1.2, opacity: 0.85, fillColor: color, fillOpacity: 0.12 };
}

function bindGcrmnLayer(feature: Feature, layer: L.Layer) {
  const name = (feature.properties as any)?.region ?? "Unknown";
  const long = GCRMN_LONG[name] ?? name;
  (layer as L.Path).bindTooltip(long, {
    permanent: false, direction: "center", className: "gcrmn-tooltip",
  });
  (layer as L.Path).on("mouseover", function (this: L.Path) {
    this.setStyle({ fillOpacity: 0.32, weight: 2 });
  });
  (layer as L.Path).on("mouseout", function (this: L.Path) {
    this.setStyle({ fillOpacity: 0.12, weight: 1.2 });
  });
}

// ─── Expanded map modal ───────────────────────────────────────────────────────
function ExpandedMapModal({
  markers,
  gcrmnGeoJson,
  onClose,
}: {
  markers: MapMarker[];
  gcrmnGeoJson: GeoJSON.FeatureCollection | undefined;
  onClose: () => void;
}) {
  const [showGcrmn, setShowGcrmn] = useState(true);
  const [showAca,   setShowAca]   = useState(true);

  const orcidCount = markers.filter((m) => !!m.orcidId).length;
  const activeLayers = (showGcrmn ? 1 : 0) + (showAca ? 1 : 0) + 1; // +1 basemap

  return createPortal(
    <div
      data-testid="reef-map-expanded"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,10,18,0.92)",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── Header bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "12px 20px",
        background: "rgba(0,19,28,0.95)",
        borderBottom: "1px solid rgba(131,238,240,0.15)",
        flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#83eef0" strokeWidth="1.8"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "#83eef0", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Coral Reef Network Map
          </span>
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <MetricChip icon={<Users size={11} color="#83eef0"/>} label={`${markers.length} Members`} color="#83eef0"/>
          <MetricChip icon={<BadgeCheck size={11} color="#A6CE39"/>} label={`${orcidCount} Verified`} color="#A6CE39"/>
          <MetricChip icon={<Globe size={11} color="#1dd1a1"/>} label={`${Object.keys(GCRMN_COLORS).length} GCRMN Regions`} color="#1dd1a1"/>
          <MetricChip icon={<Layers size={11} color="#c56cf0"/>} label={`${activeLayers} Active Layers`} color="#c56cf0"/>
        </div>

        {/* Close */}
        <button
          data-testid="close-expanded-map"
          onClick={onClose}
          style={{
            background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.2)",
            borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#83eef0cc",
            display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600,
          }}
        >
          <X size={13}/> Close
        </button>
      </div>

      {/* ── Body: map + side panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <style>{`.gcrmn-tooltip { background: rgba(0,19,28,0.88) !important; border: 1px solid rgba(131,238,240,0.25) !important; color: #d4e9f3 !important; font-family: Inter,sans-serif !important; font-size: 11px !important; padding: 3px 9px !important; border-radius: 6px !important; box-shadow: none !important; }`}</style>

          <MapContainer
            center={[12, 10]}
            zoom={2}
            zoomControl={true}
            scrollWheelZoom={true}
            attributionControl={true}
            style={{ width: "100%", height: "100%", background: "#00131c" }}
          >
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="© Esri"
              maxZoom={10}
            />
            {showAca && (
              <WMSTileLayer
                url="https://allencoralatlas.org/geoserver/ows"
                layers="coral-atlas:benthic_map"
                format="image/png"
                transparent={true}
                opacity={0.5}
                version="1.1.1"
                attribution="© Allen Coral Atlas"
              />
            )}
            {showGcrmn && gcrmnGeoJson && (
              <GeoJSON
                key="gcrmn-expanded"
                data={gcrmnGeoJson}
                style={gcrmnStyle}
                onEachFeature={bindGcrmnLayer}
              />
            )}
            {markers.map((m) => (
              <Marker key={m.id} position={[m.latitude, m.longitude]} icon={makePin(!!m.orcidId)}>
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", minWidth: 130, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#00131c", fontSize: 13 }}>
                      {m.displayName || "Reef Explorer"}
                    </div>
                    {m.orcidId && (
                      <div style={{ fontSize: 10, color: "#A6CE39", marginTop: 2 }}>
                        ✓ ORCID Verified Researcher
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            {markers.length > 0 && <FitBounds markers={markers} />}
          </MapContainer>
        </div>

        {/* ── Side panel ── */}
        <div style={{
          width: 240,
          background: "rgba(0,19,28,0.97)",
          borderLeft: "1px solid rgba(131,238,240,0.12)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Layers section */}
          <SideSection title="Layers">
            <LayerToggle
              label="GCRMN Regions"
              sublabel="10 GCRMN monitoring zones"
              active={showGcrmn}
              color="#1dd1a1"
              onClick={() => setShowGcrmn((v) => !v)}
              testId="expanded-toggle-gcrmn"
            />
            <LayerToggle
              label="Allen Coral Atlas"
              sublabel="Benthic habitat map"
              active={showAca}
              color="#48dbfb"
              onClick={() => setShowAca((v) => !v)}
              testId="expanded-toggle-aca"
            />
          </SideSection>

          {/* GCRMN region legend */}
          {showGcrmn && (
            <SideSection title="GCRMN Regions">
              {Object.entries(GCRMN_COLORS).map(([key, color]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <span style={{
                    width: 12, height: 8, borderRadius: 2, flexShrink: 0,
                    background: color + "55",
                    border: `1.5px solid ${color}`,
                    display: "inline-block",
                  }}/>
                  <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>
                    {GCRMN_LONG[key] ?? key}
                  </span>
                </div>
              ))}
            </SideSection>
          )}

          {/* Member legend */}
          <SideSection title="Map Key">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>DAO Member</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#83eef0",border:"2px solid #A6CE39",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>ORCID Verified Researcher</span>
            </div>
          </SideSection>

          {/* Data sources */}
          <SideSection title="Data Sources">
            {[
              { label: "Esri Ocean Basemap", href: "https://www.arcgis.com" },
              { label: "Allen Coral Atlas", href: "https://allencoralatlas.org" },
              { label: "GCRMN Regions", href: "https://gcrmn.net" },
              { label: "NOAA Coral Reef Watch", href: "https://coralreefwatch.noaa.gov" },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                display: "block", fontSize: 10, color: "#83eef099",
                textDecoration: "none", padding: "2px 0",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = "#83eef0")}
                onMouseLeave={e => (e.currentTarget.style.color = "#83eef099")}
              >
                ↗ {label}
              </a>
            ))}
          </SideSection>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function MetricChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      background: `${color}14`, border: `1px solid ${color}33`,
      borderRadius: 20, padding: "3px 10px",
    }}>
      {icon}
      <span style={{ fontSize: 10.5, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(131,238,240,0.08)" }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
        color: "#83eef066", textTransform: "uppercase", marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}

function LayerToggle({
  label, sublabel, active, color, onClick, testId,
}: {
  label: string; sublabel: string; active: boolean; color: string; onClick: () => void; testId: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        background: active ? `${color}18` : "transparent",
        border: `1px solid ${active ? color + "55" : "rgba(131,238,240,0.1)"}`,
        borderRadius: 8, padding: "7px 10px", cursor: "pointer", marginBottom: 6,
        textAlign: "left",
      }}
    >
      <span style={{
        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
        background: active ? color : "transparent",
        border: `2px solid ${active ? color : color + "66"}`,
        transition: "background 0.2s",
      }}/>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: active ? "#d4e9f3" : "#d4e9f366" }}>{label}</div>
        <div style={{ fontSize: 9, color: "#d4e9f344", marginTop: 1 }}>{sublabel}</div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ReefMap({
  compact = false,
  expanded: externalExpanded,
  onExpandChange,
}: {
  compact?: boolean;
  expanded?: boolean;
  onExpandChange?: (v: boolean) => void;
}) {
  const [showGcrmn, setShowGcrmn] = useState(true);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const expanded  = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setExpanded = onExpandChange ?? setInternalExpanded;

  const { data: markers = [] } = useQuery<MapMarker[]>({
    queryKey: ["/api/map/markers"],
    refetchInterval: 60_000,
  });

  const { data: gcrmnGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/gcrmn/regions"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  return (
    <>
      <style>{`.gcrmn-tooltip { background: rgba(0,19,28,0.88) !important; border: 1px solid rgba(131,238,240,0.25) !important; color: #d4e9f3 !important; font-family: Inter,sans-serif !important; font-size: 10px !important; padding: 2px 7px !important; border-radius: 6px !important; box-shadow: none !important; }`}</style>

      <div
        data-testid="reef-map"
        className="relative w-full overflow-hidden"
        style={{
          height: compact ? 200 : 280,
          borderRadius: 16,
          border: "1px solid rgba(131,238,240,0.12)",
          cursor: compact ? "pointer" : "default",
        }}
      >
        {/* Transparent click-to-expand overlay (compact mode only) */}
        {compact && (
          <div
            data-testid="reef-map-click-overlay"
            onClick={() => setExpanded(true)}
            style={{
              position: "absolute", inset: 0, zIndex: 600,
              background: "transparent",
            }}
          />
        )}
        <MapContainer
          center={[12, -80]}
          zoom={2}
          zoomControl={false}
          scrollWheelZoom={false}
          attributionControl={false}
          style={{ width: "100%", height: "100%", background: "#00131c" }}
        >
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="© Esri"
            maxZoom={10}
          />
          <WMSTileLayer
            url="https://allencoralatlas.org/geoserver/ows"
            layers="coral-atlas:benthic_map"
            format="image/png"
            transparent={true}
            opacity={0.5}
            version="1.1.1"
            attribution="© Allen Coral Atlas"
          />
          {showGcrmn && gcrmnGeoJson && (
            <GeoJSON
              key="gcrmn"
              data={gcrmnGeoJson}
              style={gcrmnStyle}
              onEachFeature={bindGcrmnLayer}
            />
          )}
          {markers.map((m) => (
            <Marker key={m.id} position={[m.latitude, m.longitude]} icon={makePin(!!m.orcidId)}>
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", minWidth: 120, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: "#00131c", fontSize: 13 }}>
                    {m.displayName || "Reef Explorer"}
                  </div>
                  {m.orcidId && (
                    <div style={{ fontSize: 10, color: "#A6CE39", marginTop: 2 }}>
                      ✓ Verified Researcher
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {markers.length > 0 && <FitBounds markers={markers} />}
        </MapContainer>

        {/* ── Layer toggle buttons ── */}
        <div
          className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-auto"
          style={{ zIndex: 500 }}
        >
          <button
            data-testid="toggle-gcrmn-layer"
            onClick={() => setShowGcrmn((v) => !v)}
            style={{
              background: showGcrmn ? "rgba(29,209,161,0.85)" : "rgba(0,19,28,0.75)",
              border: `1px solid ${showGcrmn ? "#1dd1a1" : "rgba(29,209,161,0.4)"}`,
              borderRadius: 6, padding: "2px 7px", fontSize: 9,
              color: showGcrmn ? "#fff" : "#1dd1a1cc",
              fontFamily: "Inter,sans-serif", fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em",
            }}
          >
            GCRMN
          </button>
        </div>

        {/* ── Expand button (top-right) ── */}
        <button
          data-testid="expand-reef-map"
          onClick={() => setExpanded(true)}
          className="absolute pointer-events-auto"
          style={{
            top: 8, right: 8, zIndex: 500,
            background: "rgba(0,19,28,0.82)",
            border: "1px solid rgba(131,238,240,0.3)",
            borderRadius: 7, padding: "4px 7px",
            display: "flex", alignItems: "center", gap: 4,
            cursor: "pointer", color: "#83eef0cc",
            fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600,
          }}
        >
          <Maximize2 size={10} color="#83eef0"/>
          Expand
        </button>

        {/* ── Legend ── */}
        <div
          className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none"
          style={{ zIndex: 500 }}
        >
          {showGcrmn && (
            <div className="flex items-center gap-1.5">
              <span style={{ width:10,height:6,background:"rgba(29,209,161,0.35)",border:"1.5px solid #1dd1a1",borderRadius:2,display:"inline-block" }}/>
              <span style={{ fontSize: 8.5, color: "#d4e9f3aa", fontFamily: "Inter,sans-serif" }}>GCRMN region</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span style={{ width:9,height:9,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",display:"inline-block" }}/>
            <span style={{ fontSize: 8.5, color: "#d4e9f3aa", fontFamily: "Inter,sans-serif" }}>Member</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ width:9,height:9,borderRadius:"50%",background:"#83eef0",border:"2px solid #A6CE39",display:"inline-block" }}/>
            <span style={{ fontSize: 8.5, color: "#d4e9f3aa", fontFamily: "Inter,sans-serif" }}>ORCID verified</span>
          </div>
        </div>

        {/* ── Member count badge ── */}
        {markers.length > 0 && (
          <div className="absolute bottom-2 right-2 pointer-events-none" style={{ zIndex: 500 }}>
            <div style={{
              background: "rgba(0,19,28,0.8)", border: "1px solid rgba(131,238,240,0.25)",
              borderRadius: 8, padding: "2px 7px", fontSize: 10, color: "#83eef0",
              fontFamily: "Inter,sans-serif", fontWeight: 600,
            }}>
              {markers.length} {markers.length === 1 ? "member" : "members"}
            </div>
          </div>
        )}
      </div>

      {/* ── Expanded modal ── */}
      {expanded && (
        <ExpandedMapModal
          markers={markers}
          gcrmnGeoJson={gcrmnGeoJson}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
