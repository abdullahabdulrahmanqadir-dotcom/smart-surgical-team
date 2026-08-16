/**
 * Generated typographic covers for publications that have no real figure.
 *
 * Most of the head & neck archive is paywalled, and roughly a dozen papers
 * have no figures anywhere in their full text, so there is nothing to harvest
 * for them. Journal cover art and publisher logos are not an option — that is
 * someone else's trademark, and thirteen of the papers share one journal, so
 * the grid would render as a wall of identical thumbnails.
 *
 * Instead every uncovered paper gets a deterministic card built from its own
 * metadata: title, journal, year, category. Output is plain SVG so it needs no
 * font binary, no rasteriser and no storage — it renders identically on the
 * Worker and in local dev. A real `cover_image_url` always wins over this, so
 * harvesting figures later is a data change with no code change.
 *
 * Deliberately no letter-spacing anywhere: see the RTL tracking rule. These
 * covers carry Latin metadata today, but the rule is cheaper to keep than to
 * remember.
 */

export type CoverInput = {
  title: string;
  journal?: string;
  year?: string;
  category?: string;
};

const WIDTH = 1200;
const HEIGHT = 800;

/**
 * Brand-derived palettes, one per slot, chosen by hash rather than a lookup
 * table that would silently collapse to one colour the moment someone adds a
 * category. The hash key is the journal: category is near-uniform across the
 * archive, and keying on it rendered every card in the same brown — the wall
 * of identical thumbnails this whole approach exists to avoid.
 */
const PALETTES = [
  { base: "#0d3838", glow: "#167a78", edge: "#cdebe5" }, // teal deep
  { base: "#40322a", glow: "#a9642f", edge: "#f4ead4" }, // brown / copper
  { base: "#4b2d3c", glow: "#a85f68", edge: "#f5e6e8" }, // plum / rose
  { base: "#2f3a26", glow: "#71805a", edge: "#e9eddf" }, // olive
  { base: "#1d3140", glow: "#3f6f86", edge: "#dce9ef" }, // slate blue
  { base: "#43301c", glow: "#d3ab63", edge: "#f7ead9" }, // honey
];

function paletteFor(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Approximate Georgia advance widths, in ems.
 *
 * SVG offers no text metrics here, and a flat per-character average is not
 * good enough: an all-caps title measured at the lowercase average overflowed
 * the artwork, because capitals run roughly 40% wider. Bucketing by character
 * class costs nothing and keeps every real title inside the frame.
 */
function glyphWidth(char: string) {
  if (/[ilj.,;:'!|]/.test(char)) return 0.28;
  if (/[ft()\-[\]]/.test(char)) return 0.36;
  if (/[mw]/.test(char)) return 0.78;
  if (/[MW]/.test(char)) return 0.94;
  if (/[A-Z]/.test(char)) return 0.7;
  if (/[0-9]/.test(char)) return 0.5;
  if (char === " ") return 0.25;
  return 0.5;
}

function textWidth(text: string, fontSize: number) {
  let ems = 0;
  for (const char of text) ems += glyphWidth(char);
  return ems * fontSize;
}

/** Greedy wrap against a real width budget, with a hard split for long words. */
function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let current = "";

  const hardSplit = (word: string) => {
    let head = "";
    for (const char of word) {
      if (textWidth(`${head}${char}-`, fontSize) > maxWidth) break;
      head += char;
    }
    return [head, word.slice(head.length)] as const;
  };

  const words = text.split(/\s+/).filter(Boolean);
  for (let index = 0; index < words.length && lines.length < maxLines; index += 1) {
    let word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
      if (lines.length >= maxLines) break;
    }
    // Chemical names and hyphen-free compounds can exceed a whole line on
    // their own; split rather than let them run past the artwork edge.
    while (textWidth(word, fontSize) > maxWidth && lines.length < maxLines) {
      const [head, tail] = hardSplit(word);
      if (!head) break;
      lines.push(`${head}-`);
      word = tail;
    }
    current = word;
  }
  if (current && lines.length < maxLines) lines.push(current);

  // Anything that did not fit gets an ellipsis on the final line, trimmed to
  // the measured budget so the marker itself cannot cause an overflow.
  const rendered = lines.join(" ").replace(/-\s/g, "");
  if (rendered.length < text.replace(/\s+/g, " ").length) {
    let last = lines[lines.length - 1] ?? "";
    while (last && textWidth(`${last}…`, fontSize) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.replace(/[\s,;:.-]+$/, "")}…`;
  }
  return lines;
}

function truncate(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1).trimEnd()}…` : clean;
}

/** Trims a single-line label to a measured width budget. */
function fitText(value: string, fontSize: number, maxWidth: number) {
  let text = value.replace(/\s+/g, " ").trim();
  if (textWidth(text, fontSize) <= maxWidth) return text;
  while (text && textWidth(`${text}…`, fontSize) > maxWidth) text = text.slice(0, -1);
  return `${text.trimEnd()}…`;
}

/** Builds the full SVG document for one publication cover. */
export function researchCoverSvg({ title, journal, year, category }: CoverInput) {
  const palette = paletteFor(journal?.trim() || category?.trim() || title);
  const cleanTitle = truncate(title || "Publication", 220);

  // Step down through sizes and take the largest that fits whole. Driven by
  // measured width, not character count: an all-caps title of the same length
  // needs a smaller size than a lowercase one.
  const maxTextWidth = WIDTH - 200;
  const maxLines = 5;
  let titleSize = 62;
  let lines = wrap(cleanTitle, titleSize, maxTextWidth, maxLines);
  for (const size of [54, 46, 40]) {
    if (!lines[lines.length - 1]?.endsWith("…")) break;
    titleSize = size;
    lines = wrap(cleanTitle, titleSize, maxTextWidth, maxLines);
  }
  const lineHeight = Math.round(titleSize * 1.22);

  // Block is centred on the artwork's optical middle, biased slightly up so it
  // sits clear of the footer rule.
  const blockTop = Math.round((HEIGHT - lines.length * lineHeight) / 2) - 20;

  const eyebrow = fitText((journal || "Publication").toUpperCase(), 28, maxTextWidth);
  const footerRight = (year || "").trim();
  // Leaves room for the year at the opposite end of the same footer line.
  const footerLeft = fitText((category || "Research").toUpperCase(), 28, maxTextWidth - 200);

  const titleLines = lines
    .map((line, index) => `<text x="100" y="${blockTop + index * lineHeight + titleSize}" class="t">${escapeXml(line)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${escapeXml(cleanTitle)}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${palette.glow}"/>
<stop offset="0.55" stop-color="${palette.base}"/>
<stop offset="1" stop-color="${palette.base}"/>
</linearGradient>
<radialGradient id="glow" cx="0.82" cy="0.12" r="0.75">
<stop offset="0" stop-color="${palette.edge}" stop-opacity="0.34"/>
<stop offset="1" stop-color="${palette.edge}" stop-opacity="0"/>
</radialGradient>
<style>
.t { fill: #ffffff; font-family: Georgia, "Times New Roman", serif; font-size: ${titleSize}px; font-weight: 500; }
.label { fill: ${palette.edge}; font-family: Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; }
.label-dim { fill: ${palette.edge}; fill-opacity: 0.72; font-family: Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; }
</style>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
<g fill="none" stroke="${palette.edge}" stroke-opacity="0.16" stroke-width="2">
<circle cx="1010" cy="150" r="120"/>
<circle cx="1010" cy="150" r="190"/>
<circle cx="1010" cy="150" r="260"/>
</g>
<rect x="100" y="96" width="64" height="5" fill="${palette.edge}" fill-opacity="0.85"/>
<text x="100" y="140" class="label">${escapeXml(eyebrow)}</text>
${titleLines}
<rect x="100" y="${HEIGHT - 122}" width="${WIDTH - 200}" height="1" fill="${palette.edge}" fill-opacity="0.3"/>
<text x="100" y="${HEIGHT - 78}" class="label-dim">${escapeXml(footerLeft)}</text>
${footerRight ? `<text x="${WIDTH - 100}" y="${HEIGHT - 78}" class="label-dim" text-anchor="end">${escapeXml(footerRight)}</text>` : ""}
</svg>`;
}

/** The public URL a paper's generated cover is served from. */
export function researchCoverPath(id: number) {
  return `/api/research-cover/${id}`;
}
