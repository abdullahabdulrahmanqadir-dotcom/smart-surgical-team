import type { MetadataRoute } from "next";
import { getPublicEvents } from "./lib/events";
import { getLibraryContent } from "./lib/content";
import { LOCALES, LOCALE_META } from "./lib/i18n";
import { getNewsItems, newsItemShape } from "./lib/news";
import { getPosters } from "./lib/posters";
import { getResearches } from "./lib/research";
import { PUBLIC_TOPIC_GROUPS } from "./lib/topics";

const SITE_ORIGIN = "https://smart.ssteam.workers.dev";
const PUBLIC_ROUTES = ["", "about", "topics", "events", "news", "posters", "research", "contact", "privacy", "terms"];

type SitemapPage = {
  route: string;
  lastModified?: string;
};

function absoluteUrl(locale: string, route: string) {
  return `${SITE_ORIGIN}/${locale}${route ? `/${route}` : ""}`;
}

function localizedEntries({ route, lastModified }: SitemapPage): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: absoluteUrl(locale, route),
    ...(lastModified ? { lastModified } : {}),
    alternates: {
      languages: {
        ...Object.fromEntries(
          LOCALES.map((alternateLocale) => [
            LOCALE_META[alternateLocale].htmlLang,
            absoluteUrl(alternateLocale, route),
          ]),
        ),
        "x-default": absoluteUrl("en", route),
      },
    },
  }));
}

/**
 * Keep the sitemap database-backed so newly published Admin content is
 * discoverable without a site deployment. The underlying public reads already
 * use the same short shared cache as the rendered pages.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [content, events, posters, researches, news] = await Promise.all([
    getLibraryContent(),
    getPublicEvents(),
    getPosters(),
    getResearches(),
    getNewsItems(),
  ]);

  const pages: SitemapPage[] = [
    ...PUBLIC_ROUTES.map((route) => ({ route })),
    ...PUBLIC_TOPIC_GROUPS.map((topic) => ({ route: `topics/${topic.slug}` })),
    // Posters have their own richer detail route, so do not also advertise the
    // duplicate /library URL for the same record.
    ...content
      .filter((item) => item.kind !== "poster")
      .map((item) => ({ route: `library/${item.slug}`, lastModified: item.publishedAt })),
    ...events.map((event) => ({ route: `events/${event.slug}` })),
    ...posters.map((poster) => ({ route: `posters/${poster.slug}`, lastModified: poster.publishedAt })),
    ...researches.map((paper) => ({ route: `research/${paper.id}`, lastModified: paper.date })),
    // Only items that have a page of their own. An item whose card links
    // straight out to an external article has no URL here to advertise.
    ...news
      .filter((item) => newsItemShape(item) === "article")
      .map((item) => ({ route: `news/${item.slug}`, lastModified: item.date || undefined })),
  ];

  return pages.flatMap(localizedEntries);
}
