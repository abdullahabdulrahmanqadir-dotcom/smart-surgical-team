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

export async function getCollaborators(locale: Locale): Promise<Collaborator[]> {
  let rows: Row[];
  try {
    rows = await cachedCollaborators();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    noteDegradedRead();
    return [];
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
