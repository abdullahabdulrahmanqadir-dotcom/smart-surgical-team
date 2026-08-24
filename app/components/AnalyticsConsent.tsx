"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "../lib/i18n";

const MEASUREMENT_ID = "G-KZ5GNTTR1K";
const CONSENT_KEY = "sst-analytics-consent";
const PREFERENCES_EVENT = "sst:open-analytics-preferences";

type Consent = "granted" | "denied";
type AnalyticsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

const COPY = {
  en: {
    title: "Help us improve the website",
    body: "With your permission, Google Analytics will measure page visits and general interactions. We do not send form activity, site searches, or advertising signals.",
    accept: "Allow analytics",
    decline: "Decline",
    privacy: "Privacy Policy",
  },
  ar: {
    title: "ساعدنا في تحسين الموقع",
    body: "بموافقتك، يقيس Google Analytics زيارات الصفحات والتفاعلات العامة. لا نرسل نشاط النماذج أو عمليات البحث داخل الموقع أو إشارات الإعلانات.",
    accept: "السماح بالتحليلات",
    decline: "رفض",
    privacy: "سياسة الخصوصية",
  },
} as const;

function removeAnalyticsCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name || (name !== "_ga" && !name.startsWith("_ga_"))) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname}; SameSite=Lax`;
  }
}

export default function AnalyticsConsent({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const copy = COPY[locale];

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    const saved = stored === "granted" || stored === "denied" ? stored : null;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setConsent(saved);
      setOpen(saved === null);
      setReady(true);
    });

    const openPreferences = () => setOpen(true);
    window.addEventListener(PREFERENCES_EVENT, openPreferences);
    return () => {
      active = false;
      window.removeEventListener(PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  useEffect(() => {
    if (consent !== "granted") return;
    const analytics = window as AnalyticsWindow;
    analytics.dataLayer ??= [];
    analytics.gtag ??= (...args: unknown[]) => { analytics.dataLayer?.push(args); };
    analytics.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
    analytics.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    analytics.gtag("js", new Date());
    analytics.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    if (!document.querySelector(`script[data-analytics-id="${MEASUREMENT_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.dataset.analyticsId = MEASUREMENT_ID;
      document.head.appendChild(script);
    }
  }, [consent]);

  useEffect(() => {
    if (consent !== "granted") return;
    const analytics = window as AnalyticsWindow;
    // Deliberately omit the query string: filters and search terms on this
    // clinical education site must not become analytics dimensions.
    analytics.gtag?.("event", "page_view", {
      send_to: MEASUREMENT_ID,
      page_location: `${location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
    });
  }, [consent, pathname]);

  const choose = (next: Consent) => {
    localStorage.setItem(CONSENT_KEY, next);
    setConsent(next);
    setOpen(false);
    if (next === "denied") {
      (window as AnalyticsWindow).gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      removeAnalyticsCookies();
    }
  };

  if (!ready || !open) return null;

  return (
    <aside className="analytics-consent" role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title">
      <div>
        <h2 id="analytics-consent-title">{copy.title}</h2>
        <p>{copy.body} <Link href={`/${locale}/privacy`}>{copy.privacy}</Link></p>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" className="btn btn-primary" onClick={() => choose("granted")}>{copy.accept}</button>
        <button type="button" className="btn btn-outline" onClick={() => choose("denied")}>{copy.decline}</button>
      </div>
    </aside>
  );
}

export function openAnalyticsPreferences() {
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}
