"use client";

import { useState, type CSSProperties } from "react";
import type { ContentRecord } from "../lib/content";
import { IconArrowRight, IconClock, IconFile, IconFullscreen, IconPlay, IconUsers } from "./icons";

export default function ContentPlayer({ content }: { content: ContentRecord }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(content.progress ?? 0);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"overview" | "chapters" | "notes">("overview");

  return (
    <>
      <section className="content-player" aria-label={`${content.title} player`}>
        {content.videoUrl ? (
          <video className="content-video" controls preload="metadata" poster={content.posterUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
            <source src={content.videoUrl} />
            Your browser does not support video playback.
          </video>
        ) : <>
          <div className="player-art" aria-hidden="true"><div className="player-grid" /><div className="player-orbit player-orbit-one" /><div className="player-orbit player-orbit-two" /><div className="player-anatomy">{content.topic.toUpperCase()}<br />MASTERCLASS</div></div>
          <button type="button" className={`content-play ${playing ? "is-playing" : ""}`} onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause lecture" : "Play lecture"}>
            {playing ? <span className="pause-mark" aria-hidden="true" /> : <IconPlay size={29} />}
          </button>
          <div className="player-topline"><span>{content.kind === "webinar_recording" ? "Recorded webinar" : "Operative series"}</span><span>HD</span></div>
          <div className="player-controls">
            <button type="button" className="control-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause lecture" : "Play lecture"}>{playing ? <span className="pause-mark small" aria-hidden="true" /> : <IconPlay size={16} />}</button>
            <input className="timeline" type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} aria-label="Lecture progress" style={{ "--progress": `${progress}%` } as CSSProperties} />
            <span className="timeline-time">{content.duration}</span>
            <button className="control-label" type="button" aria-label="Closed captions">CC</button>
            <button className="control-label" type="button" aria-label="Full screen"><IconFullscreen size={16} /></button>
          </div>
        </>}
      </section>

      <div className="content-tabs" role="tablist" aria-label="Lecture information">
        {(["overview", "chapters", "notes"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "overview" ? "Overview" : item === "chapters" ? "Chapters" : "Learning notes"}</button>)}
      </div>

      {tab === "overview" && <div className="content-tab-panel" role="tabpanel"><p>{content.summary}</p><div className="content-facts"><span><IconClock size={16} /> {content.duration}</span>{content.learnerCount ? <span><IconUsers size={16} /> {content.learnerCount} learners</span> : null}<span><IconFile size={16} /> Course notes</span></div></div>}
      {tab === "chapters" && <ol className="chapter-list" role="tabpanel">{content.chapters.length ? content.chapters.map((chapter) => <li key={chapter.title}><button type="button" onClick={() => setProgress(chapter.progress)}><span>{chapter.time}</span><b>{chapter.title}</b><IconPlay size={14} /></button></li>) : <li className="content-tab-panel">Chapters will appear here when they are added to this content item.</li>}</ol>}
      {tab === "notes" && <div className="content-tab-panel note-panel" role="tabpanel"><p>Save the key surgical points for this {content.kind === "poster" ? "resource" : "lecture"} to revisit them later.</p><button type="button" className="btn btn-outline" onClick={() => setSaved((value) => !value)}>{saved ? "Saved to my notes" : "Save to my notes"} <IconArrowRight size={16} /></button></div>}
    </>
  );
}
