"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "../lib/dictionaries";

const videoUrl = "https://www.youtube-nocookie.com/embed/gUKXoL-zXdM?playsinline=1&rel=0&enablejsapi=1";
const autoplayVideoUrl = `${videoUrl}&autoplay=1`;

export default function IntroductionVideo({ t }: { t: Dictionary["introduction"] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);

  const startPlayback = useCallback(() => {
    const player = playerRef.current?.contentWindow;
    if (!player || !shouldAutoplay) return;

    player.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [25] }), "*");
    player.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
    player.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
  }, [shouldAutoplay]);

  const pausePlayback = useCallback(() => {
    const player = playerRef.current?.contentWindow;
    if (!player) return;

    player.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldAutoplay(true);
          startPlayback();
        } else {
          pausePlayback();
        }
      },
      { rootMargin: "0px 0px -10%", threshold: 0.15 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [startPlayback, pausePlayback]);

  useEffect(() => {
    if (!shouldAutoplay) return;

    const retryPlayback = window.setTimeout(startPlayback, 600);
    return () => window.clearTimeout(retryPlayback);
  }, [shouldAutoplay, startPlayback]);

  return (
    <div className="introduction-video" ref={containerRef}>
      <iframe
        key={shouldAutoplay ? "autoplay" : "idle"}
        ref={playerRef}
        src={shouldAutoplay ? autoplayVideoUrl : videoUrl}
        title={t.videoTitle}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => window.setTimeout(startPlayback, 350)}
      />
    </div>
  );
}
