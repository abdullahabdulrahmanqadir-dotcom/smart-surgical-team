import { getTopicContent } from "../../../../lib/content";
import { getPublicTopicGroupWithSubtopics, topicSlugsFor } from "../../../../lib/topic-tree";

/**
 * Cases for one topic group.
 *
 * The Topics screen used to receive every published item for every topic in
 * its initial payload, including the topics the reader never opened. It now
 * server-renders only the topic in the URL and calls this route when the
 * reader picks a different one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getPublicTopicGroupWithSubtopics(slug);
  if (!group) return Response.json({ error: "Unknown topic." }, { status: 404 });

  const items = await getTopicContent(topicSlugsFor(group));

  return Response.json({ items }, {
    headers: {
      // Matches the 60s revalidate on the underlying cached query, so a reader
      // switching back and forth never re-fetches within that window.
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
