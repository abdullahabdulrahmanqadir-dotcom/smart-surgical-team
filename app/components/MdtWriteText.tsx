"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

type MdtWriteTextProps = {
  text: string;
  /** Play immediately on mount (above-the-fold hero) instead of waiting for scroll. */
  immediate?: boolean;
  /** Milliseconds before the first word starts writing. */
  delayMs?: number;
  /** Milliseconds between consecutive words. */
  stepMs?: number;
  /** Duration of each word's ink-write sweep in milliseconds. */
  wordDurationMs?: number;
  /** Show a brief editorial ink cursor while writing (hero and form headings). */
  cursor?: boolean;
  className?: string;
};

function subscribeMotionPreference(callback: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMotionAllowed(): boolean {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerMotionAllowed(): boolean {
  return false;
}

/**
 * Progressive ink-writing text reveal for the MDT page.
 *
 * Renders a plain, unbroken text node during SSR so crawlers, tests and
 * reduced-motion visitors see static markup with zero layout shift. In the
 * browser (when motion is allowed) it splits on spaces — keeping every Arabic
 * word intact so letter joins never break — and sweeps each word open
 * sequentially in the active reading direction.
 */
export default function MdtWriteText({
  text,
  immediate = false,
  delayMs = 0,
  stepMs = 45,
  wordDurationMs = 340,
  cursor = false,
  className,
}: MdtWriteTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const canAnimate = useSyncExternalStore(
    subscribeMotionPreference,
    getMotionAllowed,
    getServerMotionAllowed,
  );
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!canAnimate) return;

    if (immediate) {
      let inner = 0;
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setStarted(true));
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
      };
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setStarted(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const bounds = node.getBoundingClientRect();
    if (bounds.top < window.innerHeight * 0.94 && bounds.bottom > 0) {
      const frame = window.requestAnimationFrame(() => setStarted(true));
      return () => window.cancelAnimationFrame(frame);
    }

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setStarted(true);
      observer.disconnect();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      },
      { rootMargin: "0px 0px -5%", threshold: 0.05 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [canAnimate, immediate]);

  if (!canAnimate) {
    return <span ref={ref} className={className ? `mdt-write ${className}` : "mdt-write"}>{text}</span>;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const totalMs = delayMs + Math.max(words.length - 1, 0) * stepMs + wordDurationMs;

  return (
    <span
      ref={ref}
      className={`mdt-write${started ? " is-writing" : " is-armed"}${cursor ? " has-cursor" : ""}${className ? ` ${className}` : ""}`}
      style={
        {
          "--write-delay": `${delayMs}ms`,
          "--write-step": `${stepMs}ms`,
          "--write-dur": `${wordDurationMs}ms`,
          "--write-total": `${totalMs}ms`,
        } as CSSProperties
      }
    >
      {words.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          <span className="mdt-write-word" style={{ "--w": index } as CSSProperties}>
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
      {cursor && <span className="mdt-write-caret" aria-hidden="true" />}
    </span>
  );
}
