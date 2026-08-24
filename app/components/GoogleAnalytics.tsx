"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MEASUREMENT_ID = "G-KZ5GNTTR1K";

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

/**
 * Privacy-minimized GA4. Analytics and advertising storage always remain
 * denied by the synchronous head initializer in the locale layout, so the
 * Google tag sends only cookieless measurement pings. Page locations are
 * constructed from the pathname to keep filters and search terms out of
 * analytics entirely.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    const analytics = window as AnalyticsWindow;
    const firstPathname = initialPathname.current;
    analytics.gtag?.("js", new Date());
    analytics.gtag?.("config", MEASUREMENT_ID, {
      send_page_view: true,
      page_location: `${location.origin}${firstPathname}`,
      page_path: firstPathname,
      page_title: document.title,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ads_data_redaction: true,
      url_passthrough: false,
    });

    if (!document.querySelector(`script[data-analytics-id="${MEASUREMENT_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.dataset.analyticsId = MEASUREMENT_ID;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (pathname === initialPathname.current) return;
    const analytics = window as AnalyticsWindow;
    analytics.gtag?.("event", "page_view", {
      send_to: MEASUREMENT_ID,
      page_location: `${location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
