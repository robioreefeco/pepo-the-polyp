import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  "EAS":   "East Asian Seas",
  "ETP":   "Eastern Tropical Pacific",
  "ROPME": "Red Sea / Arabian Gulf",
  "RSGA":  "Red Sea & Gulf of Aden",
  "WIO":   "Western Indian Ocean",
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

// ─── Main component ───────────────────────────────────────────────────────────
export function ReefMap({ compact = false }: { compact?: boolean }) {
  const [showGcrmn, setShowGcrmn] = useState(true);
  const [showDhw,   setShowDhw]   = useState(false);

  const { data: markers = [] } = useQuery<MapMarker[]>({
    queryKey: ["/api/map/markers"],
    refetchInterval: 60_000,
  });

  const { data: gcrmnGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/gcrmn/regions"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Stable GeoJSON style per feature
  const gcrmnStyle = (feature?: Feature) => {
    const name = (feature?.properties as any)?.region ?? "";
    const color = GCRMN_COLORS[name] ?? "#83eef0";
    return {
      color,
      weight: 1.2,
      opacity: 0.85,
      fillColor: color,
      fillOpacity: 0.12,
    };
  };

  const onEachGcrmn = (feature: Feature, layer: L.Layer) => {
    const name = (feature.properties as any)?.region ?? "Unknown";
    const long = GCRMN_LONG[name] ?? name;
    (layer as L.Path).bindTooltip(long, {
      permanent: false,
      direction: "center",
      className: "gcrmn-tooltip",
    });
    (layer as L.Path).on("mouseover", function (this: L.Path) {
      this.setStyle({ fillOpacity: 0.32, weight: 2 });
    });
    (layer as L.Path).on("mouseout", function (this: L.Path) {
      this.setStyle({ fillOpacity: 0.12, weight: 1.2 });
    });
  };

  return (
    <>
      {/* Tooltip style injected once */}
      <style>{`.gcrmn-tooltip { background: rgba(0,19,28,0.88) !important; border: 1px solid rgba(131,238,240,0.25) !important; color: #d4e9f3 !important; font-family: Inter,sans-serif !important; font-size: 10px !important; padding: 2px 7px !important; border-radius: 6px !important; box-shadow: none !important; }`}</style>

      <div
        data-testid="reef-map"
        className="relative w-full overflow-hidden"
        style={{
          height: compact ? 200 : 280,
          borderRadius: 16,
          border: "1px solid rgba(131,238,240,0.12)",
        }}
      >
        <MapContainer
          center={[12, -80]}
          zoom={2}
          zoomControl={false}
          scrollWheelZoom={false}
          attributionControl={false}
          style={{ width: "100%", height: "100%", background: "#00131c" }}
        >
          {/* ── Esri Ocean basemap ── */}
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="© Esri"
            maxZoom={10}
          />

          {/* ── Allen Coral Atlas benthic overlay ── */}
          <WMSTileLayer
            url="https://allencoralatlas.org/geoserver/ows"
            layers="coral-atlas:benthic_map"
            format="image/png"
            transparent={true}
            opacity={0.5}
            version="1.1.1"
            attribution="© Allen Coral Atlas"
          />

          {/* ── NOAA CRW Degree Heating Weeks (optional) ── */}
          {showDhw && (
            <WMSTileLayer
              url="https://coastwatch.pfeg.noaa.gov/erddap/wms/NOAA_DHW/request"
              layers="NOAA_DHW:CRW_DHW"
              format="image/png"
              transparent={true}
              opacity={0.65}
              version="1.3.0"
              attribution="NOAA CRW"
            />
          )}

          {/* ── GCRMN region polygons ── */}
          {showGcrmn && gcrmnGeoJson && (
            <GeoJSON
              key="gcrmn"
              data={gcrmnGeoJson}
              style={gcrmnStyle}
              onEachFeature={onEachGcrmn}
            />
          )}

          {/* ── Community member pins ── */}
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
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 9,
              color: showGcrmn ? "#fff" : "#1dd1a1cc",
              fontFamily: "Inter,sans-serif",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            GCRMN
          </button>
          <button
            data-testid="toggle-dhw-layer"
            onClick={() => setShowDhw((v) => !v)}
            style={{
              background: showDhw ? "rgba(220,50,50,0.85)" : "rgba(0,19,28,0.75)",
              border: `1px solid ${showDhw ? "#e05555" : "rgba(220,80,80,0.4)"}`,
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 9,
              color: showDhw ? "#fff" : "#e05555cc",
              fontFamily: "Inter,sans-serif",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            🌡 DHW
          </button>
        </div>

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
          <div
            className="absolute top-2 right-2 pointer-events-none"
            style={{ zIndex: 500 }}
          >
            <div
              style={{
                background: "rgba(0,19,28,0.8)",
                border: "1px solid rgba(131,238,240,0.25)",
                borderRadius: 8,
                padding: "2px 7px",
                fontSize: 10,
                color: "#83eef0",
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
              }}
            >
              {markers.length} {markers.length === 1 ? "member" : "members"}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
