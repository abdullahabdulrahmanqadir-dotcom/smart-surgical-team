import type { Locale } from "../i18n";
import { ar } from "./ar";
import { en } from "./en";

export type Dictionary = typeof en;
export type PartialDictionary = { [K in keyof Dictionary]?: Partial<Dictionary[K]> };

const DICTIONARIES: Record<Locale, PartialDictionary> = { en, ar };

/**
 * A non-English dictionary is a partial, so any key it omits falls through to
 * the English value. That is the right runtime behaviour — a missing string
 * should never render blank — but it is silent, which is how English ended up
 * scattered across the Arabic site without anyone noticing.
 *
 * In development the gaps are reported once per locale, loudly, with the exact
 * `namespace.key` paths. Production is untouched: same object, same fallback,
 * no extra work per request.
 */
const reportedGaps = new Set<Locale>();

function reportMissingKeys(locale: Locale, overrides: PartialDictionary) {
  if (reportedGaps.has(locale)) return;
  reportedGaps.add(locale);

  const missing: string[] = [];
  for (const namespace of Object.keys(en) as (keyof Dictionary)[]) {
    const translated = (overrides[namespace] ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(en[namespace] as Record<string, unknown>)) {
      if (!(key in translated)) missing.push(`${String(namespace)}.${key}`);
    }
  }

  if (missing.length) {
    console.warn(
      `[i18n] ${missing.length} key(s) missing from "${locale}" and falling back to English:\n  ${missing.join("\n  ")}`,
    );
  }
}

export function getDictionary(locale: Locale): Dictionary {
  const overrides = DICTIONARIES[locale] ?? {};
  if (process.env.NODE_ENV !== "production" && locale !== "en") reportMissingKeys(locale, overrides);
  return Object.fromEntries(
    (Object.keys(en) as (keyof Dictionary)[]).map((key) => [key, { ...en[key], ...(overrides[key] ?? {}) }]),
  ) as Dictionary;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => key in values ? String(values[key]) : match);
}
