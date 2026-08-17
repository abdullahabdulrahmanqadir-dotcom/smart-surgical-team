import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { CACHE_TAGS } from "./cache-tags";
import { PUBLIC_TOPIC_GROUPS, type SubTopic, type TopicGroup } from "./topics";

/**
 * The public topic tree, with its subtopics read from the database.
 *
 * The four major topics stay in code (`./topics`): they carry an icon, a blurb,
 * an intro and translations that no admin field produces, and they are locked
 * in the workspace for exactly that reason. Their **subtopics** are editable,
 * so the list of them has to come from `public.topics` — otherwise a subtopic
 * added in the admin exists in the database, is filed onto cases, and is
 * invisible everywhere on the site, which is how a case ended up belonging to
 * no visible topic at all.
 *
 * Server-only: importing this from a client component would drag `next/cache`
 * and the Supabase server client into the browser bundle. Client components
 * keep importing the plain constants from `./topics`.
 */

const REVALIDATE_SECONDS = 60;

function canUseContentDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

type TopicRow = { id: string; name: string | null; slug: string | null; parent_id: string | null; sort_order: number | null };

async function fetchTopicRows(): Promise<TopicRow[] | null> {
  if (!canUseContentDatabase()) return null;
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("topics")
      .select("id,name,slug,parent_id,sort_order")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as TopicRow[];
  } catch (error) {
    console.error("Could not read the topic tree:", error);
    return null;
  }
}

// Shares the content tag, so the admin's topic write — which already expires
// that tag — republishes the tree along with the cards that use it.
const cachedTopicRows = unstable_cache(fetchTopicRows, ["public-topic-tree"], { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAGS.content] });

/**
 * Merges the stored subtopics into the hardcoded groups.
 *
 * The database decides which subtopics exist, what they are called and what
 * order they come in. The code list is consulted only for the artwork a few of
 * them carry, matched by slug — a newly added subtopic simply has none.
 *
 * A group the database does not recognise, or a read that failed, keeps its
 * hardcoded subtopics: a taxonomy that empties itself on a bad connection
 * would take every case on the site down with it.
 */
function merge(groups: TopicGroup[], rows: TopicRow[] | null): TopicGroup[] {
  if (!rows?.length) return groups;
  const byId = new Map(rows.map((row) => [row.id, row]));
  return groups.map((group) => {
    const major = rows.find((row) => !row.parent_id && row.slug === group.slug);
    if (!major) return group;
    const artwork = new Map(group.subTopics.map((topic) => [topic.slug, topic.imageIcon]));
    const children = rows
      .filter((row) => row.parent_id === major.id && row.slug && row.name && byId.has(row.parent_id))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const subTopics: SubTopic[] = children.map((row) => {
      const slug = String(row.slug);
      const imageIcon = artwork.get(slug);
      return imageIcon ? { slug, name: String(row.name), imageIcon } : { slug, name: String(row.name) };
    });
    // A major topic that has been emptied of subtopics in the database is a
    // real state — the group simply renders without the subtopic filters.
    return { ...group, subTopics };
  });
}

/** Every visible group, subtopics included. */
export async function getPublicTopicTree(): Promise<TopicGroup[]> {
  return merge(PUBLIC_TOPIC_GROUPS, await cachedTopicRows());
}

/** One group by slug, or undefined when the slug is not a public major topic. */
export async function getPublicTopicGroupWithSubtopics(slug: string): Promise<TopicGroup | undefined> {
  return (await getPublicTopicTree()).find((group) => group.slug === slug);
}

/** The slugs whose cases belong to a group: the group itself and its subtopics. */
export function topicSlugsFor(group: TopicGroup): string[] {
  return [group.slug, ...group.subTopics.map((topic) => topic.slug)];
}
