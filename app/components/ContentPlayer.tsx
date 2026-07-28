"use client";

import { useState, type CSSProperties } from "react";
import { IconArrowRight, IconClock, IconFile, IconFullscreen, IconPlay, IconUsers } from "./icons";

const chapters = [
  ["00:00", "Welcome & learning objectives"],
  ["02:18", "Exposure and surgical landmarks"],
  ["08:46", "Identifying the recurrent laryngeal nerve"],
  ["15:04", "Parathyroid preservation"],
  ["21:12", "Haemostasis and closure"],
];

export default function ContentPlayer() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(28);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"overview" | "chapters" | "notes">("overview");

  return (
    <>
      <section className="content-player" aria-label="Lecture player">
        <div className="player-art" aria-hidden="true">
          <div className="player-grid" />
          <div className="player-orbit player-orbit-one" />
          <div className="player-orbit player-orbit-two" />
          <div className="player-anatomy">THYROID<br />MASTERCLASS</div>
        </div>
        <button
          type="button"
          className={`content-play ${playing ? "is-playing" : ""}`}
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause lecture" : "Play lecture"}
        >
          {playing ? <span className="pause-mark" aria-hidden="true" /> : <IconPlay size={29} />}
        </button>
        <div className="player-topline">
          <span>Operative series</span>
          <span>HD</span>
        </div>
        <div className="player-controls">
          <button
            type="button"
            className="control-play"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause lecture" : "Play lecture"}
          >
            {playing ? <span className="pause-mark small" aria-hidden="true" /> : <IconPlay size={16} />}
          </button>
          <input
            className="timeline"
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
            aria-label="Lecture progress"
            style={{ "--progress": `${progress}%` } as CSSProperties}
          />
          <span className="timeline-time">06:47 <i>/</i> 24:18</span>
          <button className="control-label" type="button" aria-label="Closed captions">CC</button>
          <button className="control-label" type="button" aria-label="Full screen"><IconFullscreen size={16} /></button>
        </div>
      </section>

      <div className="content-tabs" role="tablist" aria-label="Lecture information">
        {(["overview", "chapters", "notes"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "is-active" : ""}
            onClick={() => setTab(item)}
          >
            {item === "overview" ? "Overview" : item === "chapters" ? "Chapters" : "Learning notes"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="content-tab-panel" role="tabpanel">
          <p>
            A practical, step-by-step walkthrough of total thyroidectomy, focused on safe exposure,
            recurrent laryngeal nerve identification, parathyroid preservation and haemostasis.
          </p>
          <div className="content-facts">
            <span><IconClock size={16} /> 24 min</span>
            <span><IconUsers size={16} /> 480 learners</span>
            <span><IconFile size={16} /> Course notes</span>
          </div>
        </div>
      )}

      {tab === "chapters" && (
        <ol className="chapter-list" role="tabpanel">
          {chapters.map(([time, label], index) => (
            <li key={label}>
              <button type="button" onClick={() => setProgress(Math.min(96, 8 + index * 22))}>
                <span>{time}</span><b>{label}</b><IconPlay size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}

      {tab === "notes" && (
        <div className="content-tab-panel note-panel" role="tabpanel">
          <p>Save the key surgical points for this lecture to revisit them when preparing for your next case.</p>
          <button type="button" className="btn btn-outline" onClick={() => setSaved((value) => !value)}>
            {saved ? "Saved to my notes" : "Save to my notes"} <IconArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
