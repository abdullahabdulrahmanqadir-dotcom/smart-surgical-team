// Generates the concentric dotted Middle East silhouette for the MEBS 2027
// hero from our Natural Earth 1:50m shapes (public/maps/world-50m.json).
//
//   node scripts/build-hero-map.mjs
//
// Output: public/mebs-middle-east-map.svg — one crisp static vector asset
// echoing the official MEBS 2027 banner's concentric pink-to-blush dotted
// Middle East map, with zero client JS and infinite Retina sharpness.

import { geoBounds, geoContains, geoMercator } from "d3-geo";
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";

const MIDDLE_EAST = new Set([
  "TR", "CY", "SY", "LB", "IL", "PS", "JO", "EG",
  "IQ", "IR", "KW", "SA", "BH", "QA", "AE", "OM", "YE",
]);

const W = 680;
const H = 560;
const PAD = 16;

const topology = JSON.parse(readFileSync("public/maps/world-50m.json", "utf8"));
const all = feature(topology, topology.objects.countries);
const features = all.features.filter((f) => MIDDLE_EAST.has(f.properties?.a2));

const collection = { type: "FeatureCollection", features };
const projection = geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], collection);

// Precompute geographic bounding boxes for fast point-in-polygon rejection.
const indexed = features.map((f) => ({
  a2: f.properties.a2,
  feature: f,
  bounds: geoBounds(f),
}));

function insideMiddleEast(lon, lat) {
  for (const item of indexed) {
    const [[minLon, minLat], [maxLon, maxLat]] = item.bounds;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    if (geoContains(item.feature, [lon, lat])) return item.a2;
  }
  return null;
}

// Center concentric rings in central Iraq (matching the official MEBS 2027
// banner where the radial rings fan outward evenly across Iraq, Turkey, the
// Levant, Egypt, the Arabian Peninsula, and Iran).
const [hubX, hubY] = projection([44.4, 31.2]);
const [suliX, suliY] = projection([45.443, 35.5686]);

const DR = 7.4;
const MAX_R = Math.hypot(W, H);
const dots = [];
const iraqDots = [];

function pushDot(x, y, a2) {
  const cmd = `M${x.toFixed(1)} ${y.toFixed(1)}h.01`;
  if (a2 === "IQ") iraqDots.push(cmd);
  else dots.push(cmd);
}

// Center dot
{
  const pt = projection.invert([hubX, hubY]);
  if (pt) {
    const a2 = insideMiddleEast(pt[0], pt[1]);
    if (a2) pushDot(hubX, hubY, a2);
  }
}

for (let ring = 1; ring * DR <= MAX_R; ring++) {
  const r = ring * DR;
  const count = Math.max(6, Math.round((2 * Math.PI * r) / DR));
  // Subtle half-step angular stagger on alternating rings keeps diagonal
  // spacing natural without losing the unmistakable concentric ring cadence.
  const phase = (ring % 2) * (Math.PI / count);
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    const x = hubX + Math.cos(a) * r;
    const y = hubY + Math.sin(a) * r;
    if (x < PAD - 4 || x > W - PAD + 4 || y < PAD - 4 || y > H - PAD + 4) continue;
    const pt = projection.invert([x, y]);
    if (!pt) continue;
    const a2 = insideMiddleEast(pt[0], pt[1]);
    if (a2) pushDot(x, y, a2);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none">
  <defs>
    <radialGradient id="mebs-me-sheen" cx="${(suliX / W * 100).toFixed(1)}%" cy="${((suliY - 40) / H * 100).toFixed(1)}%" r="72%" fx="${(suliX / W * 100).toFixed(1)}%" fy="${((suliY - 55) / H * 100).toFixed(1)}%">
      <stop offset="0%" stop-color="#fff0f5"/>
      <stop offset="22%" stop-color="#feb1ca"/>
      <stop offset="56%" stop-color="#e24f82"/>
      <stop offset="100%" stop-color="#bd2f5f"/>
    </radialGradient>
    <radialGradient id="mebs-me-iraq" cx="${(suliX / W * 100).toFixed(1)}%" cy="${(suliY / H * 100).toFixed(1)}%" r="48%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#ffc7da"/>
      <stop offset="100%" stop-color="#f2739e"/>
    </radialGradient>
  </defs>
  <path d="${dots.join(" ")}" stroke="url(#mebs-me-sheen)" stroke-width="4.4" stroke-linecap="round"/>
  <path d="${iraqDots.join(" ")}" stroke="url(#mebs-me-iraq)" stroke-width="4.9" stroke-linecap="round"/>
  <circle cx="${suliX.toFixed(1)}" cy="${suliY.toFixed(1)}" r="10" fill="#fe8eae" fill-opacity="0.22"/>
  <circle cx="${suliX.toFixed(1)}" cy="${suliY.toFixed(1)}" r="4.2" fill="#ffffff" stroke="#c43c63" stroke-width="1.6"/>
</svg>
`;

writeFileSync("public/mebs-middle-east-map.svg", svg);
console.log(
  `public/mebs-middle-east-map.svg: ${dots.length + iraqDots.length} dots (${iraqDots.length} Iraq), ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`,
);
