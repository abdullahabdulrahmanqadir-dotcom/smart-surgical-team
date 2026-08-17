/**
 * The social-preview twin of the on-page publication cover.
 *
 * Every publication's cover is generated from its own title and journal and
 * coloured by the topic it is filed under — see ResearchCover.tsx, which is
 * what readers actually see. This module renders the same design as an image
 * file, because a link unfurler on WhatsApp or LinkedIn will not run our CSS;
 * it wants a URL that returns a picture.
 *
 * Output is plain SVG so it needs no font binary, no rasteriser and no
 * storage — it renders identically on the Worker and in local dev, and stays
 * correct when a title is edited in the admin because nothing is cached to
 * disk.
 *
 * Deliberately no letter-spacing anywhere: see the RTL tracking rule. These
 * covers carry Latin metadata today, but the rule is cheaper to keep than to
 * remember.
 */

import { paletteFor } from "./research-palettes";

export type CoverInput = {
  title: string;
  journal?: string;
  /** The topic's palette name; falls back to hashing the journal. */
  palette?: string;
};

const WIDTH = 1200;
const HEIGHT = 800;

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

/**
 * How much to open up or tighten a cover's title, by how much title there is.
 *
 * These titles run from 36 to 166 characters — a 4.6x spread poured into one
 * fixed box. Set at a single size, a short title left most of its cover empty
 * while the longest ones were clipped, and the grid read as broken rather than
 * varied. Scaling the type inversely evens out the ink each cover carries.
 *
 * The range is deliberately much narrower than the range it corrects for:
 * 1.28x down to 0.88x, about 1.45x end to end against content that varies by
 * 4.6x. Fully evening it out would need a 4x range, and covers that different
 * stop looking like one family. The CSS clamps this feeds are the hard stops —
 * this only shifts a title within them, it cannot push one past a readable
 * size in either direction.
 *
 * Measured in ems rather than counted in characters: the estimator above knows
 * that capitals and 'm' are wide and 'i' is narrow, so an all-caps title is
 * treated as the large thing it is instead of by its character count.
 *
 * The thresholds are centred on the archive's own median title (~39em), so a
 * typical paper sits at 1x and the steps correct the outliers either side. An
 * earlier cut centred them too low, which put the median at 1.14x and quietly
 * enlarged two thirds of the grid instead of evening it out.
 */
export function coverTitleScale(title: string) {
  const ems = textWidth(title.replace(/\s+/g, " ").trim(), 1);
  // 25 rather than 22: the genuinely short titles form a run from 15 to 24em,
  // and the lower cut split that group in half for no reason a reader could see.
  if (ems <= 25) return 1.28;
  if (ems <= 32) return 1.14;
  if (ems <= 45) return 1;
  if (ems <= 60) return 0.93;
  return 0.88;
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

/** Builds the full SVG document for one publication cover. */
export function researchCoverSvg({ title, journal, palette: paletteName }: CoverInput) {
  const palette = paletteFor(paletteName, journal?.trim() || title);
  const cleanTitle = truncate(title || "Publication", 220);

  // Step down through sizes and take the largest that fits whole. Driven by
  // measured width, not character count: an all-caps title of the same length
  // needs a smaller size than a lowercase one.
  const maxTextWidth = WIDTH - 200;
  const maxLines = 5;
  // Same length-driven sizing as the HTML cover, so a shared link and the page
  // it opens do not show the same title at noticeably different sizes.
  let titleSize = Math.round(62 * coverTitleScale(cleanTitle));
  let lines = wrap(cleanTitle, titleSize, maxTextWidth, maxLines);
  // The step-down remains as a safety net: the scale is bucketed, so a title at
  // the top of its bucket can still overrun and needs to give ground.
  for (const factor of [0.87, 0.74, 0.65]) {
    if (!lines[lines.length - 1]?.endsWith("…")) break;
    titleSize = Math.round(62 * coverTitleScale(cleanTitle) * factor);
    lines = wrap(cleanTitle, titleSize, maxTextWidth, maxLines);
  }
  const lineHeight = Math.round(titleSize * 1.22);

  // Centred, matching the HTML cover: the title is the only thing on here now.
  const blockTop = Math.round((HEIGHT - lines.length * lineHeight) / 2);

  const titleLines = lines
    .map((line, index) => `<text x="${WIDTH / 2}" y="${blockTop + index * lineHeight + titleSize}" text-anchor="middle" class="t">${escapeXml(line)}</text>`)
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
</style>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
${titleLines}
</svg>`;
}

/** The public URL a paper's generated cover is served from. */
export function researchCoverPath(id: number) {
  return `/api/research-cover/${id}`;
}
