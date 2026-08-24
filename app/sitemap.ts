import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_META } from "./lib/i18n";

const SITE_ORIGIN = "https://smart.ssteam.workers.dev";
const PUBLIC_ROUTES = ["", "about", "topics", "events", "posters", "research", "contact", "privacy", "terms"];

function absoluteUrl(locale: string, route: string) {
  return `${SITE_ORIGIN}/${locale}${route ? `/${route}` : ""}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.flatMap((route) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(locale, route),
      lastModified: new Date(),
      changeFrequency: route === "" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((alternateLocale) => [
            LOCALE_META[alternateLocale].htmlLang,
            absoluteUrl(alternateLocale, route),
          ]),
        ),
      },
    })),
  );
}
