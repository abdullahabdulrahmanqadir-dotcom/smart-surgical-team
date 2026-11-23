/**
 * Collaboration map: the public shape of a collaborating institution, and
 * the hub every arc starts from.
 *
 * Client-safe (no server imports): the map component renders these. Reads
 * live in `collaborators-server.ts`. Table: migration 0030.
 */

export type Collaborator = {
  slug: string;
  name: string;
  city: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  lat: number;
  lng: number;
  description?: string;
  websiteUrl?: string;
  featured: boolean;
};

/** Smart Surgical Team at Smart Health Tower: the map's centre. Listing
    ourselves needs no consent, so the hub shows even when the map is empty.
    City-level position; the map never zooms past country scale. */
export const HUB = { lat: 35.5617, lng: 45.4372, country: "IQ" } as const;

/** "N institutions in M countries", counted the same way everywhere. */
export function collaboratorCounts(list: Collaborator[]) {
  return { institutions: list.length, countries: new Set(list.map((item) => item.country)).size };
}

/** The map component's strings, picked from the page dictionary. Lives here,
    not in the "use client" component, so server pages can call it. */
export function mapLabels(t: Record<
  "mapLabel" | "zoomIn" | "zoomOut" | "world" | "ctrlHint" | "touchHint" | "hubName" | "hubPlace" | "count" | "allCountries" | "filterLabel" | "emptyTitle" | "emptyBody" | "emptyCta" | "visit" | "close" | "showOnMap" | "clusterLabel" | "listLabel",
  string
>) {
  const { mapLabel, zoomIn, zoomOut, world, ctrlHint, touchHint, hubName, hubPlace, count, allCountries, filterLabel, emptyTitle, emptyBody, emptyCta, visit, close, showOnMap, clusterLabel, listLabel } = t;
  return { mapLabel, zoomIn, zoomOut, world, ctrlHint, touchHint, hubName, hubPlace, count, allCountries, filterLabel, emptyTitle, emptyBody, emptyCta, visit, close, showOnMap, clusterLabel, listLabel };
}
