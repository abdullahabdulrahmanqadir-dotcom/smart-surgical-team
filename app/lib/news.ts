import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { isNewsRelationType, resolveNewsSections, type NewsCategory, type NewsItem } from "./news-data";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { noteDegradedRead } from "../../lib/render-health";

/**
 * Server-side news reads.
 *
 * Import this only from server components and route handlers. Everything a
 * client component needs — the types, the item-shape rule, the Arabic
 * fallback, the date formatters — lives in `./news-data`, which carries no
 * server imports. Reaching for this module from a `"use client"` file drags
 * `next/cache` into the browser bundle, where `AsyncLocalStorage` does not
 * exist.
 *
 * News is database-backed: migration `0021_news.sql` creates `news_items`,
 * `news_categories` and `news_media`, and the admin workspace manages them.
 *
 * These reads have no fallback content. A labelled placeholder set stood in
 * here while the section was built against an unapplied migration; it was
 * removed on 2026-08-29, once real news was published. **Nothing invented is
 * served in its place:** with no published rows the feed renders its own empty
 * state, which is the honest answer and the one the client sees if they ever
 * unpublish everything.
 */

export * from "./news-data";

export const NEWS_CACHE_TAG = CACHE_TAGS.news;

const REVALIDATE_SECONDS = 60;

function canUseDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

type CategoryRow = { id: string; name: string; name_ar: string | null; slug: string; sort_order?: number } | null;

type NewsRow = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  summary: string | null;
  summary_ar: string | null;
  body: unknown;
  body_ar: unknown;
  published_at: string | null;
  link_url: string | null;
  cover_url: string | null;
  pinned: boolean | null;
  justify_body?: boolean | null;
  related_type: string | null;
  related_ref: string | null;
  category: CategoryRow;
  news_media: { public_url: string; alt_text: string | null; caption: string | null; kind: string | null; sort_order: number }[] | null;
};

// Migration 0024 adds `justify_body`. Selecting a column the database does not
// have fails the whole query, which would take the news section down in the
// window between a deploy and its migration; the first such failure drops the
// column for the life of the process and the read is retried without it. Every
// item then reads as justified, which is the site-wide default anyway.
let justifyBodyColumn = true;
function missingJustifyBody(message: string) { return /justify_body/.test(message) && /does not exist/i.test(message); }

const NEWS_SELECT = () =>
  "id,title,title_ar,slug,summary,summary_ar,body,body_ar,published_at,link_url,cover_url,pinned," +
  (justifyBodyColumn ? "justify_body," : "") +
  "related_type,related_ref," +
  "category:news_categories(id,name,name_ar,slug)," +
  "news_media(public_url,alt_text,caption,kind,sort_order)";

function categoryOf(row: CategoryRow): NewsCategory | null {
  return row ? { id: row.id, name: row.name, nameAr: row.name_ar ?? "", slug: row.slug } : null;
}

function mapRow(row: NewsRow): NewsItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar ?? "",
    summary: row.summary ?? "",
    summaryAr: row.summary_ar ?? "",
    sections: resolveNewsSections(row.body),
    sectionsAr: resolveNewsSections(row.body_ar),
    category: categoryOf(row.category),
    // Stored as a timestamp, written from a date field: the feed and the cards
    // only ever show the calendar day.
    date: row.published_at ? String(row.published_at).slice(0, 10) : "",
    linkUrl: row.link_url ?? "",
    coverUrl: row.cover_url ?? "",
    pinned: Boolean(row.pinned),
    // Justified unless the editor turned it off; a database without the column
    // reads as the default rather than as "off".
    justifyBody: row.justify_body ?? true,
    related: isNewsRelationType(row.related_type) && row.related_ref
      ? { type: row.related_type, ref: row.related_ref }
      : null,
    media: [...(row.news_media ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({ publicUrl: item.public_url, altText: item.alt_text ?? "", caption: item.caption ?? "", kind: item.kind === "document" ? "document" as const : "image" as const })),
  };
}

/**
 * Throws rather than returning an empty list when the query fails: the result
 * of this function is cached, and an empty list is a legitimate thing to cache.
 * A single failure would otherwise publish "nothing here" for the whole
 * revalidate window. Callers degrade outside the cache instead.
 */
async function fetchNewsItems(): Promise<NewsItem[]> {
  if (!canUseDatabase()) return [];
  const run = () => getSupabaseServerClient()
    .from("news_items")
    .select(NEWS_SELECT())
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  let { data, error } = await run();
  if (error && justifyBodyColumn && missingJustifyBody(error.message)) {
    console.warn("news_items.justify_body is missing — apply migration 0024. Reading every item as justified, the default.");
    justifyBodyColumn = false;
    ({ data, error } = await run());
  }
  if (error) throw new Error(`published news query failed: ${error.message}`);
  return ((data ?? []) as unknown as NewsRow[]).map(mapRow);
}

const cachedNewsItems = unstable_cache(fetchNewsItems, ["published-news"], { revalidate: REVALIDATE_SECONDS, tags: [NEWS_CACHE_TAG] });

export async function getNewsItems(): Promise<NewsItem[]> {
  try {
    return await cachedNewsItems();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // Degraded, not empty — see `lib/render-health.ts`. The distinction keeps
    // this one bad response from being cached as the state of the site.
    noteDegradedRead();
    return [];
  }
}

export async function getNewsItem(slug: string): Promise<NewsItem | undefined> {
  return (await getNewsItems()).find((item) => item.slug === slug);
}

/**
 * The one item flagged for the homepage banner, if any.
 *
 * A single pin is enforced by the admin API and by a partial unique index, so
 * finding more than one here would mean the database was edited by hand; the
 * newest wins, since the list is already ordered by publication date.
 */
export async function getPinnedNewsItem(): Promise<NewsItem | undefined> {
  return (await getNewsItems()).find((item) => item.pinned);
}

async function fetchNewsCategories(): Promise<NewsCategory[]> {
  if (!canUseDatabase()) return [];
  const { data, error } = await getSupabaseServerClient()
    .from("news_categories")
    .select("id,name,name_ar,slug,sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`news categories query failed: ${error.message}`);
  return ((data ?? []) as NonNullable<CategoryRow>[]).map((row) => ({ id: row.id, name: row.name, nameAr: row.name_ar ?? "", slug: row.slug }));
}

const cachedNewsCategories = unstable_cache(fetchNewsCategories, ["news-categories"], { revalidate: REVALIDATE_SECONDS, tags: [NEWS_CACHE_TAG] });

/**
 * Every category, in the admin's order — including ones nothing is filed under
 * yet. The public feed narrows this to the categories its items actually use,
 * so an empty chip is never offered.
 */
export async function getNewsCategories(): Promise<NewsCategory[]> {
  try {
    return await cachedNewsCategories();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // Degraded, not empty — see `lib/render-health.ts`. The distinction keeps
    // this one bad response from being cached as the state of the site.
    noteDegradedRead();
    return [];
  }
}
