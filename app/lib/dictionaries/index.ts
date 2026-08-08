import type { Locale } from "../i18n";
import { ar } from "./ar";
import { en } from "./en";

export type Dictionary = typeof en;
export type PartialDictionary = { [K in keyof Dictionary]?: Partial<Dictionary[K]> };

const DICTIONARIES: Record<Locale, PartialDictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  const overrides = DICTIONARIES[locale] ?? {};
  return Object.fromEntries(
    (Object.keys(en) as (keyof Dictionary)[]).map((key) => [key, { ...en[key], ...(overrides[key] ?? {}) }]),
  ) as Dictionary;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => key in values ? String(values[key]) : match);
}
