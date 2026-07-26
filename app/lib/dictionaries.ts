import type { Locale } from "./i18n";

// English is the source of truth. Arabic and Sorani start empty and fall back
// to English per-key, so a partial translation renders a partly-translated page
// rather than a crash or a blank string.

const en = {
  brand: {
    name: "Smart Surgical Team",
    short: "SST",
    tagline: "Head & Neck Surgery, Guided by Expertise.",
    location: "Smart Health Tower · Sulaymaniah, Kurdistan",
  },
  nav: {
    home: "Home",
    about: "About",
    topics: "Topics",
    library: "Library",
    webinars: "Webinars",
    events: "Events",
    team: "Our Team",
    contact: "Contact",
    signIn: "Sign in",
    register: "Register",
    skipToContent: "Skip to content",
    languageLabel: "Language",
    menu: "Menu",
    close: "Close",
  },
  cta: {
    exploreLibrary: "Explore the Library",
    viewAll: "View all",
    learnMore: "Learn more",
  },
  topics: {
    kicker: "Curriculum",
    title: "Browse by Topic",
    intro:
      "Four core tracks, each with operative video, imaging review and follow-up discussion.",
    lessonCount: "{count} lessons",
  },
  footer: {
    rights: "All rights reserved.",
    quickLinks: "Quick links",
    contactUs: "Contact us",
    blurb:
      "A dedicated academic hub for head & neck surgery education. Expert insights, better outcomes.",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    hours: "Saturday – Thursday, 9:00 – 17:00",
  },
  common: {
    loading: "Loading",
    comingSoon: "Coming soon",
  },
};

/** Every locale must be structurally assignable to the English shape. */
export type Dictionary = typeof en;
type PartialDictionary = {
  [K in keyof Dictionary]?: Partial<Dictionary[K]>;
};

// PLACEHOLDER: awaiting professional translation. Keys added here override the
// English fallback immediately, so translation can land key-by-key.
const ar: PartialDictionary = {};
const ckb: PartialDictionary = {};

const DICTIONARIES: Record<Locale, PartialDictionary> = { en, ar, ckb };

/**
 * Returns a dictionary for the locale with English filled in behind it, so a
 * missing translation degrades to English instead of an empty string.
 */
export function getDictionary(locale: Locale): Dictionary {
  const overrides = DICTIONARIES[locale] ?? {};

  // Built via fromEntries rather than keyed assignment: TypeScript cannot prove
  // a per-key write is sound across a union of section shapes.
  return Object.fromEntries(
    (Object.keys(en) as (keyof Dictionary)[]).map((key) => [
      key,
      { ...en[key], ...(overrides[key] ?? {}) },
    ]),
  ) as Dictionary;
}

/** Simple {placeholder} interpolation for strings with counts or names. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
