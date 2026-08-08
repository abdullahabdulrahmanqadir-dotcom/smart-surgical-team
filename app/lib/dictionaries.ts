import type { Locale } from "./i18n";

// English is the source of truth. Arabic falls back to English per-key, so a
// missing key renders English rather than a crash or a blank string.

const en = {
  brand: {
    name: "Smart Surgical Team",
    short: "SST",
    tagline: "Head & Neck Surgery, Guided by Expertise.",
    location: "Smart Health Tower · Sulaymaniah, Kurdistan",
  },
  nav: {
    home: "Home",
    about: "About us",
    topics: "Content",
    library: "Library",
    webinars: "Webinars",
    events: "Events",
    research: "Research",
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
    kicker: "Topics",
    title: "Browse by Topic",
    intro:
      "Four focused surgical tracks for structured study across head and neck surgery.",
    exploreGroup: "Explore topic",
    guideKicker: "Anatomical guide",
    guideTitle: "Start with the region",
    guideIntro:
      "Select a highlighted area or one of the topic cards to move from the whole head and neck to a focused surgical view.",
    guideIntroActive:
      "Focused on {name}. Browse published content by topic or format.",
    chooseRegion:
      "Select a region above and its focus areas will open here.",
    mapReset: "Back to the whole head and neck",
    focusAreas: "Focus areas",
    conditions: "Conditions",
    conditionCases: "Cases",
    caseVideoLabel: "Case video",
    caseReadLabel: "Case study",
    minRead: "min read",
    caseEmptyTitle: "No published content yet",
    caseEmptyBody:
      "Published content for this topic will appear here.",
    collectionKicker: "Learning collection",
    collectionTitle: "Learning collection",
    collectionBody:
      "Published operative videos, imaging reviews and discussions appear here.",
    backToTopics: "All topics",
    otherTopics: "Continue exploring",
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

// Modern Standard Arabic, clinical/academic register. Any key removed here
// falls back to English, so this file can be corrected key-by-key without
// breaking the page.
//
// Deliberate choices worth knowing before you edit:
//  - `brand.name` / `brand.short` stay in Latin script. The team's identity is
//    registered in English and appears that way on signage and publications;
//    translating it would produce a second, unrecognised name.
//  - Times use Western digits, which is the norm for Iraqi Arabic web copy.
//  - `guideIntroActive` keeps the `{name}` placeholder — `fill()` substitutes a
//    topic name, so the token must survive verbatim.
const ar: PartialDictionary = {
  brand: {
    tagline: "جراحة الرأس والعنق، بقيادة الخبرة.",
    location: "برج الصحة الذكي · السليمانية، كردستان",
  },
  nav: {
    home: "الرئيسية",
    about: "من نحن",
    topics: "المحتوى",
    library: "المكتبة",
    webinars: "الندوات الإلكترونية",
    events: "الفعاليات",
    research: "البحوث",
    team: "فريقنا",
    contact: "اتصل بنا",
    signIn: "تسجيل الدخول",
    register: "إنشاء حساب",
    skipToContent: "تخطي إلى المحتوى",
    languageLabel: "اللغة",
    menu: "القائمة",
    close: "إغلاق",
  },
  cta: {
    exploreLibrary: "تصفّح المكتبة",
    viewAll: "عرض الكل",
    learnMore: "اعرف المزيد",
  },
  topics: {
    kicker: "المواضيع",
    title: "تصفّح حسب الموضوع",
    intro:
      "أربعة مسارات جراحية متخصّصة لدراسة منهجية في جراحة الرأس والعنق.",
    exploreGroup: "استكشف الموضوع",
    guideKicker: "دليل تشريحي",
    guideTitle: "ابدأ من المنطقة",
    guideIntro:
      "اختر منطقة مميّزة أو إحدى بطاقات المواضيع للانتقال من الرأس والعنق ككل إلى عرض جراحي مركّز.",
    guideIntroActive:
      "التركيز على {name}. تصفّح المحتوى المنشور حسب الموضوع أو الصيغة.",
    chooseRegion:
      "اختر منطقة في الأعلى وستظهر مجالات التركيز الخاصة بها هنا.",
    mapReset: "العودة إلى الرأس والعنق كاملاً",
    focusAreas: "مجالات التركيز",
    conditions: "الحالات المرضية",
    conditionCases: "الحالات",
    caseVideoLabel: "فيديو الحالة",
    caseReadLabel: "دراسة حالة",
    minRead: "دقيقة قراءة",
    caseEmptyTitle: "لا يوجد محتوى منشور بعد",
    caseEmptyBody:
      "سيظهر هنا المحتوى المنشور الخاص بهذا الموضوع.",
    collectionKicker: "مجموعة تعليمية",
    collectionTitle: "مجموعة تعليمية",
    collectionBody:
      "تظهر هنا مقاطع العمليات الجراحية ومراجعات التصوير والمناقشات المنشورة.",
    backToTopics: "جميع المواضيع",
    otherTopics: "واصل الاستكشاف",
  },
  footer: {
    rights: "جميع الحقوق محفوظة.",
    quickLinks: "روابط سريعة",
    contactUs: "اتصل بنا",
    blurb:
      "منصّة أكاديمية متخصّصة في تعليم جراحة الرأس والعنق. خبرة متعمّقة، ونتائج أفضل.",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    hours: "السبت – الخميس، 9:00 – 17:00",
  },
  common: {
    loading: "جارٍ التحميل",
    comingSoon: "قريباً",
  },
};

const DICTIONARIES: Record<Locale, PartialDictionary> = { en, ar };

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
