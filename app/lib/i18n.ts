// Locale configuration. All three locales are URL-prefixed (/en, /ar, /ckb) so
// no language is privileged over the others.

export const LOCALES = ["en", "ar", "ckb"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

type LocaleMeta = {
  /** Written direction. Both Arabic and Sorani Kurdish are RTL. */
  dir: "ltr" | "rtl";
  /** Name shown in the language switcher, always in that language itself. */
  label: string;
  /** Short form for the compact switcher. */
  short: string;
  /** BCP 47 tag for <html lang>. */
  htmlLang: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { dir: "ltr", label: "English", short: "EN", htmlLang: "en" },
  ar: { dir: "rtl", label: "العربية", short: "ع", htmlLang: "ar" },
  ckb: { dir: "rtl", label: "کوردی", short: "کو", htmlLang: "ckb-Arab" },
};

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}

/**
 * Picks the best locale from an Accept-Language header, falling back to the
 * default. Used only to redirect "/" — never to override an explicit choice,
 * because the switcher must always win.
 */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // Sorani is requested as ckb, but also arrives as ku / ku-IQ in practice.
    if (tag.startsWith("ckb") || tag.startsWith("ku")) return "ckb";
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("en")) return "en";
  }

  return DEFAULT_LOCALE;
}

/** Builds a locale-prefixed href. Accepts paths with or without a leading slash. */
export function localePath(locale: Locale, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

/**
 * Swaps the locale segment of a pathname, preserving the rest of the route.
 * Used by the language switcher so switching language keeps you on the page.
 */
export function swapLocaleInPath(pathname: string, next: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && isLocale(segments[0])) {
    segments[0] = next;
    return `/${segments.join("/")}`;
  }
  return localePath(next, pathname);
}
