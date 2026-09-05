/**
 * The colour vocabulary for research topics.
 *
 * A publication's cover is generated, not uploaded, and its colour comes from
 * the topic it is filed under — so the archive grid reads as grouped before a
 * single title is read. Topics store a palette *name* rather than hex values,
 * which keeps the exact colours here in code: the site owns its own brand, and
 * an admin choosing "teal" should get whatever teal the site means today, not
 * a hex triple frozen into a database row on the day the topic was created.
 *
 * Both renderers import this module — the HTML cover on the cards and detail
 * pages, and the SVG cover used for social previews — so the two can never
 * drift apart into slightly different greens.
 */

export type Palette = {
  /** The deep field colour the cover sits on. */
  base: string;
  /** The lighter corner the gradient runs toward. */
  glow: string;
  /** Rules, eyebrow text and other tints laid over the field. */
  edge: string;
};

/**
 * `base` and `glow` are deliberately deep. The title sits in white directly on
 * this field, and the lighter first draft of these colours left the honey and
 * olive covers close to failing contrast where the gradient was brightest.
 * `edge` stays pale — it is only ever used for text and tints laid on top.
 */
export const RESEARCH_PALETTES = {
  teal: { base: "#082a2a", glow: "#0f5f5e", edge: "#cdebe5" },
  slate: { base: "#142430", glow: "#325a6d", edge: "#dce9ef" },
  plum: { base: "#3a222e", glow: "#8b4c55", edge: "#f5e6e8" },
  copper: { base: "#31261f", glow: "#8a5026", edge: "#f4ead4" },
  olive: { base: "#232c1c", glow: "#5b6847", edge: "#e9eddf" },
  honey: { base: "#332415", glow: "#b08c47", edge: "#f7ead9" },
  rose: { base: "#3d1430", glow: "#a8336e", edge: "#f9e3ee" },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof RESEARCH_PALETTES;

export const PALETTE_NAMES = Object.keys(RESEARCH_PALETTES) as PaletteName[];

/** Human labels for the admin's palette picker. */
export const PALETTE_LABELS: Record<PaletteName, string> = {
  teal: "Teal",
  slate: "Slate blue",
  plum: "Plum",
  copper: "Copper",
  olive: "Olive",
  honey: "Honey",
  rose: "Rose",
};

export function isPaletteName(value: unknown): value is PaletteName {
  return typeof value === "string" && value in RESEARCH_PALETTES;
}

/**
 * Resolves a topic's stored palette name to real colours.
 *
 * Falls back by hashing rather than defaulting to one colour: an unfiled paper,
 * or one whose topic was deleted, would otherwise render in the same teal as
 * the largest topic and read as belonging to it. Hashing the key at least
 * spreads those apart, and hashes the same way every render so a cover does not
 * change colour between page loads.
 */
export function paletteFor(name: unknown, fallbackKey = ""): Palette {
  if (isPaletteName(name)) return RESEARCH_PALETTES[name];
  let hash = 0;
  for (let index = 0; index < fallbackKey.length; index += 1) {
    hash = (hash * 31 + fallbackKey.charCodeAt(index)) >>> 0;
  }
  return RESEARCH_PALETTES[PALETTE_NAMES[hash % PALETTE_NAMES.length]];
}
