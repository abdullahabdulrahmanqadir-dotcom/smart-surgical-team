import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { noteDegradedRead } from "../../lib/render-health";
import { CACHE_TAGS } from "./cache-tags";
import type { Collaborator } from "./collaborators";
import type { Locale } from "./i18n";

export * from "./collaborators";

/**
 * Published collaborators for the map, server-side only.
 *
 * Selects named columns: the consent date and note are internal and must
 * never reach a page. Like `events.ts`, a failed query throws inside the
 * cache (a throw is not cached) and degrades outside it.
 */

type Row = {
  slug: string; name_en: string; name_ar: string | null; city_en: string; city_ar: string | null;
  country_code: string; lat: number; lng: number; description_en: string | null; description_ar: string | null;
  website_url: string | null; featured: boolean;
};

const PUBLIC_COLUMNS = "slug,name_en,name_ar,city_en,city_ar,country_code,lat,lng,description_en,description_ar,website_url,featured";

/** The table arrives with migration 0030. Until it is applied, an empty map
    is the true state of the site, not a degraded read. */
function tableMissing(message: string) {
  return /collaborators/.test(message) && /does not exist|find the table|schema cache/i.test(message);
}

async function fetchCollaborators(): Promise<Row[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data, error } = await getSupabaseServerClient()
    .from("collaborators")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .eq("field", "breast")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (error) {
    if (tableMissing(error.message)) return [];
    throw new Error(`collaborators query failed: ${error.message}`);
  }
  return (data ?? []) as Row[];
}

const cachedCollaborators = unstable_cache(fetchCollaborators, ["public-collaborators"], { revalidate: 300, tags: [CACHE_TAGS.collaborators] });

/** Temporary local-dev preview institutions so the full map (markers,
    same-city spiderfy clusters, geodesic arcs, country tinting, and country
    filter) can be exercised before real written-consent rows are added in
    Admin. Never active in production builds (`NODE_ENV !== "development"`). */
const DEV_PREVIEW_COLLABORATORS: Row[] = [
  {
    slug: "preview-catania",
    name_en: "Cannizzaro Hospital Breast Unit",
    name_ar: "وحدة الثدي بمستشفى كانيتزارو",
    city_en: "Catania",
    city_ar: "كاتانيا",
    country_code: "IT",
    lat: 37.526,
    lng: 15.111,
    description_en: "Joint oncoplastic training, multidisciplinary case reviews, and multicentre surgical outcomes research.",
    description_ar: "تدريب مشترك في الجراحة التجميلية الورمية ومراجعة الحالات متعددة التخصصات والبحوث السريرية.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: true,
  },
  {
    slug: "preview-london-1",
    name_en: "Royal Free Breast Surgery Department",
    name_ar: "قسم جراحة الثدي بمستشفى رويال فري",
    city_en: "London",
    city_ar: "لندن",
    country_code: "GB",
    lat: 51.553,
    lng: -0.165,
    description_en: "Clinical fellowship exchange and multidisciplinary tumour board collaboration.",
    description_ar: "تبادل الزمالات السريرية والتعاون في اجتماعات الفريق متعدد التخصصات.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: true,
  },
  {
    slug: "preview-london-2",
    name_en: "Guy's Breast Imaging & Oncology Centre",
    name_ar: "مركز غايز لتصوير وأورام الثدي",
    city_en: "London",
    city_ar: "لندن",
    country_code: "GB",
    lat: 51.503,
    lng: -0.087,
    description_en: "Collaborative breast radiology education and early-detection workshops.",
    description_ar: "تعليم مشترك في أشعة الثدي وورش الكشف المبكر.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: false,
  },
  {
    slug: "preview-dubai",
    name_en: "Emirates Breast Oncology Institute",
    name_ar: "معهد الإمارات لأورام الثدي",
    city_en: "Dubai",
    city_ar: "دبي",
    country_code: "AE",
    lat: 25.2048,
    lng: 55.2708,
    description_en: "Regional scientific faculty exchange and breast interventional radiology workshops.",
    description_ar: "تبادل الخبرات العلمية الإقليمية وورش الأشعة التداخلية للثدي.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: false,
  },
  {
    slug: "preview-cairo",
    name_en: "National Breast Surgery Teaching Unit",
    name_ar: "الوحدة التعليمية الوطنية لجراحة الثدي",
    city_en: "Cairo",
    city_ar: "القاهرة",
    country_code: "EG",
    lat: 30.0444,
    lng: 31.2357,
    description_en: "Regional curriculum development and hands-on surgical education.",
    description_ar: "تطوير المناهج الإقليمية والتعليم الجراحي التطبيقي.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: false,
  },
  {
    slug: "preview-goiania",
    name_en: "Goiás Oncoplastic Surgery Centre",
    name_ar: "مركز غوياس للجراحة التجميلية الورمية",
    city_en: "Goiânia",
    city_ar: "غويانيا",
    country_code: "BR",
    lat: -16.6869,
    lng: -49.2648,
    description_en: "International oncoplastic surgery training and symposium collaboration.",
    description_ar: "التدريب الدولي في الجراحة التجميلية الورمية والتعاون في الندوات العلمية.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: false,
  },
  {
    slug: "preview-boston",
    name_en: "New England Breast Surgery Collaborative",
    name_ar: "مجموعة نيو إنجلاند التعاونية لجراحة الثدي",
    city_en: "Boston",
    city_ar: "بوسطن",
    country_code: "US",
    lat: 42.3601,
    lng: -71.0589,
    description_en: "Comparative breast cancer outcomes research and virtual MDT case discussions.",
    description_ar: "بحوث مقارنة في نتائج سرطان الثدي ومناقشات افتراضية متعددة التخصصات.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: false,
  },
  {
    slug: "preview-tokyo",
    name_en: "Tokyo Breast Care Research Group",
    name_ar: "مجموعة طوكيو لأبحاث رعاية الثدي",
    city_en: "Tokyo",
    city_ar: "طوكيو",
    country_code: "JP",
    lat: 35.6762,
    lng: 139.6503,
    description_en: "Collaborative clinical studies and minimally invasive breast surgery exchange.",
    description_ar: "دراسات سريرية مشتركة وتبادل الخبرات في جراحة الثدي طفيفة التوغل.",
    website_url: "https://ibs.smarthealth.group/faculty",
    featured: false,
  },
];

export async function getCollaborators(locale: Locale): Promise<Collaborator[]> {
  let rows: Row[];
  try {
    rows = await cachedCollaborators();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    noteDegradedRead();
    rows = [];
  }
  if (rows.length === 0 && process.env.NODE_ENV === "development") {
    rows = DEV_PREVIEW_COLLABORATORS;
  }
  const ar = locale === "ar";
  return rows.map((row) => ({
    slug: row.slug,
    name: (ar && row.name_ar) || row.name_en,
    city: (ar && row.city_ar) || row.city_en,
    country: row.country_code,
    lat: Number(row.lat),
    lng: Number(row.lng),
    description: ((ar && row.description_ar) || row.description_en) ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    featured: Boolean(row.featured),
  }));
}
