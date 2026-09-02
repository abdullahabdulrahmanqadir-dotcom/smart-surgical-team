/**
 * Content shapes and the presentation constants that go with them.
 *
 * Deliberately free of server-only imports. Client components render content
 * too, and when the Supabase reads and their `next/cache` wrapper were the only
 * home for these exports, the browser bundle pulled in `AsyncLocalStorage` and
 * crashed on load. The server-side reads live in `content.ts`, which re-exports
 * everything here.
 */

export type ContentKind = "case_article" | "video" | "webinar_recording" | "poster";

export type ContentChapter = {
  time: string;
  title: string;
  progress: number;
};

export type CaseSummary = {
  presentation?: string;
  imaging?: string;
  procedure?: string;
  histopathology?: string;
  outcome?: string;
};

export const CASE_SUMMARY_FIELDS: { key: keyof CaseSummary; label: string }[] = [
  { key: "presentation", label: "Presentation" },
  { key: "imaging", label: "Imaging & workup" },
  { key: "procedure", label: "Procedure" },
  { key: "histopathology", label: "Histopathology" },
  { key: "outcome", label: "Outcome & follow-up" },
];

// A case record is an ordered list of named rich-text sections. The five keys
// above are the defaults every new case starts from; an editor may rename any
// of them and append sections of their own, which carry a generated key.
export type CaseSection = { key: string; label: string; body: string };

export const CASE_SECTION_KEYS = CASE_SUMMARY_FIELDS.map((field) => field.key) as string[];

// The one place that decides what a case's sections are, used by every reader.
// `caseSections` wins when the item has been saved since custom sections
// existed; anything older is rendered from the five legacy columns under their
// original headings. Empty sections never reach the page.
export function resolveCaseSections(
  record: { caseSections?: CaseSection[]; caseSummary?: CaseSummary },
  labels?: Partial<Record<keyof CaseSummary, string>>,
): CaseSection[] {
  const stored = record.caseSections;
  if (stored?.length) {
    return stored
      .filter((section) => section && typeof section.body === "string" && section.body.trim() && String(section.label ?? "").trim())
      .map((section, index) => ({ key: String(section.key || `section-${index}`), label: String(section.label).trim(), body: section.body.trim() }));
  }
  return CASE_SUMMARY_FIELDS.flatMap(({ key, label }) => {
    const body = record.caseSummary?.[key]?.trim();
    return body ? [{ key, label: labels?.[key] ?? label, body }] : [];
  });
}

/**
 * The class list for a container of editor-written prose.
 *
 * `justify` is the record's own `justify_body` choice (migration 0024).
 * Anything but an explicit `false` justifies, so a record read from a database
 * without the column — or from a cache entry written before it existed — gets
 * the site-wide default rather than ragged-right.
 */
export function proseClass(base: string, justify?: boolean): string {
  return justify === false ? base : `${base} is-justified`;
}

export type ContentTopic = { name: string; slug: string };

/**
 * The fields a list view actually paints: topic grids, the case library and
 * the related rail. Everything a card cannot show — chapters, case-summary
 * prose, contributor biographies, the full media manifest — is deliberately
 * absent, because list payloads used to carry all of it to the browser for
 * every published item on the site.
 */
export type ContentCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: ContentKind;
  topic: string;
  topicSlug: string;
  topics: ContentTopic[];
  duration: string;
  durationSeconds?: number;
  readingMinutes?: number;
  publishedAt?: string;
  level: string;
  videoUrl?: string;
  thumbnailSource?: "youtube" | "image" | "before_after";
  thumbnailUrl?: string;
  beforeUrl?: string;
  afterUrl?: string;
  accessLevel?: "public" | "members_only";
  /** Teaching & reference material rather than a clinical case (migration 0022). */
  isTeaching?: boolean;
};

export type ContentRecord = ContentCard & {
  /**
   * Justify this record's written sections on its public page (migration
   * 0024). Absent — an older cache entry, or a database without the column —
   * reads as `true`, which is the site-wide default.
   */
  justifyBody?: boolean;
  presenter: { name: string; role: string; bio: string; initials: string };
  contributors: { name: string; role: string; initials: string; photoUrl?: string }[];
  posterUrl?: string;
  posterCtaText?: string;
  posterCtaUrl?: string;
  chapters: ContentChapter[];
  caseSummary?: CaseSummary;
  caseSections?: CaseSection[];
  learnerCount?: number;
  progress?: number;
  media?: { id: string; storagePath: string; kind: "image" | "document"; publicUrl: string; altText?: string; caption?: string }[];
};
