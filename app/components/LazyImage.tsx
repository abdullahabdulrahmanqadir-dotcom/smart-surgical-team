"use client";

import { useCallback, useState } from "react";

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
  const [settled, setSettled] = useState<{ src: string; ok: boolean } | null>(null);
  const state = settled?.src !== src ? "loading" : settled.ok ? "loaded" : "failed";

  // An image that is already in the browser cache can finish decoding before
  // React attaches `onLoad`, which would leave the placeholder shimmering over
  // a picture that is already on screen. The ref callback runs at mount, which
  // is the only point where that race can happen.
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setSettled({ src: node.getAttribute("src") ?? "", ok: node.naturalWidth > 0 });
  }, []);

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
        onLoad={() => setSettled({ src, ok: true })}
        onError={() => setSettled({ src, ok: false })}
      />
    </span>
  );
}
