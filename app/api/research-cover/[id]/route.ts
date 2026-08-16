import { getResearchById } from "../../../lib/research";
import { researchCoverSvg } from "../../../lib/research-cover";

/**
 * Generated cover art for a publication that has no harvested figure.
 *
 * Built from the paper's own metadata rather than stored, so it stays correct
 * when a title or journal is edited in Admin and costs nothing to hold. See
 * app/lib/research-cover.ts for why publisher artwork is not used instead.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paper = await getResearchById(id.replace(/\.svg$/, ""));
  if (!paper) return new Response("Not found", { status: 404 });

  return new Response(researchCoverSvg({
    title: paper.title,
    journal: paper.journal,
    year: paper.year,
    category: paper.category,
  }), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // Longer than the 60s research cache: the artwork only changes when the
      // paper's own metadata does, and a stale cover for an hour is harmless.
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
