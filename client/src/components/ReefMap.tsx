import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, GeoJSON, CircleMarker, Polyline, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, X, Users, Globe, Layers, Camera } from "lucide-react";
import type { Feature } from "geojson";
import { usePrivy } from "@privy-io/react-auth";

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

// ─── GCRMN 2026 benthos monitoring sites ─────────────────────────────────────
// Source: GCRMN / gcrmndb_benthos synthetic dataset (2026-04)
// https://github.com/GCRMN/gcrmndb_benthos#6-description-of-the-synthetic-dataset
interface GcrmnSite {
  country: string; territory: string;
  lat: number; lon: number;
  sites: number; surveys: number; datasets: number;
  firstYear: number; lastYear: number;
}
export const GCRMN_SITES_2026: GcrmnSite[] = [
  { country:"Antigua and Barbuda", territory:"Antigua and Barbuda",       lat:17.12,  lon:-61.85,  sites:41,    surveys:50,    datasets:2,  firstYear:2003, lastYear:2022 },
  { country:"Aruba",               territory:"Aruba",                     lat:12.52,  lon:-70.0,   sites:6,     surveys:7,     datasets:1,  firstYear:2003, lastYear:2009 },
  { country:"Australia",           territory:"Australia",                  lat:-18.3,  lon:147.7,   sites:2614,  surveys:13110, datasets:13, firstYear:1988, lastYear:2025 },
  { country:"Australia",           territory:"Christmas Island",           lat:-10.5,  lon:105.7,   sites:25,    surveys:84,    datasets:3,  firstYear:2003, lastYear:2023 },
  { country:"Australia",           territory:"Cocos Islands",              lat:-12.2,  lon:96.8,    sites:27,    surveys:85,    datasets:2,  firstYear:1997, lastYear:2023 },
  { country:"Australia",           territory:"Norfolk Island",             lat:-29.0,  lon:167.9,   sites:4,     surveys:19,    datasets:1,  firstYear:2020, lastYear:2025 },
  { country:"Bahamas",             territory:"Bahamas",                    lat:25.0,   lon:-77.4,   sites:542,   surveys:808,   datasets:3,  firstYear:1986, lastYear:2024 },
  { country:"Bahrain",             territory:"Bahrain",                    lat:26.2,   lon:50.6,    sites:45,    surveys:55,    datasets:5,  firstYear:1985, lastYear:2024 },
  { country:"Bangladesh",          territory:"Bangladesh",                  lat:21.9,   lon:89.4,    sites:2,     surveys:2,     datasets:1,  firstYear:2005, lastYear:2006 },
  { country:"Barbados",            territory:"Barbados",                   lat:13.2,   lon:-59.5,   sites:80,    surveys:349,   datasets:3,  firstYear:1982, lastYear:2022 },
  { country:"Belize",              territory:"Belize",                     lat:16.5,   lon:-87.9,   sites:483,   surveys:776,   datasets:7,  firstYear:1985, lastYear:2024 },
  { country:"Brazil",              territory:"Brazil",                     lat:-14.2,  lon:-39.0,   sites:205,   surveys:666,   datasets:5,  firstYear:2002, lastYear:2025 },
  { country:"Brazil",              territory:"Trindade",                   lat:-20.5,  lon:-29.3,   sites:8,     surveys:24,    datasets:1,  firstYear:2009, lastYear:2024 },
  { country:"Brunei",              territory:"Brunei",                     lat:4.9,    lon:114.9,   sites:84,    surveys:103,   datasets:3,  firstYear:1997, lastYear:2024 },
  { country:"Cambodia",            territory:"Cambodia",                   lat:11.1,   lon:103.1,   sites:229,   surveys:484,   datasets:4,  firstYear:1998, lastYear:2024 },
  { country:"China",               territory:"China",                      lat:19.9,   lon:110.4,   sites:179,   surveys:625,   datasets:4,  firstYear:1997, lastYear:2024 },
  { country:"Colombia",            territory:"Colombia",                   lat:9.5,    lon:-76.3,   sites:221,   surveys:711,   datasets:6,  firstYear:1997, lastYear:2024 },
  { country:"Comores",             territory:"Comores",                    lat:-11.7,  lon:43.3,    sites:35,    surveys:94,    datasets:4,  firstYear:1999, lastYear:2022 },
  { country:"Costa Rica",          territory:"Costa Rica",                 lat:9.6,    lon:-84.6,   sites:234,   surveys:478,   datasets:6,  firstYear:1999, lastYear:2025 },
  { country:"Cuba",                territory:"Cuba",                       lat:22.0,   lon:-79.5,   sites:196,   surveys:205,   datasets:3,  firstYear:1999, lastYear:2023 },
  { country:"Curaçao",             territory:"Curaçao",                    lat:12.2,   lon:-69.0,   sites:151,   surveys:444,   datasets:4,  firstYear:1973, lastYear:2023 },
  { country:"Djibouti",            territory:"Djibouti",                   lat:11.8,   lon:43.1,    sites:23,    surveys:23,    datasets:1,  firstYear:2005, lastYear:2008 },
  { country:"Dominica",            territory:"Dominica",                   lat:15.4,   lon:-61.4,   sites:31,    surveys:46,    datasets:2,  firstYear:2004, lastYear:2018 },
  { country:"Dominican Republic",  territory:"Dominican Republic",         lat:18.7,   lon:-69.3,   sites:178,   surveys:516,   datasets:8,  firstYear:1999, lastYear:2024 },
  { country:"East Timor",          territory:"East Timor",                 lat:-8.9,   lon:125.7,   sites:11,    surveys:13,    datasets:2,  firstYear:2004, lastYear:2017 },
  { country:"Ecuador",             territory:"Ecuador",                    lat:-1.0,   lon:-80.5,   sites:43,    surveys:49,    datasets:1,  firstYear:1999, lastYear:2015 },
  { country:"Ecuador",             territory:"Galapagos",                  lat:-0.95,  lon:-91.0,   sites:37,    surveys:249,   datasets:3,  firstYear:1994, lastYear:2024 },
  { country:"Egypt",               territory:"Egypt",                      lat:27.9,   lon:34.5,    sites:216,   surveys:527,   datasets:4,  firstYear:1997, lastYear:2024 },
  { country:"El Salvador",         territory:"El Salvador",                lat:13.5,   lon:-89.8,   sites:9,     surveys:45,    datasets:1,  firstYear:2009, lastYear:2024 },
  { country:"Eritrea",             territory:"Eritrea",                    lat:15.2,   lon:41.8,    sites:2,     surveys:2,     datasets:1,  firstYear:2000, lastYear:2000 },
  { country:"Federal Republic of Somalia", territory:"Federal Republic of Somalia", lat:2.0, lon:45.3, sites:5, surveys:5, datasets:2, firstYear:2005, lastYear:2024 },
  { country:"Fiji",                territory:"Fiji",                       lat:-17.7,  lon:177.4,   sites:654,   surveys:1003,  datasets:12, firstYear:1997, lastYear:2025 },
  { country:"France",              territory:"Collectivity of Saint Martin",lat:18.1,  lon:-63.1,   sites:12,    surveys:83,    datasets:2,  firstYear:2007, lastYear:2022 },
  { country:"France",              territory:"Europa Island",              lat:-22.3,  lon:40.4,    sites:1,     surveys:1,     datasets:1,  firstYear:2002, lastYear:2002 },
  { country:"France",              territory:"French Polynesia",           lat:-17.7,  lon:-149.4,  sites:229,   surveys:2191,  datasets:8,  firstYear:1987, lastYear:2024 },
  { country:"France",              territory:"Guadeloupe",                 lat:16.3,   lon:-61.6,   sites:27,    surveys:209,   datasets:4,  firstYear:2002, lastYear:2024 },
  { country:"France",              territory:"Martinique",                 lat:14.6,   lon:-61.0,   sites:42,    surveys:323,   datasets:3,  firstYear:2001, lastYear:2024 },
  { country:"France",              territory:"Mayotte",                    lat:-12.8,  lon:45.2,    sites:39,    surveys:303,   datasets:2,  firstYear:1998, lastYear:2025 },
  { country:"France",              territory:"New Caledonia",              lat:-20.9,  lon:165.6,   sites:880,   surveys:4121,  datasets:9,  firstYear:1997, lastYear:2025 },
  { country:"France",              territory:"Réunion",                    lat:-21.1,  lon:55.5,    sites:4025,  surveys:4461,  datasets:3,  firstYear:1998, lastYear:2025 },
  { country:"France",              territory:"Saint-Barthélemy",           lat:17.9,   lon:-62.8,   sites:4,     surveys:43,    datasets:2,  firstYear:2002, lastYear:2024 },
  { country:"France",              territory:"Wallis and Futuna",          lat:-13.3,  lon:-176.2,  sites:11,    surveys:22,    datasets:1,  firstYear:2019, lastYear:2024 },
  { country:"Grenada",             territory:"Grenada",                    lat:12.1,   lon:-61.7,   sites:99,    surveys:239,   datasets:4,  firstYear:2004, lastYear:2024 },
  { country:"Guatemala",           territory:"Guatemala",                  lat:14.0,   lon:-91.7,   sites:24,    surveys:49,    datasets:3,  firstYear:2006, lastYear:2023 },
  { country:"Haiti",               territory:"Haiti",                      lat:18.7,   lon:-73.4,   sites:96,    surveys:109,   datasets:2,  firstYear:2003, lastYear:2018 },
  { country:"Haiti",               territory:"Navassa Island",             lat:18.4,   lon:-75.0,   sites:15,    surveys:15,    datasets:1,  firstYear:2012, lastYear:2012 },
  { country:"Honduras",            territory:"Honduras",                   lat:15.9,   lon:-83.8,   sites:405,   surveys:848,   datasets:4,  firstYear:1997, lastYear:2024 },
  { country:"India",               territory:"Andaman and Nicobar",        lat:11.7,   lon:92.7,    sites:29,    surveys:29,    datasets:1,  firstYear:2021, lastYear:2022 },
  { country:"India",               territory:"India",                      lat:10.8,   lon:72.8,    sites:117,   surveys:1745,  datasets:6,  firstYear:1998, lastYear:2024 },
  { country:"Indonesia",           territory:"Indonesia",                  lat:-3.0,   lon:118.0,   sites:726,   surveys:1320,  datasets:5,  firstYear:1987, lastYear:2024 },
  { country:"Iran",                territory:"Iran",                       lat:26.9,   lon:56.2,    sites:46,    surveys:71,    datasets:3,  firstYear:1999, lastYear:2024 },
  { country:"Israel",              territory:"Israel",                     lat:29.5,   lon:34.9,    sites:4,     surveys:4,     datasets:1,  firstYear:1997, lastYear:2001 },
  { country:"Jamaica",             territory:"Jamaica",                    lat:17.9,   lon:-76.8,   sites:308,   surveys:794,   datasets:7,  firstYear:1986, lastYear:2024 },
  { country:"Japan",               territory:"Japan",                      lat:26.5,   lon:127.8,   sites:951,   surveys:8216,  datasets:4,  firstYear:1983, lastYear:2025 },
  { country:"Jordan",              territory:"Jordan",                     lat:29.5,   lon:35.0,    sites:12,    surveys:34,    datasets:2,  firstYear:2008, lastYear:2024 },
  { country:"Kenya",               territory:"Kenya",                      lat:-3.2,   lon:40.1,    sites:158,   surveys:568,   datasets:8,  firstYear:1987, lastYear:2024 },
  { country:"Kiribati",            territory:"Gilbert Islands",            lat:1.4,    lon:173.0,   sites:18,    surveys:18,    datasets:2,  firstYear:2011, lastYear:2018 },
  { country:"Kiribati",            territory:"Line Group",                 lat:2.0,    lon:-157.5,  sites:97,    surveys:125,   datasets:3,  firstYear:2009, lastYear:2023 },
  { country:"Kiribati",            territory:"Phoenix Group",              lat:-4.0,   lon:-171.1,  sites:58,    surveys:123,   datasets:1,  firstYear:2009, lastYear:2018 },
  { country:"Kuwait",              territory:"Kuwait",                     lat:29.1,   lon:48.5,    sites:18,    surveys:27,    datasets:4,  firstYear:1987, lastYear:2014 },
  { country:"Madagascar",          territory:"Madagascar",                 lat:-15.7,  lon:46.4,    sites:121,   surveys:294,   datasets:10, firstYear:1998, lastYear:2024 },
  { country:"Malaysia",            territory:"Malaysia",                   lat:4.5,    lon:114.5,   sites:1351,  surveys:5711,  datasets:5,  firstYear:1987, lastYear:2024 },
  { country:"Maldives",            territory:"Maldives",                   lat:3.2,    lon:73.2,    sites:444,   surveys:822,   datasets:6,  firstYear:1997, lastYear:2024 },
  { country:"Marshall Islands",    territory:"Marshall Islands",           lat:7.1,    lon:171.2,   sites:147,   surveys:174,   datasets:3,  firstYear:2002, lastYear:2020 },
  { country:"Mexico",              territory:"Mexico",                     lat:20.6,   lon:-86.9,   sites:709,   surveys:2321,  datasets:10, firstYear:1997, lastYear:2024 },
  { country:"Micronesia",          territory:"Federated States of Micronesia", lat:6.9, lon:158.2, sites:217,  surveys:555,   datasets:3,  firstYear:2000, lastYear:2020 },
  { country:"Mozambique",          territory:"Mozambique",                 lat:-15.0,  lon:40.4,    sites:162,   surveys:376,   datasets:10, firstYear:1997, lastYear:2024 },
  { country:"Myanmar",             territory:"Myanmar",                    lat:16.0,   lon:97.6,    sites:53,    surveys:62,    datasets:3,  firstYear:1990, lastYear:2025 },
  { country:"Netherlands",         territory:"Bonaire",                    lat:12.2,   lon:-68.3,   sites:165,   surveys:640,   datasets:7,  firstYear:1973, lastYear:2025 },
  { country:"Netherlands",         territory:"Saba",                       lat:17.6,   lon:-63.2,   sites:30,    surveys:68,    datasets:3,  firstYear:1994, lastYear:2024 },
  { country:"Netherlands",         territory:"Sint-Eustatius",             lat:17.5,   lon:-63.0,   sites:37,    surveys:72,    datasets:3,  firstYear:1999, lastYear:2023 },
  { country:"New Zealand",         territory:"Cook Islands",               lat:-21.2,  lon:-159.8,  sites:191,   surveys:246,   datasets:5,  firstYear:2005, lastYear:2023 },
  { country:"New Zealand",         territory:"Niue",                       lat:-19.1,  lon:-169.9,  sites:7,     surveys:7,     datasets:1,  firstYear:2011, lastYear:2011 },
  { country:"Nicaragua",           territory:"Nicaragua",                  lat:12.5,   lon:-83.5,   sites:58,    surveys:77,    datasets:3,  firstYear:2003, lastYear:2015 },
  { country:"Oman",                territory:"Oman",                       lat:22.9,   lon:59.5,    sites:132,   surveys:277,   datasets:12, firstYear:2003, lastYear:2024 },
  { country:"Palau",               territory:"Palau",                      lat:7.5,    lon:134.6,   sites:116,   surveys:425,   datasets:4,  firstYear:1997, lastYear:2024 },
  { country:"Panama",              territory:"Panama",                     lat:8.5,    lon:-82.0,   sites:308,   surveys:480,   datasets:5,  firstYear:1997, lastYear:2024 },
  { country:"Papua New Guinea",    territory:"Papua New Guinea",           lat:-5.5,   lon:144.0,   sites:280,   surveys:536,   datasets:5,  firstYear:1998, lastYear:2025 },
  { country:"Philippines",         territory:"Philippines",                lat:10.3,   lon:123.9,   sites:922,   surveys:1289,  datasets:5,  firstYear:1986, lastYear:2023 },
  { country:"Qatar",               territory:"Qatar",                      lat:25.3,   lon:51.5,    sites:26,    surveys:26,    datasets:4,  firstYear:2014, lastYear:2024 },
  { country:"Republic of Mauritius",territory:"Chagos Archipelago",        lat:-6.3,   lon:71.9,    sites:63,    surveys:224,   datasets:3,  firstYear:2010, lastYear:2023 },
  { country:"Republic of Mauritius",territory:"Republic of Mauritius",     lat:-20.3,  lon:57.5,    sites:10,    surveys:12,    datasets:1,  firstYear:1999, lastYear:2003 },
  { country:"Saint Kitts and Nevis",territory:"Saint Kitts and Nevis",     lat:17.4,   lon:-62.8,   sites:38,    surveys:55,    datasets:2,  firstYear:2004, lastYear:2024 },
  { country:"Saint Lucia",         territory:"Saint Lucia",                lat:13.9,   lon:-61.0,   sites:21,    surveys:61,    datasets:1,  firstYear:1999, lastYear:2014 },
  { country:"Saint Vincent and the Grenadines", territory:"Saint Vincent and the Grenadines", lat:13.3, lon:-61.2, sites:55, surveys:74, datasets:4, firstYear:1999, lastYear:2024 },
  { country:"Samoa",               territory:"Samoa",                      lat:-13.8,  lon:-172.1,  sites:50,    surveys:90,    datasets:4,  firstYear:2012, lastYear:2022 },
  { country:"Saudi Arabia",        territory:"Saudi Arabia",               lat:22.0,   lon:38.0,    sites:179,   surveys:346,   datasets:7,  firstYear:1985, lastYear:2024 },
  { country:"Seychelles",          territory:"Seychelles",                 lat:-4.7,   lon:55.5,    sites:125,   surveys:244,   datasets:4,  firstYear:1994, lastYear:2024 },
  { country:"Singapore",           territory:"Singapore",                  lat:1.3,    lon:103.8,   sites:65,    surveys:362,   datasets:3,  firstYear:1986, lastYear:2024 },
  { country:"Sint-Maarten",        territory:"Sint-Maarten",               lat:18.0,   lon:-63.1,   sites:14,    surveys:61,    datasets:3,  firstYear:1999, lastYear:2024 },
  { country:"Solomon Islands",     territory:"Solomon Islands",            lat:-9.6,   lon:160.2,   sites:190,   surveys:288,   datasets:6,  firstYear:2005, lastYear:2024 },
  { country:"South Africa",        territory:"South Africa",               lat:-27.0,  lon:32.9,    sites:6,     surveys:37,    datasets:2,  firstYear:1993, lastYear:2023 },
  { country:"Sri Lanka",           territory:"Sri Lanka",                  lat:7.5,    lon:81.8,    sites:10,    surveys:32,    datasets:2,  firstYear:2003, lastYear:2024 },
  { country:"Sudan",               territory:"Sudan",                      lat:21.0,   lon:37.1,    sites:86,    surveys:123,   datasets:6,  firstYear:2004, lastYear:2022 },
  { country:"Taiwan",              territory:"Taiwan",                     lat:22.5,   lon:120.5,   sites:186,   surveys:459,   datasets:3,  firstYear:1997, lastYear:2024 },
  { country:"Tanzania",            territory:"Tanzania",                   lat:-7.0,   lon:39.7,    sites:197,   surveys:369,   datasets:14, firstYear:1992, lastYear:2025 },
  { country:"Thailand",            territory:"Thailand",                   lat:9.5,    lon:100.0,   sites:297,   surveys:619,   datasets:4,  firstYear:1988, lastYear:2024 },
  { country:"Tonga",               territory:"Tonga",                      lat:-21.2,  lon:-175.0,  sites:551,   surveys:682,   datasets:8,  firstYear:2002, lastYear:2024 },
  { country:"Trinidad and Tobago", territory:"Trinidad and Tobago",        lat:10.7,   lon:-61.0,   sites:52,    surveys:115,   datasets:3,  firstYear:2007, lastYear:2023 },
  { country:"United Arab Emirates",territory:"Abu musa, Greater and Lesser Tunb", lat:25.9, lon:55.0, sites:7, surveys:7, datasets:1, firstYear:2016, lastYear:2017 },
  { country:"United Arab Emirates",territory:"United Arab Emirates",       lat:24.5,   lon:54.5,    sites:78,    surveys:230,   datasets:13, firstYear:2004, lastYear:2024 },
  { country:"United Kingdom",      territory:"Anguilla",                   lat:18.2,   lon:-63.1,   sites:10,    surveys:132,   datasets:2,  firstYear:2002, lastYear:2023 },
  { country:"United Kingdom",      territory:"Bermuda",                    lat:32.3,   lon:-64.8,   sites:203,   surveys:255,   datasets:2,  firstYear:1982, lastYear:2021 },
  { country:"United Kingdom",      territory:"British Virgin Islands",     lat:18.4,   lon:-64.6,   sites:34,    surveys:328,   datasets:3,  firstYear:1992, lastYear:2024 },
  { country:"United Kingdom",      territory:"Cayman Islands",             lat:19.3,   lon:-81.4,   sites:70,    surveys:227,   datasets:5,  firstYear:1997, lastYear:2024 },
  { country:"United Kingdom",      territory:"Montserrat",                 lat:16.7,   lon:-62.2,   sites:87,    surveys:109,   datasets:2,  firstYear:2005, lastYear:2017 },
  { country:"United Kingdom",      territory:"Pitcairn",                   lat:-25.1,  lon:-130.1,  sites:6,     surveys:12,    datasets:2,  firstYear:2009, lastYear:2023 },
  { country:"United Kingdom",      territory:"Turks and Caicos Islands",   lat:21.8,   lon:-71.8,   sites:91,    surveys:149,   datasets:5,  firstYear:1999, lastYear:2024 },
  { country:"United States",       territory:"American Samoa",             lat:-14.3,  lon:-170.7,  sites:1039,  surveys:1219,  datasets:4,  firstYear:1997, lastYear:2019 },
  { country:"United States",       territory:"Guam",                       lat:13.4,   lon:144.8,   sites:391,   surveys:545,   datasets:4,  firstYear:1997, lastYear:2021 },
  { country:"United States",       territory:"Hawaii",                     lat:20.8,   lon:-156.5,  sites:2019,  surveys:2405,  datasets:4,  firstYear:1997, lastYear:2021 },
  { country:"United States",       territory:"Howland and Baker Islands",  lat:0.8,    lon:-176.6,  sites:150,   surveys:150,   datasets:1,  firstYear:2015, lastYear:2017 },
  { country:"United States",       territory:"Jarvis Island",              lat:-0.4,   lon:-160.0,  sites:222,   surveys:222,   datasets:1,  firstYear:2015, lastYear:2017 },
  { country:"United States",       territory:"Johnston Atoll",             lat:16.7,   lon:-169.5,  sites:46,    surveys:46,    datasets:1,  firstYear:2015, lastYear:2015 },
  { country:"United States",       territory:"Northern Mariana Islands",   lat:15.2,   lon:145.8,   sites:680,   surveys:924,   datasets:3,  firstYear:1999, lastYear:2020 },
  { country:"United States",       territory:"Palmyra Atoll",              lat:5.9,    lon:-162.1,  sites:194,   surveys:298,   datasets:2,  firstYear:2009, lastYear:2019 },
  { country:"United States",       territory:"Puerto Rico",                lat:18.4,   lon:-66.1,   sites:2985,  surveys:3296,  datasets:8,  firstYear:1982, lastYear:2024 },
  { country:"United States",       territory:"United States",              lat:24.6,   lon:-81.7,   sites:2038,  surveys:5283,  datasets:13, firstYear:1984, lastYear:2024 },
  { country:"United States",       territory:"United States Virgin Islands",lat:18.3,  lon:-64.9,   sites:5885,  surveys:6878,  datasets:10, firstYear:1982, lastYear:2024 },
  { country:"United States",       territory:"Wake Island",                lat:19.3,   lon:166.6,   sites:146,   surveys:146,   datasets:1,  firstYear:2014, lastYear:2017 },
  { country:"Vanuatu",             territory:"Vanuatu",                    lat:-15.4,  lon:166.9,   sites:75,    surveys:114,   datasets:3,  firstYear:2004, lastYear:2023 },
  { country:"Venezuela",           territory:"Venezuela",                  lat:12.0,   lon:-70.3,   sites:50,    surveys:57,    datasets:3,  firstYear:1999, lastYear:2018 },
  { country:"Vietnam",             territory:"Vietnam",                    lat:15.0,   lon:108.5,   sites:278,   surveys:705,   datasets:3,  firstYear:1998, lastYear:2024 },
  { country:"Yemen",               territory:"Yemen",                      lat:14.5,   lon:43.0,    sites:6,     surveys:12,    datasets:3,  firstYear:1999, lastYear:2017 },
];

// Pre-compute totals once
const GCRMN_TOTALS = GCRMN_SITES_2026.reduce(
  (acc, s) => ({ sites: acc.sites + s.sites, surveys: acc.surveys + s.surveys }),
  { sites: 0, surveys: 0 }
);

function gcrmnSiteRadius(surveys: number): number {
  return Math.max(4, Math.min(22, Math.sqrt(surveys) * 0.55));
}

// ─── GCRMN site popup ─────────────────────────────────────────────────────────
function GcrmnSitePopup({ site }: { site: GcrmnSite }) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", minWidth: 170, maxWidth: 210 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "#A6CE39", marginBottom: 3, lineHeight: 1.3 }}>
        🪸 {site.territory}
      </div>
      <div style={{ fontSize: 9.5, color: "#888", marginBottom: 6 }}>{site.country}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", marginBottom: 6 }}>
        {[
          ["Sites",    site.sites.toLocaleString()],
          ["Surveys",  site.surveys.toLocaleString()],
          ["Datasets", site.datasets.toString()],
          ["Period",   `${site.firstYear}–${site.lastYear}`],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 8, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#d4e9f3" }}>{v}</div>
          </div>
        ))}
      </div>
      <a
        href="https://github.com/GCRMN/gcrmndb_benthos#6-description-of-the-synthetic-dataset"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 9, color: "#A6CE39", textDecoration: "none", display: "block",
          border: "1px solid #A6CE3944", borderRadius: 4, padding: "2px 6px", textAlign: "center" }}
      >
        ↗ GCRMN gcrmndb_benthos
      </a>
    </div>
  );
}

// ─── Custom coral-teal member pin ─────────────────────────────────────────────
function makePin() {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#83eef0;
      border:2.5px solid #83eef0;
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

// ─── Fix Leaflet map sizing when rendered inside portals / flex containers ────
// Leaflet calculates map dimensions synchronously on mount, before the browser
// has finished applying CSS flex layout.  A short setTimeout gives the layout
// engine one tick to settle, then tells Leaflet to re-measure.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => { map.invalidateSize(); }, 50);
    return () => clearTimeout(t);
  }, [map]);
  return null;
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

/** Toggles .gcrmn-labels-on on the map container when zoom ≥ minZoom so that
 *  permanent GCRMN site labels (class gcrmn-perm) become visible via CSS. */
function GcrmnZoomWatcher({ enabled, minZoom = 5 }: { enabled: boolean; minZoom?: number }) {
  const map = useMap();
  const update = useCallback(() => {
    const c = map.getContainer();
    const show = enabled && map.getZoom() >= minZoom;
    c.classList.toggle("gcrmn-labels-on", show);
  }, [map, enabled, minZoom]);
  useMapEvents({ zoomend: update });
  useEffect(() => { update(); }, [update]);
  return null;
}

function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (b: L.LatLngBounds) => void }) {
  const map = useMap();
  useEffect(() => { onBoundsChange(map.getBounds()); }, [map]);
  useMapEvents({ moveend: () => onBoundsChange(map.getBounds()), zoomend: () => onBoundsChange(map.getBounds()) });
  return null;
}

// ─── Map tools helpers ────────────────────────────────────────────────────────
function haversineDist(a: L.LatLng, b: L.LatLng): number {
  return a.distanceTo(b) / 1000; // km
}
function polygonAreaKm2(pts: L.LatLng[]): number {
  if (pts.length < 3) return 0;
  const R = 6371;
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = pts[i].lng * Math.PI / 180;
    const yi = pts[i].lat * Math.PI / 180;
    const xj = pts[j].lng * Math.PI / 180;
    const yj = pts[j].lat * Math.PI / 180;
    area += (xj - xi) * (Math.sin(yi) + Math.sin(yj));
  }
  return Math.abs(area * R * R / 2);
}

type MapTool = 'points' | 'lines' | 'areas' | 'import' | 'settings';

function MapToolHandler({ activeTool, onMapClick }: {
  activeTool: MapTool | null;
  onMapClick: (latlng: L.LatLng) => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.getContainer().style.cursor =
      activeTool === 'points' || activeTool === 'lines' || activeTool === 'areas'
        ? 'crosshair' : '';
  }, [map, activeTool]);
  useMapEvents({
    click: e => {
      if (activeTool === 'points' || activeTool === 'lines' || activeTool === 'areas') {
        onMapClick(e.latlng);
      }
    },
  });
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
  points: number;
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

// ─── WDPA GetFeatureInfo click handler (wdpar data pipeline in the browser) ──
// Calls Protected Planet WMS GetFeatureInfo on click to retrieve real WDPA
// attributes: PA name, IUCN category, marine status, area, designation year.
// Falls back silently if CORS is not configured on the WMS server.
function WdparClickHandler({ active }: { active: boolean }) {
  const map = useMap();

  useMapEvents({
    click: async (e) => {
      if (!active) return;

      const bounds  = map.getBounds();
      const size    = map.getSize();
      const point   = map.latLngToContainerPoint(e.latlng);

      const bbox = [
        bounds.getWest(), bounds.getSouth(),
        bounds.getEast(), bounds.getNorth(),
      ].join(",");

      const params = new URLSearchParams({
        SERVICE:      "WMS",
        VERSION:      "1.1.1",
        REQUEST:      "GetFeatureInfo",
        LAYERS:       "wdpa:wdpa_marine_poly",
        QUERY_LAYERS: "wdpa:wdpa_marine_poly",
        INFO_FORMAT:  "application/json",
        FEATURE_COUNT:"1",
        X:            String(Math.round(point.x)),
        Y:            String(Math.round(point.y)),
        WIDTH:        String(size.x),
        HEIGHT:       String(size.y),
        BBOX:         bbox,
        SRS:          "EPSG:4326",
      });

      try {
        const res = await fetch(
          `https://maps.protectedplanet.net/geoserver/wms?${params}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) return;
        const data = await res.json();
        const features = data?.features;
        if (!features?.length) return;

        const p = features[0].properties ?? {};
        const marineLabel =
          p.MARINE === "2" ? "Wholly marine" :
          p.MARINE === "1" ? "Partially marine" : String(p.MARINE ?? "");
        const areaFmt = p.REP_AREA
          ? `${Number(p.REP_AREA).toLocaleString()} km²` : "-";
        const iucn   = p.IUCN_CAT || "-";
        const name   = p.NAME || "Marine Protected Area";
        const desig  = p.DESIG_ENG || p.DESIG || "-";
        const yr     = p.STATUS_YR || "-";
        const wdpaid = p.WDPAID || "-";

        const html = `
          <div style="font-family:Inter,sans-serif;font-size:11.5px;min-width:170px;max-width:240px;color:#d4e9f3">
            <div style="font-weight:800;color:#00b894;font-size:12.5px;margin-bottom:5px;line-height:1.3">${name}</div>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="color:#888;padding:1px 6px 1px 0;font-size:10px">IUCN category</td><td style="font-weight:700;color:#55efc4">${iucn}</td></tr>
              <tr><td style="color:#888;padding:1px 6px 1px 0;font-size:10px">Marine status</td><td>${marineLabel}</td></tr>
              <tr><td style="color:#888;padding:1px 6px 1px 0;font-size:10px">Reported area</td><td>${areaFmt}</td></tr>
              <tr><td style="color:#888;padding:1px 6px 1px 0;font-size:10px">Designation</td><td style="font-size:10px">${desig}</td></tr>
              <tr><td style="color:#888;padding:1px 6px 1px 0;font-size:10px">Year</td><td>${yr}</td></tr>
            </table>
            <div style="margin-top:5px;font-size:8.5px;color:#666;border-top:1px solid rgba(131,238,240,0.12);padding-top:4px">
              WDPA ID ${wdpaid} · Source: UNEP-WCMC &amp; IUCN (2026) · Protected Planet
            </div>
          </div>`;

        L.popup({ maxWidth: 260, className: "wdpar-popup" })
          .setLatLng(e.latlng)
          .setContent(html)
          .openOn(map);
      } catch {
        // CORS or network error — silent fail, WMS tiles continue to render
      }
    },
  });

  return null;
}

// ─── Copernicus Marine layer config ──────────────────────────────────────────
const CMS_DATASET = "cmems_obs-oc_glo_bgc-plankton_my_l4-multi-4km_P1M_202603";
const CMS_PRODUCT = "OCEANCOLOUR_GLO_BGC_L4_MY_009_104";
const CMS_MIN_YM  = "1997-09";
const CMS_MAX_YM  = "2026-03";

// Ocean-color optics / transparency datasets (same product, different dataset IDs)
const CMS_DS_OPTICS = "cmems_obs-oc_glo_bgc-optics_my_l4-multi-4km_P1M_202603";
const CMS_DS_TRANSP = "cmems_obs-oc_glo_bgc-transp_my_l4-multi-4km_P1M_202603";

const CMS_LAYERS = [
  // ── Phytoplankton (plankton dataset) ─────────────────────────────────────
  { var: "CHL",     label: "Chlorophyll-a",        unit: "mg m⁻³",      color: "#00b894", cmap: "algae"   },
  { var: "DIATO",   label: "Diatoms",               unit: "mg m⁻³",      color: "#e17055", cmap: "matter"  },
  { var: "DINO",    label: "Dinoflagellates",        unit: "mg m⁻³",      color: "#d63031", cmap: "plasma"  },
  { var: "GREEN",   label: "Green Algae",           unit: "mg m⁻³",      color: "#55efc4", cmap: "dense"   },
  { var: "HAPTO",   label: "Haptophytes",           unit: "mg m⁻³",      color: "#a29bfe", cmap: "ice"     },
  { var: "MICRO",   label: "Microphytoplankton",    unit: ">20 µm",      color: "#fdcb6e", cmap: "thermal" },
  { var: "NANO",    label: "Nanophytoplankton",     unit: "2–20 µm",     color: "#fd79a8", cmap: "tempo"   },
  { var: "PICO",    label: "Picophytoplankton",     unit: "<2 µm",       color: "#74b9ff", cmap: "solar"   },
  { var: "PROCHLO", label: "Prochlorococcus",       unit: "mg m⁻³",      color: "#26de81", cmap: "speed"   },
  { var: "PROKAR",  label: "Prokaryotes",           unit: "mg m⁻³",      color: "#6c5ce7", cmap: "deep"    },
  // ── Optics (light attenuation / transparency) ────────────────────────────
  { var: "KD490",   label: "Light Attenuation",     unit: "m⁻¹",         color: "#0984e3", cmap: "matter",  dataset: CMS_DS_OPTICS },
  { var: "ZSD",     label: "Secchi Depth",          unit: "m",           color: "#00cec9", cmap: "deep",    dataset: CMS_DS_OPTICS },
  { var: "BBP",     label: "Particle Backscatter",  unit: "m⁻¹",         color: "#6c5ce7", cmap: "amp",     dataset: CMS_DS_OPTICS },
  // ── Transparency / particles ──────────────────────────────────────────────
  { var: "SPM",     label: "Suspended Particles",   unit: "g m⁻³",       color: "#e67e22", cmap: "turbid",  dataset: CMS_DS_TRANSP },
] as const;
type CmsVar = (typeof CMS_LAYERS)[number]["var"];

function cmsMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m,10)-1] + " " + y;
}
function cmsNavMonth(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  let nm = m + delta, ny = y;
  if (nm > 12) { nm -= 12; ny++; }
  if (nm < 1)  { nm += 12; ny--; }
  const r = `${ny}-${String(nm).padStart(2,"0")}`;
  return r < CMS_MIN_YM ? CMS_MIN_YM : r > CMS_MAX_YM ? CMS_MAX_YM : r;
}
// Convert "YYYY-MM" ↔ zero-based slider index (0 = CMS_MIN_YM)
function ymToIndex(yyyymm: string): number {
  const [y, m] = yyyymm.split("-").map(Number);
  const [y0, m0] = CMS_MIN_YM.split("-").map(Number);
  return (y - y0) * 12 + (m - m0);
}
function indexToYm(idx: number): string {
  const [y0, m0] = CMS_MIN_YM.split("-").map(Number);
  const abs = (y0 - 1) * 12 + (m0 - 1) + idx;
  const y = Math.floor(abs / 12) + 1;
  const m = abs % 12 + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
const CMS_TOTAL_MONTHS = ymToIndex(CMS_MAX_YM); // 342
function buildCmsTileUrl(v: CmsVar, cmap: string, yyyymm: string, dataset = CMS_DATASET): string {
  return (
    "https://wmts.marine.copernicus.eu/teroWmts" +
    "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
    `&LAYER=${encodeURIComponent(CMS_PRODUCT + "/" + dataset + "/" + v)}` +
    `&STYLE=${encodeURIComponent("cmap:" + cmap)}` +
    "&FORMAT=image%2Fpng&TILEMATRIXSET=EPSG%3A3857" +
    "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}" +
    `&TIME=${encodeURIComponent(yyyymm + "-01T00:00:00Z")}`
  );
}

// ─── Live Ocean State layers ──────────────────────────────────────────────────
// Products: PHY_001_024 · BGC_001_028 · WAV_001_027 · MULTIOBS_015_012
//           SEALEVEL_008_047 · WIND_L4_NRT · SST NRT
type LiveLayer = {
  var: string;
  wmtsVar?: string;   // actual CMEMS variable name when it differs from var
  label: string; unit: string; color: string; cmap: string;
  product: string; dataset: string; elevation: number | null;
  time: () => string; toolboxId: string;
  group: string;
  // Dataset metadata shown in the metrics card
  productTitle: string;
  resolution: string;
  cadence: string;
  depthRange: string;
  coverage: string;
};
type LiveVar =
  | "thetao" | "so" | "sea_water_velocity" | "zos" | "siconc"
  | "mlotst" | "bottomT" | "sithick"
  | "analysed_sst"
  | "to_obs" | "ugo"
  | "adt" | "sla"
  | "VHM0" | "VTPK" | "VMDR" | "wind"
  | "ph" | "o2" | "phyc" | "nppv" | "no3" | "po4" | "si" | "fe" | "zooc" | "zeu"
  | "spco2" | "talk" | "dissic";

function liveDate(daysBack: number, hour = "00:00:00"): string {
  const d = new Date(); d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10) + "T" + hour + "Z";
}

const PHY      = "GLOBAL_ANALYSISFORECAST_PHY_001_024";
const BGC      = "GLOBAL_ANALYSISFORECAST_BGC_001_028";
const SST      = "SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001";
const WAV      = "GLOBAL_ANALYSISFORECAST_WAV_001_027";
const WND      = "WIND_GLO_PHY_L4_NRT_012_004";
const MULTIOBS = "MULTIOBS_GLO_PHY_TSUV_3D_MYNRT_015_012";
const SEALEVEL = "SEALEVEL_GLO_PHY_L4_MY_008_047";

const LIVE_LAYERS: LiveLayer[] = [
  // ── SST NRT ────────────────────────────────────────────────────────────────
  { var: "analysed_sst",      label: "Sea Surface Temp.",   unit: "°C · NRT daily",           color: "#ff6b6b", cmap: "thermal",
    product: SST, dataset: "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2",
    elevation: null,   time: () => liveDate(2),              toolboxId: SST,                                   group: "SST NRT",
    productTitle: "OSTIA Global SST (Met Office · CMEMS)", resolution: "0.05° · 6 km", cadence: "Daily · NRT observations", depthRange: "Surface", coverage: "Global · 1981–NRT" },
  // ── Ocean Physics — Model (PHY_001_024) ───────────────────────────────────
  { var: "thetao",            label: "Temperature",         unit: "°C · 6H · 0.5 m",          color: "#e17055", cmap: "thermal",
    product: PHY, dataset: "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i_202406",
    elevation: -0.494, time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i_202406", group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "6-hourly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "so",                label: "Salinity",            unit: "PSU · 6H · 0.5 m",          color: "#a29bfe", cmap: "haline",
    product: PHY, dataset: "cmems_mod_glo_phy-so_anfc_0.083deg_PT6H-i_202406",
    elevation: -0.494, time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy-so_anfc_0.083deg_PT6H-i_202406",    group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "6-hourly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "sea_water_velocity",label: "Currents",            unit: "m s⁻¹ · hourly · 0.5 m",   color: "#00cec9", cmap: "speed",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",
    elevation: -0.494, time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",       group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "Hourly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "zos",               label: "SSH · Model",         unit: "m · hourly forecast",        color: "#74b9ff", cmap: "balance",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",
    elevation: null,   time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",       group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "Hourly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "siconc",            label: "Sea Ice",             unit: "fraction · daily",            color: "#dfe6e9", cmap: "ice",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",
    elevation: null,   time: () => liveDate(2),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",        group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "Daily forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  // ── Multi-observation Physics — ARMOR3D (MULTIOBS_015_012) ────────────────
  { var: "to_obs", wmtsVar: "to", label: "Temp. (Obs.)",   unit: "°C · weekly multi-obs",     color: "#fab1a0", cmap: "thermal",
    product: MULTIOBS, dataset: "dataset-armor-3d-nrt-weekly",
    elevation: -0.494, time: () => liveDate(7),              toolboxId: "dataset-armor-3d-nrt-weekly",                         group: "Observation · Multi-sensor",
    productTitle: "ARMOR3D Multi-Observation Physics (NRT)", resolution: "1/4° · ~25 km", cadence: "Weekly · multi-obs fusion", depthRange: "0–5500 m · 33 levels", coverage: "Global · NRT" },
  { var: "ugo",               label: "Geostr. Velocity",   unit: "m s⁻¹ · weekly obs",         color: "#55efc4", cmap: "speed",
    product: MULTIOBS, dataset: "dataset-armor-3d-nrt-weekly",
    elevation: -0.494, time: () => liveDate(7),              toolboxId: "dataset-armor-3d-nrt-weekly",                         group: "Observation · Multi-sensor",
    productTitle: "ARMOR3D Multi-Observation Physics (NRT)", resolution: "1/4° · ~25 km", cadence: "Weekly · multi-obs fusion", depthRange: "0–5500 m · 33 levels", coverage: "Global · NRT" },
  // ── Sea Level Altimetry (SEALEVEL_008_047) ────────────────────────────────
  { var: "adt",               label: "Abs. Sea Level",     unit: "m · L4 altimetry daily",     color: "#0984e3", cmap: "balance",
    product: SEALEVEL, dataset: "cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D",
    elevation: null,   time: () => liveDate(3),              toolboxId: SEALEVEL,                                              group: "Sea Level Altimetry",
    productTitle: "DUACS Altimetry Sea Level — Multimission L4", resolution: "1/8° · ~14 km", cadence: "Daily · multi-satellite", depthRange: "Surface", coverage: "Global · 1993–present" },
  { var: "sla",               label: "Sea Level Anomaly",  unit: "m · L4 altimetry daily",     color: "#6c5ce7", cmap: "diff",
    product: SEALEVEL, dataset: "cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D",
    elevation: null,   time: () => liveDate(3),              toolboxId: SEALEVEL,                                              group: "Sea Level Altimetry",
    productTitle: "DUACS Altimetry Sea Level — Multimission L4", resolution: "1/8° · ~14 km", cadence: "Daily · multi-satellite", depthRange: "Surface", coverage: "Global · 1993–present" },
  // ── Wave & Wind (WAV_001_027 + WIND_L4_NRT) ──────────────────────────────
  { var: "VHM0",              label: "Wave Height",        unit: "m · 3H forecast",             color: "#6c5ce7", cmap: "matter",
    product: WAV, dataset: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
    elevation: null,   time: () => liveDate(1, "03:00:00"), toolboxId: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",       group: "Wave & Wind",
    productTitle: "Global Ocean Waves Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "3-hourly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "VTPK",              label: "Peak Wave Period",   unit: "s · 3H forecast",             color: "#81ecec", cmap: "ice",
    product: WAV, dataset: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
    elevation: null,   time: () => liveDate(1, "03:00:00"), toolboxId: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",       group: "Wave & Wind",
    productTitle: "Global Ocean Waves Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "3-hourly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "VMDR",              label: "Wave Direction",     unit: "deg · 3H forecast",           color: "#b2bec3", cmap: "phase",
    product: WAV, dataset: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
    elevation: null,   time: () => liveDate(1, "03:00:00"), toolboxId: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",       group: "Wave & Wind",
    productTitle: "Global Ocean Waves Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "3-hourly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "wind",              label: "Wind Speed",         unit: "m s⁻¹ · hourly NRT",         color: "#fdcb6e", cmap: "speed",
    product: WND, dataset: "cmems_obs-wind_glo_phy_nrt_l4_0.125deg_PT1H_202207",
    elevation: null,   time: () => "2023-11-20T00:00:00Z",  toolboxId: "cmems_obs-wind_glo_phy_nrt_l4_0.125deg_PT1H_202207", group: "Wave & Wind",
    productTitle: "Global Ocean Wind L4 NRT (Copernicus)", resolution: "1/8° · ~14 km", cadence: "Hourly · NRT obs", depthRange: "10 m above sea level", coverage: "Global · 2007–NRT" },
  // ── Ocean BGC — Model (BGC_001_028) ───────────────────────────────────────
  { var: "ph",                label: "Acidity (pH)",       unit: "pH · monthly",               color: "#fd79a8", cmap: "ice",
    product: BGC, dataset: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "o2",                label: "Oxygen",             unit: "mmol m⁻³ · monthly",         color: "#55efc4", cmap: "dense",
    product: BGC, dataset: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "phyc",              label: "Biomass",            unit: "mgC m⁻³ · monthly",          color: "#26de81", cmap: "amp",
    product: BGC, dataset: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "nppv",              label: "Primary Production", unit: "mgC m⁻³ d⁻¹ · monthly",     color: "#00b894", cmap: "algae",
    product: BGC, dataset: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "no3",               label: "Nitrate",            unit: "mmol m⁻³ · monthly",         color: "#fd9644", cmap: "matter",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "po4",               label: "Phosphate",          unit: "mmol m⁻³ · monthly",         color: "#a29bfe", cmap: "tempo",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "si",                label: "Silicate",              unit: "mmol m⁻³ · monthly",         color: "#74b9ff", cmap: "deep",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "fe",                label: "Dissolved Iron",        unit: "µmol m⁻³ · monthly",         color: "#e17055", cmap: "amp",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "zooc",              label: "Zooplankton Carbon",    unit: "mgC m⁻³ · monthly",           color: "#f9ca24", cmap: "solar",
    product: BGC, dataset: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "zeu",               label: "Euphotic Zone Depth",   unit: "m · monthly",                 color: "#00b4d8", cmap: "dense",
    product: BGC, dataset: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  // ── Blue Ocean — Mixed Layer & Ice extras (PHY_001_024) ──────────────────
  { var: "mlotst",            label: "Mixed Layer Depth",     unit: "m · daily",                   color: "#0984e3", cmap: "matter",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",
    elevation: null,   time: () => liveDate(2),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",       group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "Daily forecast", depthRange: "Surface (derived)", coverage: "Global · 2019–NRT" },
  { var: "bottomT",           label: "Sea Floor Temp.",       unit: "°C · 6H forecast",            color: "#e67e22", cmap: "thermal",
    product: PHY, dataset: "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i_202406",
    elevation: null,   time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i_202406", group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "6-hourly forecast", depthRange: "Sea floor", coverage: "Global · 2019–NRT" },
  { var: "sithick",           label: "Sea Ice Thickness",     unit: "m · daily",                   color: "#b2d8f7", cmap: "ice",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",
    elevation: null,   time: () => liveDate(2),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",       group: "Physics Forecast",
    productTitle: "Global Ocean Physics Analysis and Forecast", resolution: "1/12° · ~9 km", cadence: "Daily forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  // ── Carbon System (BGC_001_028 · carbon dataset) ─────────────────────────
  { var: "spco2",             label: "Surface pCO₂",          unit: "µatm · monthly",              color: "#e84393", cmap: "matter",
    product: BGC, dataset: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",    group: "Carbon System",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "Surface", coverage: "Global · 2019–NRT" },
  { var: "talk",              label: "Total Alkalinity",      unit: "mmol m⁻³ · monthly",          color: "#48cae4", cmap: "deep",
    product: BGC, dataset: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",    group: "Carbon System",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
  { var: "dissic",            label: "Diss. Inorg. Carbon",   unit: "mmol m⁻³ · monthly",          color: "#90e0ef", cmap: "ice",
    product: BGC, dataset: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",    group: "Carbon System",
    productTitle: "Global Ocean Biogeochemistry Analysis and Forecast", resolution: "1/4° · ~25 km", cadence: "Monthly forecast", depthRange: "0–5727 m · 50 levels", coverage: "Global · 2019–NRT" },
];

const LIVE_GROUPS = [
  "SST NRT", "Physics Forecast", "Observation · Multi-sensor",
  "Sea Level Altimetry", "Wave & Wind", "BGC Forecast", "Carbon System",
] as const;

// Simplified 500 m-interval depth steps for the compact selector (positive metres)
const COMPACT_DEPTH_STEPS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500] as const;

// Standard CMEMS depth levels (metres, negative = below surface) — ARMOR3D / PHY 33-level grid
const DEPTH_LEVELS = [
  -0.494, -1.541, -2.646, -3.819, -5.078, -6.440, -7.929,
  -9.573, -11.405, -13.467, -15.810, -18.495, -21.599, -25.211,
  -29.444, -34.434, -40.344, -47.374, -55.764, -65.807, -77.854,
  -92.326, -109.729, -130.666, -155.851, -186.126, -222.475, -266.040,
  -318.127, -380.213, -453.938, -541.089, -643.567,
] as const;

function depthLabel(m: number): string {
  const a = Math.abs(m);
  if (a < 2) return "Surface";
  if (a < 10) return `${a.toFixed(1)} m`;
  if (a < 1000) return `${Math.round(a)} m`;
  return `${(a / 1000).toFixed(1)} km`;
}

// Return the first date for the timeline based on product group
function liveTimelineMin(group: string): string {
  if (group === "Sea Level Altimetry" || group === "Observation · Multi-sensor") return "1993-01-01";
  return "2019-01-01";
}

function buildLiveTileUrl(layer: LiveLayer, timeOverride?: string, elevOverride?: number | null): string {
  const time = timeOverride ?? layer.time();
  const elev = elevOverride !== undefined ? elevOverride : layer.elevation;
  return (
    "https://wmts.marine.copernicus.eu/teroWmts" +
    "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
    `&LAYER=${encodeURIComponent(layer.product + "/" + layer.dataset + "/" + (layer.wmtsVar ?? layer.var))}` +
    `&STYLE=${encodeURIComponent("cmap:" + layer.cmap)}` +
    "&FORMAT=image%2Fpng&TILEMATRIXSET=EPSG%3A3857" +
    "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}" +
    `&TIME=${encodeURIComponent(time)}` +
    (elev != null ? `&ELEVATION=${elev}` : "")
  );
}

// CSS gradient approximations for cmocean colormaps (left = min value, right = max value)
const CMAP_CSS: Record<string, string> = {
  thermal: "linear-gradient(90deg,#042333 0%,#2c3e50 15%,#31688e 28%,#35b779 45%,#fde725 65%,#f8a200 80%,#ff4500 92%,#7a0000 100%)",
  haline:  "linear-gradient(90deg,#2a186c 0%,#1a4d8e 20%,#177b8a 38%,#36b07a 58%,#acd66a 78%,#fde725 100%)",
  speed:   "linear-gradient(90deg,#f5f5f0 0%,#c8e6f2 15%,#6dccea 32%,#2bc573 52%,#f0d000 72%,#e86000 87%,#7a0000 100%)",
  balance: "linear-gradient(90deg,#1a3a6a 0%,#4a7fc2 20%,#92b9dc 42%,#f5f5f5 50%,#e08080 58%,#c04040 80%,#6a1a1a 100%)",
  diff:    "linear-gradient(90deg,#1a5276 0%,#2e86c1 25%,#aed6f1 45%,#f5f5f5 50%,#f1948a 55%,#c0392b 75%,#7b241c 100%)",
  ice:     "linear-gradient(90deg,#041d38 0%,#08306b 20%,#2171b5 42%,#74c1e8 65%,#c8e4f5 85%,#f0f7ff 100%)",
  matter:  "linear-gradient(90deg,#fdfecc 0%,#f9c62a 25%,#f07920 52%,#c62a2f 77%,#500d4b 100%)",
  amp:     "linear-gradient(90deg,#f4f1e8 0%,#dab68b 30%,#b57a3a 55%,#843905 77%,#500000 100%)",
  algae:   "linear-gradient(90deg,#d7f5e4 0%,#8dcbad 28%,#4a9874 52%,#1e6b47 77%,#053322 100%)",
  dense:   "linear-gradient(90deg,#e6f0ff 0%,#9ab8e0 30%,#4b7ab8 55%,#1e3d6e 80%,#051524 100%)",
  tempo:   "linear-gradient(90deg,#fff4f0 0%,#f7b7a0 30%,#e56b4c 55%,#a82c1a 80%,#5b0e0a 100%)",
  deep:    "linear-gradient(90deg,#fdfdd9 0%,#d6d67a 25%,#5b9b5b 52%,#1a5c8a 77%,#0d0d4d 100%)",
  phase:   "linear-gradient(90deg,#a777b5 0%,#e87a7a 25%,#f0d870 50%,#7ab870 75%,#4878c0 100%)",
  solar:   "linear-gradient(90deg,#3c1518 0%,#7c2714 20%,#c0521a 42%,#e8902e 62%,#f9d06a 82%,#ffffd4 100%)",
  plasma:  "linear-gradient(90deg,#0d0887 0%,#5b02a3 20%,#a82296 42%,#dc3b76 62%,#f77c52 80%,#fdca26 100%)",
  turbid:  "linear-gradient(90deg,#e8f5e0 0%,#c3d98a 28%,#a8a640 52%,#956c18 77%,#543005 100%)",
};

// Approximate scientific value ranges [min, max, unit] per live layer variable
const LAYER_VALUE_RANGES: Record<string, [number, number, string]> = {
  analysed_sst:       [-2,   32,   "°C"],
  thetao:             [-2,   32,   "°C"],
  to_obs:             [-2,   32,   "°C"],
  so:                 [30,   40,   "PSU"],
  sea_water_velocity: [0,    1.5,  "m/s"],
  ugo:                [0,    1.5,  "m/s"],
  zos:                [-1.5, 1.5,  "m"],
  adt:                [-1.5, 1.5,  "m"],
  sla:                [-0.3, 0.3,  "m"],
  siconc:             [0,    1,    ""],
  VHM0:               [0,    8,    "m"],
  VTPK:               [0,    30,   "s"],
  VMDR:               [0,    360,  "°"],
  wind:               [0,    20,   "m/s"],
  ph:                 [7.8,  8.3,  "pH"],
  o2:                 [0,    350,  "mmol/m³"],
  phyc:               [0,    10,   "mgC/m³"],
  nppv:               [0,    50,   "mgC/m³·d"],
  no3:                [0,    50,   "mmol/m³"],
  po4:                [0,    3,    "mmol/m³"],
  si:                 [0,    80,   "mmol/m³"],
  fe:                 [0,    1,    "µmol/m³"],
  zooc:               [0,    5,    "mgC/m³"],
  zeu:                [0,    200,  "m"],
  mlotst:             [0,    300,  "m"],
  bottomT:            [-2,   30,   "°C"],
  sithick:            [0,    4,    "m"],
  spco2:              [300,  450,  "µatm"],
  talk:               [2200, 2450, "mmol/m³"],
  dissic:             [1900, 2200, "mmol/m³"],
};

// ─── Expanded map modal ───────────────────────────────────────────────────────
function ExpandedMapModal({
  markers,
  reefImgs,
  onClose,
  inline = false,
}: {
  markers: MapMarker[];
  reefImgs: ReefImageMarker[];
  onClose: () => void;
  inline?: boolean;
}) {
  const [showGcrmn,          setShowGcrmn]          = useState(true);
  const [showCoralMapping,   setShowCoralMapping]   = useState(true);
  const [showMarineRegions,  setShowMarineRegions]  = useState(true);
  const [showImgs,           setShowImgs]           = useState(true);
  const [showDaoMembers,     setShowDaoMembers]     = useState(true);
  const [showGcrmnSites,     setShowGcrmnSites]     = useState(true);
  const [showWcsReefCloud,   setShowWcsReefCloud]   = useState(false);
  const [showWcsCcSites,     setShowWcsCcSites]     = useState(false);
  const [showReefCheck,      setShowReefCheck]      = useState(false);
  const [showReefLife,       setShowReefLife]        = useState(false);
  const [showGcrmnMonSites,  setShowGcrmnMonSites]  = useState(false);
  const [activeCmsVar,       setActiveCmsVar]       = useState<CmsVar | null>(null);
  const [cmsYYYYMM,          setCmsYYYYMM]          = useState(CMS_MAX_YM);
  const [showToolbox,        setShowToolbox]        = useState<'cms'|'live'|null>(null);
  const [toolboxTab,         setToolboxTab]         = useState<'cli'|'python'>('cli');
  const [activeLiveVar,      setActiveLiveVar]      = useState<LiveVar|null>(null);
  const [mapBounds,          setMapBounds]          = useState<L.LatLngBounds | null>(null);
  const [activeTool,         setActiveTool]         = useState<MapTool | null>(null);
  const [toolPoints,         setToolPoints]         = useState<L.LatLng[]>([]);
  const [toolLine,           setToolLine]           = useState<L.LatLng[]>([]);
  const [toolArea,           setToolArea]           = useState<L.LatLng[]>([]);
  const [importedGeoJson,    setImportedGeoJson]    = useState<GeoJSON.FeatureCollection | null>(null);
  const [toolbarPos,         setToolbarPos]         = useState<{ x: number; y: number }>({ x: 14, y: 60 });
  const [toolbarDragging,    setToolbarDragging]    = useState(false);
  const toolbarDragRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [layerOpacity,       setLayerOpacity]       = useState(0.72);
  const [isMobile,           setIsMobile]           = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  // ── Live layer time + depth controls ──────────────────────────────────────
  const [liveDate,         setLiveDate]         = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 3);
    return d.toISOString().slice(0, 10) + "T00:00:00Z";
  });
  const [liveDepthIdx,     setLiveDepthIdx]     = useState<number>(0);
  const [liveDepthM,       setLiveDepthM]       = useState<number>(0);
  const [liveDragging,     setLiveDragging]     = useState<false | "time" | "depth">(false);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [playStepDays,     setPlayStepDays]     = useState(7);
  const [isLooping,        setIsLooping]        = useState(false);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const depthTrackRef    = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    if (!toolbarDragging) return;
    const onMove = (e: MouseEvent) => {
      setToolbarPos({
        x: Math.max(4, e.clientX - toolbarDragRef.current.dx),
        y: Math.max(4, e.clientY - toolbarDragRef.current.dy),
      });
    };
    const onUp = () => setToolbarDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [toolbarDragging]);

  // ── Time-lapse animation ────────────────────────────────────────────────────
  // Note: liveMinDateStr is computed below (after activeLiveLayer), captured via ref
  const liveMinDateStrRef = useRef("2019-01-01");
  useEffect(() => {
    if (!isPlaying || !activeLiveVar) return;
    const interval = setInterval(() => {
      setLiveDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + playStepDays);
        const maxD = new Date(); maxD.setDate(maxD.getDate() - 1);
        if (d.getTime() >= maxD.getTime()) {
          if (isLooping) {
            const minD = new Date(liveMinDateStrRef.current);
            return minD.toISOString().slice(0, 10) + "T00:00:00Z";
          }
          setIsPlaying(false);
          return maxD.toISOString().slice(0, 10) + "T00:00:00Z";
        }
        return d.toISOString().slice(0, 10) + "T00:00:00Z";
      });
    }, 1100);
    return () => clearInterval(interval);
  }, [isPlaying, playStepDays, activeLiveVar, isLooping]);

  // Stop playing when layer changes
  useEffect(() => { setIsPlaying(false); }, [activeLiveVar]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.type === 'FeatureCollection') setImportedGeoJson(json);
        else if (json.type === 'Feature') setImportedGeoJson({ type: 'FeatureCollection', features: [json] });
        else setImportedGeoJson({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: json, properties: {} }] });
      } catch { alert('Could not parse file as GeoJSON'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // ── GeoJSON data — each layer fetched lazily when its toggle is enabled ──────
  const { data: gcrmnGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/gcrmn/regions"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showGcrmn,
  });
  const { data: coralMappingGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/coral-mapping/regions"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showCoralMapping,
  });
  const { data: wcsReefCloudGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/reefcloud-sites"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showWcsReefCloud,
  });
  const { data: wcsCcSitesGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/cc-sites"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showWcsCcSites,
  });
  const { data: reefCheckGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/reef-check"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showReefCheck,
  });
  const { data: reefLifeGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/reef-life"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showReefLife,
  });
  const { data: gcrmnMonSitesGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/gcrmn-mon-sites"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showGcrmnMonSites,
  });

  const activeCmsLayer = activeCmsVar
    ? CMS_LAYERS.find(l => l.var === activeCmsVar) ?? null
    : null;
  const cmsTileUrl = activeCmsLayer
    ? buildCmsTileUrl(activeCmsLayer.var as CmsVar, activeCmsLayer.cmap, cmsYYYYMM, (activeCmsLayer as any).dataset)
    : null;

  const activeLiveLayer = activeLiveVar
    ? LIVE_LAYERS.find(l => l.var === activeLiveVar) ?? null
    : null;
  const liveTileUrl = activeLiveLayer
    ? buildLiveTileUrl(
        activeLiveLayer,
        liveDate,
        activeLiveLayer.elevation != null
          ? (liveDepthM === 0 ? activeLiveLayer.elevation : -liveDepthM)
          : null,
      )
    : null;

  // Timeline date-range helpers (recomputed when active layer changes)
  const liveMinDateStr = activeLiveLayer ? liveTimelineMin(activeLiveLayer.group) : "2019-01-01";
  liveMinDateStrRef.current = liveMinDateStr;
  const liveMaxDate = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
  const tMin = new Date(liveMinDateStr).getTime();
  const tMax = liveMaxDate.getTime();

  const handleTimelinePointer = (clientX: number) => {
    const rect = timelineTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const ms = tMin + ratio * (tMax - tMin);
    const d = new Date(ms);
    setLiveDate(d.toISOString().slice(0, 10) + "T00:00:00Z");
  };

  const handleDepthPointer = (clientY: number) => {
    const rect = depthTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const rawM = ratio * 5500;
    const nearest = (COMPACT_DEPTH_STEPS as readonly number[]).reduce((a, b) =>
      Math.abs(b - rawM) < Math.abs(a - rawM) ? b : a);
    setLiveDepthM(nearest);
    setLiveDepthIdx(Math.round(nearest / 5500 * (DEPTH_LEVELS.length - 1)));
  };

  const activeLayers = (showGcrmn ? 1 : 0) + (showCoralMapping ? 1 : 0) + (showMarineRegions ? 1 : 0) + (showImgs ? 1 : 0) + (showGcrmnSites ? 1 : 0) + (showWcsReefCloud ? 1 : 0) + (showWcsCcSites ? 1 : 0) + (showReefCheck ? 1 : 0) + (showReefLife ? 1 : 0) + (showGcrmnMonSites ? 1 : 0) + (activeCmsVar ? 1 : 0) + (activeLiveVar ? 1 : 0) + 1;

  // Country breakdown for GCRMN legend — derived from live GeoJSON
  const gcrmnCountryStats = useMemo(() => {
    if (!gcrmnMonSitesGeoJson) return [];
    const counts: Record<string, number> = {};
    for (const f of gcrmnMonSitesGeoJson.features) {
      const c = (f.properties?.country as string) || "";
      if (c) counts[c] = (counts[c] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [gcrmnMonSitesGeoJson]);

  const gcrmnUniqueCountries = useMemo(() => {
    if (!gcrmnMonSitesGeoJson) return 0;
    const s = new Set(gcrmnMonSitesGeoJson.features.map(f => f.properties?.country).filter(Boolean));
    return s.size;
  }, [gcrmnMonSitesGeoJson]);

  const content = (
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
            Regen Reef Network Map
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <MetricChip icon={<Users size={11} color="#83eef0"/>} label={`${markers.length} Members`} color="#83eef0"/>
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
          <style>{`
            .gcrmn-tooltip { background: rgba(0,19,28,0.88) !important; border: 1px solid rgba(131,238,240,0.25) !important; color: #d4e9f3 !important; font-family: Inter,sans-serif !important; font-size: 11px !important; padding: 3px 9px !important; border-radius: 6px !important; box-shadow: none !important; }
            @keyframes recblink { 0%,49%{opacity:1} 50%,100%{opacity:0.15} }
          `}</style>

          <MapContainer
            center={[12, 10]}
            zoom={2}
            zoomControl={true}
            scrollWheelZoom={true}
            attributionControl={true}
            style={{ width: "100%", height: "100%", background: "#00131c" }}
          >
            <MapResizer />
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="© Esri"
              maxZoom={10}
            />
            {cmsTileUrl && (
              <TileLayer
                key={cmsTileUrl}
                url={cmsTileUrl}
                opacity={layerOpacity}
                maxZoom={10}
                attribution='© <a href="https://marine.copernicus.eu">Copernicus Marine Service · Mercator Ocean International</a>'
              />
            )}
            {liveTileUrl && (
              <TileLayer
                key={liveTileUrl}
                url={liveTileUrl}
                opacity={layerOpacity}
                maxZoom={10}
                attribution='© <a href="https://marine.copernicus.eu">Copernicus Marine Service · Mercator Ocean International</a>'
              />
            )}
            {showMarineRegions && (
              <WMSTileLayer
                url="https://geo.vliz.be/geoserver/MarineRegions/wms"
                layers="MarineRegions:eez"
                format="image/png"
                transparent={true}
                opacity={0.45}
                version="1.1.1"
                attribution='© <a href="https://www.marineregions.org">MarineRegions.org · VLIZ</a>'
              />
            )}
            {showCoralMapping && coralMappingGeoJson && (
              <GeoJSON
                key="coral-mapping"
                data={coralMappingGeoJson}
                style={() => ({
                  color: "#fd7272", weight: 1.5, opacity: 0.75,
                  fillColor: "#fd7272", fillOpacity: 0.12,
                })}
                onEachFeature={(feature, layer) => {
                  const name = feature.properties?.region ?? "Reef Region";
                  layer.bindTooltip(name, { className: "gcrmn-tooltip", sticky: true });
                  layer.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:11px;color:#d4e9f3"><strong style="color:#fd7272">🗺 ${name}</strong><br/><span style="font-size:9px;color:#999">CoralMapping / GlobalMappingRegions</span></div>`, { maxWidth: 200 });
                }}
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
            {showGcrmnSites && GCRMN_SITES_2026.map((site) => (
              <CircleMarker
                key={`gcrmn-${site.territory}`}
                center={[site.lat, site.lon]}
                radius={gcrmnSiteRadius(site.surveys)}
                pathOptions={{
                  color: "#A6CE39", weight: 1.5, opacity: 0.9,
                  fillColor: "#A6CE39", fillOpacity: 0.35,
                }}
              >
                <Popup maxWidth={220}>
                  <GcrmnSitePopup site={site} />
                </Popup>
              </CircleMarker>
            ))}
            {showDaoMembers && markers.map((m) => (
              <CircleMarker key={m.id} center={[m.latitude, m.longitude]} radius={8}
                pathOptions={{ color: "#83eef0", fillColor: "#83eef0", fillOpacity: 0.88, weight: 2 }}>
                <Popup maxWidth={210}>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, lineHeight: 1.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #83eef0", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(131,238,240,0.15)", border: "2px solid #83eef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🪸</div>
                      )}
                      <div>
                        {m.orcidId && <div style={{ fontSize: 9, color: "#00b894", fontWeight: 600 }}>ORCID ✓</div>}
                      </div>
                    </div>
                    <div style={{ color: "#83eef0", fontWeight: 700, fontSize: 10, marginBottom: 2 }}>🪸 Regen Reef Member</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            {showImgs && reefImgs.map((img) => (
              <Marker key={img.id} position={[img.latitude, img.longitude]} icon={makeImagePin()}>
                <Popup maxWidth={210}>
                  <ReefImagePopup img={img} />
                </Popup>
              </Marker>
            ))}
            {showWcsReefCloud && wcsReefCloudGeoJson && (
              <GeoJSON
                key="wcs-reefcloud-expanded"
                data={wcsReefCloudGeoJson}
                pointToLayer={(_feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 2.5, color: "#e056fd", weight: 0.8,
                    fillColor: "#e056fd", fillOpacity: 0.55, opacity: 0.8,
                  })
                }
              />
            )}
            {showWcsCcSites && wcsCcSitesGeoJson && (
              <GeoJSON
                key="wcs-cc-expanded"
                data={wcsCcSitesGeoJson}
                pointToLayer={(feature, latlng) => {
                  const m = L.circleMarker(latlng, {
                    radius: 3, color: "#ff6b9d", weight: 0.8,
                    fillColor: "#ff6b9d", fillOpacity: 0.6, opacity: 0.85,
                  });
                  const p = feature.properties ?? {};
                  m.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:11px;min-width:150px;color:#d4e9f3">
                      <div style="font-weight:700;color:#ff6b9d;font-size:12px;margin-bottom:4px">🪸 ${p.site || "Survey site"}</div>
                      <div style="font-size:10px;color:#aaa;margin-bottom:4px">${p.country || ""}</div>
                      <div style="font-size:9px;color:#666;border-top:1px solid rgba(131,238,240,0.12);padding-top:4px">Dataset: ${p.db || "-"}</div>
                      <div style="font-size:8px;color:#555;margin-top:2px">WCS-Marine / global-monitoring-maps</div>
                    </div>`,
                    { maxWidth: 220 }
                  );
                  return m;
                }}
              />
            )}
            {showReefCheck && reefCheckGeoJson && (
              <GeoJSON
                key="reef-check-expanded"
                data={reefCheckGeoJson}
                pointToLayer={(feature, latlng) => {
                  const m = L.circleMarker(latlng, {
                    radius: 3, color: "#fd9644", weight: 0.8,
                    fillColor: "#fd9644", fillOpacity: 0.6, opacity: 0.85,
                  });
                  const p = feature.properties ?? {};
                  const coralPct = p.coral != null ? `${(p.coral * 100).toFixed(1)}%` : "-";
                  const bleachPct = p.bleaching != null ? `${(p.bleaching * 100).toFixed(1)}%` : "-";
                  m.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:11px;min-width:155px;color:#d4e9f3">
                      <div style="font-weight:700;color:#fd9644;font-size:12px;margin-bottom:4px">🐠 ${p.location || "Reef Check site"}</div>
                      <table style="border-collapse:collapse;width:100%;font-size:10px">
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Latest year</td><td style="font-weight:700;color:#ffd32a">${p.year ?? "-"}</td></tr>
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Coral cover</td><td style="font-weight:700;color:#55efc4">${coralPct}</td></tr>
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Bleaching</td><td style="font-weight:700;color:#ff7675">${bleachPct}</td></tr>
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Surveys</td><td>${p.surveys ?? 1}</td></tr>
                      </table>
                      <div style="font-size:8px;color:#555;border-top:1px solid rgba(131,238,240,0.12);padding-top:4px;margin-top:4px">Reef Check · WCS-Marine / global-monitoring-maps</div>
                    </div>`,
                    { maxWidth: 230 }
                  );
                  return m;
                }}
              />
            )}
            {showReefLife && reefLifeGeoJson && (
              <GeoJSON
                key="reef-life-expanded"
                data={reefLifeGeoJson}
                pointToLayer={(feature, latlng) => {
                  const m = L.circleMarker(latlng, {
                    radius: 3, color: "#45aaf2", weight: 0.8,
                    fillColor: "#45aaf2", fillOpacity: 0.6, opacity: 0.85,
                  });
                  const p = feature.properties ?? {};
                  m.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:11px;min-width:160px;color:#d4e9f3">
                      <div style="font-weight:700;color:#45aaf2;font-size:12px;margin-bottom:4px">🌊 ${p.site_name || "RLS site"}</div>
                      <table style="border-collapse:collapse;width:100%;font-size:10px">
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Country</td><td>${p.country || "-"}</td></tr>
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Ecoregion</td><td style="font-size:9px">${p.ecoregion || "-"}</td></tr>
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Realm</td><td>${p.realm || "-"}</td></tr>
                        <tr><td style="color:#888;padding:1px 6px 1px 0">Programs</td><td>${p.programs || "-"}</td></tr>
                      </table>
                      <div style="font-size:8px;color:#555;border-top:1px solid rgba(131,238,240,0.12);padding-top:4px;margin-top:4px">Reef Life Survey · WCS-Marine / global-monitoring-maps</div>
                    </div>`,
                    { maxWidth: 230 }
                  );
                  return m;
                }}
              />
            )}
            {showGcrmnMonSites && gcrmnMonSitesGeoJson && (
              <GeoJSON
                key="gcrmn-mon-sites-expanded"
                data={gcrmnMonSitesGeoJson}
                pointToLayer={(feature, latlng) => {
                  const m = L.circleMarker(latlng, {
                    radius: 3, color: "#26de81", weight: 0.8,
                    fillColor: "#26de81", fillOpacity: 0.6, opacity: 0.85,
                  });
                  const p = feature.properties ?? {};
                  const country  = (p.country  as string) || "";
                  const location = (p.location as string) || "";
                  // Permanent label — visible via CSS when map zoom ≥ 5 (GcrmnZoomWatcher)
                  if (country) {
                    const labelHtml = location
                      ? `${country}<br/><span style="font-weight:400;color:#d4e9f3aa;font-size:8px">${location}</span>`
                      : country;
                    m.bindTooltip(labelHtml, {
                      permanent: true,
                      direction: "right",
                      offset: [5, 0],
                      className: "gcrmn-perm",
                      interactive: false,
                    });
                  }
                  m.bindPopup(
                    `<div style="font-family:Inter,sans-serif;font-size:11px;min-width:155px;color:#d4e9f3">
                      <div style="font-weight:700;color:#26de81;font-size:12px;margin-bottom:4px">🔬 GCRMN Benthic Site</div>
                      <table style="border-collapse:collapse;width:100%;font-size:10px">
                        ${country  ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Country</td><td style="font-weight:600">${country}</td></tr>`  : ""}
                        ${location ? `<tr><td style="color:#888;padding:1px 6px 1px 0">Location</td><td>${location}</td></tr>` : ""}
                      </table>
                      <div style="font-size:8px;color:#555;border-top:1px solid rgba(131,238,240,0.12);padding-top:4px;margin-top:4px">GCRMN Benthic Sites · WCS-Marine / global-monitoring-maps</div>
                    </div>`,
                    { maxWidth: 240 }
                  );
                  return m;
                }}
              />
            )}
            {markers.length > 0 && <FitBounds markers={markers} />}
            <GcrmnZoomWatcher enabled={showGcrmnMonSites} />
            <MapBoundsTracker onBoundsChange={setMapBounds} />

            {/* ── Map tool handler ── */}
            <MapToolHandler
              activeTool={activeTool}
              onMapClick={latlng => {
                if (activeTool === 'points') setToolPoints(v => [...v, latlng]);
                else if (activeTool === 'lines') setToolLine(v => v.length < 50 ? [...v, latlng] : v);
                else if (activeTool === 'areas') setToolArea(v => [...v, latlng]);
              }}
            />

            {/* ── Points tool markers ── */}
            {toolPoints.map((pt, i) => (
              <CircleMarker key={`tp-${i}`} center={pt} radius={6}
                pathOptions={{ color: "#00b894", fillColor: "#00b894", fillOpacity: 0.85, weight: 2 }}>
                <Popup>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, color: "#00b894", marginBottom: 3 }}>📍 Point {i + 1}</div>
                    <div>Lat: <b>{pt.lat.toFixed(6)}°</b></div>
                    <div>Lon: <b>{pt.lng.toFixed(6)}°</b></div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* ── Lines tool ── */}
            {toolLine.length >= 2 && (
              <Polyline positions={toolLine} pathOptions={{ color: "#fdcb6e", weight: 2.5, dashArray: "7 4" }} />
            )}
            {toolLine.map((pt, i) => i === 0 ? null : (
              <CircleMarker key={`tl-${i}`} center={pt} radius={4}
                pathOptions={{ color: "#fdcb6e", fillColor: "#fdcb6e", fillOpacity: 0.9, weight: 1.5 }}>
                <Popup>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, color: "#fdcb6e", marginBottom: 3 }}>📏 Segment {i}</div>
                    <div>Distance: <b>{haversineDist(toolLine[i - 1], pt).toFixed(2)} km</b></div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* ── Areas tool ── */}
            {toolArea.length >= 3 && (
              <Polygon positions={toolArea}
                pathOptions={{ color: "#74b9ff", fillColor: "#74b9ff", fillOpacity: 0.12, weight: 2 }} />
            )}
            {toolArea.map((pt, i) => (
              <CircleMarker key={`ta-${i}`} center={pt} radius={3}
                pathOptions={{ color: "#74b9ff", fillColor: "#74b9ff", fillOpacity: 0.8, weight: 1 }} />
            ))}

            {/* ── Imported GeoJSON ── */}
            {importedGeoJson && (
              <GeoJSON
                key={`import-${importedGeoJson.features.length}-${JSON.stringify(importedGeoJson.features[0]?.geometry).slice(0, 20)}`}
                data={importedGeoJson}
                style={() => ({ color: "#ff9f43", weight: 2.5, fillOpacity: 0.15, fillColor: "#ff9f43" })}
              />
            )}
          </MapContainer>

          {/* ── Live Layer Timeline + Play Controls ─────────────────────── */}
          {activeLiveVar && activeLiveLayer && (() => {
            const tCur = new Date(liveDate).getTime();
            const pos = Math.max(0, Math.min(1, (tCur - tMin) / (tMax - tMin)));
            const minYear = parseInt(liveMinDateStr.slice(0, 4));
            const maxYear = liveMaxDate.getFullYear();
            const years: number[] = [];
            for (let y = minYear; y <= maxYear; y++) years.push(y);
            const curLabel = new Date(liveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
            const MON_TICKS = [{ mo: 4, label: "Apr" }, { mo: 7, label: "Jul" }, { mo: 10, label: "Oct" }];
            return (
              <div
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 800,
                  height: 68, background: "rgba(0,5,12,0.93)",
                  borderTop: "1px solid rgba(131,238,240,0.14)",
                  backdropFilter: "blur(12px)",
                  display: "flex", flexDirection: "column",
                  userSelect: "none", pointerEvents: "auto",
                }}
                onMouseMove={e => { if (liveDragging === "time") handleTimelinePointer(e.clientX); }}
                onMouseUp={() => { if (liveDragging === "time") setLiveDragging(false); }}
                onMouseLeave={() => { if (liveDragging === "time") setLiveDragging(false); }}
              >
                {/* ── Controls row ── */}
                <div style={{ display: "flex", alignItems: "center", padding: "5px 12px 0", flexShrink: 0, gap: 7 }}>
                  {/* Layer pill */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: activeLiveLayer.color, flexShrink: 0, display: "inline-block", boxShadow: `0 0 6px ${activeLiveLayer.color}` }}/>
                    <span style={{ fontSize: 8.5, fontWeight: 700, fontFamily: "Inter,sans-serif", color: activeLiveLayer.color, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{activeLiveLayer.label}</span>
                    <span style={{ fontSize: 7.5, color: "#d4e9f344", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap" }}>· {activeLiveLayer.group}</span>
                    {activeLiveLayer.elevation != null && (
                      <span style={{ fontSize: 7.5, color: activeLiveLayer.color, fontFamily: "Inter,sans-serif", fontWeight: 600, background: `${activeLiveLayer.color}1a`, border: `1px solid ${activeLiveLayer.color}44`, borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap", flexShrink: 0 }}>
                        ↕ {liveDepthM === 0 ? "Surface" : `${liveDepthM} m`}
                      </span>
                    )}
                  </div>

                  {/* ── Playback controls ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {/* ⏮ jump to start */}
                    <button
                      onClick={() => { setIsPlaying(false); setLiveDate(liveMinDateStr + "T00:00:00Z"); }}
                      title="Jump to start"
                      style={{ background: "none", border: "none", color: "#d4e9f355", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "2px 1px" }}
                    >⏮</button>

                    {/* ▶ / ⏸ play-pause */}
                    <button
                      onClick={() => setIsPlaying(v => !v)}
                      title={isPlaying ? "Pause" : "Play time-lapse"}
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: isPlaying ? activeLiveLayer.color : "rgba(255,255,255,0.09)",
                        border: `1.5px solid ${activeLiveLayer.color}`,
                        color: isPlaying ? "#000" : activeLiveLayer.color,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, transition: "all 0.13s", flexShrink: 0,
                      }}
                    >{isPlaying ? "⏸" : "▶"}</button>

                    {/* ⏭ jump to end */}
                    <button
                      onClick={() => { setIsPlaying(false); setLiveDate(liveMaxDate.toISOString().slice(0, 10) + "T00:00:00Z"); }}
                      title="Jump to end"
                      style={{ background: "none", border: "none", color: "#d4e9f355", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "2px 1px" }}
                    >⏭</button>

                    {/* ↻ loop toggle */}
                    <button
                      onClick={() => setIsLooping(v => !v)}
                      title={isLooping ? "Loop: on" : "Loop: off"}
                      style={{ background: "none", border: `1px solid ${isLooping ? activeLiveLayer.color + "88" : "rgba(255,255,255,0.13)"}`, borderRadius: 4, color: isLooping ? activeLiveLayer.color : "#d4e9f344", cursor: "pointer", padding: "2px 5px", fontSize: 11, lineHeight: 1.2, transition: "all 0.13s" }}
                    >↻</button>

                    {/* speed selector */}
                    <select
                      value={playStepDays}
                      onChange={e => setPlayStepDays(parseInt(e.target.value))}
                      style={{ fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 600, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 4, color: "#d4e9f377", padding: "2px 4px", cursor: "pointer", outline: "none" }}
                    >
                      <option value="1">+1 d</option>
                      <option value="7">+7 d</option>
                      <option value="30">+30 d</option>
                    </select>

                    {/* ● REC */}
                    {isPlaying && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: 2 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4757", display: "inline-block", animation: "recblink 1s step-end infinite" }}/>
                        <span style={{ fontSize: 8, fontWeight: 800, color: "#ff4757", fontFamily: "Inter,sans-serif", letterSpacing: "0.07em" }}>REC</span>
                      </div>
                    )}
                  </div>

                  {/* current date */}
                  <span style={{ fontSize: 8.5, fontWeight: 700, fontFamily: "Inter,sans-serif", color: "#d4e9f3aa", whiteSpace: "nowrap", flexShrink: 0 }}>{curLabel}</span>
                </div>

                {/* ── Scrubber track ── */}
                <div
                  ref={timelineTrackRef}
                  onClick={e => handleTimelinePointer(e.clientX)}
                  onMouseDown={() => setLiveDragging("time")}
                  style={{ flex: 1, position: "relative", cursor: "ew-resize", margin: "0 12px 6px" }}
                >
                  {/* background */}
                  <div style={{ position: "absolute", left: 0, right: 0, top: "50%", marginTop: -1, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}/>
                  {/* progress fill */}
                  <div style={{ position: "absolute", left: 0, right: `${(1 - pos) * 100}%`, top: "50%", marginTop: -1, height: 2, background: activeLiveLayer.color, borderRadius: 2, opacity: 0.8 }}/>

                  {/* Year markers */}
                  {years.map(y => {
                    const yT = new Date(`${y}-01-01`).getTime();
                    const yPos = (yT - tMin) / (tMax - tMin);
                    if (yPos < 0 || yPos > 1) return null;
                    return (
                      <div key={y} style={{ position: "absolute", left: `${yPos * 100}%`, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", transform: "translateX(-50%)" }}>
                        <div style={{ width: 1, height: "46%", background: "rgba(255,255,255,0.35)" }}/>
                        <span style={{ fontSize: 8, fontWeight: 700, color: "#d4e9f388", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", marginTop: 1 }}>{y}</span>
                      </div>
                    );
                  })}

                  {/* Quarterly ticks with Apr / Jul / Oct labels */}
                  {years.flatMap(y => MON_TICKS.map(({ mo, label }) => {
                    const tTick = new Date(`${y}-${String(mo).padStart(2, "0")}-01`).getTime();
                    const tPos = (tTick - tMin) / (tMax - tMin);
                    if (tPos <= 0.002 || tPos >= 0.998) return null;
                    return (
                      <div key={`${y}-${mo}`} style={{ position: "absolute", left: `${tPos * 100}%`, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", transform: "translateX(-50%)" }}>
                        <div style={{ width: 1, height: "32%", background: "rgba(255,255,255,0.22)" }}/>
                        <span style={{ fontSize: 6.5, color: "#d4e9f344", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", marginTop: 1 }}>{label}</span>
                      </div>
                    );
                  }))}

                  {/* Scrubber handle */}
                  <div style={{
                    position: "absolute", left: `${pos * 100}%`, top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 14, height: 14, borderRadius: "50%",
                    background: "#fff",
                    border: `2.5px solid ${activeLiveLayer.color}`,
                    boxShadow: `0 0 10px ${activeLiveLayer.color}cc, 0 2px 6px rgba(0,0,0,0.6)`,
                    zIndex: 2, cursor: "grab", pointerEvents: "none",
                    transition: (liveDragging === "time" || isPlaying) ? "none" : "left 0.15s",
                  }}/>
                </div>
              </div>
            );
          })()}

          {/* ── Live Layer Depth Bar ─────────────────────────────────────── */}
          {activeLiveVar && activeLiveLayer && activeLiveLayer.elevation != null && (() => {
            // depthPos computed above from liveDepthM
            const depthPos = liveDepthM / 5500;
            return (
              <div
                style={{
                  position: "absolute", right: 58, top: 60, bottom: 66, zIndex: 800,
                  width: 48, pointerEvents: "auto",
                  background: "rgba(0,5,12,0.85)",
                  border: "1px solid rgba(131,238,240,0.12)",
                  borderRadius: 8, backdropFilter: "blur(8px)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "6px 0 4px",
                  userSelect: "none",
                }}
                onMouseMove={e => { if (liveDragging === "depth") handleDepthPointer(e.clientY); }}
                onMouseUp={() => { if (liveDragging === "depth") setLiveDragging(false); }}
                onMouseLeave={() => { if (liveDragging === "depth") setLiveDragging(false); }}
              >
                {/* Header label */}
                <div style={{ fontSize: 7, fontWeight: 700, color: "#d4e9f355", fontFamily: "Inter,sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Depth</div>
                {/* Current depth pill */}
                <div style={{ fontSize: 7.5, fontWeight: 700, color: activeLiveLayer.color, fontFamily: "Inter,sans-serif", marginBottom: 4, textAlign: "center", lineHeight: 1.2, padding: "1px 4px", background: `${activeLiveLayer.color}1a`, border: `1px solid ${activeLiveLayer.color}44`, borderRadius: 4 }}>
                  {liveDepthM === 0 ? "Surface" : `${liveDepthM} m`}
                </div>
                {/* Vertical track */}
                <div
                  ref={depthTrackRef}
                  onClick={e => handleDepthPointer(e.clientY)}
                  onMouseDown={() => setLiveDragging("depth")}
                  style={{ flex: 1, width: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, position: "relative", cursor: "ns-resize" }}
                >
                  {/* Progress fill (top = 0 m, increasing depth = more fill) */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${depthPos * 100}%`, background: activeLiveLayer.color, borderRadius: 3, opacity: 0.75 }}/>
                  {/* Depth tick marks — one per 500 m step */}
                  {(COMPACT_DEPTH_STEPS as readonly number[]).map(m => (
                    <div key={m} style={{ position: "absolute", top: `${(m / 5500) * 100}%`, left: -10, width: 8, height: 1, background: "rgba(255,255,255,0.2)", pointerEvents: "none" }}/>
                  ))}
                  {/* Handle */}
                  <div style={{
                    position: "absolute", top: `${depthPos * 100}%`,
                    left: "50%", transform: "translate(-50%, -50%)",
                    width: 12, height: 12, borderRadius: "50%",
                    background: "#fff", border: `2.5px solid ${activeLiveLayer.color}`,
                    boxShadow: `0 0 8px ${activeLiveLayer.color}99`,
                    pointerEvents: "none",
                    transition: liveDragging === "depth" ? "none" : "top 0.15s",
                  }}/>
                </div>
                {/* Bottom depth label */}
                <div style={{ fontSize: 6.5, color: "#d4e9f333", fontFamily: "Inter,sans-serif", marginTop: 4, textAlign: "center" }}>−5500 m</div>
              </div>
            );
          })()}

          {/* ── Layer Colorbar Legend ────────────────────────────────────── */}
          {activeLiveVar && activeLiveLayer && CMAP_CSS[activeLiveLayer.cmap] && LAYER_VALUE_RANGES[activeLiveVar] && (
            <div style={{
              position: "absolute", bottom: 72, left: 14, zIndex: 810,
              background: "rgba(0,5,12,0.90)", border: "1px solid rgba(131,238,240,0.14)",
              borderRadius: 9, backdropFilter: "blur(10px)",
              padding: "7px 11px", minWidth: 178, maxWidth: 228,
              fontFamily: "Inter,sans-serif", pointerEvents: "none",
            }}>
              {/* Header: layer name + date */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: activeLiveLayer.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {activeLiveLayer.label}
                </span>
                <span style={{ fontSize: 7, color: "#d4e9f355" }}>
                  {new Date(liveDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  {activeLiveLayer.elevation != null && ` · ${liveDepthM === 0 ? "Surface" : `${liveDepthM} m`}`}
                </span>
              </div>
              {/* Gradient colorbar */}
              <div style={{ height: 11, borderRadius: 4, background: CMAP_CSS[activeLiveLayer.cmap], marginBottom: 4, boxShadow: "0 0 8px rgba(0,0,0,0.4)" }}/>
              {/* Scale labels */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 8.5, color: "#d4e9f3aa", fontWeight: 700 }}>{LAYER_VALUE_RANGES[activeLiveVar][0]}</span>
                <span style={{ fontSize: 7.5, color: "#d4e9f355" }}>{LAYER_VALUE_RANGES[activeLiveVar][2]}</span>
                <span style={{ fontSize: 8.5, color: "#d4e9f3aa", fontWeight: 700 }}>{LAYER_VALUE_RANGES[activeLiveVar][1]}</span>
              </div>
              {/* Dataset metadata */}
              <div style={{ paddingTop: 4, borderTop: "1px solid rgba(131,238,240,0.08)" }}>
                <div style={{ fontSize: 7.5, color: "#d4e9f355", marginBottom: 1 }}>{activeLiveLayer.resolution} · {activeLiveLayer.cadence}</div>
                <div style={{ fontSize: 7, color: "#d4e9f322", lineHeight: 1.35 }}>{activeLiveLayer.productTitle}</div>
              </div>
            </div>
          )}

          {/* ── Map Tools Floating Toolbar ── */}
          {/* Result / settings panels — shown above (desktop) or below (mobile) buttons */}
          {isMobile ? (
            /* ── MOBILE: horizontal icon strip centred at top ── */
            <div style={{
              position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 900,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              pointerEvents: "auto",
            }}>
              {/* Tool readout panel — shown below buttons on mobile */}
              {activeTool === 'points' && toolPoints.length > 0 && (
                <div style={{ background: "rgba(0,10,18,0.92)", border: "1px solid rgba(0,184,148,0.4)", borderRadius: 8, padding: "7px 11px", backdropFilter: "blur(8px)", fontFamily: "Inter,sans-serif", minWidth: 160 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#00b894", marginBottom: 4 }}>📍 Points ({toolPoints.length})</div>
                  {toolPoints.slice(-2).map((pt, i) => <div key={i} style={{ fontSize: 8.5, color: "#d4e9f3aa" }}>{pt.lat.toFixed(4)}°, {pt.lng.toFixed(4)}°</div>)}
                  <button onClick={() => setToolPoints([])} style={{ marginTop: 5, fontSize: 8, background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#d4e9f366", cursor: "pointer", padding: "2px 8px", width: "100%", fontFamily: "Inter,sans-serif" }}>Clear</button>
                </div>
              )}
              {activeTool === 'lines' && toolLine.length >= 2 && (
                <div style={{ background: "rgba(0,10,18,0.92)", border: "1px solid rgba(253,203,110,0.4)", borderRadius: 8, padding: "7px 11px", backdropFilter: "blur(8px)", fontFamily: "Inter,sans-serif", minWidth: 160 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#fdcb6e", marginBottom: 4 }}>📏 Total: {toolLine.slice(1).reduce((acc, pt, i) => acc + haversineDist(toolLine[i], pt), 0).toFixed(2)} km</div>
                  <button onClick={() => setToolLine([])} style={{ fontSize: 8, background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#d4e9f366", cursor: "pointer", padding: "2px 8px", width: "100%", fontFamily: "Inter,sans-serif" }}>Clear</button>
                </div>
              )}
              {activeTool === 'areas' && toolArea.length >= 3 && (
                <div style={{ background: "rgba(0,10,18,0.92)", border: "1px solid rgba(116,185,255,0.4)", borderRadius: 8, padding: "7px 11px", backdropFilter: "blur(8px)", fontFamily: "Inter,sans-serif", minWidth: 140 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#74b9ff" }}>{polygonAreaKm2(toolArea).toFixed(1)} km²</div>
                  <button onClick={() => setToolArea([])} style={{ marginTop: 4, fontSize: 8, background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#d4e9f366", cursor: "pointer", padding: "2px 8px", width: "100%", fontFamily: "Inter,sans-serif" }}>Clear</button>
                </div>
              )}
              {activeTool === 'settings' && (
                <div style={{ background: "rgba(0,10,18,0.92)", border: "1px solid rgba(131,238,240,0.3)", borderRadius: 8, padding: "10px 12px", backdropFilter: "blur(8px)", fontFamily: "Inter,sans-serif", minWidth: 180 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#83eef0", marginBottom: 8 }}>⚙ Layer Settings</div>
                  {(activeCmsVar || activeLiveVar) ? (
                    <>
                      <div style={{ fontSize: 8, color: "#d4e9f355", marginBottom: 5 }}>Opacity — <span style={{ color: "#83eef0", fontWeight: 700 }}>{Math.round(layerOpacity * 100)}%</span></div>
                      <input type="range" min={0} max={100} value={Math.round(layerOpacity * 100)} onChange={e => setLayerOpacity(parseInt(e.target.value) / 100)} style={{ width: "100%", accentColor: "#83eef0" }} />
                    </>
                  ) : (
                    <div style={{ fontSize: 9, color: "#d4e9f355", lineHeight: 1.5 }}>Enable a Copernicus layer to adjust opacity.</div>
                  )}
                  {importedGeoJson && (
                    <button onClick={() => setImportedGeoJson(null)} style={{ marginTop: 8, fontSize: 8, background: "rgba(253,121,168,0.1)", border: "1px solid rgba(253,121,168,0.3)", borderRadius: 4, color: "#fd79a8", cursor: "pointer", padding: "3px 8px", width: "100%", fontFamily: "Inter,sans-serif", fontWeight: 600 }}>Remove imported layer</button>
                  )}
                </div>
              )}
              {/* Icon-only row */}
              <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
                {([
                  { id: 'points',   icon: '⊕', label: 'Points',   color: '#00b894' },
                  { id: 'lines',    icon: '━', label: 'Lines',    color: '#fdcb6e' },
                  { id: 'areas',    icon: '▱', label: 'Areas',    color: '#74b9ff' },
                  { id: 'import',   icon: '↑', label: 'Import',   color: '#a29bfe' },
                  { id: 'settings', icon: '⚙', label: 'Settings', color: '#83eef0' },
                ] as const).map(tool => (
                  <button
                    key={tool.id}
                    data-testid={`map-tool-${tool.id}`}
                    onClick={() => {
                      if (tool.id === 'import') { importInputRef.current?.click(); return; }
                      setActiveTool(v => v === tool.id ? null : tool.id as MapTool);
                    }}
                    title={tool.label}
                    style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                      background: activeTool === tool.id ? `rgba(0,10,18,0.94)` : "rgba(0,10,18,0.82)",
                      border: `1.5px solid ${activeTool === tool.id ? `${tool.color}99` : "rgba(255,255,255,0.18)"}`,
                      cursor: "pointer", backdropFilter: "blur(8px)", transition: "all 0.14s",
                      boxShadow: activeTool === tool.id ? `0 0 0 2px ${tool.color}33` : "none",
                    }}
                  >
                    <span style={{ fontSize: 14, color: activeTool === tool.id ? tool.color : "#d4e9f3bb", lineHeight: 1 }}>{tool.icon}</span>
                    <span style={{ fontSize: 7.5, fontWeight: 700, color: activeTool === tool.id ? tool.color : "#d4e9f355", fontFamily: "Inter,sans-serif", letterSpacing: "0.03em" }}>{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── DESKTOP: draggable compact floating toolbar ── */
            <div
              style={{
                position: "absolute",
                left: toolbarPos.x,
                top: toolbarPos.y,
                zIndex: 900,
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                pointerEvents: "auto",
                userSelect: "none",
              }}
            >
              {/* ── Icon strip ── */}
              <div style={{
                background: "rgba(0,5,12,0.86)",
                border: "1px solid rgba(131,238,240,0.14)",
                borderRadius: 16,
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.55), inset 0 0 0 0.5px rgba(255,255,255,0.04)",
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 5px 10px",
                gap: 2,
                width: 46,
              }}>
                {/* Drag handle */}
                <div
                  onMouseDown={e => {
                    setToolbarDragging(true);
                    toolbarDragRef.current = { dx: e.clientX - toolbarPos.x, dy: e.clientY - toolbarPos.y };
                    e.preventDefault();
                  }}
                  title="Drag to reposition"
                  style={{
                    width: 30, height: 20, cursor: toolbarDragging ? "grabbing" : "grab",
                    display: "flex", flexDirection: "column", gap: 4,
                    alignItems: "center", justifyContent: "center",
                    marginBottom: 4, borderRadius: 7, padding: "3px 0",
                    transition: "background 0.12s",
                  }}
                >
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 14, height: 1.5, background: "rgba(131,238,240,0.22)", borderRadius: 2 }} />
                  ))}
                </div>

                {/* Thin separator */}
                <div style={{ width: 22, height: 1, background: "rgba(131,238,240,0.1)", marginBottom: 3 }} />

                {/* Tool buttons */}
                {([
                  { id: 'points',   icon: '⊕', label: 'Points',   color: '#00b894' },
                  { id: 'lines',    icon: '━', label: 'Lines',    color: '#fdcb6e' },
                  { id: 'areas',    icon: '▱', label: 'Areas',    color: '#74b9ff' },
                  { id: 'import',   icon: '↑', label: 'Import',   color: '#a29bfe' },
                  { id: 'settings', icon: '⚙', label: 'Settings', color: '#83eef0' },
                ] as const).map(tool => (
                  <button
                    key={tool.id}
                    data-testid={`map-tool-${tool.id}`}
                    onClick={() => {
                      if (tool.id === 'import') { importInputRef.current?.click(); return; }
                      setActiveTool(v => v === tool.id ? null : tool.id as MapTool);
                    }}
                    title={tool.label}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                      background: activeTool === tool.id ? `${tool.color}18` : "transparent",
                      border: `1px solid ${activeTool === tool.id ? `${tool.color}60` : "transparent"}`,
                      cursor: "pointer", transition: "all 0.13s",
                      boxShadow: activeTool === tool.id ? `0 0 14px ${tool.color}44, inset 0 0 10px ${tool.color}0d` : "none",
                    }}
                  >
                    <span style={{ fontSize: 14, color: activeTool === tool.id ? tool.color : "#d4e9f355", lineHeight: 1, transition: "color 0.13s" }}>{tool.icon}</span>
                    <span style={{ fontSize: 5.5, fontWeight: 700, fontFamily: "Inter,sans-serif", letterSpacing: "0.05em", textTransform: "uppercase", color: activeTool === tool.id ? `${tool.color}bb` : "#d4e9f31a", transition: "color 0.13s" }}>{tool.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Result / settings readout — pops to the right ── */}
              {activeTool === 'points' && toolPoints.length > 0 && (
                <div style={{
                  background: "rgba(0,5,12,0.92)", border: "1px solid rgba(0,184,148,0.3)",
                  borderRadius: 12, padding: "10px 12px", minWidth: 158,
                  backdropFilter: "blur(16px)", fontFamily: "Inter,sans-serif",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: "#00b894", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" }}>📍 Points ({toolPoints.length})</div>
                  {toolPoints.slice(-3).map((pt, i) => (
                    <div key={i} style={{ fontSize: 7.5, color: "#d4e9f3aa", marginBottom: 2, fontFamily: "monospace" }}>
                      {pt.lat.toFixed(4)}°, {pt.lng.toFixed(4)}°
                    </div>
                  ))}
                  {toolPoints.length > 3 && <div style={{ fontSize: 7, color: "#d4e9f333", marginTop: 2 }}>+{toolPoints.length - 3} more</div>}
                  <button onClick={() => setToolPoints([])} style={{
                    marginTop: 8, fontSize: 7.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7, color: "#d4e9f344", cursor: "pointer", padding: "4px 0", width: "100%", fontFamily: "Inter,sans-serif", fontWeight: 600,
                  }}>Clear all</button>
                </div>
              )}
              {activeTool === 'lines' && toolLine.length >= 2 && (
                <div style={{
                  background: "rgba(0,5,12,0.92)", border: "1px solid rgba(253,203,110,0.3)",
                  borderRadius: 12, padding: "10px 12px", minWidth: 158,
                  backdropFilter: "blur(16px)", fontFamily: "Inter,sans-serif",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: "#fdcb6e", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" }}>📏 Distance</div>
                  {toolLine.slice(1).map((pt, i) => (
                    <div key={i} style={{ fontSize: 7.5, color: "#d4e9f3aa", marginBottom: 2 }}>
                      Seg {i + 1}: {haversineDist(toolLine[i], pt).toFixed(2)} km
                    </div>
                  ))}
                  {toolLine.length > 2 && (
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#fdcb6e", marginTop: 7, borderTop: "1px solid rgba(253,203,110,0.15)", paddingTop: 7 }}>
                      Total: {toolLine.slice(1).reduce((acc, pt, i) => acc + haversineDist(toolLine[i], pt), 0).toFixed(2)} km
                    </div>
                  )}
                  <button onClick={() => setToolLine([])} style={{
                    marginTop: 8, fontSize: 7.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7, color: "#d4e9f344", cursor: "pointer", padding: "4px 0", width: "100%", fontFamily: "Inter,sans-serif", fontWeight: 600,
                  }}>Clear</button>
                </div>
              )}
              {activeTool === 'areas' && toolArea.length >= 3 && (
                <div style={{
                  background: "rgba(0,5,12,0.92)", border: "1px solid rgba(116,185,255,0.3)",
                  borderRadius: 12, padding: "10px 12px", minWidth: 140,
                  backdropFilter: "blur(16px)", fontFamily: "Inter,sans-serif",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: "#74b9ff", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" }}>▱ Area</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#74b9ff", lineHeight: 1.1 }}>{polygonAreaKm2(toolArea).toFixed(1)}</div>
                  <div style={{ fontSize: 8, color: "#d4e9f344", marginTop: 2 }}>km² · {toolArea.length} pts</div>
                  <button onClick={() => setToolArea([])} style={{
                    marginTop: 8, fontSize: 7.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7, color: "#d4e9f344", cursor: "pointer", padding: "4px 0", width: "100%", fontFamily: "Inter,sans-serif", fontWeight: 600,
                  }}>Clear</button>
                </div>
              )}
              {activeTool === 'settings' && (
                <div style={{
                  background: "rgba(0,5,12,0.92)", border: "1px solid rgba(131,238,240,0.22)",
                  borderRadius: 12, padding: "10px 12px", minWidth: 170,
                  backdropFilter: "blur(16px)", fontFamily: "Inter,sans-serif",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: "#83eef0", marginBottom: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>⚙ Settings</div>
                  {(activeCmsVar || activeLiveVar) ? (
                    <>
                      <div style={{ fontSize: 8, color: "#d4e9f355", marginBottom: 6 }}>
                        Opacity — <span style={{ color: "#83eef0", fontWeight: 700 }}>{Math.round(layerOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={Math.round(layerOpacity * 100)}
                        onChange={e => setLayerOpacity(parseInt(e.target.value) / 100)}
                        style={{ width: "100%", accentColor: "#83eef0", marginBottom: 4 }}
                      />
                    </>
                  ) : (
                    <div style={{ fontSize: 8.5, color: "#d4e9f333", lineHeight: 1.65 }}>Enable a Copernicus layer to adjust its opacity.</div>
                  )}
                  {importedGeoJson && (
                    <button onClick={() => setImportedGeoJson(null)} style={{
                      marginTop: 8, fontSize: 7.5, background: "rgba(253,121,168,0.08)", border: "1px solid rgba(253,121,168,0.28)",
                      borderRadius: 7, color: "#fd79a8", cursor: "pointer", padding: "4px 0", width: "100%", fontFamily: "Inter,sans-serif", fontWeight: 600,
                    }}>Remove imported layer</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hidden file input for Import tool */}
          <input
            ref={importInputRef}
            type="file"
            accept=".geojson,.json"
            style={{ display: "none" }}
            onChange={handleFileImport}
          />

          {/* ── Copernicus Marine Toolbox panel ── */}
          {showToolbox && (activeCmsLayer || activeLiveLayer) && (() => {
            const isCms  = showToolbox === 'cms'  && activeCmsLayer;
            const isLive = showToolbox === 'live' && activeLiveLayer;
            const dsId   = isCms ? CMS_DATASET : activeLiveLayer?.toolboxId ?? "";

            // Correct NetCDF variable names (some differ from WMTS/display names)
            const CLI_VAR_MAP: Record<string, string[]> = {
              sea_water_velocity: ["uo", "vo"],  // eastward + northward components
            };
            const rawVarId = isCms
              ? activeCmsLayer!.var
              : (activeLiveLayer?.wmtsVar ?? activeLiveLayer?.var) ?? "";
            const varIds   = CLI_VAR_MAP[rawVarId] ?? [rawVarId];
            const varId    = varIds[0];

            // Fix: use currently-scrubbed liveDate (not the layer default time())
            const t0 = isCms ? `${cmsYYYYMM}-01` : liveDate.slice(0, 10);

            // Fix: use the user's selected depth level (liveDepthIdx) not the static default
            const hasElev = isLive && activeLiveLayer?.elevation != null;
            const selDepth = hasElev ? liveDepthM : 0;
            const elevMin  = selDepth.toFixed(3);
            const elevMax  = selDepth.toFixed(3);

            const clampLon = (v: number) => Math.max(-180, Math.min(180, v));
            const west  = mapBounds ? clampLon(mapBounds.getWest()).toFixed(4)  : "-180.0000";
            const east  = mapBounds ? clampLon(mapBounds.getEast()).toFixed(4)  : "180.0000";
            const south = mapBounds ? Math.max(-90, mapBounds.getSouth()).toFixed(4) : "-90.0000";
            const north = mapBounds ? Math.min(90,  mapBounds.getNorth()).toFixed(4) : "90.0000";

            const depthArgs = hasElev
              ? ` \\\n  --minimum-depth ${elevMin} \\\n  --maximum-depth ${elevMax}`
              : "";
            const depthPy = hasElev
              ? `    minimum_depth=${elevMin},\n    maximum_depth=${elevMax},\n`
              : "";
            const varArgsStr = varIds.map(v => `  --variable ${v}`).join(` \\\n`);
            const varArgsPy  = varIds.map(v => `"${v}"`).join(", ");

            // ── Snippets ─────────────────────────────────────────────────────────
            const snippetLogin =
              `copernicusmarine login`;

            const snippetInstall =
              `# pip (recommended)\npip install copernicusmarine\n\n` +
              `# conda / mamba\nconda install -c conda-forge copernicusmarine\n\n` +
              `# docker\ndocker pull copernicusmarine/copernicusmarine:latest`;

            const snippetSubset =
              `copernicusmarine subset \\\n` +
              `  --dataset-id ${dsId} \\\n` +
              varArgsStr + ` \\\n` +
              `  --start-datetime "${t0}T00:00:00" \\\n` +
              `  --end-datetime "${t0}T23:59:59" \\\n` +
              `  --minimum-longitude ${west} \\\n` +
              `  --maximum-longitude ${east} \\\n` +
              `  --minimum-latitude ${south} \\\n` +
              `  --maximum-latitude ${north}` + depthArgs + ` \\\n` +
              `  --output-filename "${varId}_${t0}.nc"`;

            const snippetGet =
              `copernicusmarine get \\\n` +
              `  --dataset-id ${dsId} \\\n` +
              `  --filter "*${t0}*" \\\n` +
              `  --output-directory "./${varId}/"`;

            const snippetDescribe =
              `# Check installed version\ncopernicusmarine --version\n\n` +
              `# Browse dataset catalogue\ncopernicusmarine describe \\\n` +
              `  --include-datasets \\\n` +
              `  --contains "${dsId}"`;

            const snippetPython =
              `import copernicusmarine\n\n` +
              `# Stream from cloud as xarray Dataset (no download)\n` +
              `ds = copernicusmarine.open_dataset(\n` +
              `    dataset_id="${dsId}",\n` +
              `    variables=[${varArgsPy}],\n` +
              `    start_datetime="${t0}",\n` +
              `    end_datetime="${t0}",\n` +
              `    minimum_longitude=${west},\n` +
              `    maximum_longitude=${east},\n` +
              `    minimum_latitude=${south},\n` +
              `    maximum_latitude=${north},\n` +
              depthPy +
              `)\n\n` +
              `# Or download as NetCDF\n` +
              `copernicusmarine.subset(\n` +
              `    dataset_id="${dsId}",\n` +
              `    variables=[${varArgsPy}],\n` +
              `    start_datetime="${t0}",\n` +
              `    end_datetime="${t0}",\n` +
              `    minimum_longitude=${west},\n` +
              `    maximum_longitude=${east},\n` +
              `    minimum_latitude=${south},\n` +
              `    maximum_latitude=${north},\n` +
              depthPy +
              `    output_filename="${varId}_${t0}.nc",\n` +
              `)`;

            const snippetDataframe =
              `import copernicusmarine\n\n` +
              `# Read as pandas DataFrame (tabular)\n` +
              `df = copernicusmarine.read_dataframe(\n` +
              `    dataset_id="${dsId}",\n` +
              `    variables=[${varArgsPy}],\n` +
              `    start_datetime="${t0}",\n` +
              `    end_datetime="${t0}",\n` +
              `    minimum_longitude=${west},\n` +
              `    maximum_longitude=${east},\n` +
              `    minimum_latitude=${south},\n` +
              `    maximum_latitude=${north},\n` +
              depthPy +
              `)`;

            // ── Styles ───────────────────────────────────────────────────────────
            const preStyle: React.CSSProperties = {
              margin: 0, padding: "8px 10px", borderRadius: 6, fontSize: 10, lineHeight: 1.55,
              background: "rgba(0,184,148,0.07)", border: "1px solid rgba(0,184,148,0.18)",
              color: "#83eef0", overflowX: "auto", whiteSpace: "pre",
            };
            const labelStyle: React.CSSProperties = {
              fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: 4,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            };
            const copyBtn = (text: string) => (
              <button
                onClick={() => navigator.clipboard?.writeText(text)}
                style={{ fontSize: 8, background: "rgba(0,184,148,0.1)", border: "1px solid rgba(0,184,148,0.25)", borderRadius: 4, color: "#83eef0", cursor: "pointer", fontFamily: "Inter,sans-serif", padding: "1px 6px", letterSpacing: "0.04em" }}
              >copy</button>
            );

            return (
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000,
                background: "rgba(0,10,18,0.97)", borderTop: "1px solid rgba(0,184,148,0.3)",
                backdropFilter: "blur(8px)", fontFamily: "Inter,sans-serif",
                maxHeight: "62%", overflowY: "auto",
              }}>
                {/* ── Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", borderBottom: "1px solid rgba(131,238,240,0.08)" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#00b894", marginBottom: 2 }}>
                      ⬇ Copernicus Marine Toolbox
                      <span style={{ fontSize: 9, fontWeight: 500, color: "#00b89466", marginLeft: 6 }}>v2.4.0</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#d4e9f344", fontFamily: "monospace" }}>
                      {dsId}
                      <span style={{ color: "#83eef077" }}> · {varIds.join(", ")}</span>
                      {mapBounds && <span style={{ color: "#d4e9f322" }}> · {south}°–{north}°N {west}°–{east}°E</span>}
                      {hasElev && <span style={{ color: "#d4e9f322" }}> · {liveDepthM === 0 ? "Surface" : `${liveDepthM} m`}</span>}
                      <span style={{ color: "#d4e9f322" }}> · {t0}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {(["cli", "python"] as const).map(tab => (
                      <button key={tab} onClick={() => setToolboxTab(tab)} style={{
                        fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.08em",
                        padding: "3px 10px", borderRadius: 10, cursor: "pointer", textTransform: "uppercase",
                        background: toolboxTab === tab ? "rgba(0,184,148,0.18)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${toolboxTab === tab ? "rgba(0,184,148,0.55)" : "rgba(255,255,255,0.1)"}`,
                        color: toolboxTab === tab ? "#00b894" : "#d4e9f344",
                        transition: "all 0.12s",
                      }}>{tab === 'cli' ? 'CLI' : 'Python'}</button>
                    ))}
                    <button onClick={() => setShowToolbox(null)}
                      style={{ background: "none", border: "none", color: "#d4e9f355", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px 0 8px" }}
                    >×</button>
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: "10px 16px 14px" }}>
                  {toolboxTab === 'cli' ? (
                    <>
                      {/* Row 1: Login + Install | Subset */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, alignItems: "start", marginBottom: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div>
                            <div style={labelStyle}><span>1 · Authenticate</span>{copyBtn(snippetLogin)}</div>
                            <pre style={preStyle}>{snippetLogin}</pre>
                          </div>
                          <div>
                            <div style={labelStyle}><span>2 · Install (pip / conda / docker)</span>{copyBtn(snippetInstall)}</div>
                            <pre style={preStyle}>{snippetInstall}</pre>
                          </div>
                        </div>
                        <div>
                          <div style={labelStyle}><span>3 · Subset · viewport · date · depth</span>{copyBtn(snippetSubset)}</div>
                          <pre style={preStyle}>{snippetSubset}</pre>
                        </div>
                      </div>
                      {/* Row 2: Get | Describe */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                        <div>
                          <div style={labelStyle}><span>4 · Get · download original files</span>{copyBtn(snippetGet)}</div>
                          <pre style={preStyle}>{snippetGet}</pre>
                        </div>
                        <div>
                          <div style={labelStyle}><span>5 · Describe dataset</span>{copyBtn(snippetDescribe)}</div>
                          <pre style={preStyle}>{snippetDescribe}</pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                      <div>
                        <div style={labelStyle}><span>open_dataset · stream from cloud</span>{copyBtn(snippetPython)}</div>
                        <pre style={preStyle}>{snippetPython}</pre>
                      </div>
                      <div>
                        <div style={labelStyle}><span>read_dataframe · tabular (pandas)</span>{copyBtn(snippetDataframe)}</div>
                        <pre style={preStyle}>{snippetDataframe}</pre>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 9, fontSize: 8, color: "#d4e9f325", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span>© Mercator Ocean International · Copernicus Marine Service (CMEMS)</span>
                    <a href="https://github.com/mercator-ocean/copernicus-marine-toolbox" target="_blank" rel="noopener noreferrer" style={{ color: "#83eef055", textDecoration: "underline" }}>GitHub</a>
                    <a href="https://toolbox-docs.marine.copernicus.eu/en/" target="_blank" rel="noopener noreferrer" style={{ color: "#83eef055", textDecoration: "underline" }}>Docs</a>
                    <a href={`https://data.marine.copernicus.eu/viewer/expert?view=dataset&dataset=${dsId}`} target="_blank" rel="noopener noreferrer" style={{ color: "#83eef055", textDecoration: "underline" }}>Open in Copernicus Viewer ↗</a>
                  </div>
                </div>
              </div>
            );
          })()}
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
            {/* ── Quick presets ── */}
            <div style={{ display: "flex", gap: 5, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(131,238,240,0.08)" }}>
              <button
                data-testid="expanded-toggle-all-layers"
                onClick={() => { setShowMarineRegions(true); setShowCoralMapping(true); setShowGcrmn(true); setShowGcrmnSites(true); setShowGcrmnMonSites(true); setShowWcsReefCloud(true); setShowWcsCcSites(true); setShowReefCheck(true); setShowReefLife(true); setShowImgs(true); setShowDaoMembers(true); setActiveCmsVar("CHL"); setActiveLiveVar(null); }}
                style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(131,238,240,0.12)", border: "1px solid rgba(131,238,240,0.3)", borderRadius: 6, padding: "4px 0", color: "#83eef0", cursor: "pointer" }}
              >All On</button>
              <button
                data-testid="expanded-toggle-no-layers"
                onClick={() => { setShowMarineRegions(false); setShowCoralMapping(false); setShowGcrmn(false); setShowGcrmnSites(false); setShowGcrmnMonSites(false); setShowWcsReefCloud(false); setShowWcsCcSites(false); setShowReefCheck(false); setShowReefLife(false); setShowImgs(false); setShowDaoMembers(false); setActiveCmsVar(null); setActiveLiveVar(null); setShowToolbox(null); }}
                style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 0", color: "#d4e9f355", cursor: "pointer" }}
              >All Off</button>
            </div>

            {/* ── Satellite & Ocean Data ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>
                  Satellite & Ocean Data
                </span>
              </div>
              <div style={{ fontSize: 7.5, color: "#d4e9f328", marginBottom: 8, lineHeight: 1.5 }}>
                Real-time and archived ocean variables from Copernicus Marine Service satellite observations.
              </div>

              {/* ── Ocean Colour · Monthly archive ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d4e9f333" }}>Ocean Colour · Monthly archive</span>
                {activeCmsVar && (
                  <button
                    onClick={() => setActiveCmsVar(null)}
                    style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
                  >off</button>
                )}
              </div>

              {/* Layer select — grouped by ocean-colour category */}
              <select
                data-testid="expanded-cms-layer-select"
                value={activeCmsVar ?? ""}
                onChange={e => setActiveCmsVar((e.target.value as CmsVar) || null)}
                style={{
                  width: "100%", fontSize: 10, fontFamily: "Inter,sans-serif", fontWeight: 600,
                  background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.25)",
                  borderRadius: 7, padding: "6px 10px",
                  color: activeCmsVar ? "#00b894" : "#d4e9f355",
                  cursor: "pointer", outline: "none", marginBottom: 8,
                }}
              >
                <option value="">— Off —</option>
                <optgroup label="Phytoplankton">
                  {CMS_LAYERS.filter(l => !(l as any).dataset).map(l => (
                    <option key={l.var} value={l.var}>{l.label} · {l.unit}</option>
                  ))}
                </optgroup>
                <optgroup label="Light & Optics">
                  {CMS_LAYERS.filter(l => (l as any).dataset === CMS_DS_OPTICS).map(l => (
                    <option key={l.var} value={l.var}>{l.label} · {l.unit}</option>
                  ))}
                </optgroup>
                <optgroup label="Transparency">
                  {CMS_LAYERS.filter(l => (l as any).dataset === CMS_DS_TRANSP).map(l => (
                    <option key={l.var} value={l.var}>{l.label} · {l.unit}</option>
                  ))}
                </optgroup>
              </select>

              {/* Dataset info card — shown when CMS layer active */}
              {activeCmsVar && activeCmsLayer && (
                <div style={{
                  background: `${activeCmsLayer.color}0d`,
                  border: `1px solid ${activeCmsLayer.color}33`,
                  borderRadius: 7, padding: "8px 10px", marginBottom: 7,
                  fontFamily: "Inter,sans-serif",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4, marginBottom: 5 }}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: activeCmsLayer.color, lineHeight: 1.35, flex: 1 }}>
                      Global Ocean Colour (Copernicus-GlobColour) from Satellite Observations
                    </div>
                    <span style={{
                      fontSize: 6.5, fontWeight: 800, letterSpacing: "0.07em",
                      background: "rgba(0,184,148,0.18)", border: "1px solid rgba(0,184,148,0.45)",
                      borderRadius: 4, padding: "1px 5px", color: "#00b894", whiteSpace: "nowrap", flexShrink: 0,
                    }}>L4</span>
                  </div>
                  <div style={{ fontSize: 6.5, color: "#d4e9f333", marginBottom: 6, fontFamily: "monospace" }}>
                    OCEANCOLOUR_GLO_BGC_L4_MY_009_104
                  </div>
                  {([
                    ["Variable",   `${activeCmsVar} — ${activeCmsLayer.label} (${activeCmsLayer.unit})`],
                    ["Resolution", "4 km · Level 4 gapfilled"],
                    ["Cadence",    `Monthly · ${cmsMonthLabel(cmsYYYYMM)}`],
                    ["Depth",      "Surface · Euphotic zone"],
                    ["Coverage",   "Global · Sep 1997 – Mar 2026"],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 6, marginBottom: 2.5 }}>
                      <span style={{ fontSize: 7.5, color: "#d4e9f333", minWidth: 64, fontWeight: 600, flexShrink: 0 }}>{k}</span>
                      <span style={{ fontSize: 7.5, color: "#d4e9f3aa", lineHeight: 1.3 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Time navigator — only shown when a layer is active */}
              {activeCmsVar && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <button
                    onClick={() => setCmsYYYYMM(v => cmsNavMonth(v, -1))}
                    disabled={cmsYYYYMM <= CMS_MIN_YM}
                    style={{ fontSize: 13, background: "none", border: "1px solid rgba(131,238,240,0.2)", borderRadius: 4, color: cmsYYYYMM <= CMS_MIN_YM ? "#d4e9f322" : "#83eef0", cursor: cmsYYYYMM <= CMS_MIN_YM ? "default" : "pointer", padding: "1px 6px", lineHeight: 1 }}
                  >‹</button>
                  <span style={{ flex: 1, textAlign: "center", fontSize: 10, fontFamily: "Inter,sans-serif", fontWeight: 600, color: "#83eef0" }}>
                    {cmsMonthLabel(cmsYYYYMM)}
                  </span>
                  <button
                    onClick={() => setCmsYYYYMM(v => cmsNavMonth(v, +1))}
                    disabled={cmsYYYYMM >= CMS_MAX_YM}
                    style={{ fontSize: 13, background: "none", border: "1px solid rgba(131,238,240,0.2)", borderRadius: 4, color: cmsYYYYMM >= CMS_MAX_YM ? "#d4e9f322" : "#83eef0", cursor: cmsYYYYMM >= CMS_MAX_YM ? "default" : "pointer", padding: "1px 6px", lineHeight: 1 }}
                  >›</button>
                </div>
              )}

              {/* Download via Toolbox */}
              {activeCmsVar && (
                <button
                  data-testid="expanded-toggle-toolbox"
                  onClick={() => setShowToolbox(v => v === 'cms' ? null : 'cms')}
                  style={{
                    width: "100%", fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700,
                    padding: "5px 0", borderRadius: 6, cursor: "pointer",
                    background: showToolbox === 'cms' ? "rgba(0,184,148,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${showToolbox === 'cms' ? "rgba(0,184,148,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: showToolbox === 'cms' ? "#00b894" : "#d4e9f366",
                    transition: "all 0.15s",
                  }}
                >⬇ Download via Copernicus Marine Toolbox</button>
              )}

              {/* Attribution note */}
              <div style={{ fontSize: 7, color: "#d4e9f325", marginTop: 6, lineHeight: 1.4 }}>
                © Mercator Ocean International · Copernicus Marine Service (CMEMS)
              </div>
            </div>

            {/* ── Ocean State · Live ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(131,238,240,0.06)" }}>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d4e9f333" }}>
                  Ocean State · Live observations
                </span>
                {activeLiveVar && (
                  <button
                    onClick={() => { setActiveLiveVar(null); setShowToolbox(null); }}
                    style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
                  >off</button>
                )}
              </div>

              {/* Ocean State select — all 7 groups as optgroups */}
              <select
                data-testid="expanded-live-layer-select"
                value={activeLiveVar ?? ""}
                onChange={e => {
                  setActiveLiveVar((e.target.value as LiveVar) || null);
                  setActiveCmsVar(null);
                  if (showToolbox === 'cms') setShowToolbox(null);
                }}
                style={{
                  width: "100%", fontSize: 10, fontFamily: "Inter,sans-serif", fontWeight: 600,
                  background: "rgba(116,185,255,0.08)", border: "1px solid rgba(116,185,255,0.22)",
                  borderRadius: 7, padding: "6px 10px",
                  color: activeLiveVar ? "#74b9ff" : "#d4e9f355",
                  cursor: "pointer", outline: "none", marginBottom: activeLiveVar ? 8 : 0,
                }}
              >
                <option value="">— Off —</option>
                {LIVE_GROUPS.map(grp => (
                  <optgroup key={grp} label={grp}>
                    {LIVE_LAYERS.filter(l => l.group === grp).map(l => (
                      <option key={l.var} value={l.var}>{l.label} · {l.unit}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {activeLiveVar && activeLiveLayer && (
                <div style={{ marginBottom: 6 }}>
                  {/* ── Dataset info card ── */}
                  <div style={{
                    background: `${activeLiveLayer.color}0d`,
                    border: `1px solid ${activeLiveLayer.color}33`,
                    borderRadius: 7, padding: "8px 10px", marginBottom: 7,
                    fontFamily: "Inter,sans-serif",
                  }}>
                    {/* Title + NRT badge */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4, marginBottom: 5 }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: activeLiveLayer.color, lineHeight: 1.35, flex: 1 }}>
                        {activeLiveLayer.productTitle}
                      </div>
                      {activeLiveLayer.coverage.includes("NRT") && (
                        <span style={{
                          fontSize: 6.5, fontWeight: 800, letterSpacing: "0.07em",
                          background: "rgba(0,184,148,0.18)", border: "1px solid rgba(0,184,148,0.45)",
                          borderRadius: 4, padding: "1px 5px", color: "#00b894", whiteSpace: "nowrap", flexShrink: 0,
                        }}>NRT</span>
                      )}
                    </div>
                    {/* Product ID */}
                    <div style={{ fontSize: 6.5, color: "#d4e9f333", marginBottom: 6, fontFamily: "monospace", letterSpacing: "0.02em" }}>
                      {activeLiveLayer.product}
                    </div>
                    {/* Metrics grid */}
                    {([
                      ["Resolution", activeLiveLayer.resolution],
                      ["Cadence",    activeLiveLayer.cadence],
                      ["Depth",      activeLiveLayer.depthRange],
                      ["Coverage",   activeLiveLayer.coverage],
                      ["Variable",   `${activeLiveLayer.wmtsVar ?? activeLiveLayer.var} · ${activeLiveLayer.unit}`],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 6, marginBottom: 2.5 }}>
                        <span style={{ fontSize: 7.5, color: "#d4e9f333", minWidth: 64, fontWeight: 600, flexShrink: 0 }}>{k}</span>
                        <span style={{ fontSize: 7.5, color: "#d4e9f3aa", lineHeight: 1.3 }}>{v}</span>
                      </div>
                    ))}
                    {/* Inline colorbar + depth indicator */}
                    {CMAP_CSS[activeLiveLayer.cmap] && LAYER_VALUE_RANGES[activeLiveVar] && (
                      <div style={{ marginTop: 6, paddingTop: 5, borderTop: `1px solid ${activeLiveLayer.color}22` }}>
                        <div style={{ height: 8, borderRadius: 3, background: CMAP_CSS[activeLiveLayer.cmap], marginBottom: 3 }}/>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#d4e9f366" }}>
                          <span style={{ fontWeight: 700 }}>{LAYER_VALUE_RANGES[activeLiveVar][0]}</span>
                          <span>{LAYER_VALUE_RANGES[activeLiveVar][2]}</span>
                          <span style={{ fontWeight: 700 }}>{LAYER_VALUE_RANGES[activeLiveVar][1]}</span>
                        </div>
                        {activeLiveLayer.elevation != null && (
                          <div style={{ marginTop: 4 }}>
                            <div style={{ fontSize: 7.5, color: "#d4e9f355", marginBottom: 5 }}>
                              Depth: <span style={{ color: activeLiveLayer.color, fontWeight: 700 }}>{liveDepthM === 0 ? "Surface" : `${liveDepthM} m`}</span>
                            </div>
                            <div style={{ fontSize: 6.5, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d4e9f322", marginBottom: 4 }}>↕ Depth (500 m steps)</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {(COMPACT_DEPTH_STEPS as readonly number[]).map(m => (
                                <button
                                  key={m}
                                  data-testid={`expanded-depth-${m}`}
                                  onClick={() => { setLiveDepthM(m); setLiveDepthIdx(Math.round(m / 5500 * (DEPTH_LEVELS.length - 1))); }}
                                  style={{
                                    fontSize: 7.5, fontFamily: "Inter,sans-serif", fontWeight: 600,
                                    padding: "2px 6px", borderRadius: 20, cursor: "pointer",
                                    background: liveDepthM === m ? `${activeLiveLayer.color}22` : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${liveDepthM === m ? `${activeLiveLayer.color}99` : "rgba(255,255,255,0.1)"}`,
                                    color: liveDepthM === m ? activeLiveLayer.color : "#d4e9f344",
                                    transition: "all 0.15s",
                                  }}
                                >{m === 0 ? "Surface" : `${m} m`}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    data-testid="expanded-toggle-live-toolbox"
                    onClick={() => setShowToolbox(v => v === 'live' ? null : 'live')}
                    style={{
                      width: "100%", fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700,
                      padding: "5px 0", borderRadius: 6, cursor: "pointer",
                      background: showToolbox === 'live' ? "rgba(0,184,148,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${showToolbox === 'live' ? "rgba(0,184,148,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: showToolbox === 'live' ? "#00b894" : "#d4e9f366",
                      transition: "all 0.15s",
                    }}
                  >⬇ Download via Copernicus Marine Toolbox</button>
                </div>
              )}

              <div style={{ fontSize: 7, color: "#d4e9f325", marginTop: activeLiveVar ? 0 : 4, lineHeight: 1.4 }}>
                PHY_001_024 · BGC_001_028 · WAV_001_027 · MULTIOBS_015_012 · SEALEVEL_008_047 · WIND_L4_NRT · SST NRT · Mercator Ocean / CMEMS
              </div>
            </div>

            {/* ── Boundaries & Regions ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2, marginTop: 10 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Boundaries & Regions</span>
              <button
                onClick={() => { const all = showCoralMapping && showMarineRegions && showGcrmn && showGcrmnSites; setShowCoralMapping(!all); setShowMarineRegions(!all); setShowGcrmn(!all); setShowGcrmnSites(!all); }}
                style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
              >{showCoralMapping && showMarineRegions && showGcrmn && showGcrmnSites ? "off" : "all"}</button>
            </div>
            <div style={{ fontSize: 7.5, color: "#d4e9f328", marginBottom: 5, lineHeight: 1.5 }}>Maritime zones, reef extents and global monitoring regions overlaid on the ocean.</div>
            <LayerToggle label="Coral Reef Regions"  sublabel="Mapped reef extents from satellite imagery — Allen Coral Atlas / UQ"                    active={showCoralMapping}  color="#fd7272" onClick={() => setShowCoralMapping(v => !v)}  testId="expanded-toggle-coral-mapping" />
            <LayerToggle label="EEZ Boundaries"      sublabel="Each country's exclusive maritime jurisdiction zone — MarineRegions.org / VLIZ"         active={showMarineRegions} color="#fdcb6e" onClick={() => setShowMarineRegions(v => !v)} testId="expanded-toggle-marine-regions" />
            <LayerToggle label="GCRMN Regions"       sublabel="10 coordinated zones for standardised global reef health monitoring"                    active={showGcrmn}         color="#1dd1a1" onClick={() => setShowGcrmn(v => !v)}         testId="expanded-toggle-gcrmn" />
            {showGcrmn && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", marginLeft: 10, marginBottom: 5, marginTop: 2 }}>
                {Object.entries(GCRMN_COLORS).map(([key, color]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 6, borderRadius: 1, background: color + "66", border: `1px solid ${color}`, display: "inline-block", flexShrink: 0 }}/>
                    <span style={{ fontSize: 7.5, color: "#d4e9f355", fontFamily: "Inter,sans-serif" }}>{GCRMN_LONG[key] ?? key}</span>
                  </div>
                ))}
              </div>
            )}
            <LayerToggle label="GCRMN Sites 2026"    sublabel={`${GCRMN_SITES_2026.length} territories covered — circle size proportional to survey count`} active={showGcrmnSites} color="#A6CE39" onClick={() => setShowGcrmnSites(v => !v)} testId="expanded-toggle-gcrmn-sites" />

            {/* ── Field Monitoring ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 2px" }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Field Monitoring</span>
              <button
                onClick={() => { const all = showGcrmnMonSites && showReefCheck && showReefLife && showWcsCcSites && showWcsReefCloud; [setShowGcrmnMonSites, setShowReefCheck, setShowReefLife, setShowWcsCcSites, setShowWcsReefCloud].forEach(fn => fn(!all)); }}
                style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
              >{showGcrmnMonSites && showReefCheck && showReefLife && showWcsCcSites && showWcsReefCloud ? "off" : "all"}</button>
            </div>
            <div style={{ fontSize: 7.5, color: "#d4e9f328", marginBottom: 5, lineHeight: 1.5 }}>In-situ reef health survey stations from major international scientific monitoring programmes.</div>
            <LayerToggle label="GCRMN Benthic Sites" sublabel="Fixed stations measuring coral cover and benthic organisms — gcrmndb_benthos"             active={showGcrmnMonSites} color="#26de81" onClick={() => setShowGcrmnMonSites(v => !v)} testId="expanded-toggle-gcrmn-mon-sites" />
            <LayerToggle label="Reef Check"          sublabel="~6,200 sites tracking bleaching events and coral cover changes since 1996"                active={showReefCheck}     color="#fd9644" onClick={() => setShowReefCheck(v => !v)}     testId="expanded-toggle-reef-check" />
            <LayerToggle label="Reef Life Survey"    sublabel="4,147 standardised fish and invertebrate survey sites worldwide"                          active={showReefLife}      color="#45aaf2" onClick={() => setShowReefLife(v => !v)}      testId="expanded-toggle-reef-life" />
            <LayerToggle label="WCS Coral Cover"     sublabel="4,766 coral cover transect sites from Wildlife Conservation Society"                     active={showWcsCcSites}    color="#ff6b9d" onClick={() => setShowWcsCcSites(v => !v)}    testId="expanded-toggle-wcs-cc-sites" />
            <LayerToggle label="WCS ReefCloud"       sublabel="14,501 AI-powered underwater photo monitoring stations — WCS Marine global programme"    active={showWcsReefCloud}  color="#e056fd" onClick={() => setShowWcsReefCloud(v => !v)}  testId="expanded-toggle-wcs-reefcloud" />

            {/* ── Community ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 2px" }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Community</span>
            </div>
            <div style={{ fontSize: 7.5, color: "#d4e9f328", marginBottom: 5, lineHeight: 1.5 }}>Members who've shared their location and community-submitted reef imagery.</div>
            <LayerToggle label="Regen Reef Members"  sublabel={`${markers.length} members on the Regen Reef Network`}                                   active={showDaoMembers}    color="#83eef0" onClick={() => setShowDaoMembers(v => !v)} testId="expanded-toggle-dao-members" />
            <LayerToggle label="Reef Photos"         sublabel={`${reefImgs.length} peer-reviewed photos from community reef surveys`}                   active={showImgs}          color="#ff9f43" onClick={() => setShowImgs(v => !v)}          testId="expanded-toggle-imgs" />
          </SideSection>


          <SideSection title="Map Key">
            {/* Each row only shows when its layer is active */}
            {showMarineRegions && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:13,height:8,borderRadius:2,background:"rgba(253,203,110,0.2)",border:"1.5px solid #fdcb6e",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Exclusive Economic Zone (EEZ)</span>
              </div>
            )}
            {showCoralMapping && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:13,height:8,borderRadius:2,background:"rgba(253,114,114,0.2)",border:"1.5px solid #fd7272",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>CoralMapping reef region</span>
              </div>
            )}
            {showGcrmn && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:13,height:8,borderRadius:2,background:"rgba(29,209,161,0.35)",border:"1.5px solid #1dd1a1",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>GCRMN monitoring region</span>
              </div>
            )}
            {showGcrmnSites && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <span style={{ width:11,height:11,borderRadius:"50%",background:"#A6CE3988",border:"1.5px solid #A6CE39",display:"inline-block",flexShrink:0 }}/>
                  <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>GCRMN monitoring territory</span>
                </div>
                <div style={{ fontSize: 8.5, color: "#d4e9f344", marginLeft: 19, marginBottom: 2, marginTop: -1 }}>
                  Circle size ∝ survey count
                </div>
              </>
            )}
            {showDaoMembers && markers.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:11,height:11,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Regen Reef Member</span>
              </div>
            )}
            {showImgs && reefImgs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:13,height:13,borderRadius:3,background:"#ff9f43",border:"1.5px solid #ffb347",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Community reef photo</span>
              </div>
            )}
            {showGcrmnMonSites && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(38,222,129,0.45)",border:"1.5px solid #26de81",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>GCRMN Benthic Site</span>
              </div>
            )}
            {showReefCheck && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(253,150,68,0.45)",border:"1.5px solid #fd9644",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Reef Check monitoring station</span>
              </div>
            )}
            {showReefLife && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(69,170,242,0.45)",border:"1.5px solid #45aaf2",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Reef Life Survey site</span>
              </div>
            )}
            {showWcsCcSites && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(255,107,157,0.45)",border:"1.5px solid #ff6b9d",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>WCS coral cover survey site</span>
              </div>
            )}
            {showWcsReefCloud && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(224,86,253,0.45)",border:"1.5px solid #e056fd",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>WCS ReefCloud monitoring site</span>
              </div>
            )}
            {!showMarineRegions && !showCoralMapping && !showGcrmn && !showGcrmnSites && !showDaoMembers && !showImgs && !showGcrmnMonSites && !showReefCheck && !showReefLife && !showWcsCcSites && !showWcsReefCloud && (
              <div style={{ fontSize: 9, color: "#d4e9f333", fontStyle: "italic" }}>No point or boundary layers active</div>
            )}
          </SideSection>

          {showGcrmnMonSites && gcrmnCountryStats.length > 0 && (
            <SideSection title="GCRMN Sites by Country">
              <div style={{ fontSize: 9, color: "#26de8188", marginBottom: 7 }}>
                Top countries · {gcrmnUniqueCountries} countries total · hover dots for details
              </div>
              {gcrmnCountryStats.map(([country, count]) => (
                <div key={country} style={{ marginBottom: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                    <span style={{ fontSize: 9.5, color: "#d4e9f3cc", maxWidth: 158, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{country}</span>
                    <span style={{ fontSize: 9, color: "#26de81", fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>{count.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(38,222,129,0.1)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${(count / gcrmnCountryStats[0][1]) * 100}%`, background: "#26de81", borderRadius: 2, opacity: 0.65 }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 8.5, color: "#d4e9f333", marginTop: 4, borderTop: "1px solid rgba(38,222,129,0.08)", paddingTop: 5 }}>
                Geocoded via Natural Earth 50m + Marine Regions EEZ
              </div>
            </SideSection>
          )}

          {(showWcsReefCloud || showWcsCcSites || showReefCheck || showReefLife || showGcrmnMonSites) && (
            <SideSection title="WCS Marine Datasets">
              <div style={{ fontSize: 9.5, color: "#d4e9f3aa", lineHeight: 1.5, marginBottom: 8 }}>
                Wildlife Conservation Society (WCS) Marine Program global reef monitoring data. Includes ReefCloud stations, coral cover field records, Reef Check surveys with coral cover and bleaching metrics, and Reef Life Survey sites with full ecoregion and realm metadata, the same input datasets used by the WCS <em>global-reef-data-layers</em> analysis pipeline.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px", marginBottom: 8 }}>
                {[
                  ["ReefCloud Sites", "14,501"],
                  ["CC Survey Sites", "4,766"],
                  ["Reef Check Stns", "~6,200"],
                  ["RLS Sites", "4,147"],
                  ["GCRMN Stns", "11,619"],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ background: "rgba(224,86,253,0.07)", border: "1px solid rgba(224,86,253,0.25)", borderRadius: 6, padding: "5px 7px" }}>
                    <div style={{ fontSize: 7.5, color: "#e056fd88", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e056fd" }}>{v}</div>
                  </div>
                ))}
              </div>
              {[
                { label: "WCS.org: Marine Program", href: "https://www.wcs.org/", color: "#e056fd" },
                { label: "WCS-Marine / global-monitoring-maps", href: "https://github.com/WCS-Marine/global-monitoring-maps", color: "#e056fdbb" },
                { label: "WCS-Marine / global-reef-data-layers", href: "https://github.com/WCS-Marine/global-reef-data-layers", color: "#e056fdbb" },
                { label: "ReefCloud: AIMS reef monitoring", href: "https://reefcloud.ai", color: "#ff6b9d" },
                { label: "Reef Check International", href: "https://www.reefcheck.org", color: "#fd9644" },
                { label: "Reef Life Survey", href: "https://reeflifesurvey.com", color: "#45aaf2" },
                { label: "GCRMN / gcrmndb_benthos", href: "https://github.com/GCRMN/gcrmndb_benthos", color: "#26de81" },
              ].map(({ label, href, color }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", fontSize: 9, color, textDecoration: "none", padding: "2px 0", marginBottom: 2 }}
                >
                  ↗ {label}
                </a>
              ))}
            </SideSection>
          )}

          <SideSection title="GCRMN Benthos Dataset">
            <div style={{ fontSize: 9.5, color: "#d4e9f3aa", lineHeight: 1.5, marginBottom: 8 }}>
              The GCRMN <em>gcrmndb_benthos</em> synthetic dataset integrates benthic cover surveys from contributing national and regional monitoring programs into a single harmonised record.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px", marginBottom: 8 }}>
              {[
                ["Territories", GCRMN_SITES_2026.length],
                ["Total Sites", GCRMN_TOTALS.sites.toLocaleString()],
                ["Total Surveys", GCRMN_TOTALS.surveys.toLocaleString()],
                ["Time Span", "1973–2025"],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ background: "rgba(166,206,57,0.07)", border: "1px solid rgba(166,206,57,0.2)", borderRadius: 6, padding: "5px 7px" }}>
                  <div style={{ fontSize: 7.5, color: "#A6CE3988", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#A6CE39" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8.5, color: "#d4e9f344", lineHeight: 1.4, marginBottom: 6 }}>
              Variables: country · territory · site · lat/lon · date · habitat · zone · transect · benthic cover category &amp; sub-category · observer
            </div>
            <a
              href="https://github.com/GCRMN/gcrmndb_benthos#6-description-of-the-synthetic-dataset"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", fontSize: 9, color: "#A6CE39", textDecoration: "none",
                border: "1px solid #A6CE3944", borderRadius: 5, padding: "4px 8px",
                textAlign: "center", fontWeight: 600,
              }}
            >
              ↗ GCRMN / gcrmndb_benthos (GitHub)
            </a>
          </SideSection>

          <SideSection title="Marine Regions · EEZ">
            <div style={{ fontSize: 9.5, color: "#d4e9f3aa", lineHeight: 1.5, marginBottom: 8 }}>
              Marine Regions is a standard reference list of marine place names and geographic areas from the world's seas and oceans, maintained by VLIZ. The EEZ layer shows Exclusive Economic Zones, maritime boundaries within which coastal nations exercise sovereign rights over resources.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px", marginBottom: 8 }}>
              {[
                ["Coverage",  "Global"],
                ["EEZ zones", "~200+"],
                ["Source",    "VLIZ"],
                ["API",       "mregions2"],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ background: "rgba(253,203,110,0.07)", border: "1px solid rgba(253,203,110,0.25)", borderRadius: 6, padding: "5px 7px" }}>
                  <div style={{ fontSize: 7.5, color: "#fdcb6e88", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fdcb6e" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#fdcb6e", marginBottom: 2 }}>mregions2</div>
              <div style={{ fontSize: 9, color: "#d4e9f377", lineHeight: 1.4 }}>
                rOpenSci R package for querying the Marine Regions Gazetteer and GeoServer. Returns EEZ, IHO Sea Areas, Large Marine Ecosystems, Marine Ecoregions, and 27,000+ other standardised marine place names with geometry.
              </div>
            </div>
            {[
              { label: "MarineRegions.org (VLIZ)",        href: "https://www.marineregions.org",                                          color: "#fdcb6e" },
              { label: "mregions2: rOpenSci (GitHub)",    href: "https://github.com/ropensci/mregions2",                                  color: "#ffeaa7" },
              { label: "mregions2 documentation",         href: "https://docs.ropensci.org/mregions2/",                                   color: "#ffeaa7" },
              { label: "Marine Regions Gazetteer",        href: "https://www.marineregions.org/gazetteer.php",                            color: "#ffeaa7" },
              { label: "EEZ GeoServer layer",             href: "https://geo.vliz.be/geoserver/MarineRegions/wms?SERVICE=WMS&REQUEST=GetCapabilities", color: "#ffeaa7" },
            ].map(({ label, href, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", fontSize: 9, color, textDecoration: "none", padding: "2px 0", marginBottom: 2 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#83eef0")}
                onMouseLeave={e => (e.currentTarget.style.color = color)}
              >
                ↗ {label}
              </a>
            ))}
          </SideSection>

          <SideSection title="CoralMapping Reef Regions">
            <div style={{ fontSize: 9.5, color: "#d4e9f3aa", lineHeight: 1.5, marginBottom: 8 }}>
              Region boundary masks from the University of Queensland's Allen Coral Atlas pipeline, defining the spatial extents used to task Planet satellite imagery and generate reef maps globally.
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#fd7272", marginBottom: 2 }}>GlobalMappingRegions</div>
              <div style={{ fontSize: 9, color: "#d4e9f377", lineHeight: 1.4 }}>
                GeoJSON region mask files covering 29 reef zones, from the Great Barrier Reef and Hawaiian Islands to the Red Sea, Coral Sea, and Mesoamerican Reef.
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#fdcb6e", marginBottom: 2 }}>proc_gee_utils</div>
              <div style={{ fontSize: 9, color: "#d4e9f377", lineHeight: 1.4 }}>
                Python utility library for Google Earth Engine authentication and processing, used to generate geomorphic and benthic zone maps from Planet and Sentinel-2 imagery at 5 m resolution.
              </div>
            </div>
            {[
              { label: "CoralMapping / GlobalMappingRegions", href: "https://github.com/CoralMapping/GlobalMappingRegions", color: "#fd7272" },
              { label: "CoralMapping / proc_gee_utils",       href: "https://github.com/CoralMapping/proc_gee_utils",       color: "#fdcb6e" },
            ].map(({ label, href, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", fontSize: 9, color, textDecoration: "none", padding: "2px 0", marginBottom: 2 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#83eef0")}
                onMouseLeave={e => (e.currentTarget.style.color = color)}
              >
                ↗ {label}
              </a>
            ))}
          </SideSection>

          <SideSection title="Data Sources">
            {[
              { label: "Marine Regions · EEZ (VLIZ / mregions2)",     href: "https://www.marineregions.org",                           color: "#fdcb6e" },
              { label: "CoralMapping / GlobalMappingRegions",          href: "https://github.com/CoralMapping/GlobalMappingRegions",     color: "#fd7272" },
              { label: "CoralMapping / proc_gee_utils",                href: "https://github.com/CoralMapping/proc_gee_utils",           color: "#fdcb6e" },
              { label: "GCRMN gcrmndb_benthos",                        href: "https://github.com/GCRMN/gcrmndb_benthos#6-description-of-the-synthetic-dataset", color: "#A6CE39" },
              { label: "WCS-Marine / global-monitoring-maps",          href: "https://github.com/WCS-Marine/global-monitoring-maps",     color: "#e056fd" },
              { label: "WCS-Marine / global-reef-data-layers",         href: "https://github.com/WCS-Marine/global-reef-data-layers",    color: "#ff6b9d" },
              { label: "WCS.org: Marine Program",                      href: "https://www.wcs.org/",                                    color: "#e056fdaa" },
              { label: "Esri Ocean Basemap",                           href: "https://www.arcgis.com",                                  color: "#83eef099" },
              { label: "GCRMN Regions",                                href: "https://gcrmn.net",                                       color: "#83eef099" },
              { label: "NOAA Coral Reef Watch",                        href: "https://coralreefwatch.noaa.gov",                         color: "#83eef099" },
            ].map(({ label, href, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", fontSize: 10, color, textDecoration: "none", padding: "2px 0" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#83eef0")}
                onMouseLeave={e => (e.currentTarget.style.color = color)}
              >
                ↗ {label}
              </a>
            ))}
          </SideSection>
        </div>
      </div>
    </div>
  );
  return inline ? content : createPortal(content, document.body);
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
  const [hovered, setHovered] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
        background: active ? `${color}15` : hovered ? "rgba(131,238,240,0.05)" : "transparent",
        border: `1px solid ${active ? color + "44" : hovered ? "rgba(131,238,240,0.16)" : "rgba(131,238,240,0.08)"}`,
        borderRadius: 9, padding: "8px 10px", cursor: "pointer", marginBottom: 5,
        textAlign: "left", transition: "background 0.15s, border-color 0.15s",
        boxShadow: active ? `inset 0 1px 0 ${color}18` : "none",
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
        background: active ? color : hovered ? "rgba(131,238,240,0.06)" : "transparent",
        border: `1.5px solid ${active ? color : hovered ? color + "55" : color + "33"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? `0 0 8px ${color}44` : "none",
        transition: "all 0.18s",
      }}>
        {active && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: 600, fontFamily: "Inter,sans-serif",
          color: active ? "#d4e9f3" : hovered ? "#d4e9f377" : "#d4e9f355",
          transition: "color 0.15s",
        }}>{label}</div>
        <div style={{
          fontSize: 9, color: active ? "#d4e9f340" : "#d4e9f328", marginTop: 2,
          fontFamily: "Inter,sans-serif", lineHeight: 1.4,
        }}>{sublabel}</div>
      </div>
    </button>
  );
}

// ─── Compact layer row (checkbox + hover state) ────────────────────────────────
function CompactLayerRow({
  testId, label, sublabel, color, active, toggle,
}: {
  testId: string; label: string; sublabel?: string; color: string; active: boolean; toggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        width: "100%", textAlign: "left", cursor: "pointer",
        padding: "5px 9px", borderRadius: 7,
        background: active
          ? `${color}16`
          : hovered
          ? "rgba(131,238,240,0.045)"
          : "transparent",
        border: `1px solid ${active ? color + "38" : hovered ? "rgba(131,238,240,0.13)" : "transparent"}`,
        transition: "background 0.13s, border-color 0.13s",
        marginBottom: 2,
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 13, height: 13, borderRadius: 3, flexShrink: 0,
        background: active ? color : "transparent",
        border: `1.5px solid ${active ? color : hovered ? color + "66" : color + "33"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? `0 0 6px ${color}55` : "none",
        transition: "all 0.15s",
      }}>
        {active && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {/* Color swatch */}
      <div style={{
        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
        background: color,
        opacity: active ? 0.85 : 0.25,
        transition: "opacity 0.15s",
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10.5, fontFamily: "Inter,sans-serif",
          fontWeight: active ? 600 : 400,
          color: active ? "#d4e9f3ee" : hovered ? "#d4e9f366" : "#d4e9f344",
          transition: "color 0.13s",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{label}</div>
        {sublabel && (
          <div style={{
            fontSize: 8, fontFamily: "Inter,sans-serif",
            color: active ? "#d4e9f330" : "#d4e9f322",
            marginTop: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{sublabel}</div>
        )}
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
  const [showGcrmn,         setShowGcrmn]         = useState(true);
  const [showCoralMapping,  setShowCoralMapping]  = useState(true);
  const [showMarineRegions, setShowMarineRegions] = useState(true);
  const [showImgs,          setShowImgs]          = useState(true);
  const [showDaoMembers,    setShowDaoMembers]    = useState(true);
  const [showGcrmnSites,    setShowGcrmnSites]    = useState(true);
  const [showLayerMenu,     setShowLayerMenu]     = useState(false);
  const [internalExpanded,  setInternalExpanded]  = useState(false);
  const [activeCmsVar,      setActiveCmsVar]      = useState<CmsVar | null>(null);
  const [cmsYYYYMM,         setCmsYYYYMM]         = useState(CMS_MAX_YM);
  const [showToolbox,       setShowToolbox]       = useState<'cms'|'live'|null>(null);
  const [activeLiveVar,     setActiveLiveVar]     = useState<LiveVar|null>(null);
  const [compactLiveDate,   setCompactLiveDate]   = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 3);
    return d.toISOString().slice(0, 10) + "T00:00:00Z";
  });
  const [compactDepthM,     setCompactDepthM]     = useState<number>(0);
  const [showWcsReefCloudC, setShowWcsReefCloudC] = useState(false);
  const [showWcsCcSitesC,   setShowWcsCcSitesC]   = useState(false);
  const [showReefCheckC,    setShowReefCheckC]    = useState(false);
  const [showReefLifeC,     setShowReefLifeC]     = useState(false);
  const [showGcrmnMonC,     setShowGcrmnMonC]     = useState(false);

  const activeCmsLayer = activeCmsVar
    ? CMS_LAYERS.find(l => l.var === activeCmsVar) ?? null
    : null;
  const cmsTileUrl = activeCmsLayer
    ? buildCmsTileUrl(activeCmsLayer.var as CmsVar, activeCmsLayer.cmap, cmsYYYYMM, (activeCmsLayer as any).dataset)
    : null;
  const activeLiveLayer = activeLiveVar
    ? LIVE_LAYERS.find(l => l.var === activeLiveVar) ?? null
    : null;
  const liveTileUrl = activeLiveLayer
    ? buildLiveTileUrl(
        activeLiveLayer,
        compactLiveDate,
        activeLiveLayer.elevation != null
          ? (compactDepthM === 0 ? activeLiveLayer.elevation : -compactDepthM)
          : null,
      )
    : null;

  const expanded  = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setExpanded = onExpandChange ?? setInternalExpanded;

  const { login, authenticated } = usePrivy();

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

  const { data: coralMappingGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/coral-mapping/regions"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: compactWcsReefCloudGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/reefcloud-sites"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showWcsReefCloudC,
  });
  const { data: compactWcsCcGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/cc-sites"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showWcsCcSitesC,
  });
  const { data: compactReefCheckGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/reef-check"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showReefCheckC,
  });
  const { data: compactReefLifeGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/reef-life"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showReefLifeC,
  });
  const { data: compactGcrmnMonGeoJson } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/wcs/gcrmn-mon-sites"],
    staleTime: 24 * 60 * 60 * 1000,
    enabled: showGcrmnMonC,
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
          <MapResizer />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="© Esri"
            maxZoom={10}
          />
          {cmsTileUrl && (
            <TileLayer
              key={cmsTileUrl}
              url={cmsTileUrl}
              opacity={0.72}
              maxZoom={10}
              attribution='© Copernicus Marine Service · Mercator Ocean International'
            />
          )}
          {liveTileUrl && (
            <TileLayer
              key={liveTileUrl}
              url={liveTileUrl}
              opacity={0.72}
              maxZoom={10}
              attribution='© Copernicus Marine Service · Mercator Ocean International'
            />
          )}
          {showMarineRegions && (
            <WMSTileLayer
              url="https://geo.vliz.be/geoserver/MarineRegions/wms"
              layers="MarineRegions:eez"
              format="image/png"
              transparent={true}
              opacity={0.4}
              version="1.1.1"
              attribution='© MarineRegions.org · VLIZ'
            />
          )}
          {showCoralMapping && coralMappingGeoJson && (
            <GeoJSON
              key="coral-mapping-compact"
              data={coralMappingGeoJson}
              style={() => ({
                color: "#fd7272", weight: 1, opacity: 0.6,
                fillColor: "#fd7272", fillOpacity: 0.1,
              })}
            />
          )}
          {showGcrmn && gcrmnGeoJson && (
            <GeoJSON
              key="gcrmn"
              data={gcrmnGeoJson}
              style={gcrmnStyle}
              onEachFeature={bindGcrmnLayer}
            />
          )}
          {showGcrmnSites && GCRMN_SITES_2026.map((site) => (
            <CircleMarker
              key={`gcrmn-c-${site.territory}`}
              center={[site.lat, site.lon]}
              radius={gcrmnSiteRadius(site.surveys)}
              pathOptions={{
                color: "#A6CE39", weight: 1.2, opacity: 0.85,
                fillColor: "#A6CE39", fillOpacity: 0.28,
              }}
            >
              <Popup maxWidth={220}>
                <GcrmnSitePopup site={site} />
              </Popup>
            </CircleMarker>
          ))}
          {showDaoMembers && markers.map((m) => (
            <CircleMarker key={m.id} center={[m.latitude, m.longitude]} radius={7}
              pathOptions={{ color: "#83eef0", fillColor: "#83eef0", fillOpacity: 0.88, weight: 2 }}>
              <Popup maxWidth={200}>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, lineHeight: 1.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #83eef0", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(131,238,240,0.15)", border: "2px solid #83eef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🪸</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, color: "#00131c", fontSize: 12, lineHeight: 1.3 }}>{m.displayName}</div>
                      {m.orcidId && <div style={{ fontSize: 9, color: "#00b894", fontWeight: 600, marginTop: 1 }}>ORCID ✓</div>}
                    </div>
                  </div>
                  <div style={{ color: "#83eef0", fontWeight: 700, fontSize: 10, marginBottom: 2 }}>⚓ DAO Member · MesoReefDAO</div>
                  {m.points > 0 && <div style={{ color: "#666", fontSize: 9 }}>{m.points.toLocaleString()} contribution pts</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {showWcsReefCloudC && compactWcsReefCloudGeoJson && (
            <GeoJSON key="wcs-rc-c" data={compactWcsReefCloudGeoJson}
              pointToLayer={(_f, ll) => L.circleMarker(ll, { radius: 2.5, color: "#e056fd", weight: 0.7, fillColor: "#e056fd", fillOpacity: 0.55, opacity: 0.85 })} />
          )}
          {showWcsCcSitesC && compactWcsCcGeoJson && (
            <GeoJSON key="wcs-cc-c" data={compactWcsCcGeoJson}
              pointToLayer={(_f, ll) => L.circleMarker(ll, { radius: 2.5, color: "#ff6b9d", weight: 0.7, fillColor: "#ff6b9d", fillOpacity: 0.6, opacity: 0.85 })} />
          )}
          {showReefCheckC && compactReefCheckGeoJson && (
            <GeoJSON key="rc-c" data={compactReefCheckGeoJson}
              pointToLayer={(_f, ll) => L.circleMarker(ll, { radius: 2.5, color: "#fd9644", weight: 0.7, fillColor: "#fd9644", fillOpacity: 0.6, opacity: 0.85 })} />
          )}
          {showReefLifeC && compactReefLifeGeoJson && (
            <GeoJSON key="rls-c" data={compactReefLifeGeoJson}
              pointToLayer={(_f, ll) => L.circleMarker(ll, { radius: 2.5, color: "#45aaf2", weight: 0.7, fillColor: "#45aaf2", fillOpacity: 0.6, opacity: 0.85 })} />
          )}
          {showGcrmnMonC && compactGcrmnMonGeoJson && (
            <GeoJSON key="gcrmn-mon-c" data={compactGcrmnMonGeoJson}
              pointToLayer={(_f, ll) => L.circleMarker(ll, { radius: 2.5, color: "#26de81", weight: 0.7, fillColor: "#26de81", fillOpacity: 0.6, opacity: 0.85 })} />
          )}
          {showImgs && reefImgs.map((img) => (
            <Marker key={img.id} position={[img.latitude, img.longitude]} icon={makeImagePin()}>
              <Popup maxWidth={210}>
                <ReefImagePopup img={img} />
              </Popup>
            </Marker>
          ))}
          {markers.length > 0 && <FitBounds markers={markers} />}
        </MapContainer>

        {/* ── Minimal layer menu ── */}
        <div
          className="absolute top-2 left-2 pointer-events-auto"
          style={{ zIndex: 500 }}
        >
          <button
            data-testid="toggle-layer-menu"
            onClick={() => setShowLayerMenu(v => !v)}
            style={{
              background: showLayerMenu ? "rgba(131,238,240,0.15)" : "rgba(0,19,28,0.85)",
              border: `1px solid ${showLayerMenu ? "rgba(131,238,240,0.45)" : "rgba(131,238,240,0.22)"}`,
              borderRadius: 7, padding: "4px 9px",
              display: "flex", alignItems: "center", gap: 5,
              cursor: "pointer", color: "#83eef0cc",
              fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600,
            }}
          >
            <Layers size={10} color="#83eef0" />
            Layers
          </button>

          {showLayerMenu && (
            <div style={{
              marginTop: 6,
              background: "rgba(0,10,18,0.97)",
              border: "1px solid rgba(131,238,240,0.16)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(131,238,240,0.06)",
              minWidth: 232,
              backdropFilter: "blur(12px)",
              overflow: "hidden",
            }}>
              {/* ── Panel header ── */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px 8px",
                borderBottom: "1px solid rgba(131,238,240,0.08)",
                background: "rgba(131,238,240,0.03)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={11} color="#83eef0" />
                  <span style={{ fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 700, color: "#d4e9f3bb", letterSpacing: "0.02em" }}>
                    Map Layers
                  </span>
                </div>
                <span style={{
                  fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600,
                  color: "#83eef0", background: "rgba(131,238,240,0.12)",
                  border: "1px solid rgba(131,238,240,0.25)",
                  borderRadius: 10, padding: "1px 7px",
                }}>
                  {[showCoralMapping, showMarineRegions, showGcrmn, showGcrmnSites, showImgs, showDaoMembers, activeCmsVar, activeLiveVar].filter(Boolean).length} / 8
                </span>
              </div>

              {/* ── Preset buttons ── */}
              <div style={{ display: "flex", gap: 5, padding: "7px 10px 6px", borderBottom: "1px solid rgba(131,238,240,0.07)" }}>
                <button
                  data-testid="toggle-all-layers"
                  onClick={() => { setShowMarineRegions(true); setShowCoralMapping(true); setShowGcrmn(true); setShowGcrmnSites(true); setShowImgs(true); setShowDaoMembers(true); setActiveCmsVar("CHL"); setActiveLiveVar(null); }}
                  style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(131,238,240,0.11)", border: "1px solid rgba(131,238,240,0.28)", borderRadius: 6, padding: "4px 0", color: "#83eef0", cursor: "pointer", transition: "background 0.15s" }}
                >Select All</button>
                <button
                  data-testid="toggle-no-layers"
                  onClick={() => { setShowMarineRegions(false); setShowCoralMapping(false); setShowGcrmn(false); setShowGcrmnSites(false); setShowImgs(false); setShowDaoMembers(false); setActiveCmsVar(null); setActiveLiveVar(null); setShowToolbox(null); }}
                  style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 0", color: "#d4e9f355", cursor: "pointer", transition: "background 0.15s" }}
                >Clear All</button>
              </div>

              {/* ── Layer groups ── */}
              <div style={{ padding: "6px 6px 8px", maxHeight: 360, overflowY: "auto" }}>

                {/* ── Satellite group (custom — radio, not checkbox) ── */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 8, color: "#d4e9f333" }}>◎</span>
                      <span style={{ fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Satellite · CMS</span>
                    </div>
                    {activeCmsVar && (
                      <button
                        onClick={() => setActiveCmsVar(null)}
                        style={{ fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "1px 5px", color: "#d4e9f344", borderRadius: 4 }}
                      >off</button>
                    )}
                  </div>
                  {/* Compact select */}
                  <div style={{ padding: "0 10px 4px" }}>
                    <select
                      data-testid="compact-cms-layer-select"
                      value={activeCmsVar ?? ""}
                      onChange={e => setActiveCmsVar((e.target.value as CmsVar) || null)}
                      style={{
                        width: "100%", fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600,
                        background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.25)",
                        borderRadius: 6, padding: "4px 8px", color: activeCmsVar ? "#00b894" : "#d4e9f355",
                        cursor: "pointer", outline: "none",
                      }}
                    >
                      <option value="">— Off —</option>
                      {CMS_LAYERS.map(l => (
                        <option key={l.var} value={l.var}>{l.label} ({l.var})</option>
                      ))}
                    </select>
                  </div>
                  {/* Time nav */}
                  {activeCmsVar && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 10px 4px" }}>
                      <button
                        onClick={() => setCmsYYYYMM(v => cmsNavMonth(v, -1))}
                        disabled={cmsYYYYMM <= CMS_MIN_YM}
                        style={{ fontSize: 12, background: "none", border: "1px solid rgba(131,238,240,0.2)", borderRadius: 4, color: cmsYYYYMM <= CMS_MIN_YM ? "#d4e9f322" : "#83eef0", cursor: cmsYYYYMM <= CMS_MIN_YM ? "default" : "pointer", padding: "0 5px", lineHeight: 1.4 }}
                      >‹</button>
                      <span style={{ flex: 1, textAlign: "center", fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600, color: "#83eef0" }}>{cmsMonthLabel(cmsYYYYMM)}</span>
                      <button
                        onClick={() => setCmsYYYYMM(v => cmsNavMonth(v, +1))}
                        disabled={cmsYYYYMM >= CMS_MAX_YM}
                        style={{ fontSize: 12, background: "none", border: "1px solid rgba(131,238,240,0.2)", borderRadius: 4, color: cmsYYYYMM >= CMS_MAX_YM ? "#d4e9f322" : "#83eef0", cursor: cmsYYYYMM >= CMS_MAX_YM ? "default" : "pointer", padding: "0 5px", lineHeight: 1.4 }}
                      >›</button>
                    </div>
                  )}
                </div>

                {/* ── Ocean State · Live group ── */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 8, color: "#d4e9f333" }}>◎</span>
                      <span style={{ fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Ocean State · Live</span>
                    </div>
                    {activeLiveVar && (
                      <button
                        onClick={() => { setActiveLiveVar(null); setShowToolbox(null); }}
                        style={{ fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "1px 5px", color: "#d4e9f344", borderRadius: 4 }}
                      >off</button>
                    )}
                  </div>
                  <div style={{ padding: "0 10px 4px" }}>
                    <select
                      data-testid="compact-live-layer-select"
                      value={activeLiveVar ?? ""}
                      onChange={e => {
                        setActiveLiveVar((e.target.value as LiveVar) || null);
                        setActiveCmsVar(null);
                      }}
                      style={{
                        width: "100%", fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600,
                        background: "rgba(116,185,255,0.08)", border: "1px solid rgba(116,185,255,0.22)",
                        borderRadius: 6, padding: "4px 8px",
                        color: activeLiveVar ? "#74b9ff" : "#d4e9f355",
                        cursor: "pointer", outline: "none",
                      }}
                    >
                      <option value="">— Off —</option>
                      {LIVE_GROUPS.map(grp => (
                        <optgroup key={grp} label={grp}>
                          {LIVE_LAYERS.filter(l => l.group === grp).map(l => (
                            <option key={l.var} value={l.var}>{l.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {/* Compact date navigator for live layers */}
                  {activeLiveVar && activeLiveLayer && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 10px 3px" }}>
                        <button
                          onClick={() => {
                            const d = new Date(compactLiveDate);
                            d.setDate(d.getDate() - 7);
                            const min = new Date(liveTimelineMin(activeLiveLayer.group));
                            if (d >= min) setCompactLiveDate(d.toISOString().slice(0, 10) + "T00:00:00Z");
                          }}
                          style={{ fontSize: 12, background: "none", border: "1px solid rgba(116,185,255,0.2)", borderRadius: 4, color: "#74b9ff", cursor: "pointer", padding: "0 5px", lineHeight: 1.4 }}
                        >‹</button>
                        <span style={{ flex: 1, textAlign: "center", fontSize: 8.5, fontFamily: "Inter,sans-serif", fontWeight: 600, color: "#74b9ff" }}>
                          {new Date(compactLiveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <button
                          onClick={() => {
                            const d = new Date(compactLiveDate);
                            d.setDate(d.getDate() + 7);
                            const max = new Date(); max.setDate(max.getDate() - 1);
                            if (d <= max) setCompactLiveDate(d.toISOString().slice(0, 10) + "T00:00:00Z");
                          }}
                          style={{ fontSize: 12, background: "none", border: "1px solid rgba(116,185,255,0.2)", borderRadius: 4, color: "#74b9ff", cursor: "pointer", padding: "0 5px", lineHeight: 1.4 }}
                        >›</button>
                      </div>
                      <div style={{ padding: "0 10px 2px", fontSize: 8, color: "#d4e9f355", fontFamily: "Inter,sans-serif" }}>
                        <span style={{ color: activeLiveLayer.color }}>● </span>{activeLiveLayer.unit}
                      </div>
                    </>
                  )}
                  {/* ── Depth selector — 500 m steps, only for depth-capable layers ── */}
                  {activeLiveVar && activeLiveLayer && activeLiveLayer.elevation != null && (
                    <div style={{ padding: "4px 8px 6px" }}>
                      <div style={{ fontSize: 6.5, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d4e9f322", marginBottom: 4, paddingLeft: 2 }}>↕ Depth</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {COMPACT_DEPTH_STEPS.map(m => (
                          <button
                            key={m}
                            data-testid={`compact-depth-${m}`}
                            onClick={() => setCompactDepthM(m)}
                            style={{
                              fontSize: 7.5, fontFamily: "Inter,sans-serif", fontWeight: 600,
                              padding: "2px 6px", borderRadius: 20, cursor: "pointer",
                              background: compactDepthM === m ? `${activeLiveLayer.color}22` : "rgba(255,255,255,0.04)",
                              border: `1px solid ${compactDepthM === m ? `${activeLiveLayer.color}99` : "rgba(255,255,255,0.1)"}`,
                              color: compactDepthM === m ? activeLiveLayer.color : "#d4e9f344",
                              transition: "all 0.15s",
                            }}
                          >{m === 0 ? "Surface" : `${m} m`}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {([
                  { group: "Boundaries & Regions", icon: "◈", note: "Maritime zones, reef extents and monitoring regions.", layers: [
                    { testId: "toggle-coral-mapping-layer",   label: "Coral Reef Regions",  sublabel: "Mapped reef extents — Allen Coral Atlas",    color: "#fd7272", active: showCoralMapping,  toggle: () => setShowCoralMapping(v => !v)  },
                    { testId: "toggle-marine-regions-layer",  label: "EEZ Boundaries",      sublabel: "Excl. Economic Zones — VLIZ",                 color: "#fdcb6e", active: showMarineRegions, toggle: () => setShowMarineRegions(v => !v) },
                    { testId: "toggle-gcrmn-layer",           label: "GCRMN Regions",       sublabel: "10 global reef monitoring zones",             color: "#1dd1a1", active: showGcrmn,         toggle: () => setShowGcrmn(v => !v)         },
                    { testId: "toggle-gcrmn-sites-layer",     label: "GCRMN Sites 2026",    sublabel: `${GCRMN_SITES_2026.length} territories — circle size ∝ surveys`, color: "#A6CE39", active: showGcrmnSites, toggle: () => setShowGcrmnSites(v => !v) },
                  ]},
                  { group: "Community", icon: "●", note: "MesoReefDAO members and community reef data.", layers: [
                    { testId: "toggle-dao-members-layer",     label: "DAO Members",         sublabel: `${markers.length} members on the Regen Reef Network`, color: "#83eef0", active: showDaoMembers, toggle: () => setShowDaoMembers(v => !v) },
                    { testId: "toggle-imgs-layer",            label: "Reef Photos",         sublabel: "Community-submitted reef imagery",           color: "#ff9f43", active: showImgs,          toggle: () => setShowImgs(v => !v)          },
                  ]},
                  { group: "Field Monitoring", icon: "◎", note: "In-situ reef survey stations worldwide.", layers: [
                    { testId: "compact-toggle-gcrmn-mon",     label: "GCRMN Benthic Sites", sublabel: "Fixed benthic stations — GCRMN global network",  color: "#26de81", active: showGcrmnMonC,     toggle: () => setShowGcrmnMonC(v => !v)     },
                    { testId: "compact-toggle-reef-check",    label: "Reef Check",          sublabel: "Coral cover monitoring — global",              color: "#fd9644", active: showReefCheckC,    toggle: () => setShowReefCheckC(v => !v)    },
                    { testId: "compact-toggle-reef-life",     label: "Reef Life Survey",    sublabel: "Fish & invertebrate survey sites",             color: "#45aaf2", active: showReefLifeC,     toggle: () => setShowReefLifeC(v => !v)     },
                    { testId: "compact-toggle-wcs-cc",        label: "WCS Coral Cover",     sublabel: "WCS transect survey sites",                   color: "#ff6b9d", active: showWcsCcSitesC,   toggle: () => setShowWcsCcSitesC(v => !v)   },
                    { testId: "compact-toggle-wcs-reefcloud", label: "WCS ReefCloud",       sublabel: "AI-powered underwater photo survey sites",     color: "#e056fd", active: showWcsReefCloudC, toggle: () => setShowWcsReefCloudC(v => !v) },
                  ]},
                ]).map(({ group, icon, note, layers }) => {
                  const ls = layers as unknown as any[];
                  const allActive = ls.every((l: any) => l.active);
                  return (
                    <div key={group} style={{ marginBottom: 4 }}>
                      {/* Group header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "5px 10px 3px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 8, color: "#d4e9f333" }}>{icon}</span>
                          <span style={{ fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>
                            {group}
                          </span>
                        </div>
                        <button
                          onClick={() => { const turnOn = !allActive; ls.forEach((l: any) => { if (l.active !== turnOn) l.toggle(); }); }}
                          style={{
                            fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 600,
                            background: "none", border: "none", cursor: "pointer", padding: "1px 5px",
                            color: allActive ? "#d4e9f344" : "#83eef088",
                            borderRadius: 4,
                          }}
                        >{allActive ? "Hide all" : "Show all"}</button>
                      </div>
                      {/* Group note */}
                      {note && (
                        <div style={{ fontSize: 7.5, color: "#d4e9f328", padding: "0 10px 4px", lineHeight: 1.4, fontFamily: "Inter,sans-serif" }}>{note}</div>
                      )}
                      {/* Layer rows */}
                      {ls.map((l: any) => (
                        <CompactLayerRow key={l.testId} {...l} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

        {/* ── CMS Timelapse bar ── full-width bottom strip ── */}
        <div
          data-testid="compact-timelapse-bar"
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1001,
            background: "rgba(0,5,10,0.90)", backdropFilter: "blur(4px)",
            borderTop: "1px solid rgba(131,238,240,0.12)",
            padding: "4px 10px 3px",
            pointerEvents: "auto",
            fontFamily: "Inter,sans-serif",
          }}
        >
          {/* Label + step buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
            <span style={{
              fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              color: activeCmsVar ? "#00b894cc" : "#83eef033",
            }}>
              {activeCmsVar ? activeCmsVar : "CMS"}
            </span>
            <span style={{ fontSize: 7, color: "#d4e9f322" }}>·</span>
            <span style={{ fontSize: 7.5, fontWeight: 600, color: activeCmsVar ? "#83eef0cc" : "#83eef044" }}>
              {cmsMonthLabel(cmsYYYYMM)}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setCmsYYYYMM(v => cmsNavMonth(v, -1))}
              disabled={cmsYYYYMM <= CMS_MIN_YM}
              style={{
                fontSize: 11, lineHeight: 1.3, padding: "0 5px",
                background: "none", border: "1px solid rgba(131,238,240,0.15)", borderRadius: 3,
                color: cmsYYYYMM <= CMS_MIN_YM ? "#83eef020" : "#83eef088",
                cursor: cmsYYYYMM <= CMS_MIN_YM ? "default" : "pointer",
              }}
            >‹</button>
            <button
              onClick={() => setCmsYYYYMM(v => cmsNavMonth(v, +1))}
              disabled={cmsYYYYMM >= CMS_MAX_YM}
              style={{
                fontSize: 11, lineHeight: 1.3, padding: "0 5px",
                background: "none", border: "1px solid rgba(131,238,240,0.15)", borderRadius: 3,
                color: cmsYYYYMM >= CMS_MAX_YM ? "#83eef020" : "#83eef088",
                cursor: cmsYYYYMM >= CMS_MAX_YM ? "default" : "pointer",
              }}
            >›</button>
          </div>

          {/* Range slider */}
          <input
            type="range"
            min={0}
            max={CMS_TOTAL_MONTHS}
            step={1}
            value={ymToIndex(cmsYYYYMM)}
            onChange={e => setCmsYYYYMM(indexToYm(Number(e.target.value)))}
            data-testid="compact-timelapse-slider"
            style={{
              width: "100%", display: "block",
              accentColor: activeCmsVar ? "#00b894" : "#83eef044",
              cursor: "pointer", margin: "2px 0",
              height: 4,
            }}
          />

          {/* Year + quarterly tick labels */}
          <div style={{ position: "relative", height: 11, marginTop: 1 }}>
            {/* Year labels every 4 years */}
            {[1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026].map(yr => {
              const ym = `${yr}-01`;
              if (ym < CMS_MIN_YM || ym > CMS_MAX_YM) return null;
              const pct = (ymToIndex(ym) / CMS_TOTAL_MONTHS) * 100;
              return (
                <span key={yr} style={{
                  position: "absolute", left: `${pct}%`,
                  transform: "translateX(-50%)",
                  fontSize: 6, color: "rgba(131,238,240,0.45)",
                  fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap",
                }}>{yr}</span>
              );
            })}
            {/* Quarterly ticks: Apr / Jul / Oct — no label, just a tick mark */}
            {Array.from({ length: 30 }, (_, i) => 1997 + i).flatMap(yr =>
              [4, 7, 10].map(mo => {
                const ym = `${yr}-${String(mo).padStart(2, "0")}`;
                if (ym < CMS_MIN_YM || ym > CMS_MAX_YM) return null;
                const pct = (ymToIndex(ym) / CMS_TOTAL_MONTHS) * 100;
                const lbl = mo === 4 ? "Apr" : mo === 7 ? "Jul" : "Oct";
                return (
                  <span key={ym} style={{
                    position: "absolute", left: `${pct}%`,
                    transform: "translateX(-50%)",
                    fontSize: 5.5, color: "rgba(131,238,240,0.22)",
                    lineHeight: 1, whiteSpace: "nowrap",
                  }}>{lbl}</span>
                );
              })
            )}
          </div>
        </div>

        {/* ── Legend + Login ── */}
        <div
          className="absolute left-2 flex flex-col gap-1.5"
          style={{ zIndex: 500, bottom: 52 }}
        >
          {/* Labelled legend — one row per active layer */}
          <div
            className="pointer-events-none"
            style={{
              background: "rgba(0,19,28,0.72)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(131,238,240,0.1)", borderRadius: 7,
              padding: "4px 7px", display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            {showMarineRegions && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:10,height:6,borderRadius:2,background:"rgba(253,203,110,0.2)",border:"1.5px solid #fdcb6e",flexShrink:0,display:"inline-block" }}/>
                <span style={{ fontSize:8,color:"#d4e9f3aa",fontFamily:"Inter,sans-serif" }}>EEZ Boundary</span>
              </div>
            )}
            {showCoralMapping && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:10,height:6,borderRadius:2,background:"rgba(253,114,114,0.2)",border:"1.5px solid #fd7272",flexShrink:0,display:"inline-block" }}/>
                <span style={{ fontSize:8,color:"#d4e9f3aa",fontFamily:"Inter,sans-serif" }}>Coral Reef Region</span>
              </div>
            )}
            {showGcrmn && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:10,height:6,borderRadius:2,background:"rgba(29,209,161,0.35)",border:"1.5px solid #1dd1a1",flexShrink:0,display:"inline-block" }}/>
                <span style={{ fontSize:8,color:"#d4e9f3aa",fontFamily:"Inter,sans-serif" }}>GCRMN Region</span>
              </div>
            )}
            {showGcrmnSites && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:"rgba(166,206,57,0.35)",border:"1.5px solid #A6CE39",flexShrink:0,display:"inline-block" }}/>
                <span style={{ fontSize:8,color:"#d4e9f3aa",fontFamily:"Inter,sans-serif" }}>GCRMN Territory</span>
              </div>
            )}
            {showDaoMembers && markers.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",flexShrink:0,display:"inline-block" }}/>
                <span style={{ fontSize:8,color:"#d4e9f3aa",fontFamily:"Inter,sans-serif" }}>DAO Member</span>
              </div>
            )}
            {showImgs && reefImgs.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8,height:8,borderRadius:2,background:"#ff9f43",border:"1.5px solid #ffb347",flexShrink:0,display:"inline-block" }}/>
                <span style={{ fontSize:8,color:"#d4e9f3aa",fontFamily:"Inter,sans-serif" }}>Reef Photo</span>
              </div>
            )}
          </div>
          {/* Log in button */}
          {!authenticated && (
            <button
              data-testid="map-login-button"
              onClick={() => { try { login(); } catch { /* suppress */ } }}
              style={{
                background: "rgba(131,238,240,0.12)",
                border: "1px solid rgba(131,238,240,0.35)",
                borderRadius: 6, padding: "3px 9px",
                fontSize: 9, color: "#83eef0",
                fontFamily: "Inter,sans-serif", fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.06em",
                pointerEvents: "auto",
              }}
            >
              Log in
            </button>
          )}
        </div>

        {/* ── Counts badge ── */}
        <div className="absolute bottom-2 right-2 pointer-events-none flex flex-col gap-1 items-end" style={{ zIndex: 500 }}>
          {showDaoMembers && markers.length > 0 && (
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
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}

// ─── Standalone full-page map (no portal, no compact underlay) ────────────────
// Used by /reef-map route. Renders the expanded map UI directly inline.
export function ReefMapExpandedPage({ onClose }: { onClose: () => void }) {
  const { data: markers = [] } = useQuery<MapMarker[]>({
    queryKey: ["/api/map/markers"],
    refetchInterval: 60_000,
  });
  const { data: reefImgs = [] } = useQuery<ReefImageMarker[]>({
    queryKey: ["/api/reef-images"],
    refetchInterval: 60_000,
  });
  return (
    <ExpandedMapModal
      markers={markers}
      reefImgs={reefImgs}
      onClose={onClose}
      inline={true}
    />
  );
}
