"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LazyImage from "./LazyImage";
import { fill, type Dictionary } from "../lib/dictionaries";

type Image = { id: string; publicUrl: string; altText?: string; caption?: string };

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const FIT_ZOOM = 1;

/** Untransformed layout box of the image, measured relative to the canvas. */
type FitBox = { width: number; height: number; centreX: number; centreY: number };

export default function ImageGallery({ images, label, t, presentation = "gallery", pair = false }: { images: Image[]; label?: string; t: Dictionary["media"]; presentation?: "gallery" | "poster" | "hero"; pair?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(FIT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(true);
  // Full-size case images are large. The viewer frame, its controls and the
  // filmstrip appear at once; this tracks the photograph itself so the frame
  // can show that it is still arriving rather than sitting empty.
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fitRef = useRef<FitBox>({ width: 0, height: 0, centreX: 0, centreY: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; zoom: number; pan: { x: number; y: number }; centre: { x: number; y: number } } | null>(null);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const active = openIndex === null ? null : images[openIndex];

  /** Panning is bounded so the image can never be dragged off into empty space:
      an edge may reach the canvas edge but never travel past it. Along an axis
      where the scaled image is smaller than the canvas it stays put. */
  const clampPan = useCallback((next: { x: number; y: number }, atZoom: number) => {
    const canvas = canvasRef.current;
    const fit = fitRef.current;
    if (!canvas || !fit.width || !fit.height) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    const axis = (value: number, half: number, centre: number, extent: number) => {
      const upper = half - centre;
      const lower = extent - centre - half;
      if (lower > upper) return 0;
      return Math.max(lower, Math.min(upper, value));
    };
    return {
      x: axis(next.x, (fit.width * atZoom) / 2, fit.centreX, bounds.width),
      y: axis(next.y, (fit.height * atZoom) / 2, fit.centreY, bounds.height),
    };
  }, []);

  const applyZoom = useCallback((nextZoom: number, anchor?: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    setZoom((currentZoom) => {
      if (target === currentZoom) return currentZoom;
      setPan((currentPan) => {
        if (target <= FIT_ZOOM) return { x: 0, y: 0 };
        if (!canvas || !anchor) return clampPan(currentPan, target);
        // Keep whatever sits under the pointer pinned in place while scaling.
        const bounds = canvas.getBoundingClientRect();
        const fit = fitRef.current;
        const offsetX = anchor.x - (bounds.left + fit.centreX);
        const offsetY = anchor.y - (bounds.top + fit.centreY);
        const ratio = target / currentZoom;
        return clampPan(
          { x: offsetX - (offsetX - currentPan.x) * ratio, y: offsetY - (offsetY - currentPan.y) * ratio },
          target,
        );
      });
      return target;
    });
  }, [clampPan]);

  const resetView = useCallback(() => { setAnimate(true); setZoom(FIT_ZOOM); setPan({ x: 0, y: 0 }); }, []);
  const close = useCallback(() => { setOpenIndex(null); resetView(); setDragging(false); pointers.current.clear(); gesture.current = null; }, [resetView]);
  const step = useCallback((delta: number) => {
    setOpenIndex((current) => (current === null ? current : (current + delta + images.length) % images.length));
    resetView();
  }, [images.length, resetView]);

  /** Measure the painted size so pan limits track the real pixels on screen.
      `offsetWidth`/`offsetHeight` are the untransformed layout box, which the
      max-width/max-height rules keep at the image's own aspect ratio. */
  const measure = useCallback(() => {
    const image = imageRef.current;
    if (!image || !image.offsetWidth) return;
    fitRef.current = {
      width: image.offsetWidth,
      height: image.offsetHeight,
      centreX: image.offsetLeft + image.offsetWidth / 2,
      centreY: image.offsetTop + image.offsetHeight / 2,
    };
    setPan((current) => clampPan(current, zoom));
  }, [clampPan, zoom]);

  useLayoutEffect(() => { measure(); }, [measure, openIndex]);

  // A revisited image is often already decoded, in which case `onLoad` never
  // fires again and the indicator would otherwise never clear.
  useLayoutEffect(() => {
    const image = imageRef.current;
    setImageLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [active?.id]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); return; }
      if (images.length > 1 && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        step(event.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (event.key === "+" || event.key === "=") { event.preventDefault(); setAnimate(true); applyZoom(zoom + 0.4); }
      if (event.key === "-" || event.key === "_") { event.preventDefault(); setAnimate(true); applyZoom(zoom - 0.4); }
      if (event.key === "0") { event.preventDefault(); resetView(); }
    };
    const pageOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = pageOverflow; };
  }, [active, applyZoom, close, images.length, resetView, step, zoom]);

  // React's delegated wheel listener may be passive in some browsers. A native,
  // non-passive handler is required to consume wheel input while viewing an image.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setAnimate(false);
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0022));
      applyZoom(zoom * factor, { x: event.clientX, y: event.clientY });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [active, applyZoom, zoom]);

  // Neighbouring images are fetched up front so stepping through feels instant.
  useEffect(() => {
    if (openIndex === null || images.length < 2) return;
    for (const offset of [1, -1]) {
      const preload = new window.Image();
      preload.src = images[(openIndex + offset + images.length) % images.length].publicUrl;
    }
  }, [images, openIndex]);

  if (!images.length) return null;

  const open = (index: number) => { setOpenIndex(index); resetView(); };
  const zoomed = zoom > FIT_ZOOM + 0.001;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom,
        pan,
        centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      dragStart.current = null;
      swipeStart.current = null;
      return;
    }
    setAnimate(false);
    if (zoomed) {
      dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false };
      setDragging(true);
    } else if (images.length > 1) {
      swipeStart.current = { x: event.clientX, y: event.clientY, time: Date.now() };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pinch = gesture.current;
    if (pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      applyZoom(pinch.zoom * (distance / pinch.distance), pinch.centre);
      return;
    }
    if (!dragStart.current) return;
    dragStart.current.moved = true;
    setPan(clampPan(
      { x: dragStart.current.panX + event.clientX - dragStart.current.x, y: dragStart.current.panY + event.clientY - dragStart.current.y },
      zoom,
    ));
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    dragStart.current = null;
    setDragging(false);
    const swipe = swipeStart.current;
    swipeStart.current = null;
    if (swipe && !zoomed && event.type === "pointerup") {
      const distanceX = event.clientX - swipe.x;
      const distanceY = event.clientY - swipe.y;
      if (Math.abs(distanceX) > 60 && Math.abs(distanceX) > Math.abs(distanceY) * 1.5 && Date.now() - swipe.time < 600) {
        step(distanceX < 0 ? 1 : -1);
      }
    }
  };

  const isPoster = presentation === "poster";
  const isHero = presentation === "hero";

  return <section className={`case-image-gallery${isPoster ? " poster-image-viewer" : ""}${isHero ? " content-hero-image hero-image-viewer" : ""}`} aria-labelledby={isPoster || isHero ? undefined : "case-images-title"} aria-label={isPoster || isHero ? (label ?? t.imageViewer) : undefined}>
    {isPoster || isHero ? null : <span className="aside-label" id="case-images-title">{label ?? t.caseImages}</span>}
    <div className={`case-image-thumbnails${pair ? " is-before-after" : ""}`}>{images.map((image, index) =>
      <button key={image.id} type="button" onClick={() => open(index)} aria-label={pair ? (index === 0 ? t.beforeLabel : t.afterLabel) : fill(t.openImage, { index: index + 1, count: images.length })}>
        <LazyImage className="case-image-thumb" src={image.publicUrl} alt={image.altText ?? t.caseImage} eager={isPoster || isHero} />
        <span className="case-image-thumb-badge">{pair ? (index === 0 ? t.beforeLabel : t.afterLabel) : t.openImageBadge}</span>
      </button>)}
    </div>
    {isHero && images[0]?.caption ? <p className="content-hero-caption">{images[0].caption}</p> : null}
    {/* Rendered into <body> rather than in place. The viewer is `position: fixed`,
        and the scroll-reveal treatment puts a `transform`/`filter` on the
        gallery's ancestors — either one makes that ancestor the containing
        block for fixed children, which trapped the full-screen viewer inside
        the gallery card instead of covering the page. */}
    {active ? createPortal(<div className="image-lightbox" role="dialog" aria-modal="true" aria-label={active.altText || t.imageViewer}>
      <div className="image-lightbox-bar">
        <p className="image-lightbox-title">{active.caption || active.altText || t.caseImage}{images.length > 1 ? <span> · {(openIndex ?? 0) + 1} / {images.length}</span> : null}</p>
        <div className="image-lightbox-tools">
          <button type="button" onClick={() => { setAnimate(true); applyZoom(zoom - 0.4); }} disabled={zoom <= MIN_ZOOM} aria-label={t.zoomOut}>−</button>
          <button type="button" className="image-lightbox-level" onClick={resetView} aria-label={t.resetZoom}>{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => { setAnimate(true); applyZoom(zoom + 0.4); }} disabled={zoom >= MAX_ZOOM} aria-label={t.zoomIn}>+</button>
          <a href={active.publicUrl} target="_blank" rel="noreferrer" aria-label={t.openOriginal}>{t.original}</a>
          <button type="button" className="image-lightbox-close" onClick={close} aria-label={t.closeViewer}>×</button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className={`image-lightbox-canvas${zoomed ? " is-zoomed" : ""}${dragging ? " is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={(event) => { setAnimate(true); if (zoomed) resetView(); else applyZoom(2.5, { x: event.clientX, y: event.clientY }); }}
        onClick={(event) => { if (event.target === event.currentTarget && !zoomed) close(); }}
      >
        {imageLoaded ? null : <span className="image-lightbox-loading" role="status" aria-label={t.loadingImage}><span className="image-lightbox-spinner" aria-hidden="true" /></span>}
        <img
          ref={imageRef}
          key={active.id}
          draggable={false}
          src={active.publicUrl}
          alt={active.altText ?? t.caseImage}
          onLoad={() => { setImageLoaded(true); measure(); }}
          onError={() => setImageLoaded(true)}
          style={{
            opacity: imageLoaded ? 1 : 0,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transition: animate && !dragging ? "transform .22s cubic-bezier(.2,.7,.3,1)" : "none",
          }}
        />
      </div>
      {images.length > 1 ? <>
        <button type="button" className="image-lightbox-step is-prev" onClick={() => step(-1)} aria-label={t.previousImage}>‹</button>
        <button type="button" className="image-lightbox-step is-next" onClick={() => step(1)} aria-label={t.nextImage}>›</button>
        <div className="image-lightbox-filmstrip" role="tablist" aria-label={t.chooseImage}>
          {images.map((image, index) =>
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === openIndex}
              className={index === openIndex ? "is-current" : undefined}
              onClick={() => { setOpenIndex(index); resetView(); }}
              aria-label={fill(t.imageNumber, { index: index + 1 })}
            ><img src={image.publicUrl} alt="" loading="lazy"/></button>)}
        </div>
      </> : null}
    </div>, document.body) : null}
  </section>;
}
