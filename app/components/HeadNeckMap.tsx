"use client";

import type { CSSProperties } from "react";
import { ANATOMY_PLATE, ANATOMY_REGIONS, getAnatomyRegion } from "../lib/anatomy-map";

type HeadNeckMapProps = {
  /** The focused topic slug, or null for the whole head and neck. */
  active: string | null;
  /** Accessible name for each region's hotspot, keyed by topic slug. */
  labels: Record<string, string>;
  onSelect: (slug: string) => void;
  onReset: () => void;
  resetLabel: string;
};

/**
 * One illustration, one camera. Selecting a region flies the camera to that
 * region's focus point and softens everything outside it; selecting another
 * region tweens straight there, which passes through the intermediate scale and
 * gives the pull-back-and-push-in motion for free.
 */
export default function HeadNeckMap({ active, labels, onSelect, onReset, resetLabel }: HeadNeckMapProps) {
  const region = getAnatomyRegion(active);

  // Scaling about the focus point keeps it fixed, so the translate that brings
  // it to the centre of the stage is a plain, unscaled offset.
  //
  // Because the focus point always ends up at the centre of the stage, the
  // depth-of-field mask can sit outside the camera and stay centred — which
  // keeps the blur off the transformed layer, where it would otherwise force a
  // full re-raster of the plate on every frame of the move.
  const camera = {
    "--cam-origin-x": `${region?.x ?? 50}%`,
    "--cam-origin-y": `${region?.y ?? 50}%`,
    "--cam-shift-x": `${50 - (region?.x ?? 50)}%`,
    "--cam-shift-y": `${50 - (region?.y ?? 50)}%`,
    "--cam-zoom": region?.zoom ?? 1,
    "--cam-tilt-x": `${region?.tiltX ?? 0}deg`,
    "--cam-tilt-y": `${region?.tiltY ?? 0}deg`,
    /** The sharp radius in stage terms: the camera magnifies it by the zoom. */
    "--veil-r": `${region ? Math.round(region.radius * region.zoom * 10) / 10 : 50}%`,
    "--plate-ratio": `${ANATOMY_PLATE.width} / ${ANATOMY_PLATE.height}`,
    /** Same ratio as a bare number, so the stage can size itself from whichever
     *  of the container's two dimensions runs out first. */
    "--plate-ar": ANATOMY_PLATE.width / ANATOMY_PLATE.height,
  } as CSSProperties;

  return (
    <div className={`content-map${region ? " is-focused" : ""}`} style={camera}>
      <div className="content-map-stage">
        <div className="content-map-camera">
          {/* Static delivery avoids the Next Image compatibility route used by vinext. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="content-map-plate" src={ANATOMY_PLATE.src} alt="" />
        </div>

        {/* Softens everything outside the focus, so the surrounding anatomy
            falls away instead of disappearing. Sits outside the camera and
            never moves — only its opacity changes. */}
        <span className="content-map-veil" aria-hidden="true" />

        {region ? (
          <button className="content-map-reset" type="button" onClick={onReset}>
            <span className="visually-hidden">{resetLabel}</span>
          </button>
        ) : null}

        <div className="content-map-callouts">
          {ANATOMY_REGIONS.map((item, index) => (
            <button
              className={`content-map-callout content-map-callout--${item.side}`}
              style={{ left: `${item.x}%`, top: `${item.y}%`, "--float-order": index } as CSSProperties}
              type="button"
              onClick={() => onSelect(item.slug)}
              tabIndex={region ? -1 : undefined}
              key={item.slug}
            >
              <span className="content-map-dot" aria-hidden="true" />
              <span className="content-map-leader" aria-hidden="true" />
              <span className="content-map-tag" aria-hidden="true">{item.label}</span>
              {/* The short tag is for the eye; assistive tech gets the full topic name. */}
              <span className="visually-hidden">{labels[item.slug] ?? item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
