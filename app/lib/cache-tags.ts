/** Shared names for public read-through caches. In production vinext stores
    these entries under the `data:` prefix of the `smart-cache` R2 bucket the
    Worker binds as CACHE_BUCKET. See worker/r2-cache-store.ts. */
export const CACHE_TAGS = {
  content: "published-content",
  events: "published-events",
  research: "published-research",
  news: "published-news",
} as const;

export type PublicCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
