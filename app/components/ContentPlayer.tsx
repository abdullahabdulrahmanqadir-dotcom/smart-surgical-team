"use client";

import { useRef, useState } from "react";
import type { ContentRecord } from "../lib/content";
import { IconClock, IconFile, IconPlay, IconUsers } from "./icons";

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

export default function ContentPlayer({ content }: { content: ContentRecord }) {
  const video = useRef<HTMLVideoElement>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

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
      <section className="content-player" aria-label={`${content.title} player`}>
        {youtubeVideoId ? (
          <a className="youtube-video-link" href={content.videoUrl} target="_blank" rel="noreferrer" aria-label={`Watch ${content.title} on YouTube`}>
            {/* The play frame is styled and sized by CSS, so the poster is free
                to arrive late: it fades in over the frame instead of holding
                the surrounding case text back. */}
            {youtubePreview ? <img className={`youtube-video-preview${previewLoaded ? " is-loaded" : ""}`} src={youtubePreview} alt="" decoding="async" onLoad={() => setPreviewLoaded(true)} onError={(event) => { if (youtubePreviewFallback && event.currentTarget.src !== youtubePreviewFallback) event.currentTarget.src = youtubePreviewFallback; else setPreviewLoaded(true); }} /> : null}
            <span className="youtube-video-play" aria-hidden="true"><IconPlay size={22} /></span>
          </a>
        ) : (
          <video ref={video} className="content-video" controls preload="metadata" poster={content.posterUrl}>
            <source src={content.videoUrl} />
            Your browser does not support video playback.
          </video>
        )}
      </section>
      {youtubeVideoId ? <a className="youtube-watch-link" href={content.videoUrl} target="_blank" rel="noreferrer"><IconPlay size={17} />Watch on YouTube<span>Opens in YouTube for age-restricted content</span></a> : null}

      <section className="content-overview" aria-labelledby="content-overview-title"><span className="section-kicker">Overview</span><h2 id="content-overview-title">Case overview</h2><p>{content.summary}</p><div className="content-facts"><span><IconClock size={16} /> {content.duration}</span>{content.learnerCount ? <span><IconUsers size={16} /> {content.learnerCount} learners</span> : null}<span><IconFile size={16} /> Course notes</span></div></section>
    </>
  );
}
