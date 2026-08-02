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

export type ContentRecord = {
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
  presenter: { name: string; role: string; bio: string; initials: string };
  contributors: { name: string; role: string; initials: string; photoUrl?: string }[];
  videoUrl?: string;
  posterUrl?: string;
  thumbnailSource?: "youtube" | "image";
  thumbnailUrl?: string;
  chapters: ContentChapter[];
  caseSummary?: CaseSummary;
  learnerCount?: number;
  progress?: number;
  accessLevel?: "public" | "members_only";
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
type ContentItemRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: ContentKind;
  video_url: string | null;
  poster_url: string | null;
  thumbnail_source: "youtube" | "image" | null;
  thumbnail_media_path: string | null;
  duration_seconds: number | null;
  reading_minutes: number | null;
  level: string | null;
  published_at: string | null;
  case_presentation: string | null;
  case_imaging: string | null;
  case_procedure: string | null;
  case_histopathology: string | null;
  case_outcome: string | null;
  access_level: "public" | "members_only" | null;
  contributors: OneOrMany<ContributorRow>;
  content_contributors: OneOrMany<{ contributors: OneOrMany<ContributorRow> }>;
  content_topics: OneOrMany<{ topics: OneOrMany<TopicRow> }>;
  content_chapters: ChapterRow[] | null;
  content_media: { id: string; storage_path: string; kind: "image" | "document"; public_url: string; alt_text: string | null; caption: string | null; sort_order: number }[] | null;
};

function firstOf<T>(value: OneOrMany<T>): T | undefined {
  return (Array.isArray(value) ? value[0] : value) ?? undefined;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getPublishedContent(includeMembersOnly = false, identifier?: string): Promise<ContentRecord[]> {
  if (!canUseContentDatabase()) return [];

  try {
    const client = getSupabaseServerClient();
    let query = client
      .from("content_items")
      // `contributors` must be disambiguated: migration 0006 added the
      // content_contributors join table, so content_items now has two paths to
      // contributors (the lead-author FK and the many-to-many join). Since
      // then PostgREST rejects the bare embed as ambiguous, this query has
      // been failing outright and getPublishedContent's catch was turning
      // every failure into an empty list — no content showed anywhere.
      .select("id,title,slug,summary,kind,video_url,poster_url,thumbnail_source,thumbnail_media_path,duration_seconds,reading_minutes,level,published_at,case_presentation,case_imaging,case_procedure,case_histopathology,case_outcome,access_level,contributors!content_items_contributor_id_fkey(display_name,credentials,biography,photo_url),content_contributors(contributors(display_name,credentials,biography,photo_url)),content_topics(topics(name,slug)),content_chapters(title,position,starts_at_seconds),content_media(id,storage_path,kind,public_url,alt_text,caption,sort_order)")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (!includeMembersOnly) query = query.eq("access_level", "public");
    // Single-item lookups used to pull the whole catalogue and `.find()` in JS,
    // which shipped every other members-only article to answer one request.
    // `id` is a uuid column, so only compare it when the input actually is one.
    if (identifier) query = UUID_PATTERN.test(identifier) ? query.or(`id.eq.${identifier},slug.eq.${identifier}`) : query.eq("slug", identifier);
    const { data, error } = await query;
    // A query error used to be indistinguishable from "no content published
    // yet" — the exact PostgREST ambiguous-embed failure this file just had.
    if (error) console.error("getPublishedContent query failed:", error.message);
    if (error || !data) return [];

    return (data as unknown as ContentItemRow[]).map((row) => {
      const leadContributor = firstOf(row.contributors);
      const selectedContributors = (Array.isArray(row.content_contributors) ? row.content_contributors : row.content_contributors ? [row.content_contributors] : [])
        .map((entry) => firstOf(entry.contributors))
        .filter((contributor): contributor is ContributorRow & { display_name: string } => Boolean(contributor?.display_name));
      // Content created before multi-contributor support still has only the
      // legacy lead-author FK, so preserve it as a graceful fallback.
      const contributorRows = selectedContributors.length ? selectedContributors : leadContributor?.display_name ? [leadContributor] : [];
      const contributors = contributorRows.map((contributor) => {
        const name = contributor.display_name;
        return {
          name,
          role: contributor.credentials ?? "Contributor",
          initials: name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST",
          photoUrl: contributor.photo_url ?? undefined,
        };
      });
      const topics = (Array.isArray(row.content_topics) ? row.content_topics : row.content_topics ? [row.content_topics] : [])
        .map((entry) => firstOf(entry.topics))
        .filter((topic): topic is TopicRow & { name: string; slug: string } => Boolean(topic?.name && topic.slug));
      const primaryTopic = topics[0];
      const chapters = [...(row.content_chapters ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((chapter) => ({ time: formatDuration(chapter.starts_at_seconds), title: chapter.title, progress: row.duration_seconds ? Math.round((chapter.starts_at_seconds / row.duration_seconds) * 100) : 0 }));
      const presenter = contributors[0] ?? { name: "Smart Surgical Team", role: "Contributor", initials: "ST" };
      const duration = formatDuration(row.duration_seconds) || (row.reading_minutes ? `${row.reading_minutes} min read` : "");
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary ?? "",
        kind: row.kind,
        topic: primaryTopic?.name ?? "Clinical education",
        topicSlug: primaryTopic?.slug ?? "topics",
        topics,
        duration,
        durationSeconds: row.duration_seconds ?? undefined,
        readingMinutes: row.reading_minutes ?? undefined,
        publishedAt: row.published_at ?? undefined,
        level: row.level ?? "Clinical education",
        presenter: { name: presenter.name, role: presenter.role, bio: leadContributor?.biography ?? "", initials: presenter.initials },
        contributors,
        videoUrl: row.video_url ?? undefined,
        posterUrl: row.poster_url ?? undefined,
        thumbnailSource: row.thumbnail_source === "image" ? "image" : "youtube",
        thumbnailUrl: row.thumbnail_source === "image" ? row.content_media?.find((item) => item.kind === "image" && item.storage_path === row.thumbnail_media_path)?.public_url : undefined,
        chapters,
        caseSummary: {
          presentation: row.case_presentation ?? undefined,
          imaging: row.case_imaging ?? undefined,
          procedure: row.case_procedure ?? undefined,
          histopathology: row.case_histopathology ?? undefined,
          outcome: row.case_outcome ?? undefined,
        },
        accessLevel: row.access_level ?? "public",
        media: [...(row.content_media ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((item) => ({ id: item.id, storagePath: item.storage_path, kind: item.kind, publicUrl: item.public_url, altText: item.alt_text ?? undefined, caption: item.caption ?? undefined })),
      } satisfies ContentRecord;
    });
  } catch {
    return [];
  }
}

/** Published items are the single public source of truth. */
export async function getLibraryContent() {
  return getPublishedContent();
}

export async function getContent(identifier: string) {
  return (await getPublishedContent(false, identifier))[0];
}

/** Used only after the API has verified that the caller has a member session. */
export async function getContentForMember(identifier: string) {
  return (await getPublishedContent(true, identifier))[0];
}
