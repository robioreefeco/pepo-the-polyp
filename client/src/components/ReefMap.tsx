import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, X, Users, BadgeCheck, Globe, Layers, Camera } from "lucide-react";
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

// ─── Reef image pin — amber square with camera icon ───────────────────────────
function makeImagePin() {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
    html: `<div style="
      width:26px;height:26px;border-radius:6px;
      background:#ff9f43;
      border:2px solid #ffb347;
      box-shadow:0 0 8px #ff9f4388, 0 2px 6px #00000055;
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="4" stroke="white" stroke-width="2"/>
      </svg>
    </div>`,
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

interface ReefImageMarker {
  id: string;
  cid: string;
  latitude: number;
  longitude: number;
  title: string;
  profileId: string | null;
  createdAt: number;
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

// ─── Reef image popup ─────────────────────────────────────────────────────────
function ReefImagePopup({ img }: { img: ReefImageMarker }) {
  const thumbSrc = `/api/ipfs/cat/${img.cid}`;
  return (
    <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160, maxWidth: 200 }}>
      <img
        src={thumbSrc}
        alt={img.title || "Reef photo"}
        style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 6 }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#ff9f43", marginBottom: 2 }}>
        🪸 {img.title || "Community reef photo"}
      </div>
      <div style={{ fontSize: 9, color: "#888", wordBreak: "break-all", marginBottom: 4 }}>
        {img.cid.slice(0, 28)}…
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {["ipfs.io", "dweb.link"].map((gw, i) => (
          <a
            key={gw}
            href={`https://${i === 0 ? "ipfs.io" : "dweb.link"}/ipfs/${img.cid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 9, color: "#ff9f43", textDecoration: "none", border: "1px solid #ff9f4344", borderRadius: 4, padding: "2px 5px" }}
          >
            ↗ {gw}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Expanded map modal ───────────────────────────────────────────────────────
function ExpandedMapModal({
  markers,
  reefImgs,
  gcrmnGeoJson,
  onClose,
}: {
  markers: MapMarker[];
  reefImgs: ReefImageMarker[];
  gcrmnGeoJson: GeoJSON.FeatureCollection | undefined;
  onClose: () => void;
}) {
  const [showGcrmn, setShowGcrmn] = useState(true);
  const [showAca,   setShowAca]   = useState(true);
  const [showImgs,  setShowImgs]  = useState(true);

  const orcidCount = markers.filter((m) => !!m.orcidId).length;
  const activeLayers = (showGcrmn ? 1 : 0) + (showAca ? 1 : 0) + (showImgs ? 1 : 0) + 1;

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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#83eef0" strokeWidth="1.8"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "#83eef0", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Coral Reef Network Map
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <MetricChip icon={<Users size={11} color="#83eef0"/>} label={`${markers.length} Members`} color="#83eef0"/>
          <MetricChip icon={<BadgeCheck size={11} color="#A6CE39"/>} label={`${orcidCount} Verified`} color="#A6CE39"/>
          <MetricChip icon={<Camera size={11} color="#ff9f43"/>} label={`${reefImgs.length} Photos`} color="#ff9f43"/>
          <MetricChip icon={<Globe size={11} color="#1dd1a1"/>} label={`${Object.keys(GCRMN_COLORS).length} GCRMN Regions`} color="#1dd1a1"/>
          <MetricChip icon={<Layers size={11} color="#c56cf0"/>} label={`${activeLayers} Active Layers`} color="#c56cf0"/>
        </div>

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
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11 }}>
                    {m.orcidId
                      ? <span style={{ color: "#A6CE39", fontWeight: 600 }}>✓ ORCID Verified Researcher</span>
                      : <span style={{ color: "#83eef0", fontWeight: 600 }}>DAO Member</span>
                    }
                  </div>
                </Popup>
              </Marker>
            ))}
            {showImgs && reefImgs.map((img) => (
              <Marker key={img.id} position={[img.latitude, img.longitude]} icon={makeImagePin()}>
                <Popup maxWidth={210}>
                  <ReefImagePopup img={img} />
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
            <LayerToggle
              label="Reef Photos"
              sublabel={`${reefImgs.length} community images`}
              active={showImgs}
              color="#ff9f43"
              onClick={() => setShowImgs((v) => !v)}
              testId="expanded-toggle-imgs"
            />
          </SideSection>

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

          <SideSection title="Map Key">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>DAO Member</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#83eef0",border:"2px solid #A6CE39",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>ORCID Verified Researcher</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:13,height:13,borderRadius:3,background:"#ff9f43",border:"1.5px solid #ffb347",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Community reef photo</span>
            </div>
          </SideSection>

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
  const [showImgs,  setShowImgs]  = useState(true);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const expanded  = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setExpanded = onExpandChange ?? setInternalExpanded;

  const { data: markers = [] } = useQuery<MapMarker[]>({
    queryKey: ["/api/map/markers"],
    refetchInterval: 60_000,
  });

  const { data: reefImgs = [] } = useQuery<ReefImageMarker[]>({
    queryKey: ["/api/reef-images"],
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
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11 }}>
                  {m.orcidId
                    ? <span style={{ color: "#A6CE39", fontWeight: 600 }}>✓ ORCID Verified Researcher</span>
                    : <span style={{ color: "#83eef0", fontWeight: 600 }}>DAO Member</span>
                  }
                </div>
              </Popup>
            </Marker>
          ))}
          {showImgs && reefImgs.map((img) => (
            <Marker key={img.id} position={[img.latitude, img.longitude]} icon={makeImagePin()}>
              <Popup maxWidth={210}>
                <ReefImagePopup img={img} />
              </Popup>
            </Marker>
          ))}
          {markers.length > 0 && <FitBounds markers={markers} />}
        </MapContainer>

        {/* ── Layer toggles ── */}
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
          <button
            data-testid="toggle-imgs-layer"
            onClick={() => setShowImgs((v) => !v)}
            style={{
              background: showImgs ? "rgba(255,159,67,0.85)" : "rgba(0,19,28,0.75)",
              border: `1px solid ${showImgs ? "#ff9f43" : "rgba(255,159,67,0.4)"}`,
              borderRadius: 6, padding: "2px 7px", fontSize: 9,
              color: showImgs ? "#fff" : "#ff9f43cc",
              fontFamily: "Inter,sans-serif", fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: 3,
            }}
          >
            <Camera size={8} /> Photos
          </button>
        </div>

        {/* ── Expand button ── */}
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
          {showImgs && reefImgs.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span style={{ width:9,height:9,borderRadius:2,background:"#ff9f43",border:"1.5px solid #ffb347",display:"inline-block" }}/>
              <span style={{ fontSize: 8.5, color: "#d4e9f3aa", fontFamily: "Inter,sans-serif" }}>Reef photo</span>
            </div>
          )}
        </div>

        {/* ── Counts badge ── */}
        <div className="absolute bottom-2 right-2 pointer-events-none flex flex-col gap-1 items-end" style={{ zIndex: 500 }}>
          {markers.length > 0 && (
            <div style={{
              background: "rgba(0,19,28,0.8)", border: "1px solid rgba(131,238,240,0.25)",
              borderRadius: 8, padding: "2px 7px", fontSize: 10, color: "#83eef0",
              fontFamily: "Inter,sans-serif", fontWeight: 600,
            }}>
              {markers.length} {markers.length === 1 ? "member" : "members"}
            </div>
          )}
          {showImgs && reefImgs.length > 0 && (
            <div style={{
              background: "rgba(0,19,28,0.8)", border: "1px solid rgba(255,159,67,0.3)",
              borderRadius: 8, padding: "2px 7px", fontSize: 10, color: "#ff9f43",
              fontFamily: "Inter,sans-serif", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Camera size={9} color="#ff9f43" /> {reefImgs.length} {reefImgs.length === 1 ? "photo" : "photos"}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <ExpandedMapModal
          markers={markers}
          reefImgs={reefImgs}
          gcrmnGeoJson={gcrmnGeoJson}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
