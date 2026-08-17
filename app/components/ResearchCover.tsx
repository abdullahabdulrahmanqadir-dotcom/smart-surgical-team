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
 */
export default function ResearchCover({
  title,
  journal,
  palette,
  paletteKey = "",
  size = "card",
  titleAs: Title = "h3",
}: {
  title: string;
  journal?: string;
  palette?: string;
  /** Distinguishes unfiled papers from each other when there is no palette. */
  paletteKey?: string;
  size?: "card" | "hero";
  /**
   * The cover carries the paper's only title, so it has to be a real heading
   * rather than styled text — h3 in the results grid, h1 on the paper's own
   * page, where it is the document heading.
   */
  titleAs?: "h1" | "h2" | "h3";
}) {
  const colors = paletteFor(palette, paletteKey);
  return (
    <div
      className={`research-cover is-${size}`}
      style={{ "--cover-base": colors.base, "--cover-glow": colors.glow, "--cover-edge": colors.edge, "--cover-title-scale": coverTitleScale(title) } as React.CSSProperties}
    >
      {/* Direction is set on the whole block rather than on the title alone.
          On the Arabic pages a Latin title marked dir="ltr" aligned left while
          the journal above it inherited the page's right alignment, and the
          two halves of one cover pulled apart. */}
      <div className="research-cover-body" {...authoredTitleProps(title)}>
        <Title className="research-cover-title">{title}</Title>
        {journal ? <p className="research-cover-journal">{journal}</p> : null}
      </div>
    </div>
  );
}
