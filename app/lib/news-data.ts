import type { Locale } from "./i18n";

/**
 * News shapes, the item-shape rule, the Arabic fallback and date formatting.
 *
 * Deliberately free of server-only imports. Client components render news too,
 * and when the Supabase reads and their `next/cache` wrapper were the only home
 * for these exports the browser bundle pulled in `AsyncLocalStorage` and
 * crashed on load — the mistake `events.ts` and `content.ts` both document
 * having made. The server-side reads live in `news.ts`, which re-exports
 * everything here.
 */

/** One named rich-text block of a news item's body, in the order it publishes. */
export type NewsSection = { key: string; label: string; body: string };

export type NewsCategory = {
  id: string;
  name: string;
  /** Empty when the admin has not translated it; the site falls back to `name`. */
  nameAr: string;
  slug: string;
};

/** The one optional record an item points at, for a "related" card. */
export type NewsRelation = { type: "content" | "event" | "research"; ref: string };

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  summary: string;
  summaryAr: string;
  sections: NewsSection[];
  sectionsAr: NewsSection[];
  category: NewsCategory | null;
  /** `YYYY-MM-DD`, the editor's own publication date. Empty if never set. */
  date: string;
  /** An external article this item points at. Empty when it has none. */
  linkUrl: string;
  /**
   * The `publicUrl` of one of the item's own `media` entries, or empty — the
   * site then draws a generated cover. The editor picks it from the uploaded
   * images rather than uploading a second copy, so it always has a match in
   * `media` and its alt text and caption are that image's own.
   */
  coverUrl: string;
  pinned: boolean;
  related: NewsRelation | null;
  media: NewsMedia[];
};

/** One uploaded file on an item. A `document` is a PDF, not a photograph. */
export type NewsMedia = { publicUrl: string; altText: string; caption: string; kind: "image" | "document" };

export const NEWS_RELATION_TYPES: NewsRelation["type"][] = ["content", "event", "research"];

export function isNewsRelationType(value: unknown): value is NewsRelation["type"] {
  return typeof value === "string" && (NEWS_RELATION_TYPES as string[]).includes(value);
}

/**
 * Keeps only publishable sections, in order.
 *
 * A section needs both a heading and a body to reach a page: a heading with no
 * text would print an empty section, and text under no heading would print
 * unlabelled prose. Malformed rows — a hand-edited jsonb, an older save — are
 * dropped rather than rendered as `undefined`.
 */
export function resolveNewsSections(value: unknown): NewsSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const section = entry as Record<string, unknown>;
    const label = typeof section.label === "string" ? section.label.trim() : "";
    const body = typeof section.body === "string" ? section.body.trim() : "";
    const key = typeof section.key === "string" && section.key.trim() ? section.key.trim() : `section-${index + 1}`;
    return label && body ? [{ key, label, body }] : [];
  });
}

/**
 * How a single item is read, decided by what the editor filled in rather than
 * by a type field they could contradict.
 *
 * - `article` — it has a body, so it gets a detail page. A body plus a link
 *   still gets the detail page; the link becomes a "read the original" action.
 * - `link` — no body, only an external URL: the card goes straight there.
 *
 * An item with neither is an `article` too. Its detail page carries the title,
 * date and summary, which is a thin page but an honest one — better than a card
 * that leads nowhere.
 */
export function newsItemShape(item: Pick<NewsItem, "sections" | "sectionsAr" | "linkUrl">): "article" | "link" {
  if (item.sections.length || item.sectionsAr.length) return "article";
  return item.linkUrl ? "link" : "article";
}

/**
 * The Arabic fallback, in one place.
 *
 * Per field, not per item: an item with an Arabic headline but no Arabic body
 * shows the Arabic headline and leaves the body in English, where
 * `TranslatableContent` offers the reader an in-place translation. `translated`
 * is what tells a caller which of the two it received.
 */
/**
 * Every Arabic column is optional, so an untranslated record renders in
 * English on /ar with nothing to show for it. That is deliberate — a blank
 * headline would be worse — but it is invisible to whoever is publishing.
 * Development logs each gap once so the missing translations are findable.
 */
const reportedFallbacks = new Set<string>();

function noteFallback(english: string) {
  if (process.env.NODE_ENV === "production") return;
  const key = english.slice(0, 120);
  if (reportedFallbacks.has(key)) return;
  reportedFallbacks.add(key);
  console.warn(`[i18n] No Arabic translation stored; /ar is showing English: "${key}"`);
}

export function localizedText(locale: Locale, english: string, arabic: string): { value: string; translated: boolean } {
  const hasArabic = Boolean(arabic.trim());
  if (locale === "ar" && !hasArabic && english.trim()) noteFallback(english);
  const value = locale === "ar" && hasArabic ? arabic.trim() : english;
  return { value, translated: locale === "ar" && hasArabic };
}

export function localizedSections(locale: Locale, item: Pick<NewsItem, "sections" | "sectionsAr">): { sections: NewsSection[]; translated: boolean } {
  const useArabic = locale === "ar" && item.sectionsAr.length > 0;
  return { sections: useArabic ? item.sectionsAr : item.sections, translated: useArabic };
}

export function categoryLabel(locale: Locale, category: NewsCategory | null): string {
  if (!category) return "";
  return localizedText(locale, category.name, category.nameAr).value;
}

/**
 * Formats a `YYYY-MM-DD` publication date for display.
 *
 * Parsed at midday rather than midnight: `new Date("2026-08-12")` is UTC
 * midnight, which prints as the 11th for any reader west of Greenwich. The
 * homepage events panel already dodges this the same way.
 */
export function newsDate(date: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

/** The year an item belongs to, for grouping and filters. Empty when undated. */
export function newsYear(date: string): string {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : "";
}

/**
 * The uploaded photograph an item's cover points at.
 *
 * The cover is chosen from the item's own images, so it is normally there to be
 * found — and finding it is what gives the hero its alt text and caption rather
 * than a guess at the first image. Null covers both an item with no cover and a
 * `cover_url` left pointing at an image that has since been deleted; either way
 * the page falls back to the generated typographic cover.
 */
export function newsCoverImage(item: Pick<NewsItem, "coverUrl" | "media">): NewsMedia | null {
  if (!item.coverUrl) return null;
  return item.media.find((image) => image.kind === "image" && image.publicUrl === item.coverUrl) ?? null;
}

/**
 * The photographs the item page shows in its strip.
 *
 * PDFs are not photographs, and the cover is already standing at the top of the
 * page at full width — showing it again as the first thumbnail would read as a
 * duplicate. The case pages drop their hero from the sidebar gallery for the
 * same reason.
 */
export function newsGalleryImages(item: Pick<NewsItem, "coverUrl" | "media">): NewsMedia[] {
  const cover = newsCoverImage(item);
  return item.media.filter((image) => image.kind === "image" && image !== cover);
}
