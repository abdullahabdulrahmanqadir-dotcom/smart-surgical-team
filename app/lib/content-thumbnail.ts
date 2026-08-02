export type ThumbnailContent = { videoUrl?: string; thumbnailSource?: "youtube" | "image"; thumbnailUrl?: string };

export function youtubeVideoId(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : host.includes("youtube") ? (url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.split("/").filter(Boolean)[1]) : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function contentThumbnailUrl(content: ThumbnailContent): string | undefined {
  if (content.thumbnailSource === "image" && content.thumbnailUrl) return content.thumbnailUrl;
  const id = youtubeVideoId(content.videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
}
