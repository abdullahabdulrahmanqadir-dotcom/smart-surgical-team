"use client";

import LazyImage from "./LazyImage";
import { contentCardArt, type ThumbnailContent } from "../lib/content-thumbnail";

/**
 * Card artwork for a content item.
 *
 * Most cards carry one picture. A case can instead nominate two of its own
 * images as a before/after pair, which is drawn as a single seamless frame
 * split down the middle — it should read as one photograph, with the "Before"
 * and "After" captions only surfacing on hover or keyboard focus.
 */
export default function CardArt({ item, className, eager = false, labels }: {
  item: ThumbnailContent;
  className?: string;
  eager?: boolean;
  labels: { before: string; after: string };
}) {
  const art = contentCardArt(item);
  if (!art) return null;
  if (art.kind === "single") return <LazyImage className={className} src={art.url} eager={eager} />;
  return (
    <span className={`card-art-pair${className ? ` ${className}` : ""}`}>
      <span className="card-art-half">
        <LazyImage src={art.before} eager={eager} />
        <span className="card-art-half-label" aria-hidden="true">{labels.before}</span>
      </span>
      <span className="card-art-half">
        <LazyImage src={art.after} eager={eager} />
        <span className="card-art-half-label" aria-hidden="true">{labels.after}</span>
      </span>
    </span>
  );
}
