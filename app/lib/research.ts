import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { researchCoverPath } from "./research-cover";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { noteDegradedRead } from "../../lib/render-health";
import { TEAM_GROUPS } from "./team";

/**
 * Server-side research reads.
 *
 * Research is DB-backed: the admin manages `public.researches` and the site
 * reads published rows through a short shared cache, exactly like `content.ts`.
 * The external smarthealth.group feed is no longer used — its papers were
 * imported once by migration 0009.
 */

/** A topic or subtopic a paper is filed under, as the site needs to render it. */
export type ResearchTopic = {
  id: string;
  name: string;
  slug: string;
};

export type Publication = {
  id: number;
  title: string;
  link: string;
  /** The social-preview image; the on-page cover is rendered as real text. */
  coverUrl: string;
  authors: string;
  abstract: string;
  date: string;
  year: string;
  journal: string;
  /** Null when the paper is unfiled — it still renders, in a hashed colour. */
  topic: ResearchTopic | null;
  subtopic: ResearchTopic | null;
  /** The topic's palette name, driving the generated cover art. */
  palette: string;
  /** Justify the abstract on the paper's page (migration 0024). */
  justifyBody: boolean;
  contributors?: { name: string; portraitUrl?: string }[];
  media?: { publicUrl: string; altText?: string; caption?: string }[];
};

const STAFF = TEAM_GROUPS.flatMap((group) => group.members);
const STAFF_NAME_ALIASES: Record<string, string> = {
  "aras jamal qadir": "Aras J. Qaradaxy",
  "aras j qaradakhy": "Aras J. Qaradaxy",
  "abdullah abdulrahman qadir": "Abdullah A. Qadr",
  "abdullah abdueahman qadir": "Abdullah A. Qadr",
};

function nameKey(name: string) {
  return name.toLocaleLowerCase().replace(/\b(?:dr|prof|mr|ms)\.?\s*/g, "").replace(/[^a-z]+/g, " ").trim();
}

function staffPortraitFor(name: string) {
  const key = nameKey(name);
  const aliasedName = STAFF_NAME_ALIASES[key];
  if (aliasedName) return STAFF.find((member) => member.name === aliasedName)?.portrait;
  const tokens = key.split(" ");
  const first = tokens[0];
  const last = tokens.at(-1);
  return STAFF.find((member) => {
    const memberTokens = nameKey(member.name).split(" ");
    const memberFirst = memberTokens[0];
    const memberLast = memberTokens.at(-1);
    return (key === nameKey(member.name)) || (first === memberFirst && last === memberLast) || (first === memberFirst && last && memberLast && (last.startsWith(memberLast.slice(0, 4)) || memberLast.startsWith(last.slice(0, 4))));
  })?.portrait;
}

function contributorsFromNames(authors: string) {
  return authors.split(/,|\band\b/i).map((name) => name.trim()).filter((name) => name && !/^colleagues$/i.test(name)).map((name) => ({ name, portraitUrl: staffPortraitFor(name) }));
}

function withStaffPortraits(paper: Publication): Publication {
  return { ...paper, contributors: contributorsFromNames(paper.authors) };
}

function canUseDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const REVALIDATE_SECONDS = 60;
export const RESEARCH_CACHE_TAG = CACHE_TAGS.research;

type TopicRow = { id: string; name: string; slug: string; palette?: string | null } | null;

type ResearchRow = {
  id: number; title: string; authors: string | null; abstract: string | null;
  journal: string | null; link: string | null; published_date: string | null;
  justify_body?: boolean | null;
  topic: TopicRow; subtopic: TopicRow;
  research_media: { public_url: string; alt_text: string | null; caption: string | null; sort_order: number }[] | null;
};

// Both topic joins point at the same table, so PostgREST needs the foreign key
// named explicitly — without it the embed is ambiguous and the query fails.
// Migration 0024 adds `justify_body`. Selecting a column the database does not
// have fails the whole query, which would take the research section down in
// the window between a deploy and its migration; the first such failure drops
// the column for the life of the process and the read is retried without it.
// Every paper then reads as justified, which is the site-wide default anyway.
let justifyBodyColumn = true;
function missingJustifyBody(message: string) { return /justify_body/.test(message) && /does not exist/i.test(message); }

const RESEARCH_SELECT = () =>
  "id,title,authors,abstract,journal,link,published_date," +
  (justifyBodyColumn ? "justify_body," : "") +
  "topic:research_topics!researches_topic_id_fkey(id,name,slug,palette)," +
  "subtopic:research_topics!researches_subtopic_id_fkey(id,name,slug)," +
  "research_media(public_url,alt_text,caption,sort_order)";

function topicOf(row: TopicRow): ResearchTopic | null {
  return row ? { id: row.id, name: row.name, slug: row.slug } : null;
}

function mapRow(row: ResearchRow): Publication {
  const date = row.published_date ?? "";
  const media = [...(row.research_media ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ publicUrl: item.public_url, altText: item.alt_text ?? undefined, caption: item.caption ?? undefined }));
  return withStaffPortraits({
    id: row.id,
    title: row.title,
    link: row.link ?? "",
    coverUrl: researchCoverPath(row.id),
    authors: row.authors ?? "Smart Health research team",
    abstract: row.abstract ?? "",
    date,
    year: date.slice(0, 4) || "Research",
    journal: row.journal ?? "Journal website",
    // Justified unless the editor turned it off; a database without the column
    // reads as the default rather than as "off".
    justifyBody: row.justify_body ?? true,
    topic: topicOf(row.topic),
    subtopic: topicOf(row.subtopic),
    // Subtopics inherit their parent's palette at seed time, but the admin can
    // change a topic's colour without touching its children, so read the
    // parent: the topic is what the reader is filtering by.
    palette: row.topic?.palette ?? "",
    media,
  });
}

/**
 * Throws rather than returning an empty list when the query fails: the result
 * of this function is cached, and an empty list is a legitimate thing to cache.
 * A single failure would otherwise publish "nothing here" for the whole
 * revalidate window. Callers degrade outside the cache instead.
 */
async function fetchResearches(): Promise<Publication[]> {
  if (!canUseDatabase()) return [];
  const run = () => getSupabaseServerClient()
    .from("researches")
    .select(RESEARCH_SELECT())
    .eq("status", "published")
    .order("published_date", { ascending: false });
  let { data, error } = await run();
  if (error && justifyBodyColumn && missingJustifyBody(error.message)) {
    console.warn("researches.justify_body is missing — apply migration 0024. Reading every paper as justified, the default.");
    justifyBodyColumn = false;
    ({ data, error } = await run());
  }
  if (error) throw new Error(`published researches query failed: ${error.message}`);
  return ((data ?? []) as unknown as ResearchRow[]).map(mapRow);
}

const cachedResearches = unstable_cache(fetchResearches, ["published-researches"], { revalidate: REVALIDATE_SECONDS, tags: [RESEARCH_CACHE_TAG] });

async function safeResearches(): Promise<Publication[]> {
  try {
    return await cachedResearches();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // Degraded, not empty — see `lib/render-health.ts`. The distinction keeps
    // this one bad response from being cached as the state of the site.
    noteDegradedRead();
    return [];
  }
}

export async function getResearches(): Promise<Publication[]> {
  return safeResearches();
}

/** A topic with its subtopics, in the order the admin arranged them. */
export type ResearchTopicTree = ResearchTopic & { palette: string; subtopics: ResearchTopic[] };

async function fetchTopicTree(): Promise<ResearchTopicTree[]> {
  if (!canUseDatabase()) return [];
  const { data, error } = await getSupabaseServerClient()
    .from("research_topics")
    .select("id,name,slug,palette,parent_id,sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`research topics query failed: ${error.message}`);
  const rows = (data ?? []) as { id: string; name: string; slug: string; palette: string; parent_id: string | null }[];
  return rows.filter((row) => !row.parent_id).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    palette: row.palette,
    subtopics: rows.filter((child) => child.parent_id === row.id).map((child) => ({ id: child.id, name: child.name, slug: child.slug })),
  }));
}

const cachedTopicTree = unstable_cache(fetchTopicTree, ["research-topic-tree"], { revalidate: REVALIDATE_SECONDS, tags: [RESEARCH_CACHE_TAG] });

export async function getResearchTopics(): Promise<ResearchTopicTree[]> {
  try {
    return await cachedTopicTree();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // Degraded, not empty — see `lib/render-health.ts`. The distinction keeps
    // this one bad response from being cached as the state of the site.
    noteDegradedRead();
    return [];
  }
}

/** Finds one publication for its public, stable detail URL. */
export async function getResearchById(id: string): Promise<Publication | undefined> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return undefined;
  return (await safeResearches()).find((paper) => paper.id === numericId);
}
