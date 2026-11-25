// Builds the collaboration map's country shapes from Natural Earth
// (via the `world-atlas` package) into public/maps/.
//
//   node scripts/build-world-map.mjs
//
// Each country shape is tagged with its ISO 3166-1 alpha-2 code (`a2`), the
// code the collaborators table stores, so the map can tint and label a country
// without a lookup table in the browser.
//
// Borders: the site shows internationally recognised country borders only
// (decision 2026-11-23, docs/superpowers/specs/2026-11-23-breast-summit-and-map-design.md).
// Natural Earth draws a few de facto entities as their own shapes; the two
// with no broad recognition are folded into the recognised state by giving
// them its code. The map draws borders only between shapes with different
// codes, so the line between them disappears.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const FOLD = {
  Somaliland: "SO", // part of Somalia
  "N. Cyprus": "CY", // part of Cyprus
};
const NAMED = {
  Kosovo: "XK",
  "Indian Ocean Ter.": "AU",
  // Siachen Glacier: disputed between India and Pakistan; left unassigned
  // (no label, no tint) rather than given to either.
};

function alpha2(numeric) {
  if (!numeric) return null;
  try {
    const region = new Intl.Locale(`und-${numeric}`).region;
    return /^[A-Z]{2}$/.test(region ?? "") ? region : null;
  } catch {
    return null;
  }
}

mkdirSync("public/maps", { recursive: true });
for (const scale of ["110m", "50m"]) {
  const topology = JSON.parse(readFileSync(require.resolve(`world-atlas/countries-${scale}.json`), "utf8"));
  const unresolved = [];
  for (const geometry of topology.objects.countries.geometries) {
    const name = geometry.properties?.name ?? "";
    const a2 = FOLD[name] ?? NAMED[name] ?? alpha2(geometry.id);
    if (!a2) unresolved.push(name);
    geometry.properties = a2 ? { a2 } : {};
    delete geometry.id;
  }
  // `land` is not needed: coastlines come from the countries' outer edges.
  delete topology.objects.land;
  const out = `public/maps/world-${scale}.json`;
  writeFileSync(out, JSON.stringify(topology));
  console.log(`${out}: ${topology.objects.countries.geometries.length} shapes; unassigned: ${unresolved.join(", ") || "none"}`);
}
