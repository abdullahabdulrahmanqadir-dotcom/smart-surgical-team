"use client";

import { useRef, useState } from "react";
import type { ContentRecord } from "../lib/content";
import { IconClock, IconFile, IconPlay, IconUsers } from "./icons";

export default function ContentPlayer({ content }: { content: ContentRecord }) {
  const video = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<"overview" | "chapters" | "notes">("overview");

  // Articles and resources do not get a simulated lecture player. Their
  // authored body and uploaded files are rendered directly on the page.
  if (!content.videoUrl) return null;

  return (
    <>
      <section className="content-player" aria-label={`${content.title} player`}>
        <video ref={video} className="content-video" controls preload="metadata" poster={content.posterUrl}>
          <source src={content.videoUrl} />
          Your browser does not support video playback.
        </video>
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
