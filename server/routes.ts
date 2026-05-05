import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { storage } from "./storage";
import { uploadToIPFS, getPinata, gatewayUrls, primaryGatewayUrl } from "./ipfs";

// ─── GCRMN regions GeoJSON cache (fetched once from GitHub, valid 24h) ─────────
let _gcrmnCache: { geojson: object; expiresAt: number } | null = null;

// ─── CoralMapping / GlobalMappingRegions cache ───────────────────────────────
let _coralMappingCache: { geojson: object; expiresAt: number } | null = null;

// ─── WCS Marine layer caches ──────────────────────────────────────────────────
let _wcsReefCloudCache: { geojson: object; expiresAt: number } | null = null;
let _wcsCcSitesCache:   { geojson: object; expiresAt: number } | null = null;
let _reefCheckCache:    { geojson: object; expiresAt: number } | null = null;
let _reefLifeCache:     { geojson: object; expiresAt: number } | null = null;
let _gcrmnMonSitesCache: { geojson: object; expiresAt: number } | null = null;

// ─── Natural Earth geography caches (for GCRMN reverse geocoding) ────────────
type NeFeature = { name: string; polygons: number[][][][] };
let _neCountries: NeFeature[] | null = null;
let _neAdmin1:    NeFeature[] | null = null;

/** Ray-casting point-in-polygon for a single GeoJSON ring. */
function _raycast(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Returns true if (lon, lat) is inside any polygon of a GeoJSON Multi/Polygon geometry. */
function _pointInFeature(lon: number, lat: number, feature: NeFeature): boolean {
  for (const poly of feature.polygons) {
    if (_raycast(lon, lat, poly[0])) return true; // outer ring only (speed)
  }
  return false;
}

/**
 * Find the nearest feature whose polygon boundary is within `maxDeg` degrees.
 * Used as a fallback for ocean/reef points that sit outside all land polygons.
 * Scanning polygon vertices is fast enough (~50k vertices) at the cell-cache scale.
 */
function _nearestByVertex(lon: number, lat: number, features: NeFeature[], maxDeg: number): string {
  let best = "";
  let minDist = maxDeg * maxDeg; // compare squared distance (avoids sqrt)
  for (const feat of features) {
    for (const poly of feat.polygons) {
      for (const ring of poly) {
        for (const v of ring) {
          const d = (v[0] - lon) ** 2 + (v[1] - lat) ** 2;
          if (d < minDist) { minDist = d; best = feat.name; }
        }
      }
    }
  }
  return best;
}

/** Fetch + parse a Natural Earth GeoJSON, keeping only name + polygon rings. */
async function _fetchNeGeoJSON(url: string, nameProps: string[]): Promise<NeFeature[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Natural Earth fetch failed: ${res.status} ${url}`);
  const gj = await res.json() as any;
  return gj.features.map((f: any) => {
    const name = nameProps.map(p => f.properties?.[p]).find(Boolean) ?? "";
    const geom = f.geometry;
    const polys: number[][][][] = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
    return { name, polygons: polys };
  });
}

/** Load (and cache forever) Natural Earth 50m countries. */
async function loadNeCountries(): Promise<NeFeature[]> {
  if (_neCountries) return _neCountries;
  _neCountries = await _fetchNeGeoJSON(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
    ["NAME"]
  );
  return _neCountries;
}

/** Load (and cache forever) Natural Earth 50m admin-1 states/provinces. */
async function loadNeAdmin1(): Promise<NeFeature[]> {
  if (_neAdmin1) return _neAdmin1;
  _neAdmin1 = await _fetchNeGeoJSON(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson",
    ["name", "NAME"]
  );
  return _neAdmin1;
}

/** Return {country, location} for a (lat, lon) pair using Natural Earth polygons. */
async function reverseGeocode(lat: number, lon: number): Promise<{ country: string; location: string }> {
  const [countries, admin1] = await Promise.all([loadNeCountries(), loadNeAdmin1()]);
  const country = countries.find(f => _pointInFeature(lon, lat, f))?.name ?? "";
  const location = admin1.find(f => _pointInFeature(lon, lat, f))?.name ?? "";
  return { country, location };
}

const CORAL_MAPPING_FILES = [
  { name: "Bermuda",                          path: "Bermuda.geojson" },
  { name: "Brazil",                           path: "SmallSystems/Brazil.geojson" },
  { name: "East Africa",                      path: "EastAfrica/EastAfricaMaskedFinal.geojson" },
  { name: "Northern Caribbean / Bahamas",     path: "NorthernCaribbean/NorthernCaribbeanBahamasMaskedFinal.geojson" },
  { name: "West Indian Ocean Islands",        path: "WestIndianOcean/WestIndianOceanIslandsMaskedFinal.geojson" },
  { name: "West Micronesia",                  path: "WestMicronesia/WestMicronesiaMaskedFinal.geojson" },
  { name: "Great Barrier Reef & Torres Strait", path: "GBR_TorresStrait/UQGBR_TorresStraitMask.geojson" },
  { name: "Hawaiian Islands",                 path: "HawaiianIslands/HawaiianIslandsMasked_Combined.geojson" },
  { name: "Indonesia",                        path: "Indonesia/UQIndonesiaMask.geojson" },
  { name: "Philippines",                      path: "Philippines/UQPhilippinesMask.geojson" },
  { name: "Red Sea",                          path: "RedSea/UQRedSeaMask.json" },
  { name: "Mesoamerican Reef",                path: "Mesoamerican/UQMesoamericanMask.geojson" },
  { name: "SW Pacific East",                  path: "SouthWestPacific/SouthWestPacificMasked_East.geojson" },
  { name: "SW Pacific West",                  path: "SouthWestPacific/SouthWestPacificMasked_West.geojson" },
  { name: "NW Arabian Sea",                   path: "NorthwestArabianSea/UQNorthwestArabianSeaMask.geojson" },
  { name: "South China Sea",                  path: "SouthChinaSea/UQSouthChinaSeaMask.geojson" },
  { name: "Coral Sea",                        path: "CoralSea/UQCoralSeaMask.geojson" },
  { name: "Sub-Tropical Eastern Australia",   path: "SubTropicalEasternAustralia/UQSubEastAustraliaMask.geojson" },
  { name: "Timor Sea",                        path: "TimorSea/UQTimorSeaMasked.geojson" },
  { name: "South Asia",                       path: "SouthAsia/UQSouthAsiaMask.json" },
  { name: "Andaman Sea",                      path: "AndamanSea/andamansea_masked.geojson" },
  { name: "Central Indian Ocean",             path: "CentIndianOcean/UQCentIndianOceanMask.geojson" },
  { name: "East Micronesia",                  path: "EastMicronesia/UQEastMicronesiaMask.geojson" },
  { name: "Tropical Eastern Pacific",         path: "TropicalEasternPacific/UQTropicalEastPacificMask.geojson" },
  { name: "South East Caribbean",             path: "SouthEastCaribbean/UQSouthEastCaribbeanMask.geojson" },
  { name: "NW China Sea",                     path: "NorthwestChinaSea/UQNorthwestChinaSeaMask.geojson" },
  { name: "North East Asia",                  path: "NorthEastAsia/UQNorthEastAsiaMask.geojson" },
  { name: "Gulf of Aden",                     path: "GulfOfAden/UQGulfOfAdenMask.geojson" },
  { name: "Western Australia",                path: "WesternAustralia/UQWesternAustraliaMask.geojson" },
];

async function fetchCoralMappingRegions(): Promise<object> {
  const now = Date.now();
  if (_coralMappingCache && now < _coralMappingCache.expiresAt) return _coralMappingCache.geojson;

  const BASE = "https://raw.githubusercontent.com/CoralMapping/GlobalMappingRegions/master/";
  const results = await Promise.allSettled(
    CORAL_MAPPING_FILES.map(async ({ name, path }) => {
      const res = await fetch(BASE + path);
      if (!res.ok) return null;
      const fc: any = await res.json();
      const features: any[] = fc.type === "FeatureCollection" ? fc.features : [{ type: "Feature", geometry: fc.geometry ?? fc, properties: fc.properties ?? {} }];
      return features.map((f: any) => ({ ...f, properties: { ...(f.properties ?? {}), region: name } }));
    })
  );

  const allFeatures: any[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) allFeatures.push(...r.value);
  }

  const geojson = { type: "FeatureCollection", features: allFeatures };
  _coralMappingCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

async function fetchGcrmnRegions(): Promise<object> {
  const now = Date.now();
  if (_gcrmnCache && now < _gcrmnCache.expiresAt) return _gcrmnCache.geojson;

  const BASE = "https://raw.githubusercontent.com/GCRMN/gcrmn_regions/master/data/gcrmn-regions";
  const [shpRes, dbfRes] = await Promise.all([
    fetch(`${BASE}/gcrmn_regions.shp`),
    fetch(`${BASE}/gcrmn_regions.dbf`),
  ]);
  if (!shpRes.ok || !dbfRes.ok) throw new Error("Failed to fetch GCRMN shapefiles");

  const [shpBuf, dbfBuf] = await Promise.all([shpRes.arrayBuffer(), dbfRes.arrayBuffer()]);

  const shapefile = await import("shapefile");
  const geojson = await shapefile.read(Buffer.from(shpBuf), Buffer.from(dbfBuf));

  _gcrmnCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

// ─── WCS Marine — ReefCloud monitoring sites (global-monitoring-maps) ─────────
async function fetchWcsReefCloudSites(): Promise<object> {
  const now = Date.now();
  if (_wcsReefCloudCache && now < _wcsReefCloudCache.expiresAt) return _wcsReefCloudCache.geojson;

  const url = "https://raw.githubusercontent.com/WCS-Marine/global-monitoring-maps/main/data/ReefCloud_Sites_Sep2024.geojson";
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`WCS ReefCloud fetch failed: ${res.status}`);
  const geojson = await res.json();

  _wcsReefCloudCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

// ─── Quoted CSV parser (handles fields with commas inside double-quotes) ────────
function parseCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = "", inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { res.push(cur); cur = ""; }
    else { cur += c; }
  }
  res.push(cur);
  return res;
}

// ─── WCS Marine — coral cover survey sites (global-monitoring-maps cc_sites.csv)
async function fetchWcsCcSites(): Promise<object> {
  const now = Date.now();
  if (_wcsCcSitesCache && now < _wcsCcSitesCache.expiresAt) return _wcsCcSitesCache.geojson;

  const url = "https://raw.githubusercontent.com/WCS-Marine/global-monitoring-maps/main/data/cc_sites.csv";
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`WCS cc_sites fetch failed: ${res.status}`);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const features: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const lon = parseFloat(cols[cols.length - 1]);
    const lat = parseFloat(cols[cols.length - 2]);
    if (!isFinite(lat) || !isFinite(lon)) continue;
    const db      = cols[0].trim();
    const country = cols[1].trim();
    const site    = cols.slice(2, cols.length - 2).join(",").trim();
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { db, country, site },
    });
  }

  const geojson = { type: "FeatureCollection", features };
  _wcsCcSitesCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

// ─── EEZ overrides — sourced once from Marine Regions REST API, baked in ──────
// Covers the 47 1-degree cells that sit in open ocean beyond Natural Earth land
// polygons.  Key format: "Math.round(lat),Math.round(lon)" — same as cellCache.
const EEZ_CELL_OVERRIDES: Record<string, { country: string; location: string }> = {
  "-1,73":   { country: "Maldives",                 location: "" },
  "-1,74":   { country: "Maldives",                 location: "" },
  "-10,51":  { country: "Seychelles",               location: "" },
  "-15,-148":{ country: "France",                   location: "French Polynesia" },
  "-15,-149":{ country: "France",                   location: "French Polynesia" },
  "-15,-168":{ country: "United States of America", location: "American Samoa" },
  "-16,55":  { country: "France",                   location: "Tromelin Island" },
  "-16,60":  { country: "Mauritius",                location: "" },
  "-17,119": { country: "Australia",                location: "Argo-Rowley Terrace" },
  "-17,60":  { country: "Mauritius",                location: "Cargados Carajos" },
  "-18,-163":{ country: "New Zealand",              location: "Cook Islands" },
  "-20,63":  { country: "Mauritius",                location: "" },
  "-21,153": { country: "Australia",                location: "Great Barrier Reef" },
  "-21,40":  { country: "France",                   location: "Bassas da India" },
  "-22,40":  { country: "France",                   location: "Ile Europa" },
  "-23,-149":{ country: "France",                   location: "French Polynesia" },
  "-3,73":   { country: "Maldives",                 location: "" },
  "-3,74":   { country: "Maldives",                 location: "" },
  "-30,40":  { country: "",                         location: "" },
  "-4,-32":  { country: "Brazil",                   location: "" },
  "-4,73":   { country: "Mauritius",                location: "Chagos Islands" },
  "-4,74":   { country: "Mauritius",                location: "Chagos Islands" },
  "-5,74":   { country: "Mauritius",                location: "Chagos Islands" },
  "-6,53":   { country: "Seychelles",               location: "" },
  "-7,52":   { country: "Seychelles",               location: "" },
  "-7,53":   { country: "Seychelles",               location: "" },
  "-9,46":   { country: "Seychelles",               location: "" },
  "-9,51":   { country: "Seychelles",               location: "" },
  "0,-160":  { country: "United States of America", location: "Jarvis Island" },
  "0,-176":  { country: "United States of America", location: "Howland and Baker Islands" },
  "0,73":    { country: "Maldives",                 location: "" },
  "1,-177":  { country: "United States of America", location: "Howland and Baker Islands" },
  "10,-109": { country: "France",                   location: "Clipperton Island" },
  "13,-81":  { country: "Colombia",                 location: "" },
  "16,-80":  { country: "Jamaica",                  location: "" },
  "17,-169": { country: "United States of America", location: "Johnston Atoll" },
  "17,-170": { country: "United States of America", location: "Johnston Atoll" },
  "17,168":  { country: "Marshall Islands",         location: "" },
  "18,168":  { country: "United States of America", location: "Wake Island" },
  "19,167":  { country: "United States of America", location: "Wake Island" },
  "24,-166": { country: "United States of America", location: "Hawaii" },
  "26,-174": { country: "United States of America", location: "Hawaii" },
  "26,131":  { country: "Japan",                    location: "" },
  "28,-176": { country: "United States of America", location: "Hawaii" },
  "28,-178": { country: "United States of America", location: "Hawaii" },
  "6,-162":  { country: "United States of America", location: "Palmyra Atoll" },
  "6,-87":   { country: "Costa Rica",               location: "Cocos Island" },
};

// ─── GCRMN monitoring sites — all-lat-long-no-mermaid.csv (db == 'gcrmn') ─────
// Country + location are "NA" in the source CSV; we reverse-geocode each unique
// 1-degree cell: EEZ overrides first, then NE polygon test, then nearest-vertex.
// On the first cold start the geocoded result is written to gcrmn_sites in the DB;
// all subsequent calls skip geocoding entirely and read straight from the DB.
async function fetchGcrmnMonitoringSites(): Promise<object> {
  const now = Date.now();
  if (_gcrmnMonSitesCache && now < _gcrmnMonSitesCache.expiresAt) return _gcrmnMonSitesCache.geojson;

  // ── DB-first: if the table is already populated, serve from there ───────────
  const dbCount = await storage.getGcrmnSiteCount();
  if (dbCount > 0) {
    const rows = await storage.getAllGcrmnSites();
    const features = rows.map(r => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
      properties: { country: r.country, location: r.location, site: r.site },
    }));
    const geojson = { type: "FeatureCollection", features };
    _gcrmnMonSitesCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
    console.log(`[gcrmnMonSites] served ${rows.length} sites from database`);
    return geojson;
  }

  // ── First-run: geocode from source CSV, persist results to DB ───────────────
  // Pre-load Natural Earth data (cached after first fetch)
  const [countries, admin1] = await Promise.all([loadNeCountries(), loadNeAdmin1()]);

  const url = "https://raw.githubusercontent.com/WCS-Marine/global-monitoring-maps/main/data/all-lat-long-no-mermaid.csv";
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`GCRMN sites fetch failed: ${res.status}`);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const features: any[] = [];
  const seen = new Set<string>();

  // 1-degree cell cache so each unique cell is only polygon-tested once
  const cellCache = new Map<string, { country: string; location: string }>();

  const lookupCell = (lat: number, lon: number) => {
    const cellKey = `${Math.round(lat)},${Math.round(lon)}`;
    if (cellCache.has(cellKey)) return cellCache.get(cellKey)!;
    // 1. EEZ authoritative override (Marine Regions API, baked in)
    if (EEZ_CELL_OVERRIDES[cellKey]) {
      cellCache.set(cellKey, EEZ_CELL_OVERRIDES[cellKey]);
      return EEZ_CELL_OVERRIDES[cellKey];
    }
    // 2. Natural Earth point-in-polygon (land polygons, 50m scale)
    const clat = Math.round(lat);
    const clon = Math.round(lon);
    let country  = countries.find(f => _pointInFeature(clon, clat, f))?.name ?? "";
    let location = admin1.find(f => _pointInFeature(clon, clat, f))?.name ?? "";
    // 3. Nearest polygon vertex fallback — 2.5° country, 1.0° location
    if (!country)  country  = _nearestByVertex(clon, clat, countries, 2.5);
    if (!location) location = _nearestByVertex(clon, clat, admin1,    1.0);
    const result = { country, location };
    cellCache.set(cellKey, result);
    return result;
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 6) continue;
    if (cols[0].trim() !== "gcrmn") continue;
    const lat = parseFloat(cols[4]);
    const lon = parseFloat(cols[5]);
    if (!isFinite(lat) || !isFinite(lon)) continue;
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const geo = lookupCell(lat, lon);
    const site = cols[3].trim().replace(/^"|"$/g, "").replace(/^NA$/i, "");
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { country: geo.country, location: geo.location, site },
    });
  }

  console.log(`[gcrmnMonSites] ${features.length} sites, ${cellCache.size} cells geocoded via Natural Earth`);

  // Persist geocoded results to DB so future restarts skip geocoding entirely
  try {
    const rows = features.map((f: any) => ({
      lat:      f.geometry.coordinates[1] as number,
      lon:      f.geometry.coordinates[0] as number,
      site:     (f.properties.site     ?? "") as string,
      location: (f.properties.location ?? "") as string,
      country:  (f.properties.country  ?? "") as string,
    }));
    await storage.bulkInsertGcrmnSites(rows);
    console.log(`[gcrmnMonSites] persisted ${rows.length} sites to database`);
  } catch (err) {
    console.error("[gcrmnMonSites] DB persist failed (non-fatal):", err);
  }

  const geojson = { type: "FeatureCollection", features };
  _gcrmnMonSitesCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

// ─── Reef Check sites — global-monitoring-maps/reef_check_all.csv ─────────────
// Deduplicates by Reef_Check_ID; keeps most recent year + avg coral/bleaching
async function fetchReefCheckSites(): Promise<object> {
  const now = Date.now();
  if (_reefCheckCache && now < _reefCheckCache.expiresAt) return _reefCheckCache.geojson;

  const url = "https://raw.githubusercontent.com/WCS-Marine/global-monitoring-maps/main/data/reef_check_all.csv";
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Reef Check fetch failed: ${res.status}`);
  const text = await res.text();

  const lines = text.trim().split("\n");
  // cols: 0=new_id 1=Reef_Check_ID 2=Lat 3=Long 4=Depth 5=Date 6=Year 7=Location 8=macro 9=parrot 10=bleaching 11=coral
  const sites = new Map<string, { lat: number; lon: number; location: string; year: number; coral: number | null; bleaching: number | null; count: number }>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 12) continue;
    const id       = cols[1].trim().replace(/^"|"$/g, "");
    const lat      = parseFloat(cols[2]);
    const lon      = parseFloat(cols[3]);
    const year     = parseInt(cols[6], 10);
    const location = cols[7].trim().replace(/^"|"$/g, "");
    const coralStr = cols[11].trim();
    const bleachStr = cols[10].trim();
    if (!isFinite(lat) || !isFinite(lon) || !id) continue;

    const coral     = coralStr    === "NA" ? null : parseFloat(coralStr);
    const bleaching = bleachStr   === "NA" ? null : parseFloat(bleachStr);

    const existing = sites.get(id);
    if (!existing || year > existing.year) {
      sites.set(id, { lat, lon, location, year, coral, bleaching, count: (existing?.count ?? 0) + 1 });
    } else {
      existing.count++;
    }
  }

  const features = Array.from(sites.values()).map(({ lat, lon, location, year, coral, bleaching, count }) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { location, year, coral, bleaching, surveys: count },
  }));

  const geojson = { type: "FeatureCollection", features };
  _reefCheckCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

// ─── Reef Life Survey sites — global-monitoring-maps/reef_life_site_info.csv ──
async function fetchReefLifeSites(): Promise<object> {
  const now = Date.now();
  if (_reefLifeCache && now < _reefLifeCache.expiresAt) return _reefLifeCache.geojson;

  const url = "https://raw.githubusercontent.com/WCS-Marine/global-monitoring-maps/main/data/reef_life_site_info.csv";
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Reef Life Survey fetch failed: ${res.status}`);
  const text = await res.text();

  const lines = text.trim().split("\n");
  // cols: 0=FID 1=country 2=area 3=location 4=site_code 5=site_name 6=old_site_codes 7=latitude 8=longitude 9=realm 10=province 11=ecoregion 12=lat_zone 13=programs 14=geom
  const features: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 14) continue;
    const lat       = parseFloat(cols[7]);
    const lon       = parseFloat(cols[8]);
    if (!isFinite(lat) || !isFinite(lon)) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        site_name:  cols[5].trim(),
        country:    cols[1].trim(),
        location:   cols[3].trim(),
        realm:      cols[9].trim(),
        ecoregion:  cols[11].trim(),
        programs:   cols[13].trim(),
      },
    });
  }

  const geojson = { type: "FeatureCollection", features };
  _reefLifeCache = { geojson, expiresAt: now + 24 * 60 * 60 * 1000 };
  return geojson;
}

declare module "express-session" {
  interface SessionData {
    orcid?: {
      orcidId: string;
      orcidName: string;
      profileId: string;
      accessToken: string;
      tokenExpiresAt: number; // unix ms
    };
  }
}

const PEPO_API_KEY = process.env.PEPO_API_KEY || "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || "";
const PRIVY_APP_ID = process.env.VITE_PRIVY_APP_ID || process.env.PRIVY_APP_ID || "";
const BONFIRES_BASE = "https://pepo.app.bonfires.ai";
const BONFIRE_ID = "69372cce6b69184280de3a89";
const ORCID_CLIENT_ID = process.env.ORCID_CLIENT_ID || "";
const ORCID_CLIENT_SECRET = process.env.ORCID_CLIENT_SECRET || "";
const ORCID_BASE = "https://orcid.org";

// Derive the ORCID redirect URI from the incoming request host so the same
// build works on every domain (thepolyp.xyz, pepothepolyp.replit.app, localhost, …).
// Replit's reverse proxy sets X-Forwarded-Proto; fall back to host-based detection.
function getOrcidRedirectUri(req: Request): string {
  // Allow a fixed override via env — set this in the Replit secrets to match
  // whatever redirect URI is registered in your ORCID developer portal.
  if (process.env.ORCID_REDIRECT_URI) return process.env.ORCID_REDIRECT_URI;
  const host = req.headers.host || "";
  const forwarded = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const protocol = forwarded || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}/api/auth/orcid/callback`;
}

const orcidStateStore = new Map<string, { createdAt: number; mode: "auth" | "link" }>();

// ─── Rate limiters ─────────────────────────────────────────────────────────────
// General API: 120 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Chat endpoint: 20 requests per 15 minutes per IP (calls external AI API)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Chat rate limit reached. Please wait a few minutes before sending more messages." },
});

// Auth endpoints: 10 per 15 minutes (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please try again later." },
});

// ─── Privy JWKS verification (cached, no per-request API call) ─────────────────
let privyJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getPrivyJWKS() {
  if (!privyJWKS && PRIVY_APP_ID) {
    privyJWKS = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`)
    );
  }
  return privyJWKS;
}

interface PrivyVerifyResult {
  valid: boolean;
  userId?: string;
  appId?: string;
  error?: string;
}

async function verifyPrivyToken(token: string): Promise<PrivyVerifyResult> {
  if (!PRIVY_APP_ID || !token) return { valid: false, error: "Missing app ID or token" };
  const jwks = getPrivyJWKS();
  if (!jwks) return { valid: false, error: "JWKS not initialized" };
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: "privy.io",
      audience: PRIVY_APP_ID,
    });
    return { valid: true, userId: payload.sub as string, appId: PRIVY_APP_ID };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Token verification failed" };
  }
}

function sanitizeString(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

// ─── IPFS profile pinning (background, fire-and-forget) ───────────────────────
async function pinProfileAsync(profile: Record<string, unknown>, profileId: string): Promise<void> {
  try {
    const isFirstPin = !profile.ipfsCid;
    const jsonStr = JSON.stringify({
      ...profile,
      schema: "pepo-profile-v2",
      pinnedAt: Date.now(),
    });
    const buf = Buffer.from(jsonStr, "utf-8");
    const filename = `pepo-profile-${profileId}-${Date.now()}.json`;
    const pinata = getPinata();
    const file = new File([buf], filename, { type: "application/json" });
    const result = await pinata.upload.public.file(file);
    const cid = result.cid;
    await storage.saveIpfsBlock(cid, buf.toString("base64"), "application/json");
    await storage.saveIpfsCid(profileId, cid);
    // Award one-time points on first IPFS sync
    if (isFirstPin) {
      await storage.addContribution({
        profileId,
        type: "resource",
        description: "Synced profile to IPFS via Pinata",
        points: 30,
      });
    }
    console.log(`[IPFS] Profile pinned for ${profileId}: ${cid}`);
  } catch (err) {
    console.error("[IPFS] pinProfileAsync failed:", err);
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply general rate limiting to all /api routes
  app.use("/api", generalLimiter);

  // ─── IPFS routes (Pinata — https://github.com/PinataCloud) ───────────────
  const ipfsUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  // POST /api/ipfs/upload — pin an image to Pinata; returns CID + gateway URLs
  app.post(
    "/api/ipfs/upload",
    ipfsUpload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) return res.status(400).json({ error: "No file provided" });
        const cid = await uploadToIPFS(req.file.buffer, req.file.originalname);
        // Cache bytes locally so /cat can serve without a Pinata round-trip
        const b64 = req.file.buffer.toString("base64");
        await storage.saveIpfsBlock(cid, b64, req.file.mimetype);
        return res.json({
          cid,
          mimeType: req.file.mimetype,
          size: req.file.size,
          filename: req.file.originalname,
          gateways: gatewayUrls(cid),
          url: primaryGatewayUrl(cid),
          localUrl: `/api/ipfs/cat/${cid}`,
        });
      } catch (err: any) {
        console.error("[IPFS] upload error:", err);
        return res.status(500).json({ error: err.message || "IPFS upload failed" });
      }
    }
  );

  // GET /api/ipfs/cat/:cid — serve a file (local DB cache → Pinata gateway redirect)
  app.get("/api/ipfs/cat/:cid", async (req: Request, res: Response) => {
    const cidStr = String(req.params.cid);
    try {
      // 1. Try local DB cache (fast; avoids Pinata round-trip)
      const block = await storage.getIpfsBlock(cidStr);
      if (block) {
        const buf = Buffer.from(block.data, "base64");
        res.setHeader("Content-Type", block.mimeType || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(buf);
      }
      // 2. Not cached — redirect to dedicated Pinata gateway (file lives on IPFS)
      return res.redirect(302, primaryGatewayUrl(cidStr));
    } catch (err: any) {
      console.error("[IPFS] cat error:", err);
      return res.redirect(302, primaryGatewayUrl(cidStr));
    }
  });

  // GET /api/ipfs/info — service status
  app.get("/api/ipfs/info", (_req: Request, res: Response) => {
    return res.json({
      status: "ok",
      mode: "pinata",
      gateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
      repo: "https://github.com/PinataCloud",
    });
  });

  // POST /api/ipfs/profile — pin a profile JSON blob to Pinata; requires Privy auth
  app.post("/api/ipfs/profile", async (req: Request, res: Response) => {
    const token = (req.headers["x-privy-token"] as string) || "";
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const verify = await verifyPrivyToken(token);
    if (!verify.valid) return res.status(401).json({ error: "Invalid token" });

    try {
      const profileData = req.body;
      if (!profileData || typeof profileData !== "object") {
        return res.status(400).json({ error: "Invalid profile data" });
      }

      const jsonStr = JSON.stringify({ ...profileData, pinnedAt: Date.now() });
      const buf = Buffer.from(jsonStr, "utf-8");

      // Upload to Pinata
      const pinata = getPinata();
      const filename = `pepo-profile-${verify.userId}-${Date.now()}.json`;
      const file = new File([buf], filename, { type: "application/json" });
      const result = await pinata.upload.public.file(file);
      const cid = result.cid;

      // Cache in DB so /api/ipfs/cat can serve it without a Pinata round-trip
      await storage.saveIpfsBlock(cid, buf.toString("base64"), "application/json");

      const gatewayBase = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
      const url = `https://${gatewayBase}/ipfs/${cid}`;

      // Persist CID + award one-time points
      const existing = await storage.getProfile(verify.userId!);
      await storage.saveIpfsCid(verify.userId!, cid);
      if (existing && !existing.ipfsCid) {
        await storage.addContribution({
          profileId: verify.userId!,
          type: "resource",
          description: "Synced profile to IPFS via Pinata",
          points: 30,
        });
      }

      return res.json({ cid, url, gateways: gatewayUrls(cid) });
    } catch (err: any) {
      console.error("[IPFS profile] error:", err);
      return res.status(500).json({ error: err.message || "Failed to pin profile" });
    }
  });

  // Proxy: fetch knowledge graph data (legacy — kept for compatibility)
  app.get("/api/graph", async (_req: Request, res: Response) => {
    return res.json({ message: "Use /api/graph/data for graph nodes and edges" });
  });

  // Aggregate graph data from multiple Bonfires.ai queries → nodes + edges
  app.get("/api/graph/data", async (_req: Request, res: Response) => {
    const queries = ["coral reef", "MesoReefDAO", "marine conservation", "DeSci governance"];
    const allNodes = new Map<string, any>();
    const allEdges = new Map<string, any>();

    await Promise.allSettled(queries.map(async (query) => {
      try {
        const response = await fetch(`${BONFIRES_BASE}/api/graph/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PEPO_API_KEY}`,
            "Content-Type": "application/json",
            "x-api-key": PEPO_API_KEY,
          },
          body: JSON.stringify({ bonfire_id: BONFIRE_ID, query }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return;
        const data = await response.json() as any;
        (data.entities as any[] || []).forEach((n: any) => allNodes.set(n.uuid, n));
        (data.episodes as any[] || []).forEach((n: any) => allNodes.set(n.uuid, n));
        (data.edges   as any[] || []).forEach((e: any) => allEdges.set(e.uuid, e));
      } catch { /* ignore individual query failures */ }
    }));

    return res.json({
      nodes: Array.from(allNodes.values()),
      edges: Array.from(allEdges.values()),
    });
  });

  // Proxy: serve Bonfires.ai /graph page with EXPLORER panel hidden via injected script
  app.get("/api/graph-embed", async (_req: Request, res: Response) => {
    try {
      const upstream = await fetch("https://pepo.app.bonfires.ai/graph", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MesoReefDAO/1.0)",
          "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!upstream.ok) {
        return res.status(upstream.status).send(
          `<html><body style="background:#00080c;color:#83eef0;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Graph unavailable (${upstream.status})</body></html>`
        );
      }

      let html = await upstream.text();

      // ── Injection block ────────────────────────────────────────────────────
      // 1. <base> so all /_next/ relative paths resolve against Bonfires.ai
      // 2. CSS to hide the sticky header immediately (before React hydrates)
      // 3. MutationObserver script to hide the EXPLORER panel once React renders it
      const injection = `
<base href="https://pepo.app.bonfires.ai/">
<style>
  header { display: none !important; }
  body { padding-top: 0 !important; margin-top: 0 !important; }
</style>
<script>
/* ── 1. Stub Clerk API calls so React renders without a real Clerk session ── */
(function () {
  var _fetch = window.fetch;
  window.fetch = function (resource, init) {
    var url = typeof resource === "string" ? resource
            : (resource instanceof URL ? resource.href
            : (resource && resource.url ? resource.url : ""));
    if (url && url.indexOf("clerk.bonfires.ai") !== -1) {
      /* Return a minimal Clerk client payload that says "not signed in" */
      var mockClient = {
        id: "client_mock",
        object: "client",
        session_ids: [],
        sessions: [],
        sign_in: null,
        sign_up: null,
        last_active_session_id: null,
        created_at: 0,
        updated_at: 0
      };
      return Promise.resolve(
        new Response(JSON.stringify({ response: mockClient, client: mockClient }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    }
    return _fetch.apply(this, arguments);
  };
})();

/* ── 2. Hide header, then minimize the PepoThePolypBot chat panel ─────────── */
(function () {
  var MAX = 80;
  var tries = 0;
  var headerHidden = false;
  var botMinimized = false;

  function findBotPanel() {
    /* Walk all text nodes, look for the exact label "PepoThePolypBot" */
    var walker = document.createTreeWalker(
      document.body || document.documentElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    var node;
    while ((node = walker.nextNode())) {
      var val = (node.nodeValue || "").trim();
      if (val === "PepoThePolypBot") {
        return node.parentElement;
      }
    }
    return null;
  }

  function hideAll() {
    tries++;

    /* Hide the sticky Bonfires navbar */
    if (!headerHidden) {
      var hdr = document.querySelector("header");
      if (hdr) { hdr.style.setProperty("display", "none", "important"); headerHidden = true; }
    }

    /* Minimize the PepoThePolypBot chat panel */
    if (!botMinimized) {
      var label = findBotPanel();
      if (label) {
        /* Walk up to find a sizeable container, then click its first button (the − button) */
        var el = label;
        for (var i = 0; i < 12; i++) {
          if (!el || el === document.body) break;
          if (el.offsetWidth > 100) {
            /* Try clicking a button whose text is − / minimize */
            var btns = el.querySelectorAll("button");
            var clicked = false;
            for (var b = 0; b < btns.length; b++) {
              var txt = (btns[b].textContent || "").trim();
              if (txt === "−" || txt === "-" || txt === "–" || txt.length === 1) {
                btns[b].click();
                clicked = true;
                break;
              }
            }
            if (!clicked && btns.length > 0) {
              /* Fallback: click the last button in the header row */
              btns[btns.length - 1].click();
            }
            botMinimized = true;
            break;
          }
          el = el.parentElement;
        }
      }
    }

    if ((!headerHidden || !botMinimized) && tries < MAX) {
      setTimeout(hideAll, 150);
    }
  }

  if (document.body) { hideAll(); }
  else { document.addEventListener("DOMContentLoaded", hideAll); }
  setTimeout(hideAll, 200);
  setTimeout(hideAll, 600);
  setTimeout(hideAll, 1200);
  setTimeout(hideAll, 2500);
  setTimeout(hideAll, 5000);

  var mo = new MutationObserver(function () {
    if (!headerHidden || !botMinimized) hideAll();
  });
  function attachObserver() {
    if (document.body) { mo.observe(document.body, { childList: true, subtree: true }); }
    else { document.addEventListener("DOMContentLoaded", function () { mo.observe(document.body, { childList: true, subtree: true }); }); }
  }
  attachObserver();
})();
</script>`;

      // Inject right after <head> opening tag (before any other content)
      if (html.includes("<head>")) {
        html = html.replace("<head>", "<head>" + injection);
      } else if (html.includes("<HEAD>")) {
        html = html.replace("<HEAD>", "<HEAD>" + injection);
      } else {
        html = injection + html;
      }

      // Serve with permissive headers so the iframe can load this from our domain
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Cache-Control", "no-store");
      // Wide-open CSP so Bonfires.ai assets, Clerk, websockets etc. all work
      res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
      );
      return res.send(html);
    } catch (err) {
      console.error("[graph-embed]", err);
      return res.status(502).send(
        `<html><body style="background:#00080c;color:#83eef0;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Graph temporarily unavailable</body></html>`
      );
    }
  });

  // Recent episodes — sorted newest-first for the Explorer panel
  app.get("/api/graph/recent", async (_req: Request, res: Response) => {
    const queries = ["coral reef", "MesoReefDAO", "DeSci", "marine conservation"];
    const allEpisodes = new Map<string, any>();

    await Promise.allSettled(queries.map(async (query) => {
      try {
        const response = await fetch(`${BONFIRES_BASE}/api/graph/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PEPO_API_KEY}`,
            "Content-Type": "application/json",
            "x-api-key": PEPO_API_KEY,
          },
          body: JSON.stringify({ bonfire_id: BONFIRE_ID, query }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return;
        const data = await response.json() as any;
        (data.episodes as any[] || []).forEach((ep: any) => allEpisodes.set(ep.uuid, ep));
      } catch { /* ignore individual failures */ }
    }));

    const episodes = Array.from(allEpisodes.values())
      .sort((a, b) => {
        const ta = new Date(a.valid_at || a.created_at || 0).getTime();
        const tb = new Date(b.valid_at || b.created_at || 0).getTime();
        return tb - ta;
      })
      .slice(0, 10);

    return res.json({ episodes });
  });

  // Proxy: search knowledge graph
  app.post("/api/graph/search", async (req: Request, res: Response) => {
    const query = sanitizeString(req.body?.query, 500);
    if (!query) return res.status(400).json({ error: "query must be a non-empty string under 500 characters" });

    try {
      const response = await fetch(`${BONFIRES_BASE}/api/graph/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "Content-Type": "application/json",
          "x-api-key": PEPO_API_KEY,
        },
        body: JSON.stringify({ bonfire_id: BONFIRE_ID, query }),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Search unavailable" });
      }
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.status(500).json({ error: "Search unavailable" });
    }
  });

  // Chat endpoint: query Pepo AI via Bonfires (stricter rate limit)
  app.post("/api/chat", chatLimiter, async (req: Request, res: Response) => {
    const message = sanitizeString(req.body?.message, 2000);
    if (!message) return res.status(400).json({ error: "message must be a non-empty string under 2000 characters" });

    // Identify authenticated user — Privy token takes precedence, then ORCID session
    let chatProfileId: string | null = null;
    const privyToken = (req.headers["x-privy-token"] as string) || "";
    if (privyToken) {
      const verify = await verifyPrivyToken(privyToken);
      if (verify.valid && verify.userId) chatProfileId = verify.userId;
    } else if ((req as any).session?.orcid?.profileId) {
      chatProfileId = (req as any).session.orcid.profileId;
    }

    // Helper: award question points after the response is sent
    const awardQuestionPoints = async (): Promise<number> => {
      if (!chatProfileId) return 0;
      try {
        const alreadyToday = await storage.hasContributionToday(chatProfileId, "question");
        if (alreadyToday) return 0;
        await storage.addContribution({
          profileId: chatProfileId,
          type: "question",
          description: message.slice(0, 200),
          points: 10,
        });
        return 10;
      } catch {
        return 0;
      }
    };

    try {
      const response = await fetch(`${BONFIRES_BASE}/api/graph/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "Content-Type": "application/json",
          "x-api-key": PEPO_API_KEY,
        },
        body: JSON.stringify({ bonfire_id: BONFIRE_ID, query: message }),
      });

      if (!response.ok) {
        console.log("[Pepo API] graph/query failed:", response.status);
        const pointsAwarded = await awardQuestionPoints();
        return res.json({ response: generatePepoResponse(message), source: "local", pointsAwarded });
      }

      const data = await response.json() as any;

      if (data.success && Array.isArray(data.episodes) && data.episodes.length > 0) {
        const reply = await buildPepoReply(message, data.episodes);
        const pointsAwarded = await awardQuestionPoints();
        return res.json({ response: reply, source: "bonfires", pointsAwarded });
      }

      // No Bonfires episodes — still enrich with all knowledge sources
      const [wikiCtx, mesoCtx, journalCtx, botCtx] = await Promise.all([
        fetchWikipediaContext(message),
        fetchMesoReefContext(message),
        fetchJournalKnowledge(message),
        fetchBotKnowledge(message),
      ]);
      let fallbackReply = generatePepoResponse(message);
      if (botCtx.length > 0) {
        fallbackReply += `\n\n🤖 **@PepothePolyp_bot Knowledge:**\n`;
        botCtx.forEach(tax => {
          fallbackReply += `• **${tax.name}**: ${tax.description}\n`;
        });
      }
      if (journalCtx.length > 0) {
        fallbackReply += `\n\n📚 **Peer-Reviewed Science:**\n`;
        journalCtx.slice(0, 3).forEach(paper => {
          const badge = paper.isOA ? " 🔓" : "";
          fallbackReply += `• **${paper.title}**${badge}\n  _${paper.journal}${paper.year ? `, ${paper.year}` : ""}_\n  ${paper.abstract.slice(0, 200)}...\n\n`;
        });
      }
      if (wikiCtx) fallbackReply += `\n🌐 **Wikipedia:**\n${wikiCtx.slice(0, 400)}...`;
      if (mesoCtx) {
        const relevantLines = mesoCtx.split("\n")
          .filter(line => line.toLowerCase().split(" ").some(w => w.length > 4 && message.toLowerCase().includes(w)))
          .slice(0, 4).join("\n");
        if (relevantLines.trim()) fallbackReply += `\n\n🐠 **MesoReefDAO:**\n${relevantLines.trim()}`;
      }
      const pointsAwarded = await awardQuestionPoints();
      return res.json({ response: fallbackReply, source: "enriched-local", pointsAwarded });
    } catch (err) {
      console.log("[Pepo API] error:", err);
      return res.json({ response: generatePepoResponse(message), source: "local", pointsAwarded: 0 });
    }
  });

  // ── Profiles & Leaderboard ────────────────────────────────────────────────

  // GET /api/leaderboard — public ranked list
  app.get("/api/leaderboard", async (_req: Request, res: Response) => {
    try {
      const board = await storage.getLeaderboard();
      return res.json(board);
    } catch (err) {
      console.error("[leaderboard]", err);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // GET /api/profiles — all public profiles
  app.get("/api/profiles", async (_req: Request, res: Response) => {
    try {
      const all = await storage.getAllProfiles();
      return res.json(all);
    } catch (err) {
      console.error("[profiles]", err);
      return res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  // GET /api/profiles/me — current authenticated user's own profile
  // Must be registered BEFORE /:id to avoid being swallowed by the wildcard.
  app.get("/api/profiles/me", async (req: Request, res: Response) => {
    try {
      // Privy token takes priority
      const token = (req.headers["x-privy-token"] as string) || "";
      if (token) {
        const verify = await verifyPrivyToken(token);
        if (verify.valid && verify.userId) {
          const profile = await storage.getProfile(verify.userId);
          if (!profile) return res.status(404).json({ error: "Profile not found" });
          const contribs = await storage.getContributions(verify.userId);
          return res.json({ profile, contributions: contribs });
        }
      }
      // ORCID session fallback
      if (req.session?.orcid?.profileId) {
        const pid = req.session.orcid.profileId;
        const profile = await storage.getProfile(pid);
        if (!profile) return res.status(404).json({ error: "Profile not found" });
        const contribs = await storage.getContributions(pid);
        return res.json({ profile, contributions: contribs });
      }
      return res.status(401).json({ error: "Not authenticated" });
    } catch (err) {
      console.error("[profiles/me]", err);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // GET /api/profiles/:id — single profile with contributions
  app.get("/api/profiles/:id", async (req: Request, res: Response) => {
    try {
      const pid = String(req.params.id);
      const profile = await storage.getProfile(pid);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      const contribs = await storage.getContributions(pid);
      return res.json({ profile, contributions: contribs });
    } catch (err) {
      console.error("[profile]", err);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // POST /api/profiles — upsert own profile (requires Privy auth)
  app.post("/api/profiles", async (req: Request, res: Response) => {
    const token = (req.headers["x-privy-token"] as string) || "";
    const verify = await verifyPrivyToken(token);
    if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });

    const { displayName, bio, location, website, avatarUrl, avatarCid, ipfsImages, tags, isPublic, twitterHandle, linkedinUrl, githubHandle, instagramHandle, walletAddress } = req.body;
    const uid = verify.userId!;
    try {
      // Snapshot the profile BEFORE changes so we can detect newly completed fields
      const before = await storage.getProfile(uid);

      const profile = await storage.upsertProfile({
        id: uid,
        displayName: sanitizeString(displayName) || "Explorer",
        bio: sanitizeString(bio, 500) || "",
        location: sanitizeString(location, 100) || "",
        website: sanitizeString(website, 200) || "",
        avatarUrl: sanitizeString(avatarUrl, 500) || "",
        avatarCid: sanitizeString(avatarCid, 200) || "",
        ipfsImages: Array.isArray(ipfsImages) ? ipfsImages.slice(0, 50).map(String) : [],
        tags: Array.isArray(tags) ? tags.slice(0, 10).map(String) : [],
        points: undefined, // preserved by DB default
        isPublic: isPublic !== false,
        twitterHandle: sanitizeString(twitterHandle, 50) || "",
        linkedinUrl: sanitizeString(linkedinUrl, 200) || "",
        githubHandle: sanitizeString(githubHandle, 50) || "",
        instagramHandle: sanitizeString(instagramHandle, 50) || "",
        walletAddress: sanitizeString(walletAddress, 100) || "",
      });

      // ── Award one-time points for newly completed profile fields ──────────
      const newName = sanitizeString(displayName) || "";
      const hadName = !!(before?.displayName && before.displayName !== "Explorer" && before.displayName !== "Researcher" && before.displayName.length > 0);
      const hasName = newName !== "" && newName !== "Explorer" && newName !== "Researcher";
      if (hasName && !hadName && !(await storage.hasContribution(uid, "profile_name"))) {
        await storage.addContribution({ profileId: uid, type: "profile_name", description: "Set display name", points: 10 });
      }

      const newBio = sanitizeString(bio, 500) || "";
      const hadBio = !!(before?.bio && before.bio.length >= 10);
      if (newBio.length >= 10 && !hadBio && !(await storage.hasContribution(uid, "profile_bio"))) {
        await storage.addContribution({ profileId: uid, type: "profile_bio", description: "Wrote a bio", points: 10 });
      }

      const newAvatarCid = sanitizeString(avatarCid, 200) || "";
      const newAvatarUrl = sanitizeString(avatarUrl, 500) || "";
      const hadAvatar = !!(before?.avatarCid || before?.avatarUrl);
      if ((newAvatarCid || newAvatarUrl) && !hadAvatar && !(await storage.hasContribution(uid, "profile_avatar"))) {
        await storage.addContribution({ profileId: uid, type: "profile_avatar", description: "Uploaded a profile photo", points: 15 });
      }

      void pinProfileAsync(profile as Record<string, unknown>, uid);
      return res.json(profile);
    } catch (err) {
      console.error("[upsertProfile]", err);
      return res.status(500).json({ error: "Failed to save profile" });
    }
  });

  // POST /api/profiles/sync — auto-sync from Privy after login (lightweight)
  app.post("/api/profiles/sync", async (req: Request, res: Response) => {
    const token = (req.headers["x-privy-token"] as string) || "";
    const verify = await verifyPrivyToken(token);
    if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await storage.getProfile(verify.userId!);
      if (!existing) {
        // First login — create profile + award bonus points
        const profile = await storage.upsertProfile({
          id: verify.userId!,
          displayName: req.body?.displayName || "Explorer",
          bio: "",
          location: "",
          website: "",
          avatarUrl: req.body?.avatarUrl || "",
          tags: [],
          points: 0,
          isPublic: true,
        });
        // Award first-login bonus
        await storage.addContribution({
          profileId: verify.userId!,
          type: "login",
          description: "First time joining the Reef network",
          points: 50,
        });
        // Pin new profile to IPFS in background (awards 30 pts on first pin)
        void pinProfileAsync(profile as Record<string, unknown>, verify.userId!);
        return res.json({ profile, newUser: true });
      }
      // Returning user — pin updated profile to IPFS in background on every login
      void pinProfileAsync(existing as Record<string, unknown>, verify.userId!);
      return res.json({ profile: existing, newUser: false });
    } catch (err) {
      console.error("[syncProfile]", err);
      return res.status(500).json({ error: "Failed to sync profile" });
    }
  });

  // POST /api/profiles/pin-all — batch-pin all profiles without an IPFS CID
  // Protected by PEPO_API_KEY header
  app.post("/api/profiles/pin-all", async (req: Request, res: Response) => {
    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey || apiKey !== process.env.PEPO_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const all = await storage.getAllProfilesRaw();
      const unpinned = all.filter(p => !p.ipfsCid);
      for (const p of unpinned) {
        void pinProfileAsync(p as Record<string, unknown>, p.id);
      }
      return res.json({
        message: `Queued ${unpinned.length} profiles for IPFS pinning`,
        total: all.length,
        alreadyPinned: all.length - unpinned.length,
      });
    } catch (err) {
      console.error("[pin-all]", err);
      return res.status(500).json({ error: "Failed to queue pins" });
    }
  });

  // POST /api/profiles/orcid — save ORCID iD to authenticated user's profile
  app.post("/api/profiles/orcid", async (req: Request, res: Response) => {
    const token = (req.headers["x-privy-token"] as string) || "";
    const verify = await verifyPrivyToken(token);
    if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });

    const orcidId = sanitizeString(req.body?.orcidId, 32);
    const orcidName = sanitizeString(req.body?.orcidName, 200) || "";
    if (!orcidId || !orcidId.match(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)) {
      return res.status(400).json({ error: "Invalid ORCID iD format" });
    }

    try {
      // Ensure profile exists first
      const existing = await storage.getProfile(verify.userId!);
      if (!existing) return res.status(404).json({ error: "Profile not found — log in first" });

      const profile = await storage.saveOrcid(verify.userId!, orcidId, orcidName);

      // Award bonus points for linking ORCID (one-time)
      if (!existing.orcidId) {
        await storage.addContribution({
          profileId: verify.userId!,
          type: "resource",
          description: `Linked ORCID iD ${orcidId}`,
          points: 25,
        });
      }
      return res.json(profile);
    } catch (err) {
      console.error("[saveOrcid]", err);
      return res.status(500).json({ error: "Failed to save ORCID" });
    }
  });

  // DELETE /api/profiles/orcid — unlink ORCID iD from authenticated user's profile
  app.delete("/api/profiles/orcid", async (req: Request, res: Response) => {
    const token = (req.headers["x-privy-token"] as string) || "";
    const verify = await verifyPrivyToken(token);
    if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });
    try {
      const profile = await storage.clearOrcid(verify.userId!);
      return res.json(profile);
    } catch (err) {
      console.error("[clearOrcid]", err);
      return res.status(500).json({ error: "Failed to clear ORCID" });
    }
  });

  // POST /api/profiles/ipfs — save Pinata IPFS CID to profile
  app.post("/api/profiles/ipfs", async (req: Request, res: Response) => {
    const token = (req.headers["x-privy-token"] as string) || "";
    const verify = await verifyPrivyToken(token);
    if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });

    const cid = sanitizeString(req.body?.ipfsCid, 200) || "";
    if (!cid) return res.status(400).json({ error: "ipfsCid required" });

    try {
      const existing = await storage.getProfile(verify.userId!);
      const profile = await storage.saveIpfsCid(verify.userId!, cid);

      // Award points the first time IPFS storage is activated
      if (existing && !existing.ipfsCid) {
        await storage.addContribution({
          profileId: verify.userId!,
          type: "resource",
          description: "Synced profile to IPFS via Pinata",
          points: 30,
        });
      }
      return res.json({ profile });
    } catch (err) {
      console.error("[saveIpfsCid]", err);
      return res.status(500).json({ error: "Failed to save IPFS CID" });
    }
  });

  // POST /api/profiles/location — save geolocation for authenticated user
  app.post("/api/profiles/location", async (req: Request, res: Response) => {
    // Accept both Privy token and ORCID session
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (verify.valid) profileId = verify.userId!;
    }
    if (!profileId && req.session?.orcid) profileId = req.session.orcid.profileId;
    if (!profileId) return res.status(401).json({ error: "Unauthorized" });

    const lat = parseFloat(req.body?.latitude);
    const lng = parseFloat(req.body?.longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }
    try {
      const profile = await storage.saveLocation(profileId, lat, lng);
      return res.json({ profile });
    } catch (err) {
      console.error("[saveLocation]", err);
      return res.status(500).json({ error: "Failed to save location" });
    }
  });

  // GET /api/map/markers — public user location pins for the reef map
  app.get("/api/map/markers", async (_req: Request, res: Response) => {
    try {
      const markers = await storage.getMapMarkers();
      return res.json(markers);
    } catch (err) {
      console.error("[mapMarkers]", err);
      return res.status(500).json({ error: "Failed to fetch markers" });
    }
  });

  // GET /api/reef-images/mine — returns all reef images submitted by the authenticated user
  // Must be registered BEFORE /api/reef-images to avoid any future /:id wildcard conflicts.
  app.get("/api/reef-images/mine", async (req: Request, res: Response) => {
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (verify.valid) profileId = verify.userId!;
    }
    if (!profileId && (req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    }
    if (!profileId) return res.status(401).json({ error: "Authentication required" });
    try {
      const images = await storage.getReefImagesByProfile(profileId);
      return res.json(images);
    } catch (err) {
      console.error("[reefImages/mine]", err);
      return res.status(500).json({ error: "Failed to fetch your submissions" });
    }
  });

  // GET /api/reef-images — public; returns approved geo-tagged IPFS images for the map
  app.get("/api/reef-images", async (_req: Request, res: Response) => {
    try {
      const images = await storage.getReefImages("approved");
      return res.json(images);
    } catch (err) {
      console.error("[reefImages GET]", err);
      return res.status(500).json({ error: "Failed to fetch reef images" });
    }
  });

  // POST /api/reef-images — submit an IPFS image with coordinates (goes into pending queue)
  app.post("/api/reef-images", generalLimiter, async (req: Request, res: Response) => {
    const { cid, latitude, longitude, title = "", author = "", description = "" } = req.body;
    if (!cid || typeof cid !== "string" || cid.trim().length === 0) {
      return res.status(400).json({ error: "cid is required" });
    }
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: "Invalid latitude" });
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "Invalid longitude" });
    }

    // Optional auth — attach profileId if a valid token is present
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (verify.valid) profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    }

    try {
      const img = await storage.createReefImage({
        cid: cid.trim(),
        latitude: lat,
        longitude: lon,
        title: String(title).slice(0, 120),
        author: String(author).slice(0, 120),
        description: String(description).slice(0, 500),
        profileId: profileId ?? undefined,
      });

      // Award submission points to the authenticated user
      if (profileId) {
        await storage.addContribution({
          profileId,
          type: "submission",
          description: `Submitted reef image for curation: ${img.title || img.cid.slice(0, 12)}`,
          points: 20,
        });
      }

      return res.status(201).json(img);
    } catch (err) {
      console.error("[reefImages POST]", err);
      return res.status(500).json({ error: "Failed to save reef image" });
    }
  });

  // GET /api/curation/queue — returns pending reef images for ORCID-verified curators
  app.get("/api/curation/queue", async (req: Request, res: Response) => {
    // Accept either Privy token or ORCID session
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (verify.valid) profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    }
    if (!profileId) return res.status(401).json({ error: "Authentication required" });

    // Must have an ORCID iD linked
    const profile = await storage.getProfile(profileId);
    if (!profile?.orcidId) {
      return res.status(403).json({ error: "An ORCID iD is required to access the curation queue" });
    }

    try {
      const queue = await storage.getCurationQueue();
      return res.json(queue);
    } catch (err) {
      console.error("[curation queue]", err);
      return res.status(500).json({ error: "Failed to fetch curation queue" });
    }
  });

  // POST /api/curation/:id — approve or reject a pending reef image
  app.post("/api/curation/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { decision, curatorNote } = req.body; // 'approved' | 'rejected', optional note
    if (decision !== "approved" && decision !== "rejected") {
      return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
    }

    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (verify.valid) profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    }
    if (!profileId) return res.status(401).json({ error: "Authentication required" });

    const profile = await storage.getProfile(profileId);
    if (!profile?.orcidId) {
      return res.status(403).json({ error: "An ORCID iD is required to curate images" });
    }

    try {
      const updated = await storage.curateReefImage(id, decision, profileId, typeof curatorNote === "string" ? curatorNote.slice(0, 500) : "");
      if (!updated) return res.status(404).json({ error: "Image not found" });

      // Award points to the curator (5 pts per decision)
      await storage.addContribution({
        profileId,
        type: "curation",
        description: `Curated reef image: ${decision}`,
        points: 5,
      });

      // If approved, award the submitter a 50 pt bonus
      if (decision === "approved" && updated.profileId && updated.profileId !== profileId) {
        await storage.addContribution({
          profileId: updated.profileId,
          type: "submission_approved",
          description: `Reef image approved: ${updated.title || updated.cid.slice(0, 12)}`,
          points: 50,
        });
      }

      return res.json(updated);
    } catch (err) {
      console.error("[curation vote]", err);
      return res.status(500).json({ error: "Failed to update image status" });
    }
  });

  // GET /api/gcrmn/regions — GCRMN region polygons as GeoJSON (shapefile from GitHub)
  app.get("/api/gcrmn/regions", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchGcrmnRegions();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[gcrmnRegions]", err);
      return res.status(500).json({ error: "Failed to fetch GCRMN regions" });
    }
  });

  // GET /api/coral-mapping/regions — CoralMapping GlobalMappingRegions GeoJSON
  app.get("/api/coral-mapping/regions", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchCoralMappingRegions();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[coralMappingRegions]", err);
      return res.status(500).json({ error: "Failed to fetch CoralMapping regions" });
    }
  });

  // GET /api/wcs/reefcloud-sites — WCS-Marine/global-monitoring-maps ReefCloud monitoring sites
  app.get("/api/wcs/reefcloud-sites", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchWcsReefCloudSites();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[wcsReefCloud]", err);
      return res.status(500).json({ error: "Failed to fetch WCS ReefCloud sites" });
    }
  });

  // GET /api/wcs/cc-sites — WCS-Marine/global-monitoring-maps coral cover sites (CSV→GeoJSON)
  app.get("/api/wcs/cc-sites", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchWcsCcSites();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[wcsCcSites]", err);
      return res.status(500).json({ error: "Failed to fetch WCS coral cover sites" });
    }
  });

  // GET /api/wcs/gcrmn-mon-sites — GCRMN monitoring sites (all-lat-long-no-mermaid.csv, db=gcrmn)
  app.get("/api/wcs/gcrmn-mon-sites", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchGcrmnMonitoringSites();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[gcrmnMonSites]", err);
      return res.status(500).json({ error: "Failed to fetch GCRMN monitoring sites" });
    }
  });

  // GET /api/wcs/reef-check — Reef Check survey sites (global-monitoring-maps/reef_check_all.csv)
  app.get("/api/wcs/reef-check", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchReefCheckSites();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[reefCheck]", err);
      return res.status(500).json({ error: "Failed to fetch Reef Check sites" });
    }
  });

  // GET /api/wcs/reef-life — Reef Life Survey sites (global-monitoring-maps/reef_life_site_info.csv)
  app.get("/api/wcs/reef-life", async (_req: Request, res: Response) => {
    try {
      const geojson = await fetchReefLifeSites();
      res.set("Cache-Control", "public, max-age=86400");
      return res.json(geojson);
    } catch (err) {
      console.error("[reefLife]", err);
      return res.status(500).json({ error: "Failed to fetch Reef Life Survey sites" });
    }
  });

  // GET /api/contributions/:id
  app.get("/api/contributions/:id", async (req: Request, res: Response) => {
    try {
      const contribs = await storage.getContributions(String(req.params.id));
      return res.json(contribs);
    } catch (err) {
      console.error("[contributions]", err);
      return res.status(500).json({ error: "Failed to fetch contributions" });
    }
  });

  // POST /api/contributions — award points (Privy token or ORCID session)
  app.post("/api/contributions", async (req: Request, res: Response) => {
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });
      profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!profileId) return res.status(401).json({ error: "Unauthorized" });

    const { type = "question", description = "" } = req.body;
    const allowed = ["question", "resource", "answer", "verification"];
    if (!allowed.includes(type)) return res.status(400).json({ error: "Invalid contribution type" });

    const pointsMap: Record<string, number> = { question: 10, resource: 15, answer: 10, verification: 20 };

    try {
      const alreadyToday = await storage.hasContributionToday(profileId, type);
      const pts = alreadyToday ? 0 : (pointsMap[type] ?? 10);
      const contrib = await storage.addContribution({
        profileId,
        type,
        description: sanitizeString(description, 300) || "",
        points: pts,
      });
      return res.json({ contribution: contrib, pointsAwarded: pts });
    } catch (err) {
      console.error("[addContribution]", err);
      return res.status(500).json({ error: "Failed to add contribution" });
    }
  });

  // Daily clean-a-coral action — awards 10 pts once per day
  app.post("/api/daily-clean", async (req: Request, res: Response) => {
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (!verify.valid) return res.status(401).json({ error: "Unauthorized" });
      profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!profileId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const alreadyToday = await storage.hasContributionToday(profileId, "clean");
      if (alreadyToday) {
        return res.json({ pointsAwarded: 0, alreadyClaimed: true });
      }
      await storage.addContribution({ profileId, type: "clean", description: "Daily coral cleaning", points: 10 });
      return res.json({ pointsAwarded: 10, alreadyClaimed: false });
    } catch (err) {
      console.error("[daily-clean]", err);
      return res.status(500).json({ error: "Failed to record clean" });
    }
  });

  // Check if user has already cleaned today
  app.get("/api/daily-clean/status", async (req: Request, res: Response) => {
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (!verify.valid) return res.json({ alreadyClaimed: false });
      profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    } else {
      return res.json({ alreadyClaimed: false });
    }

    if (!profileId) return res.json({ alreadyClaimed: false });

    try {
      const alreadyClaimed = await storage.hasContributionToday(profileId, "clean");
      return res.json({ alreadyClaimed });
    } catch {
      return res.json({ alreadyClaimed: false });
    }
  });

  // Graph stats
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${BONFIRES_BASE}/stats`, {
        headers: {
          "Authorization": `Bearer ${PEPO_API_KEY}`,
          "x-api-key": PEPO_API_KEY,
        },
      });
      if (!response.ok) {
        return res.json({ knowledgeDensity: "8.4 TB", networkHealth: "99.2%", nodeConnections: 3420 });
      }
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.json({ knowledgeDensity: "8.4 TB", networkHealth: "99.2%", nodeConnections: 3420 });
    }
  });

  // ─── GitHub repo actions proxy (for governance voting options) ──────────────
  // GET /api/github/issues?owner=<owner>&repo=<repo>&type=all|issues|prs
  // Returns open issues + PRs for the given repo without exposing tokens to client
  app.get("/api/github/issues", async (req: Request, res: Response) => {
    const owner = String(req.query.owner || "robioreefeco");
    const repo  = String(req.query.repo  || "memento-mori");
    const type  = String(req.query.type  || "all");

    // Validate repo path characters
    if (!/^[a-zA-Z0-9_.\-]+$/.test(owner) || !/^[a-zA-Z0-9_.\-]+$/.test(repo)) {
      return res.status(400).json({ error: "Invalid owner or repo" });
    }

    const ghToken = process.env.GITHUB_TOKEN || "";
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pepo-the-polyp/1.0",
    };
    if (ghToken) headers["Authorization"] = `Bearer ${ghToken}`;

    try {
      const items: any[] = [];

      if (type === "all" || type === "issues") {
        const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=30&labels=`, { headers });
        if (r.ok) {
          const data = await r.json() as any[];
          for (const item of data) {
            if (!item.pull_request) {
              items.push({ number: item.number, title: item.title, type: "issue", url: item.html_url, labels: (item.labels || []).map((l: any) => l.name) });
            }
          }
        }
      }

      if (type === "all" || type === "prs") {
        const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=30`, { headers });
        if (r.ok) {
          const data = await r.json() as any[];
          for (const pr of data) {
            items.push({ number: pr.number, title: pr.title, type: "pr", url: pr.html_url, labels: (pr.labels || []).map((l: any) => l.name) });
          }
        }
      }

      items.sort((a, b) => b.number - a.number);
      return res.json({ owner, repo, items });
    } catch (err: any) {
      console.error("[github/issues]", err);
      return res.status(500).json({ error: "Failed to fetch GitHub data" });
    }
  });

  // POST /api/governance/vote-recorded — awards points after a successful on-chain vote
  // Votes are verified on Vocdoni chain; this just records the points event (one-time per election)
  app.post("/api/governance/vote-recorded", generalLimiter, async (req: Request, res: Response) => {
    let profileId: string | null = null;
    const token = (req.headers["x-privy-token"] as string) || "";
    if (token) {
      const verify = await verifyPrivyToken(token);
      if (verify.valid) profileId = verify.userId!;
    } else if ((req as any).session?.orcid?.profileId) {
      profileId = (req as any).session.orcid.profileId;
    }
    if (!profileId) return res.status(401).json({ error: "Authentication required" });

    const { electionId } = req.body;
    if (!electionId || typeof electionId !== "string" || electionId.length < 8) {
      return res.status(400).json({ error: "electionId required" });
    }

    // Use a per-election type key to prevent double-awarding
    const voteType = `vote_${electionId.slice(0, 20)}`;
    if (await storage.hasContribution(profileId, voteType)) {
      return res.json({ alreadyRewarded: true, points: 0 });
    }

    await storage.addContribution({
      profileId,
      type: voteType,
      description: `Voted on governance proposal`,
      points: 15,
    });
    return res.json({ alreadyRewarded: false, points: 15 });
  });

  // ─── Vocdoni API proxy ─────────────────────────────────────────────────────
  // Proxying avoids CORS issues and keeps the org address server-side.
  const _VOCDONI_ENV = process.env.VOCDONI_ENV || "prod";
  const _VOCDONI_ORG = process.env.VOCDONI_ORG_ADDRESS || "";
  const _VOCDONI_API =
    _VOCDONI_ENV === "prod" ? "https://api.vocdoni.io/v2"
    : _VOCDONI_ENV === "dev" ? "https://api-dev.vocdoni.net/v2"
    : "https://api-stg.vocdoni.net/v2";

  // POST /api/admin/sync-points — backfill + recalculate points for all users
  app.post("/api/admin/sync-points", generalLimiter, async (_req: Request, res: Response) => {
    try {
      const result = await storage.syncAllUserPoints();
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      console.error("[sync-points]", err);
      return res.status(500).json({ error: err.message || "sync failed" });
    }
  });

  app.get("/api/governance/info", (_req: Request, res: Response) => {
    res.json({ orgAddress: _VOCDONI_ORG, env: _VOCDONI_ENV, configured: !!_VOCDONI_ORG });
  });

  app.get("/api/governance/elections", async (req: Request, res: Response) => {
    if (!_VOCDONI_ORG) return res.json({ elections: [], hasMore: false });
    const page  = Math.max(0, parseInt(String(req.query.page  || "0"),  10) || 0);
    const limit = Math.min(50, parseInt(String(req.query.limit || "20"), 10) || 20);
    try {
      const url = `${_VOCDONI_API}/elections?organizationId=${_VOCDONI_ORG}&page=${page}&limit=${limit}`;
      const r = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "pepo-the-polyp/1.0" } });
      const data = await r.json() as any;
      if (!r.ok) {
        console.error("[vocdoni/elections]", r.status, data);
        return res.status(r.status || 502).json({ error: data?.error || data?.message || `Vocdoni error ${r.status}` });
      }
      const elections: any[] = data.elections ?? [];
      return res.json({ elections, hasMore: elections.length >= limit });
    } catch (err: any) {
      console.error("[vocdoni/elections]", err);
      return res.status(502).json({ error: "Could not reach Vocdoni API" });
    }
  });

  app.get("/api/governance/elections/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    if (!/^[0-9a-fA-F]{10,100}$/.test(id)) return res.status(400).json({ error: "Invalid election ID" });
    try {
      const r = await fetch(`${_VOCDONI_API}/elections/${id}`, { headers: { "Accept": "application/json", "User-Agent": "pepo-the-polyp/1.0" } });
      const data = await r.json() as any;
      if (!r.ok) return res.status(r.status || 502).json(data);
      return res.json(data);
    } catch (err: any) {
      console.error("[vocdoni/election]", err);
      return res.status(502).json({ error: "Could not reach Vocdoni API" });
    }
  });

  // ORCID OAuth: initiate login
  // mode defaults to "auth" (standalone sign-in); pass ?link=1 to only link ORCID to an existing Privy profile
  app.get("/api/auth/orcid", authLimiter, (req: Request, res: Response) => {
    if (!ORCID_CLIENT_ID) {
      return res.status(500).json({ error: "ORCID not configured" });
    }
    const mode: "auth" | "link" = req.query.link === "1" ? "link" : "auth";
    const state = crypto.randomBytes(32).toString("hex");
    orcidStateStore.set(state, { createdAt: Date.now(), mode });
    // Clean up stale states (older than 10 minutes)
    for (const [k, v] of Array.from(orcidStateStore.entries())) {
      if (Date.now() - v.createdAt > 10 * 60 * 1000) orcidStateStore.delete(k);
    }
    const redirectUri = getOrcidRedirectUri(req);
    const params = new URLSearchParams({
      client_id: ORCID_CLIENT_ID,
      response_type: "code",
      scope: "/authenticate",
      redirect_uri: redirectUri,
      state,
    });
    return res.redirect(`${ORCID_BASE}/oauth/authorize?${params.toString()}`);
  });

  // ORCID OAuth: callback
  app.get("/api/auth/orcid/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;

    if (!code || !state || !orcidStateStore.has(state)) {
      return res.redirect("/profile?orcid_error=invalid_state");
    }
    const stateData = orcidStateStore.get(state)!;
    orcidStateStore.delete(state);

    const redirectUri = getOrcidRedirectUri(req);

    try {
      const tokenRes = await fetch(`${ORCID_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          client_id: ORCID_CLIENT_ID,
          client_secret: ORCID_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) {
        return res.redirect("/profile?orcid_error=token_failed");
      }
      const token = await tokenRes.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        orcid: string;
        name: string;
      };
      const orcid = token.orcid;
      const name = token.name || "";
      const accessToken = token.access_token;
      // expires_in is in seconds; store as absolute unix ms timestamp
      const tokenExpiresAt = token.expires_in
        ? Date.now() + token.expires_in * 1000
        : Date.now() + 20 * 365 * 24 * 60 * 60 * 1000; // ORCID tokens are long-lived; default 20 yr

      if (stateData.mode === "link") {
        // Legacy linking mode: return ORCID data as URL params for the frontend to save
        const params = new URLSearchParams({ orcid_id: orcid, orcid_name: encodeURIComponent(name) });
        return res.redirect(`/profile?${params.toString()}`);
      }

      // Auth mode: create/update a standalone ORCID profile and establish a session
      const profileId = `orcid:${orcid}`;
      const existing = await storage.getProfile(profileId);

      // Preserve existing custom display name — only use ORCID name for brand-new accounts
      // or if the stored name is still the generic default
      const resolvedDisplayName =
        existing?.displayName && existing.displayName !== "ORCID Researcher"
          ? existing.displayName
          : name || "";

      // Upsert the profile
      const upserted = await storage.upsertProfile({
        id: profileId,
        displayName: resolvedDisplayName,
        bio: existing?.bio || "",
        location: existing?.location || "",
        website: existing?.website || "",
        avatarUrl: existing?.avatarUrl || "",
        tags: existing?.tags || [],
        points: existing?.points || 0,
        isPublic: existing?.isPublic ?? true,
        orcidId: orcid,
        orcidName: name,
        ipfsCid: existing?.ipfsCid || "",
      });

      // Award first-time verification bonus (25 pts, one-time for brand-new accounts)
      if (!existing) {
        await storage.addContribution({ profileId, type: "verification", description: "ORCID identity verified", points: 25 });
      }

      // Award daily login bonus (10 pts, once per day)
      const alreadyToday = await storage.hasContributionToday(profileId, "login");
      if (!alreadyToday) {
        await storage.addContribution({ profileId, type: "login", description: "ORCID sign-in", points: 10 });
      }

      // Pin profile to IPFS in background on every ORCID sign-in (30 pts one-time)
      void pinProfileAsync(upserted as Record<string, unknown>, profileId);

      // Establish session — store access token securely server-side (never sent to client)
      req.session.orcid = { orcidId: orcid, orcidName: name, profileId, accessToken, tokenExpiresAt };
      await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));

      return res.redirect("/profile?orcid_auth=success");
    } catch (err) {
      console.error("[orcid callback]", err);
      return res.redirect("/profile?orcid_error=server_error");
    }
  });

  // GET /api/auth/orcid/session — return current ORCID session user
  app.get("/api/auth/orcid/session", (req: Request, res: Response) => {
    if (!req.session?.orcid) {
      return res.json({ authenticated: false });
    }
    const { orcidId, orcidName, profileId, tokenExpiresAt } = req.session.orcid;
    // Never expose the access token to the client — only share non-sensitive metadata
    const tokenValid = tokenExpiresAt ? Date.now() < tokenExpiresAt : true;
    return res.json({ authenticated: true, orcidId, orcidName, profileId, tokenValid });
  });

  // POST /api/auth/orcid/logout — destroy ORCID session
  app.post("/api/auth/orcid/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  // POST /api/profiles/session — update profile for ORCID-session-authenticated users
  app.post("/api/profiles/session", async (req: Request, res: Response) => {
    if (!req.session?.orcid) {
      return res.status(401).json({ error: "No active ORCID session" });
    }
    const { profileId } = req.session.orcid;
    const { displayName, bio, location, website, avatarUrl, avatarCid, ipfsImages, tags, isPublic, twitterHandle, linkedinUrl, githubHandle, instagramHandle } = req.body;
    try {
      const existing = await storage.getProfile(profileId);
      const profile = await storage.upsertProfile({
        id: profileId,
        displayName: sanitizeString(displayName) || existing?.displayName || "Researcher",
        bio: sanitizeString(bio, 500) || existing?.bio || "",
        location: sanitizeString(location, 100) || existing?.location || "",
        website: sanitizeString(website, 200) || existing?.website || "",
        avatarUrl: sanitizeString(avatarUrl, 500) || existing?.avatarUrl || "",
        avatarCid: sanitizeString(avatarCid, 200) || existing?.avatarCid || "",
        ipfsImages: Array.isArray(ipfsImages) ? ipfsImages.slice(0, 50).map(String) : (existing?.ipfsImages || []),
        tags: Array.isArray(tags) ? tags.slice(0, 10).map(String) : (existing?.tags || []),
        points: existing?.points || 0,
        isPublic: isPublic !== false,
        orcidId: existing?.orcidId || req.session.orcid.orcidId,
        orcidName: existing?.orcidName || req.session.orcid.orcidName,
        ipfsCid: existing?.ipfsCid || "",
        twitterHandle: sanitizeString(twitterHandle, 50) || existing?.twitterHandle || "",
        linkedinUrl: sanitizeString(linkedinUrl, 200) || existing?.linkedinUrl || "",
        githubHandle: sanitizeString(githubHandle, 50) || existing?.githubHandle || "",
        instagramHandle: sanitizeString(instagramHandle, 50) || existing?.instagramHandle || "",
      });
      void pinProfileAsync(profile as Record<string, unknown>, profileId);
      return res.json(profile);
    } catch (err) {
      console.error("[sessionProfile]", err);
      return res.status(500).json({ error: "Failed to save profile" });
    }
  });

  // Privy token verification endpoint — verifies JWT via JWKS (no API round-trip)
  app.post("/api/auth/verify", authLimiter, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "") || sanitizeString(req.body?.token, 4096);
      if (!token) return res.status(401).json({ valid: false, error: "No token provided" });
      const result = await verifyPrivyToken(token);
      if (!result.valid) return res.status(401).json(result);
      return res.json(result);
    } catch {
      return res.status(500).json({ valid: false, error: "Internal error" });
    }
  });

  // Privy config info endpoint (for client diagnostics)
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    return res.json({
      privyAppId: PRIVY_APP_ID || null,
      privyConfigured: Boolean(PRIVY_APP_ID && PRIVY_APP_SECRET),
      jwksUrl: PRIVY_APP_ID
        ? `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`
        : null,
    });
  });

  return httpServer;
}

// ─── Knowledge cache (TTL: 10 min) ────────────────────────────────────────────
const knowledgeCache = new Map<string, { value: string; expiresAt: number }>();

function getCached(key: string): string | null {
  const entry = knowledgeCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value;
}

function setCached(key: string, value: string, ttlMs = 10 * 60 * 1000): void {
  knowledgeCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ─── Wikipedia knowledge ───────────────────────────────────────────────────────
function extractWikiSearchTerms(query: string): string {
  // Remove common question words and extract meaningful keywords
  const stopWords = new Set(["what", "how", "why", "when", "where", "who", "which", "is", "are", "does", "do",
    "can", "could", "would", "should", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "causes", "cause", "tell", "me", "about", "explain", "describe"]);
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  // Prefer reef-adjacent science terms if present
  const scienceTerms = terms.filter(w =>
    ["coral", "reef", "bleach", "mesoamer", "mesophot", "marine", "ocean", "biodiver",
     "ecosys", "algae", "symbiodinium", "dhw", "restor", "conserv", "dao", "desci",
     "thermal", "temperat", "climate", "species", "habitat", "scleract", "spawning",
     "acidif", "carbonate", "photosyn", "symbiont", "polyp", "zooxanth", "crispr"].some(k => w.includes(k))
  );
  const finalTerms = scienceTerms.length > 0 ? scienceTerms : terms.slice(0, 4);
  return finalTerms.join(" ").trim() || query.slice(0, 60);
}

async function fetchWikipediaContext(query: string): Promise<string> {
  const searchTerms = extractWikiSearchTerms(query);
  const cacheKey = `wiki:${searchTerms}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Search Wikipedia using extracted science/reef keywords
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchTerms)}&limit=2&format=json&namespace=0`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!searchRes.ok) return "";
    const [, titles] = await searchRes.json() as [string, string[], string[], string[]];
    if (!titles || titles.length === 0) return "";

    // Fetch summaries for the top results
    const summaries: string[] = [];
    for (const title of titles.slice(0, 2)) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
      if (!summaryRes.ok) continue;
      const summaryData = await summaryRes.json() as { extract?: string; title?: string };
      if (summaryData.extract) {
        summaries.push(`**${summaryData.title}**: ${summaryData.extract.slice(0, 400)}`);
      }
    }

    const result = summaries.join("\n\n");
    if (result) setCached(cacheKey, result);
    return result;
  } catch {
    return "";
  }
}

// ─── MesoReefDAO knowledge ────────────────────────────────────────────────────
const MESOREEFDAO_KNOWLEDGE = `
MesoReefDAO is a decentralized science (DeSci) initiative dedicated to the conservation and regeneration of the Mesoamerican Barrier Reef — the world's second-largest coral reef system, stretching 1,000 km along the coasts of Mexico, Belize, Guatemala, and Honduras.

**Mission**: Scale global coral reef restoration by combining decentralized science, marine biotechnology, community innovation, and blockchain-based governance.

**Key Programs**:
- **Regen Reef Projects**: Field-based coral restoration and biotech research on the Mesoamerican and Mesophotic reefs (below 40m depth).
- **Modular Wetlabs**: Mobile laboratory units for coral and fish biotechnology, enabling in-situ research and assisted evolution experiments.
- **IoT & AI Monitoring**: Real-time ecological sensors (DHW trackers, bleaching alerts) integrated with AI to detect thermal anomalies and trigger restoration protocols.
- **DAO Governance**: On-chain proposals and voting for reef conservation funding, with transparency over how regenerative finance flows into blue economy development.
- **IP-NFTs & DeSci**: Decentralized frameworks for managing biodiversity patents and open-access research protocols.
- **Mesophotic Reefs**: Focus on reefs below 40m as thermal refugia — less studied but critically important for coral survival under climate change.

**Technology Stack**: IoT sensors, Marine Degree Heating Weeks (DHW) monitoring, CRISPR-assisted coral evolution, multi-omics research, blockchain governance (on-chain proposals), and AI-powered species distribution modeling.

**Community**: MesoReefDAO brings together marine biologists, local fishing communities, NGOs, policymakers, and DeSci contributors across the Caribbean and beyond.

**Conservation Focus**: Coral bleaching prevention, thermally resilient genotype identification, blue carbon offsetting, biodiversity incentives, and transparent impact reporting through on-chain mechanisms.
`.trim();

async function fetchMesoReefContext(query: string): Promise<string> {
  const lc = query.toLowerCase();
  const keywords = ["dao", "mesoreefdao", "meso", "regen", "wetlab", "governance", "proposal", "nft", "desci",
    "coral", "reef", "bleach", "conservation", "restoration", "monitoring", "iot", "ai", "marine",
    "mesophotic", "biotechnology", "token", "blockchain", "fund"];
  if (!keywords.some(k => lc.includes(k))) return "";
  return MESOREEFDAO_KNOWLEDGE;
}

// ─── Memento Mori knowledge ───────────────────────────────────────────────────
const MEMENTO_MORI_KNOWLEDGE = `
**Memento Mori** is a permadeath MUD (multi-user dungeon) and DeSci gaming experiment by the MesoReefDAO / robioreefeco team. It is a dark fantasy world where death is permanent, the world lives in a knowledge graph, and AI agents collaboratively narrate every action.

**Core Concept**: Players enter a living world powered by the Bonfires Knowledge Graph. Every character, item, location, NPC, and quest exists as a node in the graph with temporal edges. When a character dies — it dies permanently. Dead characters become lore. The world remembers.

**Architecture**:
- **Client** (TypeScript / Bun): Rich terminal-style MUD interface with virtualized scrolling (Pretext), wallet gate (EIP-1193 / MetaMask), codex entity browser, optimistic inventory updates.
- **Gateway** (FastAPI / Python): WebSocket hub, Matrix transport bridge (one Matrix room per game location), 30 MCP tool endpoints for NPC agents, REST routes for session, inventory, codex, and onchain state.
- **Engine** (CrewAI / Python): 31 AI crews across 10 subsystems — context gathering, event detection, combat, world generation, NPC generation, item generation, quest design, narrative, faction, and enrichment. 12 orchestration flows.
- **Data** (Bonfires KG / Neo4j + LadybugDB, Matrix / Synapse): World graph with bi-temporal edges (valid_at, expired_at), episodic memory via Graphiti.
- **Chain** (MUD framework, Solidity, Redstone L2): Onchain canonical state for characters, deaths, items, and epochs. Dual-write to KG + blockchain on every world mutation.
- **LLM** (OpenRouter / Gemini Flash): All AI reasoning for narration, NPC design, world generation, and enrichment.

**Game Loop**: Player types action → Gateway posts to Matrix room → Engine's RoundController runs context crew, plausibility check, event detection, NPC response window (15s), narration crew, memory consolidation → Narrative posted back → Client renders with rich text.

**Permadeath System**: On death — character node stays in KG forever (append-only), HAS_STATUS:DEAD and DIED_AT edges are created, death recorded onchain (immutable), NPCs remember the fallen, items drop at death location, death feed announces to all players.

**Onchain Integration (Redstone L2)**: MUD tables store Characters (name, wallet, level, alive/dead), Deaths (cause, location, level), Items (rarity, slot, quantity, owner), Epochs (state root, IPFS CID). Chain is the canonicality gate — entities only appear in-client if they exist onchain.

**Knowledge Graph Schema**:
Player --[CARRIES {valid_at, expired_at}]--> Item
Player --[LOCATED_IN]--> Location --[EXIT_TO]--> Location
NPC --[LOCATED_IN]--> Location, NPC --[MEMBER_OF]--> Faction
Player --[HAS_QUEST]--> Quest, Player --[DIED_AT]--> Location

**NPC Agents**: Each NPC is a Bonfires AI agent with its own Matrix identity. Agents access 30 engine tools (KG search, world mutation, inventory, combat) via MCP HTTP. Tool access is gated by KG entity labels.

**Entity Archetypes** (player classes): warrior (heavy armor, swordsmanship), rogue (stealth, lockpicking, daggers), mage (spellcraft, arcane lore), ranger (archery, tracking, foraging).

**AI Crews** (31 total): Context assembly, action classification, combat (5 crews), world generation (4 crews), NPC generation (4 crews), item generation (3 crews), quest design (3 crews), narration + memory (2 crews), faction (2 crews), enrichment.

**Development Status**: Phases 0–10 complete (full game loop, UI, inventory, codex, onchain). Next phases: Matrix end-to-end deployment, world seeding via WorldGenFlow, rich state updates (damage numbers, visual effects), faction integration, narrative art generation.

**Connection to MesoReefDAO**: Memento Mori is an experimental DeSci gaming project by the robioreefeco collective — the same team behind Pepo the Polyp and MesoReefDAO. It explores how Bonfires Knowledge Graphs, onchain canonical state, and AI agent orchestration can power persistent decentralized worlds, a pattern directly applicable to on-chain reef monitoring, conservation incentives, and DAO-governed science.

**Repository**: https://github.com/robioreefeco/memento-mori
`.trim();

const MEMENTO_MORI_KEYWORDS = [
  "memento", "mori", "mud", "permadeath", "dungeon", "dark fantasy", "game",
  "rpg", "npc", "quest", "combat", "narrative", "crewai", "crew", "agent",
  "matrix", "synapse", "redstone", "bun", "pretext", "codex", "inventory",
  "character", "faction", "robioreef", "robioreefeco", "bonfires game",
  "world gen", "world generation", "knowledge graph game", "desci game",
  "blockchain game", "onchain game", "ai game", "permadeath",
];

async function fetchMementoMoriContext(query: string): Promise<string> {
  const lc = query.toLowerCase();
  if (!MEMENTO_MORI_KEYWORDS.some(k => lc.includes(k))) return "";
  // Return the most relevant paragraphs
  const paragraphs = MEMENTO_MORI_KNOWLEDGE.split("\n\n");
  const relevant = paragraphs.filter(p => {
    const words = lc.split(/\s+/).filter(w => w.length > 3);
    return words.some(w => p.toLowerCase().includes(w));
  });
  return (relevant.length ? relevant.slice(0, 5).join("\n\n") : paragraphs.slice(0, 3).join("\n\n"));
}

// ─── @PepothePolyp_bot Telegram Knowledge Taxonomy ────────────────────────────
// All 10 knowledge categories from 165 Telegram bot episodes (auto-updated from Bonfires)

interface BonfireTaxonomy {
  name: string;
  description: string;
  category: string;
  keywords: string[];
}

const TELEGRAM_TAXONOMY_SEED: BonfireTaxonomy[] = [
  {
    name: "Coral Ecology and Functional Restoration",
    description: "Scientific research on coral holobionts, heat-resistant genotypes, and multi-trophic strategies including microfragmentation, probiotics, and mesophotic refugia to prevent functional extinction.",
    category: "scientific_research",
    keywords: ["coral", "holobiont", "genotype", "microfragment", "probiotic", "mesophotic", "refugia", "bleach", "restor", "ecology", "heat", "therma", "symbiodinium", "zooxanth", "polyp"],
  },
  {
    name: "Marine Biotechnology and Omics",
    description: "Molecular biology focusing on CRISPR, multi-omics, and assisted evolution, including research on bioactive compounds (SCRiPs, Galaxin) for pharmaceuticals and gene function validation.",
    category: "scientific_research",
    keywords: ["biotech", "crispr", "omics", "genomic", "evolution", "scrip", "galaxin", "molecular", "pharmac", "gene", "rna", "protein", "bioactive", "sequenc"],
  },
  {
    name: "Decentralized Science (DeSci) and IP-NFTs",
    description: "Blockchain frameworks for managing biodiversity patents, IP-NFTs, and open-access protocols to ensure data transparency, decentralized research funding, and on-chain verification.",
    category: "web3_infrastructure",
    keywords: ["desci", "ip-nft", "ipnft", "nft", "patent", "blockchain", "decentralized", "open-access", "open access", "protocol", "verification", "on-chain", "funding"],
  },
  {
    name: "Regenerative Finance (ReFi) and Blue Economy",
    description: "Market-based conservation using biodiversity credits, tokenized assets, and carbon credits to monetize ecosystem services and support sustainable marine livelihoods.",
    category: "economic_models",
    keywords: ["refi", "blue economy", "biodiversity credit", "carbon credit", "token", "asset", "monetize", "ecosystem services", "livelihood", "market", "credit", "offset", "finance", "fund"],
  },
  {
    name: "Digital Twins and dMRV Systems",
    description: "Integration of AI, IoT, and blockchain for decentralized Monitoring, Reporting, and Verification (dMRV) using virtual replicas, eDNA, and real-time sensors.",
    category: "technology_systems",
    keywords: ["digital twin", "dmrv", "mrv", "iot", "sensor", "edna", "monitor", "report", "verify", "real-time", "data", "ai", "blockchain", "virtual", "replica"],
  },
  {
    name: "DAO Governance and $POLYP Tokenomics",
    description: "Organizational structures for decentralized decision-making, featuring dual-entity legal frameworks, $POLYP tokenomics, and community-driven stewardship models.",
    category: "governance",
    keywords: ["dao", "governance", "polyp", "tokenomics", "token", "vote", "proposal", "stewardship", "decision", "legal", "community", "decentralized", "entity"],
  },
  {
    name: "AI Agents and Knowledge Graphs",
    description: "Human-AI collaboration using agentic workflows (c0ralGPT) and decentralized knowledge graphs to automate data verification, scientific discovery, and information coordination.",
    category: "technology_systems",
    keywords: ["ai agent", "knowledge graph", "c0ralgpt", "coralgpt", "agentic", "workflow", "automate", "discovery", "coordination", "llm", "machine learning", "nlp"],
  },
  {
    name: "Open-Source Hardware and Citizen Science",
    description: "Development of accessible underwater monitoring tools, including CoralAID kits, modular wetlabs, and open-source toolkits for community-led ocean science.",
    category: "community_operations",
    keywords: ["coralaid", "coral aid", "wetlab", "open-source", "open source", "hardware", "citizen science", "underwater", "toolkit", "monitoring", "modular", "community-led"],
  },
  {
    name: "Community Engagement and Cultural Stewardship",
    description: "Fostering stewardship through social media, digital culture (GM/GN), and the integration of arts, music, and ocean literacy to build community cohesion.",
    category: "community_operations",
    keywords: ["community", "social media", "telegram", "discord", "culture", "arts", "music", "ocean literacy", "education", "outreach", "engagement", "stewardship", "cohesion"],
  },
  {
    name: "Global Policy and Strategic Alignment",
    description: "Alignment with international frameworks like the High Seas Treaty and Davos themes, focusing on equitable restoration and global ocean stewardship.",
    category: "governance",
    keywords: ["policy", "high seas", "treaty", "davos", "global", "international", "framework", "equitable", "strategic", "alignment", "ocean stewardship", "conservation policy"],
  },
];

// Live taxonomy cache from Bonfires (refreshed every 60 min)
let liveTaxonomyCache: { taxonomies: BonfireTaxonomy[]; fetchedAt: number } | null = null;

async function fetchLiveTaxonomies(): Promise<BonfireTaxonomy[]> {
  if (liveTaxonomyCache && Date.now() - liveTaxonomyCache.fetchedAt < 60 * 60 * 1000) {
    return liveTaxonomyCache.taxonomies;
  }
  try {
    const res = await fetch(`${BONFIRES_BASE}/api/bonfires/${BONFIRE_ID}`, {
      headers: { "Authorization": `Bearer ${PEPO_API_KEY}`, "x-api-key": PEPO_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return TELEGRAM_TAXONOMY_SEED;
    const data = await res.json() as any;
    const raw = data.latest_taxonomies as any[] || [];
    if (raw.length === 0) return TELEGRAM_TAXONOMY_SEED;

    const merged: BonfireTaxonomy[] = raw.map((t: any) => {
      const seed = TELEGRAM_TAXONOMY_SEED.find(s =>
        s.name.toLowerCase().includes(t.name?.toLowerCase().slice(0, 10))
      );
      return {
        name: t.name || seed?.name || "Knowledge Category",
        description: t.description || seed?.description || "",
        category: t.category || seed?.category || "general",
        keywords: seed?.keywords || [],
      };
    });
    liveTaxonomyCache = { taxonomies: merged, fetchedAt: Date.now() };
    return merged;
  } catch {
    return TELEGRAM_TAXONOMY_SEED;
  }
}

function matchTaxonomies(query: string, taxonomies: BonfireTaxonomy[], maxMatches = 3): BonfireTaxonomy[] {
  const lc = query.toLowerCase();
  const scored = taxonomies.map(t => {
    const score = t.keywords.filter(kw => lc.includes(kw)).length;
    return { t, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, maxMatches).map(({ t }) => t);
}

async function fetchBotKnowledge(query: string): Promise<BonfireTaxonomy[]> {
  // Use seed immediately for fast response; refresh live cache in background
  const seedMatches = matchTaxonomies(query, TELEGRAM_TAXONOMY_SEED);
  // Kick off a background live refresh (non-blocking — updates cache for next call)
  fetchLiveTaxonomies().then(live => {
    if (live !== TELEGRAM_TAXONOMY_SEED) {
      liveTaxonomyCache = { taxonomies: live, fetchedAt: Date.now() };
    }
  }).catch(() => {});
  // If we have a warm cache from a prior live fetch, prefer it
  if (liveTaxonomyCache) {
    return matchTaxonomies(query, liveTaxonomyCache.taxonomies);
  }
  return seedMatches;
}

// ─── Scientific Journal Aggregator ───────────────────────────────────────────

interface JournalPaper {
  title: string;
  journal: string;
  year: number | string;
  abstract: string;
  doi?: string;
  isOA: boolean;
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  if (!invertedIndex || typeof invertedIndex !== "object") return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions as number[]) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(" ");
}

// Coral-reef relevance guard — paper must mention reef/coral science topics
const REEF_RELEVANCE_TERMS = [
  "coral", "reef", "bleach", "symbiodinium", "zooxanthellae", "scleractinian",
  "cnidarian", "calcification", "polyp", "acropora", "porites", "symbiotic algae",
  "marine ecology", "coral restoration", "coral holobiont", "mesophotic",
];

// Hard exclusion: papers clearly about unrelated medical/human biology domains
const REEF_EXCLUSION_TERMS = [
  "human gut", "gut microbiota", "gut microbiome", "intestine", "cancer treatment",
  "human disease", "clinical trial", "patient", "dental", "tooth", "nanoparticle therapy",
  "pharmaceutical drug", "vaccine", "hospital", "lung", "cardiovascular",
];

function isCoralReefRelevant(title: string, abstract: string): boolean {
  const titleLc = title.toLowerCase();
  const abstractLc = abstract.toLowerCase();
  const combined = titleLc + " " + abstractLc;

  // Hard exclusions first
  if (REEF_EXCLUSION_TERMS.some(t => combined.includes(t))) return false;

  // Title must mention a core reef term → strong positive signal
  const titleMatch = REEF_RELEVANCE_TERMS.some(t => titleLc.includes(t));
  if (titleMatch) return true;

  // Abstract must mention reef terms prominently (3+ distinct term types)
  const abstractHits = REEF_RELEVANCE_TERMS.reduce(
    (count, t) => count + (abstractLc.includes(t) ? 1 : 0), 0
  );
  return abstractHits >= 3;
}

function buildCoralReefQuery(userQuery: string): string {
  const terms = extractWikiSearchTerms(userQuery);
  // Always anchor to coral reef context; add user-specific science keywords
  const reefTerms = terms
    .split(" ")
    .filter(w => !["coral", "reef"].includes(w)) // avoid duplicate
    .slice(0, 4)
    .join(" ");
  return reefTerms ? `coral reef ${reefTerms}` : "coral reef";
}

async function fetchOpenAlexPapers(query: string, limit = 12): Promise<JournalPaper[]> {
  const cacheKey = `openalex:${query.slice(0, 80)}`;
  const cached = getCached(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const searchQuery = buildCoralReefQuery(query);
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(searchQuery)}&per-page=${limit}&select=title,abstract_inverted_index,doi,primary_location,publication_year,open_access&sort=cited_by_count:desc`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "PepoThePolyp/1.0 (mesoreefdao.org; mailto:contact@mesoreefdao.org)" },
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const papers: JournalPaper[] = (data.results || [])
      .map((p: any) => {
        const abstract = reconstructAbstract(p.abstract_inverted_index).slice(0, 400);
        return {
          title: p.title || "",
          journal: p.primary_location?.source?.display_name || "Academic Journal",
          year: p.publication_year || "",
          abstract,
          doi: p.doi || "",
          isOA: p.open_access?.is_oa ?? false,
        };
      })
      .filter((p: JournalPaper) => p.title && p.abstract && isCoralReefRelevant(p.title, p.abstract));
    if (papers.length) setCached(cacheKey, JSON.stringify(papers), 15 * 60 * 1000);
    return papers;
  } catch {
    return [];
  }
}

async function fetchEuropePMCPapers(query: string, limit = 5): Promise<JournalPaper[]> {
  const cacheKey = `europepmc:${query.slice(0, 80)}`;
  const cached = getCached(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const searchQuery = buildCoralReefQuery(query);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(searchQuery)}&format=json&pageSize=${limit}&resultType=core&sort=CITED+desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const papers: JournalPaper[] = (data.resultList?.result || [])
      .filter((p: any) => p.abstractText && p.title && isCoralReefRelevant(p.title, p.abstractText))
      .map((p: any) => ({
        title: p.title,
        journal: p.journalTitle || p.source || "Academic Publication",
        year: p.pubYear || "",
        abstract: (p.abstractText || "").slice(0, 400),
        doi: p.doi || "",
        isOA: p.isOpenAccess === "Y",
      }));
    if (papers.length) setCached(cacheKey, JSON.stringify(papers), 15 * 60 * 1000);
    return papers;
  } catch {
    return [];
  }
}

async function fetchJournalKnowledge(query: string): Promise<JournalPaper[]> {
  // Fetch from both sources in parallel, merge and deduplicate by title
  const [oaPapers, pmcPapers] = await Promise.all([
    fetchOpenAlexPapers(query, 4),
    fetchEuropePMCPapers(query, 2),
  ]);

  const seen = new Set<string>();
  const merged: JournalPaper[] = [];
  for (const paper of [...oaPapers, ...pmcPapers]) {
    const key = paper.title.toLowerCase().slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(paper);
    }
  }
  return merged.slice(0, 5);
}

// ─── Reply builder ────────────────────────────────────────────────────────────
async function buildPepoReply(query: string, episodes: any[]): Promise<string> {
  // Fetch all six knowledge sources in parallel
  const [wikiContext, mesoContext, mementoContext, journalPapers, botTaxonomies] = await Promise.all([
    fetchWikipediaContext(query),
    fetchMesoReefContext(query),
    fetchMementoMoriContext(query),
    fetchJournalKnowledge(query),
    fetchBotKnowledge(query),
  ]);

  const top = episodes.slice(0, 3);
  const names = top.map((e: any) => e.name).filter(Boolean);
  const summaries = top
    .map((e: any) => {
      const c = e.content?.content || e.summary || "";
      return c ? c.slice(0, 250).replace(/\s+/g, " ").trim() : "";
    })
    .filter(Boolean);

  let reply = ``;

  // Community knowledge graph results
  if (names.length > 0) {
    reply += `🔬 **Community Knowledge Graph:**\n`;
    names.forEach((name: string, i: number) => {
      reply += `• **${name}**`;
      if (summaries[i]) reply += `\n  ${summaries[i]}...`;
      reply += "\n";
    });
    reply += "\n";
  }

  // @PepothePolyp_bot Telegram taxonomy knowledge
  if (botTaxonomies.length > 0) {
    reply += `🤖 **@PepothePolyp_bot Knowledge (${botTaxonomies.length} topic${botTaxonomies.length > 1 ? "s" : ""}):**\n`;
    botTaxonomies.forEach(tax => {
      const catEmoji: Record<string, string> = {
        scientific_research: "🔬", web3_infrastructure: "⛓️", economic_models: "💱",
        technology_systems: "🛰️", governance: "🏛️", community_operations: "🤝",
      };
      const emoji = catEmoji[tax.category] || "📌";
      reply += `${emoji} **${tax.name}**\n  ${tax.description}\n\n`;
    });
  }

  // Scientific journals section
  if (journalPapers.length > 0) {
    reply += `📚 **Peer-Reviewed Science:**\n`;
    journalPapers.forEach((paper) => {
      const oaBadge = paper.isOA ? " 🔓" : "";
      reply += `• **${paper.title}**${oaBadge}\n`;
      reply += `  _${paper.journal}${paper.year ? `, ${paper.year}` : ""}_\n`;
      if (paper.abstract) reply += `  ${paper.abstract.slice(0, 220)}...\n`;
      if (paper.doi) reply += `  DOI: ${paper.doi}\n`;
      reply += "\n";
    });
  }

  // Wikipedia context
  if (wikiContext) {
    reply += `🌐 **Wikipedia Reference:**\n${wikiContext.slice(0, 500)}...\n\n`;
  }

  // MesoReefDAO context
  if (mesoContext) {
    const relevantLines = mesoContext
      .split("\n")
      .filter(line => {
        const lc = query.toLowerCase();
        return line.toLowerCase().split(" ").some(w => w.length > 4 && lc.includes(w));
      })
      .slice(0, 5)
      .join("\n");
    if (relevantLines.trim()) {
      reply += `🐠 **MesoReefDAO Context:**\n${relevantLines.trim()}\n\n`;
    }
  }

  // Memento Mori context
  if (mementoContext) {
    reply += `🎮 **Memento Mori (DeSci Game):**\n${mementoContext.slice(0, 800)}...\n\n`;
  }

  reply += `🛠️ [github.com/robioreefeco/memento-mori](https://github.com/robioreefeco/memento-mori)`;
  return reply;
}

// ─── Fallback response ────────────────────────────────────────────────────────
const REPO_FOOTER = `\n\n🛠️ [github.com/robioreefeco/memento-mori](https://github.com/robioreefeco/memento-mori)`;

function generatePepoResponse(userMessage: string): string {
  const lc = userMessage.toLowerCase();
  if (lc.includes("coral") || lc.includes("bleach")) {
    return "I'm analyzing the reef knowledge network for coral bleaching data. The MesoAmerican Reef has experienced severe thermal stress events — DHW levels above 8 trigger widespread coral mortality. I track thermally resilient genotypes and mesophotic refugia as key adaptation strategies. Ask me anything specific about bleaching events, DHW metrics, or reef restoration!" + REPO_FOOTER;
  }
  if (lc.includes("dao") || lc.includes("governance") || lc.includes("proposal")) {
    return "MesoReefDAO governs reef conservation through on-chain proposals — transparent funding of Regen Reef projects, wetlab research, IoT monitoring, and biodiversity offsetting. Which governance area would you like to explore?" + REPO_FOOTER;
  }
  if (lc.includes("graph") || lc.includes("node") || lc.includes("knowledge")) {
    return "The Pepo Knowledge Graph holds hundreds of community episodes covering coral ecology, DeSci governance, marine biotechnology, IoT monitoring, and conservation economics. Which quadrant shall we explore?" + REPO_FOOTER;
  }
  if (lc.includes("temperature") || lc.includes("heat") || lc.includes("thermal") || lc.includes("dhw")) {
    return "Sea surface temperatures across the MesoAmerican Reef corridor are monitored in real-time using Marine Degree Heating Weeks (DHW). At 4 DHW bleaching begins; at 8+ DHW widespread mortality occurs. MesoReefDAO integrates IoT sensors and AI to track these thresholds and activate restoration protocols." + REPO_FOOTER;
  }
  if (lc.includes("mesophotic") || lc.includes("deep") || lc.includes("refugia")) {
    return "Mesophotic reefs (40–150m depth) are among MesoReefDAO's key research priorities. These deep reefs remain cooler and may act as thermal refugia — seed banks for thermally resilient coral genotypes. Less studied but critically important for climate adaptation strategies." + REPO_FOOTER;
  }
  if (lc.includes("telegram")) {
    return "You can reach me on Telegram at @PepothePolyp_bot! Click the Telegram Bot link in the sidebar to open our chat directly. I'll send you real-time reef alerts and knowledge graph insights there too." + REPO_FOOTER;
  }
  return "Greetings, Explorer. I am Pepo, your guide to the MesoAmerican Reef knowledge network — powered by the Pepo Knowledge Graph, Wikipedia science, and MesoReefDAO documentation. I can help you explore coral bleaching data, DAO governance, thermal stress events, mesophotic reefs, marine biotechnology, and species distribution. What would you like to explore?" + REPO_FOOTER;
}
