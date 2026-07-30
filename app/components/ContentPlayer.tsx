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
  const [tab, setTab] = useState<"overview" | "chapters" | "notes">("overview");

  // Articles and resources do not get a simulated lecture player. Their
  // authored body and uploaded files are rendered directly on the page.
  if (!content.videoUrl) return null;
  const youtubeVideoId = getYouTubeVideoId(content.videoUrl);
  const youtubePreview = content.posterUrl || (youtubeVideoId ? `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg` : null);

  return (
    <>
      <section className="content-player" aria-label={`${content.title} player`}>
        {youtubeVideoId ? (
          <a className="youtube-video-link" href={content.videoUrl} target="_blank" rel="noreferrer" aria-label={`Watch ${content.title} on YouTube`}>
            {youtubePreview ? <img className="youtube-video-preview" src={youtubePreview} alt="" /> : null}
            <span className="youtube-video-overlay">
              <span className="youtube-video-play" aria-hidden="true"><IconPlay size={22} /></span>
              <span><b>Watch on YouTube</b><small>Opens in YouTube for age-restricted content</small></span>
            </span>
          </a>
        ) : (
          <video ref={video} className="content-video" controls preload="metadata" poster={content.posterUrl}>
            <source src={content.videoUrl} />
            Your browser does not support video playback.
          </video>
        )}
      </section>

      <div className="content-tabs" role="tablist" aria-label="Lecture information">
        {(["overview", "chapters", "notes"] as const).map((item) => <button key={item} type="button" role="tab" id={`content-tab-${item}`} aria-controls={`content-panel-${item}`} aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "overview" ? "Overview" : item === "chapters" ? "Chapters" : "Learning notes"}</button>)}
      </div>

      {tab === "overview" && <div className="content-tab-panel" role="tabpanel" id="content-panel-overview" aria-labelledby="content-tab-overview"><p>{content.summary}</p><div className="content-facts"><span><IconClock size={16} /> {content.duration}</span>{content.learnerCount ? <span><IconUsers size={16} /> {content.learnerCount} learners</span> : null}<span><IconFile size={16} /> Course notes</span></div></div>}
      {tab === "chapters" && <ol className="chapter-list" role="tabpanel" id="content-panel-chapters" aria-labelledby="content-tab-chapters">{content.chapters.length ? content.chapters.map((chapter) => <li key={chapter.title}><button type="button" onClick={() => { if (video.current && content.durationSeconds) video.current.currentTime = (chapter.progress / 100) * content.durationSeconds; }}><span>{chapter.time}</span><b>{chapter.title}</b><IconPlay size={14} /></button></li>) : <li className="content-tab-panel">Chapters will appear here when they are added to this content item.</li>}</ol>}
      {tab === "notes" && <div className="content-tab-panel note-panel" role="tabpanel" id="content-panel-notes" aria-labelledby="content-tab-notes"><p>Learning notes for this {content.kind === "poster" ? "resource" : "lecture"} will be published alongside the content.</p></div>}
    </>
  );
}
