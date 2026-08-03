import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";

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

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function canUseContentDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

type OneOrMany<T> = T | T[] | null;
type ContributorRow = { display_name: string | null; credentials: string | null; biography: string | null; photo_url: string | null };
type TopicRow = { name: string | null; slug: string | null };
type ChapterRow = { title: string; position: number; starts_at_seconds: number };
type MediaRow = { id: string; storage_path: string; kind: "image" | "document"; public_url: string; alt_text: string | null; caption: string | null; sort_order: number };

/** Columns shared by both projections. */
type ContentBaseRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: ContentKind;
  video_url: string | null;
  thumbnail_source: "youtube" | "image" | null;
  thumbnail_media_path: string | null;
  duration_seconds: number | null;
  reading_minutes: number | null;
  level: string | null;
  published_at: string | null;
  access_level: "public" | "members_only" | null;
  content_topics: OneOrMany<{ topics: OneOrMany<TopicRow> }>;
};

/** Only the two columns needed to resolve `thumbnail_media_path` to a URL. */
type CardRow = ContentBaseRow & {
  content_media: { storage_path: string; public_url: string }[] | null;
};

type FullRow = ContentBaseRow & {
  poster_url: string | null;
  case_presentation: string | null;
  case_imaging: string | null;
  case_procedure: string | null;
  case_histopathology: string | null;
  case_outcome: string | null;
  contributors: OneOrMany<ContributorRow>;
  content_contributors: OneOrMany<{ contributors: OneOrMany<ContributorRow> }>;
  content_chapters: ChapterRow[] | null;
  content_media: MediaRow[] | null;
};

const BASE_COLUMNS =
  "id,title,slug,summary,kind,video_url,thumbnail_source,thumbnail_media_path,duration_seconds,reading_minutes,level,published_at,access_level,content_topics(topics(name,slug))";

const CARD_SELECT = `${BASE_COLUMNS},content_media(storage_path,public_url)`;

// `contributors` must be disambiguated: migration 0006 added the
// content_contributors join table, so content_items now has two paths to
// contributors (the lead-author FK and the many-to-many join). Without the
// explicit constraint name PostgREST rejects the embed as ambiguous and the
// whole query fails.
const FULL_SELECT =
  `${BASE_COLUMNS},poster_url,case_presentation,case_imaging,case_procedure,case_histopathology,case_outcome` +
  ",contributors!content_items_contributor_id_fkey(display_name,credentials,biography,photo_url)" +
  ",content_contributors(contributors(display_name,credentials,biography,photo_url))" +
  ",content_chapters(title,position,starts_at_seconds)" +
  ",content_media(id,storage_path,kind,public_url,alt_text,caption,sort_order)";

function firstOf<T>(value: OneOrMany<T>): T | undefined {
  return (Array.isArray(value) ? value[0] : value) ?? undefined;
}

function toArray<T>(value: OneOrMany<T>): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Published rows change only when an editor saves, so a short shared cache
    keeps almost every visitor off the database entirely. */
const REVALIDATE_SECONDS = 60;
export const CONTENT_CACHE_TAG = "published-content";

function mapBase(row: ContentBaseRow, thumbnailUrl: string | undefined): ContentCard {
  const topics = toArray(row.content_topics)
    .map((entry) => firstOf(entry.topics))
    .filter((topic): topic is TopicRow & { name: string; slug: string } => Boolean(topic?.name && topic.slug));
  const primaryTopic = topics[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? "",
    kind: row.kind,
    topic: primaryTopic?.name ?? "Clinical education",
    topicSlug: primaryTopic?.slug ?? "topics",
    topics,
    duration: formatDuration(row.duration_seconds) || (row.reading_minutes ? `${row.reading_minutes} min read` : ""),
    durationSeconds: row.duration_seconds ?? undefined,
    readingMinutes: row.reading_minutes ?? undefined,
    publishedAt: row.published_at ?? undefined,
    level: row.level ?? "Clinical education",
    videoUrl: row.video_url ?? undefined,
    thumbnailSource: row.thumbnail_source === "image" ? "image" : "youtube",
    thumbnailUrl,
    accessLevel: row.access_level ?? "public",
  };
}

/** The chosen thumbnail is stored as a storage path; the matching media row
    carries the URL it is actually served from. */
function thumbnailUrlFor(row: { thumbnail_source: string | null; thumbnail_media_path: string | null }, media: { storage_path: string; public_url: string }[] | null) {
  if (row.thumbnail_source !== "image") return undefined;
  return media?.find((item) => item.storage_path === row.thumbnail_media_path)?.public_url;
}

async function fetchCards(): Promise<ContentCard[]> {
  if (!canUseContentDatabase()) return [];
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("content_items")
      .select(CARD_SELECT)
      .eq("status", "published")
      .eq("access_level", "public")
      .order("published_at", { ascending: false });
    // A query error used to be indistinguishable from "no content published
    // yet" — the exact PostgREST ambiguous-embed failure this file once had.
    if (error) console.error("published content cards query failed:", error.message);
    if (error || !data) return [];
    return (data as unknown as CardRow[]).map((row) => mapBase(row, thumbnailUrlFor(row, row.content_media)));
  } catch {
    return [];
  }
}

async function fetchRecord(identifier: string, includeMembersOnly: boolean): Promise<ContentRecord | null> {
  if (!canUseContentDatabase()) return null;
  try {
    let query = getSupabaseServerClient()
      .from("content_items")
      .select(FULL_SELECT)
      .eq("status", "published");
    if (!includeMembersOnly) query = query.eq("access_level", "public");
    // Single-item lookups used to pull the whole catalogue and `.find()` in JS.
    // `id` is a uuid column, so only compare it when the input actually is one.
    query = UUID_PATTERN.test(identifier) ? query.or(`id.eq.${identifier},slug.eq.${identifier}`) : query.eq("slug", identifier);

    const { data, error } = await query.limit(1);
    if (error) console.error("published content record query failed:", error.message);
    const row = (data as unknown as FullRow[] | null)?.[0];
    if (error || !row) return null;

    const leadContributor = firstOf(row.contributors);
    const selectedContributors = toArray(row.content_contributors)
      .map((entry) => firstOf(entry.contributors))
      .filter((contributor): contributor is ContributorRow & { display_name: string } => Boolean(contributor?.display_name));
    // Content created before multi-contributor support still has only the
    // legacy lead-author FK, so preserve it as a graceful fallback.
    const namedLead = leadContributor?.display_name ? [{ ...leadContributor, display_name: leadContributor.display_name }] : [];
    const contributorRows = selectedContributors.length ? selectedContributors : namedLead;
    const contributors = contributorRows.map((contributor) => {
      const name = contributor.display_name;
      return {
        name,
        role: contributor.credentials ?? "Contributor",
        initials: name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST",
        photoUrl: contributor.photo_url ?? undefined,
      };
    });
    const chapters = [...(row.content_chapters ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((chapter) => ({ time: formatDuration(chapter.starts_at_seconds), title: chapter.title, progress: row.duration_seconds ? Math.round((chapter.starts_at_seconds / row.duration_seconds) * 100) : 0 }));
    const presenter = contributors[0] ?? { name: "Smart Surgical Team", role: "Contributor", initials: "ST" };

    return {
      ...mapBase(row, thumbnailUrlFor(row, row.content_media)),
      presenter: { name: presenter.name, role: presenter.role, bio: leadContributor?.biography ?? "", initials: presenter.initials },
      contributors,
      posterUrl: row.poster_url ?? undefined,
      chapters,
      caseSummary: {
        presentation: row.case_presentation ?? undefined,
        imaging: row.case_imaging ?? undefined,
        procedure: row.case_procedure ?? undefined,
        histopathology: row.case_histopathology ?? undefined,
        outcome: row.case_outcome ?? undefined,
      },
      media: [...(row.content_media ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((item) => ({ id: item.id, storagePath: item.storage_path, kind: item.kind, publicUrl: item.public_url, altText: item.alt_text ?? undefined, caption: item.caption ?? undefined })),
    } satisfies ContentRecord;
  } catch {
    return null;
  }
}

const cachedCards = unstable_cache(fetchCards, ["published-content-cards"], { revalidate: REVALIDATE_SECONDS, tags: [CONTENT_CACHE_TAG] });
const cachedRecord = unstable_cache(fetchRecord, ["published-content-record"], { revalidate: REVALIDATE_SECONDS, tags: [CONTENT_CACHE_TAG] });

/** Published items are the single public source of truth. */
export async function getLibraryContent(): Promise<ContentCard[]> {
  return cachedCards();
}

/** Cards for one topic group, resolved without shipping the whole catalogue. */
export async function getTopicContent(topicSlugs: string[]): Promise<ContentCard[]> {
  const wanted = new Set(topicSlugs);
  return (await cachedCards()).filter((item) => item.topics.some(({ slug }) => wanted.has(slug)));
}

export async function getContent(identifier: string) {
  return (await cachedRecord(identifier, false)) ?? undefined;
}

/** Used only after the API has verified that the caller has a member session. */
export async function getContentForMember(identifier: string) {
  return (await cachedRecord(identifier, true)) ?? undefined;
}
