"use client";

import { NEWS_DISMISS_KEY } from "./NewsBanner";

/**
 * The banner's close button.
 *
 * Deliberately stateless. It hides the banner by setting the same attribute the
 * pre-paint script sets, rather than by re-rendering: the banner is server
 * markup shared by every reader, and holding its visibility in React state
 * would mean either an effect reading `localStorage` on mount — which flashes —
 * or a hydration mismatch between the shared HTML and this reader's storage.
 */
export default function NewsBannerDismiss({ itemId, label }: { itemId: string; label: string }) {
  return <button
    type="button"
    className="news-banner-dismiss"
    aria-label={label}
    onClick={(event) => {
      const banner = event.currentTarget.closest<HTMLElement>("[data-news-banner]");
      if (banner) banner.dataset.dismissed = "1";
      // A private window or blocked site data simply means this reader is asked
      // again next time; the banner still closes now.
      try { window.localStorage.setItem(NEWS_DISMISS_KEY, itemId); } catch { /* storage unavailable */ }
    }}
  >
    <span aria-hidden="true">×</span>
  </button>;
}
