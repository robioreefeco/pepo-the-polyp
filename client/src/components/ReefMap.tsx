import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, GeoJSON, CircleMarker, useMap, useMapEvents } from "react-leaflet";
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

const CMS_LAYERS = [
  { var: "CHL",     label: "Chlorophyll-a",      unit: "mg m⁻³",  color: "#00b894", cmap: "algae"   },
  { var: "DIATO",   label: "Diatoms",             unit: "mg m⁻³",  color: "#e17055", cmap: "matter"  },
  { var: "DINO",    label: "Dinoflagellates",      unit: "mg m⁻³",  color: "#d63031", cmap: "plasma"  },
  { var: "GREEN",   label: "Green Algae",         unit: "mg m⁻³",  color: "#55efc4", cmap: "dense"   },
  { var: "HAPTO",   label: "Haptophytes",         unit: "mg m⁻³",  color: "#a29bfe", cmap: "ice"     },
  { var: "MICRO",   label: "Microphytoplankton",  unit: ">20 µm",  color: "#fdcb6e", cmap: "thermal" },
  { var: "NANO",    label: "Nanophytoplankton",   unit: "2–20 µm", color: "#fd79a8", cmap: "tempo"   },
  { var: "PICO",    label: "Picophytoplankton",   unit: "<2 µm",   color: "#74b9ff", cmap: "solar"   },
  { var: "PROCHLO", label: "Prochlorococcus",     unit: "mg m⁻³",  color: "#26de81", cmap: "speed"   },
  { var: "PROKAR",  label: "Prokaryotes",         unit: "mg m⁻³",  color: "#6c5ce7", cmap: "deep"    },
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
function buildCmsTileUrl(v: CmsVar, cmap: string, yyyymm: string): string {
  return (
    "https://wmts.marine.copernicus.eu/teroWmts" +
    "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
    `&LAYER=${encodeURIComponent(CMS_PRODUCT + "/" + CMS_DATASET + "/" + v)}` +
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
};
type LiveVar =
  | "thetao" | "so" | "sea_water_velocity" | "zos" | "siconc"
  | "analysed_sst"
  | "to_obs" | "ugo"
  | "adt" | "sla"
  | "VHM0" | "VTPK" | "VMDR" | "wind"
  | "ph" | "o2" | "phyc" | "nppv" | "no3" | "po4" | "si";

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
    elevation: null,   time: () => liveDate(2),              toolboxId: SST,                                   group: "SST NRT" },
  // ── Ocean Physics — Model (PHY_001_024) ───────────────────────────────────
  { var: "thetao",            label: "Temperature",         unit: "°C · 6H · 0.5 m",          color: "#e17055", cmap: "thermal",
    product: PHY, dataset: "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i_202406",
    elevation: -0.494, time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i_202406", group: "Physics Forecast" },
  { var: "so",                label: "Salinity",            unit: "PSU · 6H · 0.5 m",          color: "#a29bfe", cmap: "haline",
    product: PHY, dataset: "cmems_mod_glo_phy-so_anfc_0.083deg_PT6H-i_202406",
    elevation: -0.494, time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy-so_anfc_0.083deg_PT6H-i_202406",    group: "Physics Forecast" },
  { var: "sea_water_velocity",label: "Currents",            unit: "m s⁻¹ · hourly · 0.5 m",   color: "#00cec9", cmap: "speed",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",
    elevation: -0.494, time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",       group: "Physics Forecast" },
  { var: "zos",               label: "SSH · Model",         unit: "m · hourly forecast",        color: "#74b9ff", cmap: "balance",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",
    elevation: null,   time: () => liveDate(1),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_202406",       group: "Physics Forecast" },
  { var: "siconc",            label: "Sea Ice",             unit: "fraction · daily",            color: "#dfe6e9", cmap: "ice",
    product: PHY, dataset: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",
    elevation: null,   time: () => liveDate(2),              toolboxId: "cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406",        group: "Physics Forecast" },
  // ── Multi-observation Physics — ARMOR3D (MULTIOBS_015_012) ────────────────
  { var: "to_obs", wmtsVar: "to", label: "Temp. (Obs.)",   unit: "°C · weekly multi-obs",     color: "#fab1a0", cmap: "thermal",
    product: MULTIOBS, dataset: "dataset-armor-3d-nrt-weekly",
    elevation: -0.494, time: () => liveDate(7),              toolboxId: "dataset-armor-3d-nrt-weekly",                         group: "Observation · Multi-sensor" },
  { var: "ugo",               label: "Geostr. Velocity",   unit: "m s⁻¹ · weekly obs",         color: "#55efc4", cmap: "speed",
    product: MULTIOBS, dataset: "dataset-armor-3d-nrt-weekly",
    elevation: -0.494, time: () => liveDate(7),              toolboxId: "dataset-armor-3d-nrt-weekly",                         group: "Observation · Multi-sensor" },
  // ── Sea Level Altimetry (SEALEVEL_008_047) ────────────────────────────────
  { var: "adt",               label: "Abs. Sea Level",     unit: "m · L4 altimetry daily",     color: "#0984e3", cmap: "balance",
    product: SEALEVEL, dataset: "cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D",
    elevation: null,   time: () => liveDate(3),              toolboxId: SEALEVEL,                                              group: "Sea Level Altimetry" },
  { var: "sla",               label: "Sea Level Anomaly",  unit: "m · L4 altimetry daily",     color: "#6c5ce7", cmap: "diff",
    product: SEALEVEL, dataset: "cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D",
    elevation: null,   time: () => liveDate(3),              toolboxId: SEALEVEL,                                              group: "Sea Level Altimetry" },
  // ── Wave & Wind (WAV_001_027 + WIND_L4_NRT) ──────────────────────────────
  { var: "VHM0",              label: "Wave Height",        unit: "m · 3H forecast",             color: "#6c5ce7", cmap: "matter",
    product: WAV, dataset: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
    elevation: null,   time: () => liveDate(1, "03:00:00"), toolboxId: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",       group: "Wave & Wind" },
  { var: "VTPK",              label: "Peak Wave Period",   unit: "s · 3H forecast",             color: "#81ecec", cmap: "ice",
    product: WAV, dataset: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
    elevation: null,   time: () => liveDate(1, "03:00:00"), toolboxId: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",       group: "Wave & Wind" },
  { var: "VMDR",              label: "Wave Direction",     unit: "deg · 3H forecast",           color: "#b2bec3", cmap: "phase",
    product: WAV, dataset: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",
    elevation: null,   time: () => liveDate(1, "03:00:00"), toolboxId: "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411",       group: "Wave & Wind" },
  { var: "wind",              label: "Wind Speed",         unit: "m s⁻¹ · hourly NRT",         color: "#fdcb6e", cmap: "speed",
    product: WND, dataset: "cmems_obs-wind_glo_phy_nrt_l4_0.125deg_PT1H_202207",
    elevation: null,   time: () => "2023-11-20T00:00:00Z",  toolboxId: "cmems_obs-wind_glo_phy_nrt_l4_0.125deg_PT1H_202207", group: "Wave & Wind" },
  // ── Ocean BGC — Model (BGC_001_028) ───────────────────────────────────────
  { var: "ph",                label: "Acidity (pH)",       unit: "pH · monthly",               color: "#fd79a8", cmap: "ice",
    product: BGC, dataset: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-car_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
  { var: "o2",                label: "Oxygen",             unit: "mmol m⁻³ · monthly",         color: "#55efc4", cmap: "dense",
    product: BGC, dataset: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
  { var: "phyc",              label: "Biomass",            unit: "mgC m⁻³ · monthly",          color: "#26de81", cmap: "amp",
    product: BGC, dataset: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
  { var: "nppv",              label: "Primary Production", unit: "mgC m⁻³ d⁻¹ · monthly",     color: "#00b894", cmap: "algae",
    product: BGC, dataset: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",
    elevation: null,   time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
  { var: "no3",               label: "Nitrate",            unit: "mmol m⁻³ · monthly",         color: "#fd9644", cmap: "matter",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
  { var: "po4",               label: "Phosphate",          unit: "mmol m⁻³ · monthly",         color: "#a29bfe", cmap: "tempo",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
  { var: "si",                label: "Silicate",           unit: "mmol m⁻³ · monthly",         color: "#74b9ff", cmap: "deep",
    product: BGC, dataset: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",
    elevation: -0.494, time: () => "2024-01-01T00:00:00Z",  toolboxId: "cmems_mod_glo_bgc-nut_anfc_0.25deg_P1M-m_202311",    group: "BGC Forecast" },
];

const LIVE_GROUPS = [
  "SST NRT", "Physics Forecast", "Observation · Multi-sensor",
  "Sea Level Altimetry", "Wave & Wind", "BGC Forecast",
] as const;

function buildLiveTileUrl(layer: LiveLayer): string {
  return (
    "https://wmts.marine.copernicus.eu/teroWmts" +
    "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
    `&LAYER=${encodeURIComponent(layer.product + "/" + layer.dataset + "/" + (layer.wmtsVar ?? layer.var))}` +
    `&STYLE=${encodeURIComponent("cmap:" + layer.cmap)}` +
    "&FORMAT=image%2Fpng&TILEMATRIXSET=EPSG%3A3857" +
    "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}" +
    `&TIME=${encodeURIComponent(layer.time())}` +
    (layer.elevation != null ? `&ELEVATION=${layer.elevation}` : "")
  );
}

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
  const [showGcrmnSites,     setShowGcrmnSites]     = useState(true);
  const [showWcsReefCloud,   setShowWcsReefCloud]   = useState(false);
  const [showWcsCcSites,     setShowWcsCcSites]     = useState(false);
  const [showReefCheck,      setShowReefCheck]      = useState(false);
  const [showReefLife,       setShowReefLife]        = useState(false);
  const [showGcrmnMonSites,  setShowGcrmnMonSites]  = useState(false);
  const [activeCmsVar,       setActiveCmsVar]       = useState<CmsVar | null>(null);
  const [cmsYYYYMM,          setCmsYYYYMM]          = useState(CMS_MAX_YM);
  const [showToolbox,        setShowToolbox]        = useState<'cms'|'live'|null>(null);
  const [activeLiveVar,      setActiveLiveVar]      = useState<LiveVar|null>(null);

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
    ? buildCmsTileUrl(activeCmsLayer.var as CmsVar, activeCmsLayer.cmap, cmsYYYYMM)
    : null;

  const activeLiveLayer = activeLiveVar
    ? LIVE_LAYERS.find(l => l.var === activeLiveVar) ?? null
    : null;
  const liveTileUrl = activeLiveLayer ? buildLiveTileUrl(activeLiveLayer) : null;

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
          <style>{`.gcrmn-tooltip { background: rgba(0,19,28,0.88) !important; border: 1px solid rgba(131,238,240,0.25) !important; color: #d4e9f3 !important; font-family: Inter,sans-serif !important; font-size: 11px !important; padding: 3px 9px !important; border-radius: 6px !important; box-shadow: none !important; }`}</style>

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
                opacity={0.72}
                maxZoom={10}
                attribution='© <a href="https://marine.copernicus.eu">Copernicus Marine Service · Mercator Ocean International</a>'
              />
            )}
            {liveTileUrl && (
              <TileLayer
                key={liveTileUrl}
                url={liveTileUrl}
                opacity={0.72}
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
            {markers.map((m) => (
              <Marker key={m.id} position={[m.latitude, m.longitude]} icon={makePin()}>
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11 }}>
                    <span style={{ color: "#83eef0", fontWeight: 600 }}>DAO Member</span>
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
          </MapContainer>

          {/* ── Copernicus Marine Toolbox panel ── */}
          {showToolbox && (activeCmsLayer || activeLiveLayer) && (() => {
            const isCms  = showToolbox === 'cms'  && activeCmsLayer;
            const isLive = showToolbox === 'live' && activeLiveLayer;
            const panelLabel = isCms
              ? `${activeCmsLayer!.label} · ${cmsMonthLabel(cmsYYYYMM)} · Dataset: ${CMS_DATASET}`
              : isLive
                ? `${activeLiveLayer!.label} · ${activeLiveLayer!.unit} · Dataset: ${activeLiveLayer!.toolboxId}`
                : "";
            const dsId  = isCms ? CMS_DATASET : activeLiveLayer?.toolboxId ?? "";
            const varId = isCms ? activeCmsLayer!.var : activeLiveLayer?.var ?? "";
            const t0    = isCms ? `${cmsYYYYMM}-01` : activeLiveLayer?.time().slice(0,10) ?? "";
            return (
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000,
                background: "rgba(0,10,18,0.96)", borderTop: "1px solid rgba(0,184,148,0.3)",
                backdropFilter: "blur(8px)", fontFamily: "Inter,sans-serif",
                padding: "14px 18px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13 }}>⬇</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#00b894" }}>Copernicus Marine Toolbox</div>
                      <div style={{ fontSize: 10, color: "#d4e9f366" }}>{panelLabel}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowToolbox(null)}
                    style={{ background: "none", border: "none", color: "#d4e9f355", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                  >×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Install</div>
                    <pre style={{
                      margin: 0, padding: "8px 10px", borderRadius: 6, fontSize: 10, lineHeight: 1.5,
                      background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.18)",
                      color: "#83eef0", overflowX: "auto", whiteSpace: "pre-wrap",
                    }}>{`pip install copernicusmarine`}</pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>CLI</div>
                    <pre style={{
                      margin: 0, padding: "8px 10px", borderRadius: 6, fontSize: 10, lineHeight: 1.5,
                      background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.18)",
                      color: "#83eef0", overflowX: "auto", whiteSpace: "pre-wrap",
                    }}>{`copernicusmarine get \\\n  --dataset-id ${dsId} \\\n  --variable ${varId} \\\n  --start-datetime "${t0}" \\\n  --end-datetime "${t0}"`}</pre>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 9, color: "#83eef066", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Python API</div>
                    <pre style={{
                      margin: 0, padding: "8px 10px", borderRadius: 6, fontSize: 10, lineHeight: 1.5,
                      background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.18)",
                      color: "#83eef0", overflowX: "auto", whiteSpace: "pre-wrap",
                    }}>{`import copernicusmarine\n\ncopernicusmarine.get(\n    dataset_id="${dsId}",\n    variables=["${varId}"],\n    start_datetime="${t0}",\n    end_datetime="${t0}",\n    output_directory="./copernicus_data",\n)`}</pre>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 9, color: "#d4e9f330" }}>
                  © Mercator Ocean International · Copernicus Marine Service (CMEMS) ·{" "}
                  <a href="https://github.com/mercator-ocean/copernicus-marine-toolbox" target="_blank" rel="noopener noreferrer"
                    style={{ color: "#83eef066", textDecoration: "underline" }}>github.com/mercator-ocean/copernicus-marine-toolbox</a>
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
                onClick={() => { setShowMarineRegions(true); setShowCoralMapping(true); setShowGcrmn(true); setShowGcrmnSites(true); setShowGcrmnMonSites(true); setShowWcsReefCloud(true); setShowWcsCcSites(true); setShowReefCheck(true); setShowReefLife(true); setShowImgs(true); setActiveCmsVar("CHL"); setActiveLiveVar(null); }}
                style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(131,238,240,0.12)", border: "1px solid rgba(131,238,240,0.3)", borderRadius: 6, padding: "4px 0", color: "#83eef0", cursor: "pointer" }}
              >All On</button>
              <button
                data-testid="expanded-toggle-no-layers"
                onClick={() => { setShowMarineRegions(false); setShowCoralMapping(false); setShowGcrmn(false); setShowGcrmnSites(false); setShowGcrmnMonSites(false); setShowWcsReefCloud(false); setShowWcsCcSites(false); setShowReefCheck(false); setShowReefLife(false); setShowImgs(false); setActiveCmsVar(null); setActiveLiveVar(null); setShowToolbox(null); }}
                style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 0", color: "#d4e9f355", cursor: "pointer" }}
              >All Off</button>
            </div>

            {/* ── Satellite · Copernicus Marine ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>
                  Satellite · Copernicus Marine
                </span>
                {activeCmsVar && (
                  <button
                    onClick={() => setActiveCmsVar(null)}
                    style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
                  >off</button>
                )}
              </div>

              {/* Layer radio chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
                {CMS_LAYERS.map(layer => (
                  <button
                    key={layer.var}
                    data-testid={`expanded-toggle-cms-${layer.var.toLowerCase()}`}
                    onClick={() => setActiveCmsVar(v => (v === layer.var ? null : layer.var as CmsVar))}
                    title={`${layer.label} · ${layer.unit}`}
                    style={{
                      fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 600,
                      padding: "3px 7px", borderRadius: 20, cursor: "pointer",
                      background: activeCmsVar === layer.var ? layer.color + "22" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${activeCmsVar === layer.var ? layer.color + "99" : "rgba(255,255,255,0.1)"}`,
                      color: activeCmsVar === layer.var ? layer.color : "#d4e9f355",
                      transition: "all 0.15s",
                    }}
                  >{layer.label}</button>
                ))}
              </div>

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

            {/* ── Ocean State · Live (PHY + BGC + SST NRT) ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>
                  Ocean State · Live
                </span>
                {activeLiveVar && (
                  <button
                    onClick={() => { setActiveLiveVar(null); setShowToolbox(null); }}
                    style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
                  >off</button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: activeLiveVar ? 8 : 0 }}>
                {LIVE_GROUPS.map(grp => {
                  const grpLayers = LIVE_LAYERS.filter(l => l.group === grp);
                  return (
                    <div key={grp}>
                      <div style={{ fontSize: 7, fontFamily: "Inter,sans-serif", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#d4e9f322", marginBottom: 3 }}>{grp}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {grpLayers.map(layer => (
                          <button
                            key={layer.var}
                            data-testid={`expanded-toggle-live-${layer.var}`}
                            onClick={() => {
                              setActiveLiveVar(v => (v === layer.var ? null : layer.var as LiveVar));
                              setActiveCmsVar(null);
                              if (showToolbox === 'cms') setShowToolbox(null);
                            }}
                            title={`${layer.label} · ${layer.unit}`}
                            style={{
                              fontSize: 8, fontFamily: "Inter,sans-serif", fontWeight: 600,
                              padding: "3px 7px", borderRadius: 20, cursor: "pointer",
                              background: activeLiveVar === layer.var ? layer.color + "22" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${activeLiveVar === layer.var ? layer.color + "99" : "rgba(255,255,255,0.1)"}`,
                              color: activeLiveVar === layer.var ? layer.color : "#d4e9f355",
                              transition: "all 0.15s",
                            }}
                          >{layer.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeLiveVar && activeLiveLayer && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 8, color: "#d4e9f355", marginBottom: 4, fontFamily: "Inter,sans-serif" }}>
                    <span style={{ color: activeLiveLayer.color, fontWeight: 700 }}>● </span>
                    {activeLiveLayer.unit}
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

            {/* ── Boundaries ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, marginTop: 10 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Boundaries</span>
              <button
                onClick={() => { const all = showCoralMapping && showMarineRegions && showGcrmn; setShowCoralMapping(!all); setShowMarineRegions(!all); setShowGcrmn(!all); }}
                style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
              >{showCoralMapping && showMarineRegions && showGcrmn ? "off" : "all"}</button>
            </div>
            <LayerToggle label="Coral Reef Regions"  sublabel="29 global mapped reef zones · UQ / Allen Coral Atlas"                                   active={showCoralMapping}  color="#fd7272" onClick={() => setShowCoralMapping(v => !v)}  testId="expanded-toggle-coral-mapping" />
            <LayerToggle label="EEZ Boundaries"      sublabel="Exclusive Economic Zones · MarineRegions.org · VLIZ"                                     active={showMarineRegions} color="#fdcb6e" onClick={() => setShowMarineRegions(v => !v)} testId="expanded-toggle-marine-regions" />
            <LayerToggle label="GCRMN Regions"       sublabel="10 GCRMN monitoring zones"                                                               active={showGcrmn}         color="#1dd1a1" onClick={() => setShowGcrmn(v => !v)}         testId="expanded-toggle-gcrmn" />

            {/* ── Monitoring ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 4px" }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Monitoring</span>
              <button
                onClick={() => { const all = showGcrmnMonSites && showGcrmnSites && showReefCheck && showReefLife && showWcsCcSites && showWcsReefCloud; [setShowGcrmnMonSites, setShowGcrmnSites, setShowReefCheck, setShowReefLife, setShowWcsCcSites, setShowWcsReefCloud].forEach(fn => fn(!all)); }}
                style={{ fontSize: 8, background: "none", border: "none", color: "#83eef066", cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 600 }}
              >{showGcrmnMonSites && showGcrmnSites && showReefCheck && showReefLife && showWcsCcSites && showWcsReefCloud ? "off" : "all"}</button>
            </div>
            <LayerToggle label="GCRMN Benthic Sites" sublabel="GCRMN program stations · gcrmndb_benthos"                                                active={showGcrmnMonSites} color="#26de81" onClick={() => setShowGcrmnMonSites(v => !v)} testId="expanded-toggle-gcrmn-mon-sites" />
            <LayerToggle label="GCRMN Sites 2026"    sublabel={`${GCRMN_SITES_2026.length} territories · ${GCRMN_TOTALS.surveys.toLocaleString()} surveys`} active={showGcrmnSites}    color="#A6CE39" onClick={() => setShowGcrmnSites(v => !v)}    testId="expanded-toggle-gcrmn-sites" />
            <LayerToggle label="Reef Check"          sublabel="~6,200 unique stations · coral cover + bleaching"                                         active={showReefCheck}     color="#fd9644" onClick={() => setShowReefCheck(v => !v)}     testId="expanded-toggle-reef-check" />
            <LayerToggle label="Reef Life Survey"    sublabel="4,147 sites · ecoregion + realm metadata"                                                 active={showReefLife}      color="#45aaf2" onClick={() => setShowReefLife(v => !v)}      testId="expanded-toggle-reef-life" />
            <LayerToggle label="WCS Coral Cover"     sublabel="4,766 field survey sites · WCS-Marine"                                                    active={showWcsCcSites}    color="#ff6b9d" onClick={() => setShowWcsCcSites(v => !v)}    testId="expanded-toggle-wcs-cc-sites" />
            <LayerToggle label="WCS ReefCloud"       sublabel="14,501 global monitoring stations · WCS-Marine"                                           active={showWcsReefCloud}  color="#e056fd" onClick={() => setShowWcsReefCloud(v => !v)}  testId="expanded-toggle-wcs-reefcloud" />

            {/* ── Community ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 4px" }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4e9f340" }}>Community</span>
            </div>
            <LayerToggle label="Reef Photos"         sublabel={`${reefImgs.length} community images`}                                                   active={showImgs}          color="#ff9f43" onClick={() => setShowImgs(v => !v)}          testId="expanded-toggle-imgs" />
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
              <span style={{ width:13,height:8,borderRadius:2,background:"rgba(253,203,110,0.2)",border:"1.5px solid #fdcb6e",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Exclusive Economic Zone (EEZ)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:13,height:8,borderRadius:2,background:"rgba(253,114,114,0.2)",border:"1.5px solid #fd7272",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>CoralMapping reef region</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#A6CE3988",border:"1.5px solid #A6CE39",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>GCRMN monitoring territory</span>
            </div>
            <div style={{ fontSize: 8.5, color: "#d4e9f344", marginLeft: 19, marginBottom: 4, marginTop: -1 }}>
              Circle size ∝ survey count
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>DAO Member</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width:13,height:13,borderRadius:3,background:"#ff9f43",border:"1.5px solid #ffb347",display:"inline-block",flexShrink:0 }}/>
              <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>Community reef photo</span>
            </div>
            {showWcsReefCloud && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(224,86,253,0.45)",border:"1.5px solid #e056fd",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>WCS ReefCloud monitoring site</span>
              </div>
            )}
            {showWcsCcSites && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(255,107,157,0.45)",border:"1.5px solid #ff6b9d",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>WCS coral cover survey site</span>
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
            {showGcrmnMonSites && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:"rgba(38,222,129,0.45)",border:"1.5px solid #26de81",display:"inline-block",flexShrink:0 }}/>
                <span style={{ fontSize: 10.5, color: "#d4e9f3bb" }}>GCRMN Benthic Site</span>
              </div>
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
  const [showGcrmnSites,    setShowGcrmnSites]    = useState(true);
  const [showLayerMenu,     setShowLayerMenu]     = useState(false);
  const [internalExpanded,  setInternalExpanded]  = useState(false);
  const [activeCmsVar,      setActiveCmsVar]      = useState<CmsVar | null>(null);
  const [cmsYYYYMM,         setCmsYYYYMM]         = useState(CMS_MAX_YM);
  const [showToolbox,       setShowToolbox]       = useState<'cms'|'live'|null>(null);
  const [activeLiveVar,     setActiveLiveVar]     = useState<LiveVar|null>(null);

  const activeCmsLayer = activeCmsVar
    ? CMS_LAYERS.find(l => l.var === activeCmsVar) ?? null
    : null;
  const cmsTileUrl = activeCmsLayer
    ? buildCmsTileUrl(activeCmsLayer.var as CmsVar, activeCmsLayer.cmap, cmsYYYYMM)
    : null;
  const activeLiveLayer = activeLiveVar
    ? LIVE_LAYERS.find(l => l.var === activeLiveVar) ?? null
    : null;
  const liveTileUrl = activeLiveLayer ? buildLiveTileUrl(activeLiveLayer) : null;

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
          {markers.map((m) => (
            <Marker key={m.id} position={[m.latitude, m.longitude]} icon={makePin()}>
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11 }}>
                  <span style={{ color: "#83eef0", fontWeight: 600 }}>DAO Member</span>
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
                  {[showCoralMapping, showMarineRegions, showGcrmn, showGcrmnSites, showImgs, activeCmsVar, activeLiveVar].filter(Boolean).length} / 7
                </span>
              </div>

              {/* ── Preset buttons ── */}
              <div style={{ display: "flex", gap: 5, padding: "7px 10px 6px", borderBottom: "1px solid rgba(131,238,240,0.07)" }}>
                <button
                  data-testid="toggle-all-layers"
                  onClick={() => { setShowMarineRegions(true); setShowCoralMapping(true); setShowGcrmn(true); setShowGcrmnSites(true); setShowImgs(true); setActiveCmsVar("CHL"); setActiveLiveVar(null); }}
                  style={{ flex: 1, fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 700, background: "rgba(131,238,240,0.11)", border: "1px solid rgba(131,238,240,0.28)", borderRadius: 6, padding: "4px 0", color: "#83eef0", cursor: "pointer", transition: "background 0.15s" }}
                >Select All</button>
                <button
                  data-testid="toggle-no-layers"
                  onClick={() => { setShowMarineRegions(false); setShowCoralMapping(false); setShowGcrmn(false); setShowGcrmnSites(false); setShowImgs(false); setActiveCmsVar(null); setActiveLiveVar(null); setShowToolbox(null); }}
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
                        const v = e.target.value as LiveVar;
                        setActiveLiveVar(v || null);
                        if (v) setActiveCmsVar(null);
                      }}
                      style={{
                        width: "100%", fontSize: 9, fontFamily: "Inter,sans-serif", fontWeight: 600,
                        background: "rgba(116,185,255,0.08)", border: "1px solid rgba(116,185,255,0.25)",
                        borderRadius: 6, padding: "4px 8px", color: activeLiveVar ? "#74b9ff" : "#d4e9f355",
                        cursor: "pointer", outline: "none",
                      }}
                    >
                      <option value="">— Off —</option>
                      <optgroup label="SST NRT">
                        <option value="analysed_sst">Sea Surface Temp. (NRT daily)</option>
                      </optgroup>
                      <optgroup label="Physics Forecast">
                        <option value="thetao">Temperature (6H · 0.5 m)</option>
                        <option value="so">Salinity (6H · 0.5 m)</option>
                        <option value="sea_water_velocity">Currents (hourly · 0.5 m)</option>
                        <option value="zos">SSH · Model (hourly)</option>
                        <option value="siconc">Sea Ice (daily)</option>
                      </optgroup>
                      <optgroup label="Observation · Multi-sensor">
                        <option value="to_obs">Temp. — Multi-obs (weekly)</option>
                        <option value="ugo">Geostr. Velocity (weekly)</option>
                      </optgroup>
                      <optgroup label="Sea Level Altimetry">
                        <option value="adt">Abs. Sea Level / ADT (daily)</option>
                        <option value="sla">Sea Level Anomaly (daily)</option>
                      </optgroup>
                      <optgroup label="Wave & Wind">
                        <option value="VHM0">Wave Height (3H)</option>
                        <option value="VTPK">Peak Wave Period (3H)</option>
                        <option value="VMDR">Mean Wave Direction (3H)</option>
                        <option value="wind">Wind Speed (NRT)</option>
                      </optgroup>
                      <optgroup label="BGC Forecast">
                        <option value="ph">Acidity / pH (monthly)</option>
                        <option value="o2">Oxygen (monthly)</option>
                        <option value="phyc">Biomass (monthly)</option>
                        <option value="nppv">Primary Production (monthly)</option>
                        <option value="no3">Nitrate (monthly)</option>
                        <option value="po4">Phosphate (monthly)</option>
                        <option value="si">Silicate (monthly)</option>
                      </optgroup>
                    </select>
                  </div>
                  {activeLiveVar && activeLiveLayer && (
                    <div style={{ padding: "0 10px 2px", fontSize: 8, color: "#d4e9f355", fontFamily: "Inter,sans-serif" }}>
                      <span style={{ color: activeLiveLayer.color }}>● </span>{activeLiveLayer.unit}
                    </div>
                  )}
                </div>

                {([
                  { group: "Boundaries", icon: "◈", layers: [
                    { testId: "toggle-coral-mapping-layer",   label: "Coral Reef Regions",  sublabel: "29 zones · UQ / Allen Coral Atlas",  color: "#fd7272", active: showCoralMapping,  toggle: () => setShowCoralMapping(v => !v)  },
                    { testId: "toggle-marine-regions-layer",  label: "EEZ Boundaries",      sublabel: "Excl. Economic Zones · VLIZ",         color: "#fdcb6e", active: showMarineRegions, toggle: () => setShowMarineRegions(v => !v) },
                    { testId: "toggle-gcrmn-layer",           label: "GCRMN Regions",       sublabel: "10 global monitoring zones",          color: "#1dd1a1", active: showGcrmn,         toggle: () => setShowGcrmn(v => !v)         },
                  ]},
                  { group: "Monitoring", icon: "◉", layers: [
                    { testId: "toggle-gcrmn-sites-layer", label: "GCRMN Sites 2026", sublabel: `${GCRMN_SITES_2026.length} territories`, color: "#A6CE39", active: showGcrmnSites, toggle: () => setShowGcrmnSites(v => !v) },
                  ]},
                  { group: "Community", icon: "●", layers: [
                    { testId: "toggle-imgs-layer",            label: "Reef Photos",         sublabel: "Community-submitted images",          color: "#ff9f43", active: showImgs,          toggle: () => setShowImgs(v => !v)          },
                  ]},
                ]).map(({ group, icon, layers }) => {
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

        {/* ── Legend + Login ── */}
        <div
          className="absolute bottom-2 left-2 flex flex-col gap-1.5"
          style={{ zIndex: 500 }}
        >
          {/* Colour swatches — no labels */}
          <div className="flex items-center gap-1 pointer-events-none">
            {showMarineRegions && <span title="EEZ boundary" style={{ width:10,height:6,background:"rgba(253,203,110,0.2)",border:"1.5px solid #fdcb6e",borderRadius:2,display:"inline-block" }}/>}
            {showCoralMapping  && <span title="CoralMapping region" style={{ width:10,height:6,background:"rgba(253,114,114,0.2)",border:"1.5px solid #fd7272",borderRadius:2,display:"inline-block" }}/>}
            {showGcrmnSites    && <span title="GCRMN monitoring site" style={{ width:8,height:8,borderRadius:"50%",background:"rgba(166,206,57,0.35)",border:"1.5px solid #A6CE39",display:"inline-block" }}/>}
            {showGcrmn         && <span title="GCRMN region" style={{ width:10,height:6,background:"rgba(29,209,161,0.35)",border:"1.5px solid #1dd1a1",borderRadius:2,display:"inline-block" }}/>}
            <span title="DAO member" style={{ width:8,height:8,borderRadius:"50%",background:"#83eef0",border:"2px solid #83eef0",display:"inline-block" }}/>
            {showImgs && reefImgs.length > 0 && <span title="Reef photo" style={{ width:8,height:8,borderRadius:2,background:"#ff9f43",border:"1.5px solid #ffb347",display:"inline-block" }}/>}
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
