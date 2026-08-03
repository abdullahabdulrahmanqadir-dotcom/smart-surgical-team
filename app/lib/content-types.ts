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
  thumbnailSource?: "youtube" | "image";
  thumbnailUrl?: string;
  accessLevel?: "public" | "members_only";
};

export type ContentRecord = ContentCard & {
  presenter: { name: string; role: string; bio: string; initials: string };
  contributors: { name: string; role: string; initials: string; photoUrl?: string }[];
  posterUrl?: string;
  chapters: ContentChapter[];
  caseSummary?: CaseSummary;
  learnerCount?: number;
  progress?: number;
  media?: { id: string; storagePath: string; kind: "image" | "document"; publicUrl: string; altText?: string; caption?: string }[];
};
