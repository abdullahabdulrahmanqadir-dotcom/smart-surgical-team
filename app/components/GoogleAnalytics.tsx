"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MEASUREMENT_ID = "G-KZ5GNTTR1K";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

/**
 * Privacy-minimized GA4. Analytics and advertising storage always remain
 * denied, so the Google tag sends only cookieless measurement pings. Page
 * locations are constructed from the pathname to keep filters and search
 * terms out of analytics entirely.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const analytics = window as AnalyticsWindow;
    analytics.dataLayer ??= [];
    analytics.gtag ??= (...args: unknown[]) => { analytics.dataLayer?.push(args); };
    analytics.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    analytics.gtag("js", new Date());
    analytics.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
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
