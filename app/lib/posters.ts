import { getContent, getLibraryContent } from "./content";
import { resolveCaseSections, type CaseSection, type ContentRecord } from "./content-types";

export type PosterEntry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  authors: string;
  label: string;
  publishedAt: string;
  sections: CaseSection[];
  cta?: { text: string; url: string };
};

const FALLBACK_POSTER: PosterEntry = {
  id: "emc-salivary-glands-cohort",
  slug: "epithelial-myoepithelial-carcinoma-salivary-glands",
  title: "Rare Insights: Epithelial-Myoepithelial Carcinoma of Salivary Glands",
  summary: "A single-centre Iraqi cohort examining the clinical presentation, surgical management and short-term outcomes of this ultra-rare salivary gland tumour.",
  imageUrl: "/posters/emc-salivary-glands-cohort.webp",
  imageAlt: "Clinical poster summarising a five-patient cohort study of epithelial-myoepithelial carcinoma of the salivary glands",
  authors: "Abdulwahid M. Salih, Hiwa O. Baba, Ari M. Abdullah, Rebaz O. Mohammed, et al.",
  label: "5-patient cohort study · 2020–2025",
  publishedAt: "2026-08-09T00:00:00.000Z",
  sections: [
    { key: "overview", label: "Study overview", body: "<p>This single-centre cohort describes five patients treated for epithelial-myoepithelial carcinoma of the salivary glands between 2020 and 2025.</p>" },
    { key: "findings", label: "Key findings", body: "<p>The cohort showed no recurrence during a mean follow-up of 24 months, with 100% patient survival and no nodal or distant metastases identified.</p>" },
  ],
};

const EXAMPLE_POSTER: PosterEntry = {
  id: "74d3f9b8-9b75-4e8d-9f11-5b8c6d28c402",
  slug: "example-thyroid-outcomes-poster",
  title: "Example: Outcomes After Thyroid Surgery",
  summary: "A clearly labelled example poster for previewing the archive card layout. Replace or remove it from the Posters section in admin.",
  imageUrl: "/posters/example-thyroid-outcomes-poster.svg",
  imageAlt: "Example academic poster layout about outcomes after thyroid surgery",
  authors: "Smart Surgical Team",
  label: "Example poster · Layout preview",
  publishedAt: "2026-08-01T00:00:00.000Z",
  sections: [
    { key: "overview", label: "About this example", body: "<p>This placeholder exists only to demonstrate how additional posters appear in the collection grid.</p>" },
    { key: "note", label: "Admin note", body: "<p>Replace its image and written details, or delete it, from the Posters section in admin when a real poster is ready.</p>" },
  ],
};

const FALLBACK_POSTERS = [FALLBACK_POSTER, EXAMPLE_POSTER];

function imageFor(record: ContentRecord) {
  return record.posterUrl
    ?? record.thumbnailUrl
    ?? record.media?.find((item) => item.kind === "image")?.publicUrl
    ?? "";
}

function mapPoster(record: ContentRecord): PosterEntry | null {
  const imageUrl = imageFor(record);
  if (record.kind !== "poster" || !imageUrl) return null;
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    imageUrl,
    imageAlt: record.media?.find((item) => item.publicUrl === imageUrl)?.altText || `Clinical poster: ${record.title}`,
    authors: record.contributors.map((person) => person.name).join(", ") || "Smart Surgical Team",
    label: record.level || "Clinical poster",
    publishedAt: record.publishedAt || "",
    sections: resolveCaseSections(record),
    cta: record.posterCtaText && record.posterCtaUrl ? { text: record.posterCtaText, url: record.posterCtaUrl } : undefined,
  };
}

export async function getPosters(): Promise<PosterEntry[]> {
  const cards = (await getLibraryContent()).filter((item) => item.kind === "poster");
  const records = await Promise.all(cards.map((card) => getContent(card.slug)));
  const posters = records.flatMap((record) => {
    const poster = record ? mapPoster(record) : null;
    return poster ? [poster] : [];
  });
  return posters.length
    ? posters.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    : FALLBACK_POSTERS;
}

export async function getPoster(slug: string): Promise<PosterEntry | undefined> {
  const record = await getContent(slug);
  const poster = record ? mapPoster(record) : null;
  if (poster) return poster;
  return FALLBACK_POSTERS.find((poster) => poster.slug === slug);
}
