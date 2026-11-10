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
 * poster image and a play button. Nothing plays on its own.
 *
 * The poster is a local photo of the clinic building. On a 2G connection or
 * with Save Data enabled, the play button sits on a plain teal panel.
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
        aria-label={`${t.playLabel} — ${t.videoTitle}`}
        onClick={() => setPlaying(true)}
      >
        {showPoster ? (
          <img
            src="/events/smart-health-tower-events-hero.webp"
            alt=""
            width={1672}
            height={941}
            loading="lazy"
            decoding="async"
            onError={() => setPosterFailed(true)}
          />
        ) : null}

        <span className="introduction-video-label" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
          {t.playLabel}
        </span>
      </button>
    </div>
  );
}
