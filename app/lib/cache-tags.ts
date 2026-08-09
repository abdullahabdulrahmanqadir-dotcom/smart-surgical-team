/** Shared names for public read-through caches. In production vinext stores
    these entries in the VINEXT_CACHE KV namespace configured by the Worker. */
export const CACHE_TAGS = {
  content: "published-content",
  events: "published-events",
  research: "published-research",
} as const;

export type PublicCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
