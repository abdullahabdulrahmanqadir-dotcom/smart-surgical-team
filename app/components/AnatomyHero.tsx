"use client";

import { useEffect, useRef, useState } from "react";

type Tissue = "thyroid" | "trachea" | "artery" | "vessels";

const tissueImages: Record<Tissue, string> = {
  thyroid: "/hero-histology-thyroid.png",
  trachea: "/hero-histology-trachea.png",
  artery: "/hero-histology-artery.png",
  vessels: "/hero-histology-vessels.png",
};

const route = [
  { x: 37, y: 49 },
  { x: 64, y: 52 },
  { x: 51, y: 61 },
  { x: 51, y: 75 },
  { x: 30, y: 79 },
  { x: 70, y: 79 },
];

function tissueAt(x: number, y: number): Tissue {
  if (y > 69 && x < 39) return "artery";
  if (y > 69 && x > 62) return "vessels";
  // The central upper airway is laryngeal/tracheal cartilage, not thyroid tissue.
  if (x > 40 && x < 60 && (y < 45 || y > 64)) return "trachea";
  if (y > 63 && x > 39 && x < 62) return "trachea";
  return "thyroid";
}

function idlePosition(rawTime: number) {
  const duration = 3600;
  // The first rAF timestamp can land just before the captured start time,
  // which would floor to a negative index and read past the route array.
  const time = Math.max(0, rawTime);
  const index = Math.floor(time / duration) % route.length;
  const current = route[index];
  const next = route[(index + 1) % route.length];
  const progress = (time % duration) / duration;
  const eased = progress * progress * (3 - 2 * progress);
  return { x: current.x + (next.x - current.x) * eased, y: current.y + (next.y - current.y) * eased };
}

export default function AnatomyHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const position = useRef({ ...route[0] });
  const target = useRef({ ...route[0] });
  const reducedMotionRef = useRef(false);
  const tissueRef = useRef<Tissue>("thyroid");
  const [touchInteractionEnabled, setTouchInteractionEnabled] = useState(false);

  // The lens position only ever feeds CSS custom properties on the root node.
  // It used to be React state written ~33 times a second, which re-rendered the
  // whole hero subtree continuously for as long as the home page was open, even
  // while scrolled out of view. Writing the properties directly costs no render,
  // and the loop now parks itself when the hero is hidden or off-screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let lastPaint = 0;
    let onScreen = true;
    const start = performance.now();

    const animate = (now: number) => {
      if (!activeRef.current) target.current = idlePosition(now - start);
      const smoothing = reducedMotionRef.current ? 0.035 : 0.12;
      position.current.x += (target.current.x - position.current.x) * smoothing;
      position.current.y += (target.current.y - position.current.y) * smoothing;
      if (now - lastPaint > 30) {
        const { x, y } = position.current;
        root.style.setProperty("--lens-x", `${x}%`);
        root.style.setProperty("--lens-y", `${y}%`);
        root.style.setProperty("--micro-x", `${16 + x * 0.68}%`);
        root.style.setProperty("--micro-y", `${16 + y * 0.68}%`);
        const tissue = tissueAt(x, y);
        if (tissue !== tissueRef.current) {
          tissueRef.current = tissue;
          root.style.setProperty("--micro-image", `url(${tissueImages[tissue]})`);
        }
        lastPaint = now;
      }
      frame = requestAnimationFrame(animate);
    };

    const stop = () => { if (frame) { cancelAnimationFrame(frame); frame = 0; } };
    const sync = () => {
      const shouldRun = onScreen && document.visibilityState === "visible";
      if (shouldRun && !frame) frame = requestAnimationFrame(animate);
      else if (!shouldRun) stop();
    };

    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { threshold: 0 });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const updateTarget = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds) return;
    target.current = {
      x: Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(8, Math.min(92, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  };
  const canHandlePointer = (event: React.PointerEvent<HTMLDivElement>) =>
    event.pointerType === "mouse" || touchInteractionEnabled;
  const pause = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    activeRef.current = true;
  };
  const resume = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { activeRef.current = false; }, 1250);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 8 : 4;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const delta = moves[event.key];
    if (!delta) return;
    event.preventDefault();
    pause();
    target.current = { x: Math.max(8, Math.min(92, target.current.x + delta[0])), y: Math.max(8, Math.min(92, target.current.y + delta[1])) };
    resume();
  };

  return (
    <div
      ref={rootRef}
      className={`anatomy-hero${touchInteractionEnabled ? " anatomy-hero--touch-interactive" : ""}`}
      tabIndex={0}
      role="group"
      aria-label="Thyroid, trachea, and neck vessel illustration."
      onPointerEnter={(event) => { if (event.pointerType === "mouse") { pause(); updateTarget(event); } }}
      onPointerMove={(event) => { if (canHandlePointer(event)) { pause(); updateTarget(event); } }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") resume(); }}
      onPointerDown={(event) => {
        if (!canHandlePointer(event)) return;
        pause();
        rootRef.current?.setPointerCapture(event.pointerId);
        updateTarget(event);
      }}
      onPointerUp={(event) => {
        if (!canHandlePointer(event)) return;
        if (rootRef.current?.hasPointerCapture(event.pointerId)) rootRef.current.releasePointerCapture(event.pointerId);
        resume();
      }}
      onPointerCancel={resume}
      onKeyDown={handleKeyDown}
      style={{ "--lens-x": `${route[0].x}%`, "--lens-y": `${route[0].y}%`, "--micro-x": `${16 + route[0].x * 0.68}%`, "--micro-y": `${16 + route[0].y * 0.68}%`, "--micro-image": `url(${tissueImages.thyroid})` } as React.CSSProperties}
    >
      <span className="anatomy-hero-base" aria-hidden="true" />
      <span className="anatomy-hero-lens" aria-hidden="true" />
      <button
        className="anatomy-hero-interact"
        type="button"
        aria-pressed={touchInteractionEnabled}
        onClick={() => setTouchInteractionEnabled((enabled) => !enabled)}
      >
        {touchInteractionEnabled ? "Done" : "Interact"}
      </button>
    </div>
  );
}
