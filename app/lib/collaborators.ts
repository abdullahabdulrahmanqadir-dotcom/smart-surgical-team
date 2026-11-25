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
    Matches Smart Health Tower coordinates (structured-data.ts). */
export const HUB = { lat: 35.5686, lng: 45.443, country: "IQ" } as const;

/** Count institutions and distinct countries the same way everywhere. */
export function collaboratorCounts(list: Collaborator[]) {
  return { institutions: list.length, countries: new Set(list.map((item) => item.country)).size };
}

/** The map component's strings, picked from the page dictionary. Lives here,
    not in the "use client" component, so server pages can call it. */
export function mapLabels(t: Record<
  | "mapLabel"
  | "zoomIn"
  | "zoomOut"
  | "focusHub"
  | "world"
  | "ctrlHint"
  | "touchHint"
  | "hubTag"
  | "hubName"
  | "hubPlace"
  | "hubCity"
  | "hubBody"
  | "countOne"
  | "countMany"
  | "countOneCountry"
  | "showingFiltered"
  | "clearFilter"
  | "allCountries"
  | "filterLabel"
  | "emptyTitle"
  | "emptyBody"
  | "emptyCta"
  | "consentNote"
  | "legendHub"
  | "legendInstitution"
  | "visit"
  | "close"
  | "showOnMap"
  | "clusterLabel"
  | "listLabel"
  | "statInstitutions"
  | "statCountries"
  | "byCountryTitle"
  | "tableTitle"
  | "colCountry"
  | "colInstitution"
  | "colCity"
  | "colFocus",
  string
>) {
  const {
    mapLabel,
    zoomIn,
    zoomOut,
    focusHub,
    world,
    ctrlHint,
    touchHint,
    hubTag,
    hubName,
    hubPlace,
    hubCity,
    hubBody,
    countOne,
    countMany,
    countOneCountry,
    showingFiltered,
    clearFilter,
    allCountries,
    filterLabel,
    emptyTitle,
    emptyBody,
    emptyCta,
    consentNote,
    legendHub,
    legendInstitution,
    visit,
    close,
    showOnMap,
    clusterLabel,
    listLabel,
    statInstitutions,
    statCountries,
    byCountryTitle,
    tableTitle,
    colCountry,
    colInstitution,
    colCity,
    colFocus,
  } = t;
  return {
    mapLabel,
    zoomIn,
    zoomOut,
    focusHub,
    world,
    ctrlHint,
    touchHint,
    hubTag,
    hubName,
    hubPlace,
    hubCity,
    hubBody,
    countOne,
    countMany,
    countOneCountry,
    showingFiltered,
    clearFilter,
    allCountries,
    filterLabel,
    emptyTitle,
    emptyBody,
    emptyCta,
    consentNote,
    legendHub,
    legendInstitution,
    visit,
    close,
    showOnMap,
    clusterLabel,
    listLabel,
    statInstitutions,
    statCountries,
    byCountryTitle,
    tableTitle,
    colCountry,
    colInstitution,
    colCity,
    colFocus,
  };
}
