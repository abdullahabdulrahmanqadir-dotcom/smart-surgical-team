"use client";

import { useEffect, useRef, useState } from "react";

type Image = { id: string; publicUrl: string; altText?: string; caption?: string };

export default function ImageGallery({ images, label = "Case images" }: { images: Image[]; label?: string }) {
  const [active, setActive] = useState<Image | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function changeZoom(next: number) {
    const value = Math.max(0.5, Math.min(4, next));
    setZoom(value);
    if (value <= 1) setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!images.length) return null;
  const close = () => { setActive(null); setZoom(1); setPan({ x: 0, y: 0 }); setDragging(false); };
  return <section className="case-image-gallery" aria-labelledby="case-images-title">
    <span className="aside-label" id="case-images-title">{label}</span>
    <div className="case-image-thumbnails">{images.map((image) => <button key={image.id} type="button" onClick={() => { setActive(image); setZoom(1); setPan({ x: 0, y: 0 }); }}><img src={image.publicUrl} alt={image.altText ?? "Case image"}/><span>Open image</span></button>)}</div>
    {active ? <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={active.altText || "Image viewer"} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="image-lightbox-frame">
        <div className="image-lightbox-tools"><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="Zoom out">−</button><input type="range" min="0.5" max="4" step="0.1" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} aria-label="Image zoom"/><button type="button" onClick={() => changeZoom(zoom + 0.25)} aria-label="Zoom in">+</button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button><button type="button" onClick={close}>Close</button></div>
        <div className={`image-lightbox-canvas${zoom > 1 ? " is-zoomed" : ""}`} onWheel={(event) => { event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? 0.15 : -0.15)); }} onPointerDown={(event) => { if (zoom <= 1) return; event.currentTarget.setPointerCapture(event.pointerId); dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; setDragging(true); }} onPointerMove={(event) => { if (!dragStart.current) return; setPan({ x: dragStart.current.panX + event.clientX - dragStart.current.x, y: dragStart.current.panY + event.clientY - dragStart.current.y }); }} onPointerUp={() => { dragStart.current = null; setDragging(false); }} onPointerCancel={() => { dragStart.current = null; setDragging(false); }}><img className={dragging ? "is-dragging" : ""} src={active.publicUrl} alt={active.altText ?? "Case image"} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}/></div>
        {active.caption ? <p>{active.caption}</p> : null}
      </div>
    </div> : null}
  </section>;
}
