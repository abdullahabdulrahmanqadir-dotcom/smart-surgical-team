"use client";

import { useEffect, useState } from "react";

type Image = { id: string; publicUrl: string; altText?: string; caption?: string };

export default function ImageGallery({ images, label = "Case images" }: { images: Image[]; label?: string }) {
  const [active, setActive] = useState<Image | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!images.length) return null;
  const close = () => { setActive(null); setZoom(1); };
  return <section className="case-image-gallery" aria-labelledby="case-images-title">
    <span className="aside-label" id="case-images-title">{label}</span>
    <div className="case-image-thumbnails">{images.map((image) => <button key={image.id} type="button" onClick={() => { setActive(image); setZoom(1); }}><img src={image.publicUrl} alt={image.altText ?? "Case image"}/><span>Open image</span></button>)}</div>
    {active ? <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={active.altText || "Image viewer"} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="image-lightbox-frame">
        <div className="image-lightbox-tools"><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} aria-label="Zoom out">−</button><input type="range" min="0.5" max="4" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Image zoom"/><button type="button" onClick={() => setZoom((value) => Math.min(4, value + 0.25))} aria-label="Zoom in">+</button><button type="button" onClick={close}>Close</button></div>
        <div className="image-lightbox-canvas"><img src={active.publicUrl} alt={active.altText ?? "Case image"} style={{ transform: `scale(${zoom})` }}/></div>
        {active.caption ? <p>{active.caption}</p> : null}
      </div>
    </div> : null}
  </section>;
}
