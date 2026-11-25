"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

export type TitleMotionVariant = "write" | "curtain" | "focus" | "ink";

type TitleMotionProps = {
  as?: "h1" | "h2" | "h3" | "span";
  text: string;
  variant?: TitleMotionVariant;
  /** Play immediately on mount (above-the-fold hero) instead of waiting for scroll. */
  immediate?: boolean;
  /** Milliseconds before the first word starts animating. */
  delayMs?: number;
  /** Milliseconds between consecutive words. */
  stepMs?: number;
  /** Duration of each word's animation in milliseconds. */
  wordDurationMs?: number;
  /** Brief editorial teal ink cursor while writing (only applies to variant="write"). */
  cursor?: boolean;
  id?: string;
  className?: string;
  tabIndex?: number;
  dir?: "ltr" | "rtl";
  lang?: string;
  translate?: "yes" | "no";
};

const VARIANT_DEFAULTS: Record<TitleMotionVariant, { stepMs: number; wordDurationMs: number }> = {
  write: { stepMs: 62, wordDurationMs: 360 },
  curtain: { stepMs: 48, wordDurationMs: 540 },
  focus: { stepMs: 52, wordDurationMs: 520 },
  ink: { stepMs: 48, wordDurationMs: 560 },
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
 * Editorial title motion with four alternating reveals:
 * - `write`: directional ink-writing sweep word by word (+ optional brief cursor)
 * - `curtain`: crisp baseline mask lift
 * - `focus`: optical lens blur-to-sharp settle
 * - `ink`: fresh Journal Teal ink wave settling into dark text
 *
 * During SSR and for reduced-motion visitors this renders the exact bare
 * heading element and unbroken text string, preserving HTML tests, SEO,
 * copy-paste and Arabic letter joins with zero layout shift.
 */
export default function TitleMotion({
  as: Tag = "h2",
  text,
  variant = "write",
  immediate = false,
  delayMs = 0,
  stepMs,
  wordDurationMs,
  cursor = false,
  id,
  className,
  tabIndex,
  dir,
  lang,
  translate,
}: TitleMotionProps) {
  const nodeRef = useRef<HTMLElement | null>(null);
  const attachRef = useCallback((el: HTMLElement | null) => {
    nodeRef.current = el;
  }, []);
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

    const node = nodeRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setStarted(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const bounds = node.getBoundingClientRect();
    if (bounds.top < window.innerHeight * 0.96 && bounds.bottom > 0) {
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
      { rootMargin: "0px 0px -4%", threshold: 0.05 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [canAnimate, immediate]);

  const sharedProps = { id, tabIndex, dir, lang, translate };

  if (!canAnimate) {
    return (
      <Tag ref={attachRef} {...sharedProps} className={className}>
        {text}
      </Tag>
    );
  }

  const defaults = VARIANT_DEFAULTS[variant];
  const resolvedStep = stepMs ?? defaults.stepMs;
  const resolvedDuration = wordDurationMs ?? defaults.wordDurationMs;
  const words = text.split(/\s+/).filter(Boolean);
  const totalMs = delayMs + Math.max(words.length - 1, 0) * resolvedStep + resolvedDuration;
  const classes = [
    className,
    "tm-title",
    `tm-${variant}`,
    started ? "is-playing" : "is-armed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      ref={attachRef}
      {...sharedProps}
      className={classes}
      style={
        {
          "--tm-delay": `${delayMs}ms`,
          "--tm-step": `${resolvedStep}ms`,
          "--tm-dur": `${resolvedDuration}ms`,
          "--tm-total": `${totalMs}ms`,
        } as CSSProperties
      }
    >
      {words.map((word, index) => {
        const wordEl = (
          <span className="tm-word" style={{ "--w": index } as CSSProperties}>
            {word}
          </span>
        );
        return (
          <Fragment key={`${index}-${word}`}>
            {variant === "curtain" ? <span className="tm-mask">{wordEl}</span> : wordEl}
            {index < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
      {variant === "write" && cursor && <span className="tm-caret" aria-hidden="true" />}
    </Tag>
  );
}
