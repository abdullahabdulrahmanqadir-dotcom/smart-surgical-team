"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Every source that has finished decoding in this document.
 *
 * Card grids are torn down and rebuilt constantly — a filter change, a search
 * term, returning from a case — and each rebuild is a fresh mount with fresh
 * state, which put the shimmering placeholder back over pictures the browser
 * already had in memory. The grid read as though it were loading all over
 * again. A source only has to be proven once per document; after that the
 * picture is rendered outright, with no placeholder and no fade.
 */
const decodedSources = new Set<string>();

/**
 * An image that never holds up the text around it.
 *
 * The page paints immediately with a shimmering placeholder in the image's
 * slot; the photograph fades in once it has actually arrived, and the slot
 * keeps its size throughout so nothing below it jumps. Off-screen images are
 * left to the browser's lazy loader rather than all being requested at once.
 */
export default function LazyImage({
  src,
  alt = "",
  className,
  eager = false,
  onClick,
  draggable,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Set for images above the fold, which should not wait for lazy loading. */
  eager?: boolean;
  onClick?: () => void;
  draggable?: boolean;
}) {
  // Recording which source settled, rather than a bare flag, means a changed
  // `src` returns to the placeholder without an effect having to reset it.
  const [settled, setSettled] = useState<{ src: string; ok: boolean } | null>(
    () => (decodedSources.has(src) ? { src, ok: true } : null),
  );
  const state = settled?.src !== src ? "loading" : settled.ok ? "loaded" : "failed";

  // An image that is already in the browser cache can finish decoding before
  // React attaches `onLoad`, leaving the placeholder shimmering over a picture
  // that has in fact arrived. `complete` is the authority here: unlike the
  // event, the browser leaves the flag set no matter who was listening when it
  // happened, so reading it back settles an image whose event went unheard.
  const node = useRef<HTMLImageElement | null>(null);
  const settle = useCallback((image: HTMLImageElement | null) => {
    if (!image?.complete) return;
    const loaded = image.getAttribute("src") ?? "";
    const ok = image.naturalWidth > 0;
    // Only a success is remembered: a failure has to be free to resolve on the
    // next attempt rather than being held against the source for the session.
    if (ok) decodedSources.add(loaded);
    // Returning the previous value leaves the state untouched, so re-checking
    // after every commit cannot drive a render loop.
    setSettled((previous) => (previous?.src === loaded && previous.ok === ok ? previous : { src: loaded, ok }));
  }, []);

  const attach = useCallback(
    (image: HTMLImageElement | null) => {
      node.current = image;
      settle(image);
    },
    [settle],
  );

  // Deliberately runs after every commit rather than on mount alone: the ref
  // fires once, and an image that was still in flight at that moment would
  // otherwise depend entirely on an event that may already have been missed.
  useEffect(() => settle(node.current));

  return (
    <span className={`lazy-image is-${state}${className ? ` ${className}` : ""}`}>
      {state === "loading" ? <span className="skeleton-block lazy-image-placeholder" aria-hidden="true" /> : null}
      <img
        ref={attach}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={draggable}
        onClick={onClick}
        onLoad={() => {
          decodedSources.add(src);
          setSettled({ src, ok: true });
        }}
        onError={() => setSettled({ src, ok: false })}
      />
    </span>
  );
}
