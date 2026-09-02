"use client";

import { useState, useSyncExternalStore } from "react";
import type { Dictionary } from "../lib/dictionaries";

const videoUrl = "https://www.youtube-nocookie.com/embed/gUKXoL-zXdM?playsinline=1&rel=0&autoplay=1";

type DataConnection = EventTarget & { saveData?: boolean; effectiveType?: string };

function getConnection() {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: DataConnection }).connection;
}

function subscribeToConnection(onChange: () => void) {
  const connection = getConnection();
  connection?.addEventListener("change", onChange);
  return () => connection?.removeEventListener("change", onChange);
}

function readSparingData() {
  const connection = getConnection();
  if (!connection) return false;
  return Boolean(connection.saveData) || /^(slow-)?2g$/.test(connection.effectiveType ?? "");
}

/** The server has no connection to read, so it renders the poster either way. */
function serverSparingData() {
  return false;
}

/**
 * The player is a facade: until someone asks for the video, the section is a
 * poster image and a play button, so the page costs one ~43 KB image instead
 * of the YouTube iframe and its player bundle. Nothing plays on its own.
 *
 * The poster is the video's own thumbnail, stored locally rather than pulled
 * from ytimg, so a visitor who never presses play never touches YouTube. If
 * even that image is too much — Save Data is on, or the connection reports
 * itself as 2G — we skip it and show the plain teal panel behind it.
 */
export default function IntroductionVideo({ t }: { t: Dictionary["introduction"] }) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const sparingData = useSyncExternalStore(subscribeToConnection, readSparingData, serverSparingData);
  const showPoster = !sparingData && !posterFailed;

  if (playing) {
    return (
      <div className="introduction-video">
        <iframe
          src={videoUrl}
          title={t.videoTitle}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="introduction-video">
      <button
        type="button"
        className={showPoster ? "introduction-video-cover" : "introduction-video-cover is-bare"}
        onClick={() => setPlaying(true)}
      >
        {showPoster ? (
          <picture>
            <source srcSet="/introduction-poster.webp" type="image/webp" />
            <img
              src="/introduction-poster.jpg"
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              onError={() => setPosterFailed(true)}
            />
          </picture>
        ) : null}

        <span className="introduction-video-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        </span>
        {/* The thumbnail already carries the video's own headline, so the
            written label only shows itself when there is no thumbnail. It
            stays in the accessibility tree either way — it is what names the
            button. */}
        <span className="introduction-video-label">
          <span className="introduction-video-action">{t.playLabel}</span>
          <span className="introduction-video-title">{t.videoTitle}</span>
        </span>
      </button>
    </div>
  );
}
