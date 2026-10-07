/**
 * Schema.org JSON-LD for search engines and AI assistants.
 *
 * Every page points at the same few entity nodes by `@id` — the team, the
 * website and each surgeon — so Google can join the case library, the papers
 * and the About page into one organisation with named people behind it. The
 * ids are absolute and never change; renaming one splits the entity in two.
 *
 * Deliberately absent: `AggregateRating` and `Review` about the team itself.
 * Google treats ratings a business publishes about itself as self-serving,
 * ignores them for rich results and can apply a manual action. Patient reviews
 * count where a third party hosts them (the Google Business Profile).
 */
import type { Dictionary } from "./dictionaries";
import { LOCALE_META, localePath, type Locale } from "./i18n";
import type { Publication } from "./research";
import { staffMemberFor } from "./research";
import { TEAM_GROUPS, type TeamMember } from "./team";
import type { ContentRecord } from "./content-types";
import type { NewsItem } from "./news-data";
import type { TeamEvent } from "./event-data";

export const SITE_ORIGIN = "https://ssthyroid.com";
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/** Smart Health Tower itself, as the contact page pins it. */
export const TOWER_COORDS = { latitude: 35.568591, longitude: 45.4430236 };

/** The other names the same team is published under elsewhere. */
const ORGANIZATION_ALTERNATE_NAMES = ["SST", "Smart Thyroid Subspecialty", "Smart Health Tower Surgery Team"];

const ORGANIZATION_SAME_AS = ["https://www.linkedin.com/company/smart-thyroid-subspecialty/"];

/**
 * External identities for roster members. Only links that verifiably belong to
 * the person go here — a wrong `sameAs` merges two people in the Knowledge Graph.
 */
const PERSON_PROFILES: Record<string, { alternateName?: string[]; description?: string; sameAs: string[] }> = {
  "Prof. Abdulwahid M. Salih": {
    // Figures supplied by the team on 2026-10-07, matching the homepage proof line.
    description: "Iraq's best thyroid surgeon and founder of Smart Surgical Team: more than 15,000 operations and 200+ published papers.",
    alternateName: ["Abdulwahid Muhammed Salih", "Abdulwahid Muhammad Salih", "عبدالواحد محمد صالح"],
    sameAs: [
      "https://en.wikipedia.org/wiki/Abdulwahid_Muhammed_Salih",
      "https://www.wikidata.org/wiki/Q123492734",
      "https://scholar.google.com/citations?user=U8XZfrsAAAAJ",
      "https://drabdulwahid.com/",
      "https://smarthealth.group/doctors/138",
      "https://www.youtube.com/@DrAbdulWahid",
      "https://maps.google.com/?cid=17337054107407027291",
    ],
  },
};

/** Groups whose members are published as entities: the surgeons and the specialists. */
const ENTITY_GROUPS = new Set(["Surgical Team", "Specialist Contributors"]);

const SURGICAL_KNOWS_ABOUT = [
  "Thyroid surgery",
  "Thyroidectomy",
  "Thyroid cancer",
  "Parathyroid surgery",
  "Head and neck surgery",
  "Salivary gland surgery",
  "Neck dissection",
];

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_ORIGIN}${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\b(?:prof|dr)\.?\s*/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The name without its honorific, which goes in `honorificPrefix`. */
function displayName(member: Pick<TeamMember, "name">) {
  return member.name.replace(/^(?:Prof|Dr)\.\s*/, "");
}

export function personId(member: Pick<TeamMember, "name">) {
  return `${SITE_ORIGIN}/#person-${slugify(member.name)}`;
}

function entityMembers() {
  return TEAM_GROUPS.filter((group) => ENTITY_GROUPS.has(group.title))
    .flatMap((group) => group.members.map((member) => ({ member, surgical: group.title === "Surgical Team" })))
    .filter(({ member }) => !member.hidden);
}

function isEntityMember(member: TeamMember | undefined): member is TeamMember {
  return Boolean(member && entityMembers().some((entry) => entry.member.name === member.name));
}

/**
 * Serialises for a `<script type="application/ld+json">` body. Titles and
 * abstracts come from the database, so `<` is escaped — otherwise a stray
 * `</script>` in any field would end the block and inject markup.
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const plainText = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** An author reference: the roster entity when the name is one of ours, else a bare Person. */
function authorRef(name: string) {
  const member = staffMemberFor(name);
  return isEntityMember(member)
    ? { "@type": "Person", "@id": personId(member), name: displayName(member) }
    : { "@type": "Person", name };
}

export function organizationGraph(locale: Locale, dict: Dictionary) {
  const members = entityMembers();
  const founder = members.find(({ member }) => member.name === "Prof. Abdulwahid M. Salih")?.member;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalClinic",
        "@id": ORGANIZATION_ID,
        name: dict.brand.name,
        alternateName: ORGANIZATION_ALTERNATE_NAMES,
        url: absoluteUrl(localePath(locale)),
        logo: absoluteUrl("/sst-mark.png"),
        image: absoluteUrl("/og-team.jpg"),
        description: dict.seo.homeDescription,
        slogan: dict.brand.tagline,
        email: dict.contact.emailAddress,
        medicalSpecialty: ["Surgical", "Endocrine", "Oncologic", "Otolaryngologic"].map((name) => `https://schema.org/${name}`),
        knowsAbout: SURGICAL_KNOWS_ABOUT,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Smart Health Tower, Majid Bag Main Street",
          addressLocality: "Sulaymaniyah",
          addressRegion: "Kurdistan Region",
          postalCode: "46001",
          addressCountry: "IQ",
        },
        geo: { "@type": "GeoCoordinates", ...TOWER_COORDS },
        hasMap: `https://www.google.com/maps?q=${TOWER_COORDS.latitude},${TOWER_COORDS.longitude}`,
        areaServed: [{ "@type": "Country", name: "Iraq" }, { "@type": "AdministrativeArea", name: "Kurdistan Region" }],
        parentOrganization: { "@type": "Organization", name: "Smart Health Tower", url: "https://smarthealth.group/" },
        ...(founder ? { founder: { "@id": personId(founder) } } : {}),
        employee: members.map(({ member }) => ({ "@id": personId(member) })),
        sameAs: ORGANIZATION_SAME_AS,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_ORIGIN,
        name: dict.brand.name,
        inLanguage: LOCALE_META[locale].htmlLang,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

/** The roster as Person entities, for the About page. */
export function teamGraph(locale: Locale, localized: TeamMember[]) {
  const copy = new Map(localized.map((member) => [member.name, member]));
  return {
    "@context": "https://schema.org",
    "@graph": entityMembers().map(({ member, surgical }) => {
      const shown = copy.get(member.name) ?? member;
      const profile = PERSON_PROFILES[member.name];
      return {
        "@type": "Person",
        "@id": personId(member),
        name: displayName(member),
        ...(/^Prof\./.test(member.name) ? { honorificPrefix: "Prof." } : { honorificPrefix: "Dr." }),
        ...(profile?.alternateName ? { alternateName: profile.alternateName } : {}),
        ...(profile?.description ? { description: profile.description } : {}),
        jobTitle: shown.role,
        hasOccupation: { "@type": "Occupation", name: surgical ? "Surgeon" : shown.role },
        hasCredential: shown.credentials.split(/\s·\s/).map((name) => ({ "@type": "EducationalOccupationalCredential", name })),
        image: absoluteUrl(member.portrait),
        url: absoluteUrl(localePath(locale, "about")),
        worksFor: { "@id": ORGANIZATION_ID },
        ...(surgical ? { knowsAbout: SURGICAL_KNOWS_ABOUT } : {}),
        ...(profile?.sameAs.length ? { sameAs: profile.sameAs } : {}),
      };
    }),
  };
}

function doiOf(link: string) {
  return link.match(/10\.\d{4,9}\/[^\s?#]+/)?.[0];
}

export function scholarlyArticleJsonLd(locale: Locale, paper: Publication) {
  const url = absoluteUrl(localePath(locale, `research/${paper.id}`));
  const doi = paper.link ? doiOf(paper.link) : undefined;
  const authors = paper.authors.split(/,|\band\b/i).map((name) => name.trim()).filter((name) => name && !/^colleagues$/i.test(name));
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": `${url}#article`,
    url,
    headline: paper.title.slice(0, 110),
    name: paper.title,
    ...(paper.abstract ? { abstract: plainText(paper.abstract) } : {}),
    ...(paper.date ? { datePublished: paper.date } : {}),
    ...(paper.journal ? { isPartOf: { "@type": "Periodical", name: paper.journal } } : {}),
    ...(paper.link ? { sameAs: paper.link } : {}),
    ...(doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: doi } } : {}),
    author: authors.map(authorRef),
    image: absoluteUrl(paper.coverUrl),
    inLanguage: "en",
    ...(paper.topic ? { about: paper.topic.name } : {}),
    sourceOrganization: { "@id": ORGANIZATION_ID },
  };
}

/** A public case or teaching record. Members-only records never reach here. */
export function medicalPageJsonLd(locale: Locale, content: ContentRecord) {
  const url = absoluteUrl(localePath(locale, `library/${content.slug}`));
  const authors = [content.presenter?.name, ...(content.contributors ?? []).map((person) => person.name)]// The record falls back to the team's own name as presenter; that is the
    // publisher, not a person.
    .filter((name): name is string => Boolean(name) && name !== "Smart Surgical Team");
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": `${url}#page`,
    url,
    name: content.title,
    headline: content.title.slice(0, 110),
    ...(content.summary ? { description: plainText(content.summary) } : {}),
    ...(content.publishedAt ? { datePublished: content.publishedAt } : {}),
    ...(content.thumbnailUrl ? { image: absoluteUrl(content.thumbnailUrl) } : {}),
    ...(authors.length ? { author: [...new Set(authors)].map(authorRef) } : {}),
    ...(content.topic ? { about: content.topic } : {}),
    audience: { "@type": "MedicalAudience", audienceType: "Clinician" },
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function newsArticleJsonLd(locale: Locale, item: NewsItem, title: string, summary: string) {
  const url = absoluteUrl(localePath(locale, `news/${item.slug}`));
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    url,
    headline: title.slice(0, 110),
    ...(summary ? { description: plainText(summary) } : {}),
    ...(item.date ? { datePublished: item.date } : {}),
    ...(item.coverUrl ? { image: absoluteUrl(item.coverUrl) } : {}),
    inLanguage: LOCALE_META[locale].htmlLang,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

const ATTENDANCE_MODE: Record<TeamEvent["format"], string> = {
  "in-person": "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
  hybrid: "https://schema.org/MixedEventAttendanceMode",
};

export function eventJsonLd(locale: Locale, event: TeamEvent) {
  const url = absoluteUrl(localePath(locale, `events/${event.slug}`));
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    url,
    name: event.title,
    ...(event.summary ? { description: event.summary } : {}),
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: ATTENDANCE_MODE[event.format] ?? ATTENDANCE_MODE["in-person"],
    location: event.format === "online"
      ? { "@type": "VirtualLocation", url: event.officialUrl }
      : { "@type": "Place", name: event.location, address: event.location },
    ...(event.image ? { image: absoluteUrl(event.image) } : {}),
    ...(event.officialUrl ? { sameAs: event.officialUrl } : {}),
    organizer: { "@id": ORGANIZATION_ID },
  };
}
