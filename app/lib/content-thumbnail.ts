export type ThumbnailSource = "youtube" | "image" | "before_after";
export type ThumbnailContent = {
  videoUrl?: string;
  thumbnailSource?: ThumbnailSource;
  thumbnailUrl?: string;
  beforeUrl?: string;
  afterUrl?: string;
};

/** Card artwork is either a single picture or a before/after pair drawn as one
    split image. Callers that can only show one picture use
    `contentThumbnailUrl`, which collapses a pair to its "before" half. */
export type CardArt =
  | { kind: "single"; url: string }
  | { kind: "beforeAfter"; before: string; after: string };

export function youtubeVideoId(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : host.includes("youtube") ? (url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.split("/").filter(Boolean)[1]) : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function contentCardArt(content: ThumbnailContent): CardArt | undefined {
  // A pair only counts once both halves resolve; a half-configured record falls
  // through to the single-image and YouTube rules rather than rendering broken.
  if (content.thumbnailSource === "before_after" && content.beforeUrl && content.afterUrl) {
    return { kind: "beforeAfter", before: content.beforeUrl, after: content.afterUrl };
  }
  if (content.thumbnailSource === "image" && content.thumbnailUrl) return { kind: "single", url: content.thumbnailUrl };
  const id = youtubeVideoId(content.videoUrl);
  if (id) return { kind: "single", url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  if (content.beforeUrl) return { kind: "single", url: content.beforeUrl };
  return content.thumbnailUrl ? { kind: "single", url: content.thumbnailUrl } : undefined;
}

export function contentThumbnailUrl(content: ThumbnailContent): string | undefined {
  const art = contentCardArt(content);
  if (!art) return undefined;
  return art.kind === "single" ? art.url : art.before;
}
