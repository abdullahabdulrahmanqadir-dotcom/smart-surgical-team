"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * The banner's close button.
 *
 * The server's inline script restores dismissal on a document load. Restore
 * the same attribute when this button mounts through client navigation, where
 * the inline script does not run.
 */
export default function NewsBannerDismiss({
  itemId, storageKey, label, nextHeadingId,
}: {
  itemId: string;
  storageKey: string;
  label: string;
  nextHeadingId: string;
}) {
  const button = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const banner = button.current?.closest<HTMLElement>("[data-news-banner]");
    if (!banner) return;
    try {
      if (window.localStorage.getItem(storageKey) === itemId) banner.dataset.dismissed = "1";
      else delete banner.dataset.dismissed;
    } catch { /* storage unavailable */ }
  }, [itemId, storageKey]);

  return <button
    ref={button}
    type="button"
    className="news-banner-dismiss"
    aria-label={label}
    onClick={(event) => {
      const banner = event.currentTarget.closest<HTMLElement>("[data-news-banner]");
      if (banner) banner.dataset.dismissed = "1";
      document.getElementById(nextHeadingId)?.focus({ preventScroll: true });
      // A private window or blocked site data simply means this reader is asked
      // again next time; the banner still closes now.
      try { window.localStorage.setItem(storageKey, itemId); } catch { /* storage unavailable */ }
    }}
  >
    <span aria-hidden="true">×</span>
  </button>;
}
