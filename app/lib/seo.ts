import type { Metadata } from "next";
import { LOCALES, LOCALE_META, localePath, type Locale } from "./i18n";

const DESCRIPTION_LIMIT = 160;

export function seoDescription(value: string, fallback: string): string {
  const clean = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || fallback;
  if (clean.length <= DESCRIPTION_LIMIT) return clean;

  const shortened = clean.slice(0, DESCRIPTION_LIMIT - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : shortened.length).trim()}…`;
}

export function seoAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(
        LOCALES.map((alternate) => [LOCALE_META[alternate].htmlLang, localePath(alternate, path)]),
      ),
      "x-default": localePath("en", path),
    },
  };
}

export function pageMetadata({
  locale,
  path = "",
  title,
  description,
  image,
}: {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
  image?: { url: string; alt: string };
}): Metadata {
  return {
    title,
    description,
    alternates: seoAlternates(locale, path),
    openGraph: {
      title,
      description,
      type: "website",
      locale: LOCALE_META[locale].htmlLang,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

/**
 * Account pages stay out of the index, but they still need a title of their
 * own: without one they inherited the homepage's, so every browser tab and
 * bookmark for the sign-up flow read "Head & Neck Surgery in Sulaymaniyah".
 */
export function privatePageMetadata(title: string): Metadata {
  return { ...PRIVATE_PAGE_METADATA, title };
}
