import { getResearchById } from "../../../lib/research";
import { researchCoverSvg } from "../../../lib/research-cover";

/**
 * The image form of a publication's cover, for social link previews.
 *
 * Readers see the HTML cover (ResearchCover.tsx); unfurlers cannot run CSS, so
 * they get this. Built from the paper's own metadata rather than stored, so it
 * stays correct when a title or journal is edited in Admin and costs nothing
 * to hold.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paper = await getResearchById(id.replace(/\.svg$/, ""));
  if (!paper) return new Response("Not found", { status: 404 });

  return new Response(researchCoverSvg({
    title: paper.title,
    journal: paper.journal,
    palette: paper.palette,
  }), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // Longer than the 60s research cache: the artwork only changes when the
      // paper's own metadata does, and a stale cover for an hour is harmless.
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
