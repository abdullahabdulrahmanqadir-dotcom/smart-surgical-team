import { authoredTitleProps } from "../lib/i18n";
import { coverTitleScale } from "../lib/research-cover";
import { paletteFor } from "../lib/research-palettes";

/**
 * The generated cover for a publication.
 *
 * Publications carry no artwork of their own. Most of the archive is paywalled,
 * a dozen papers have no figures at all, and thirteen of them share a journal —
 * so uploaded covers produced a grid that was part empty, part duplicated. The
 * cover is now built from the paper's own words instead, coloured by the topic
 * it is filed under, which makes the grid legible as groups at a glance.
 *
 * Rendered as HTML rather than as an <img> pointing at generated SVG. The title
 * is the single most important text on the card: as markup it stays selectable,
 * searchable, translatable, reflowable, and reachable by a screen reader, and
 * it needs no glyph-width estimation to decide where to wrap. The SVG twin in
 * research-cover.ts survives only for social previews, where a real image file
 * is the only thing a link unfurler will accept.
 *
 * Listings only. A paper's own page sets its title as an ordinary heading —
 * the cover exists to tell one card apart from the next, and on a page showing
 * a single paper there is nothing to tell it apart from.
 */
export default function ResearchCover({
  title,
  journal,
  palette,
  paletteKey = "",
}: {
  title: string;
  journal?: string;
  palette?: string;
  /** Distinguishes unfiled papers from each other when there is no palette. */
  paletteKey?: string;
}) {
  const colors = paletteFor(palette, paletteKey);
  return (
    <div
      className="research-cover"
      style={{ "--cover-base": colors.base, "--cover-glow": colors.glow, "--cover-edge": colors.edge, "--cover-title-scale": coverTitleScale(title) } as React.CSSProperties}
    >
      {/* Direction is set on the whole block rather than on the title alone.
          On the Arabic pages a Latin title marked dir="ltr" aligned left while
          the journal above it inherited the page's right alignment, and the
          two halves of one cover pulled apart. */}
      <div className="research-cover-body" {...authoredTitleProps(title)}>
        {/* A real heading: the cover carries the card's only title, and the
            results grid needs headings to be navigable. */}
        <h3 className="research-cover-title">{title}</h3>
        {journal ? <p className="research-cover-journal">{journal}</p> : null}
      </div>
    </div>
  );
}
