"use client";

import { useRef } from "react";
import type { ContentRecord } from "../lib/content-types";
import { IconPlay } from "./icons";
import { fill, type Dictionary } from "../lib/dictionaries";

function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (url.pathname === "/watch") videoId = url.searchParams.get("v");
      else if (["embed", "shorts", "live"].includes(parts[0] ?? "")) videoId = parts[1] ?? null;
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export default function ContentPlayer({ content, t }: { content: ContentRecord; t: Dictionary["media"] }) {
  const video = useRef<HTMLVideoElement>(null);

  // Articles and resources do not get a simulated lecture player. Their
  // authored body and uploaded files are rendered directly on the page.
  if (!content.videoUrl) return null;
  const youtubeVideoId = getYouTubeVideoId(content.videoUrl);
  // YouTube's max-resolution image is 1280px wide when the source upload
  // provides it. Older videos occasionally lack it, so the image falls back
  // to YouTube's high-quality variant if the first request fails.
  const youtubePreview = content.posterUrl || (youtubeVideoId ? `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg` : null);
  const youtubePreviewFallback = youtubeVideoId ? `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg` : null;

  return (
    <>
      <section className="content-player" aria-label={fill(t.playerLabel, { title: content.title })}>
        {youtubeVideoId ? (
          <a className="youtube-video-link" href={content.videoUrl} target="_blank" rel="noreferrer" aria-label={fill(t.watchOnYouTubeLabel, { title: content.title })}>
            {youtubePreview ? <img className="youtube-video-preview" src={youtubePreview} alt="" decoding="async" onError={(event) => { if (youtubePreviewFallback && event.currentTarget.src !== youtubePreviewFallback) event.currentTarget.src = youtubePreviewFallback; }} /> : null}
            <span className="youtube-video-play" aria-hidden="true"><IconPlay size={22} /></span>
          </a>
        ) : (
          <video ref={video} className="content-video" controls preload="metadata" poster={content.posterUrl}>
            <source src={content.videoUrl} />
            {t.videoFallback}
          </video>
        )}
      </section>
      {youtubeVideoId ? <a className="youtube-watch-link" href={content.videoUrl} target="_blank" rel="noreferrer"><IconPlay size={17} />{t.watchOnYouTube}<span>{t.youtubeNote}</span></a> : null}
    </>
  );
}
