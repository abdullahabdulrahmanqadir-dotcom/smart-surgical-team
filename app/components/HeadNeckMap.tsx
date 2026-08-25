"use client";

import type { CSSProperties } from "react";
import { ANATOMY_PLATE, ANATOMY_REGIONS, getAnatomyRegion } from "../lib/anatomy-map";

type HeadNeckMapProps = {
  /** The focused topic slug, or null for the whole head and neck. */
  active: string | null;
  /** Accessible name for each region's hotspot, keyed by topic slug. */
  labels: Record<string, string>;
  fallbackLabels: Record<string, string>;
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
export default function HeadNeckMap({ active, labels, fallbackLabels, onSelect, onReset, resetLabel }: HeadNeckMapProps) {
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
  } as CSSProperties;

  return (
    <div className={`content-map${region ? " is-focused" : ""}`} style={camera}>
      <div className="content-map-stage">
        <div className="content-map-camera">
          {/* A CSS background lets the active theme fetch only its own plate;
              two hidden img elements would still download both full assets. */}
          <span
            className="content-map-plate"
            style={{
              "--plate-image-light": `url(${ANATOMY_PLATE.src})`,
              "--plate-image-dark": `url(${ANATOMY_PLATE.darkSrc})`,
            } as CSSProperties}
            aria-hidden="true"
          />
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
            (() => {
              const label = labels[item.slug] ?? fallbackLabels[item.slug] ?? item.label;
              return <button
                className={`content-map-callout content-map-callout--${item.side}`}
                // The button spans dot to tag, so the leader's percentage width
                // resolves against the stage rather than a zero-width box.
                style={{
                  left: `${item.side === "left" ? item.x - item.leader : item.x}%`,
                  top: `${item.y}%`,
                  width: `${item.leader}%`,
                  "--float-order": index,
                } as CSSProperties}
                type="button"
                onClick={() => onSelect(item.slug)}
                tabIndex={region ? -1 : undefined}
                key={item.slug}
              >
                <span className="content-map-dot" aria-hidden="true" />
                <span className="content-map-leader" aria-hidden="true" />
                <span className="content-map-tag" aria-hidden="true">{label}</span>
                <span className="visually-hidden">{label}</span>
              </button>;
            })()
          ))}
        </div>
      </div>
    </div>
  );
}
