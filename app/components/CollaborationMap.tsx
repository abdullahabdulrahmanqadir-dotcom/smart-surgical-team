"use client";

import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { interpolateZoom } from "d3-interpolate";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, FeatureCollection, Geometry, MultiLineString, Polygon } from "geojson";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { HUB, collaboratorCounts, type Collaborator } from "../lib/collaborators";
import { countryName } from "../lib/countries";
import { fill } from "../lib/dictionaries";
import { IconArrowRight, IconClose, IconGlobe, IconPin } from "./icons";
import "./collaboration-map.css";

/**
 * The International Breast Surgery Collaboration Map.
 *
 * Our own drawing, not rented map tiles: Natural Earth country shapes
 * (public/maps, built by scripts/build-world-map.mjs) on an Equal Earth
 * projection, so country sizes are true and the borders are the ones the site
 * chose (recognised country borders only; spec 2026-11-23).
 *
 * Everything is one SVG in a fixed coordinate space (W x H). Countries sit in a
 * group that takes the zoom transform; markers, labels and the arc are placed
 * in screen space so they stay the same size at every zoom.
 *
 * Gestures never trap the page: the wheel zooms only with Ctrl/Cmd, and touch
 * needs two fingers. A hint says so when someone tries the other way.
 */

const W = 960;
const projection = geoEqualEarth().fitWidth(W, { type: "Sphere" });
const path = geoPath(projection);
const [[, top], [, bottom]] = path.bounds({ type: "Sphere" });
const H = Math.ceil(bottom - top);
projection.translate([W / 2, H / 2]);
const SPHERE = path({ type: "Sphere" }) ?? "";
const GRATICULE = path(geoGraticule10()) ?? "";
const MAX_ZOOM = 12;
const DETAIL_ZOOM = 2.6; // past this, swap to the 1:50m shapes
const LABEL_ZOOM = 2.2;

type Shape = { a2: string; d: string; label?: { x: number; y: number; area: number } };
type Loaded = { shapes: Shape[]; borders: string; coast: string };
type Props = { a2?: string };
type Countries = GeometryCollection<Props>;

export type MapLabels = {
  mapLabel: string;
  zoomIn: string;
  zoomOut: string;
  world: string;
  ctrlHint: string;
  touchHint: string;
  hubName: string;
  hubPlace: string;
  count: string;
  allCountries: string;
  filterLabel: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  visit: string;
  close: string;
  showOnMap: string;
  clusterLabel: string;
  listLabel: string;
};

const cache: Partial<Record<"110m" | "50m", Promise<Loaded>>> = {};

function loadShapes(scale: "110m" | "50m"): Promise<Loaded> {
  cache[scale] ??= fetch(`/maps/world-${scale}.json`)
    .then((response) => { if (!response.ok) throw new Error(`map ${scale}: ${response.status}`); return response.json() as Promise<Topology<{ countries: Countries }>>; })
    .then((topology: Topology<{ countries: Countries }>) => {
      const object = topology.objects.countries;
      const collection = feature(topology, object) as FeatureCollection<Geometry, Props>;
      const shapes: Shape[] = collection.features.map((item: Feature<Geometry, Props>) => {
        const a2 = item.properties?.a2 ?? "";
        // Labels sit on the largest landmass, so France is labelled in France
        // and not in the sea between it and French Guiana.
        let label: Shape["label"];
        const polygons: Polygon[] = item.geometry.type === "MultiPolygon"
          ? item.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
          : item.geometry.type === "Polygon" ? [item.geometry] : [];
        for (const polygon of polygons) {
          const area = path.area(polygon);
          if (!label || area > label.area) { const [x, y] = path.centroid(polygon); label = { x, y, area }; }
        }
        return { a2, d: path(item) ?? "", label: a2 && label && Number.isFinite(label.x) ? label : undefined };
      });
      // Borders are drawn only between shapes with different codes, which is
      // how Somaliland and Northern Cyprus lose their lines (see the build script).
      const borders = path(mesh(topology, object, (a, b) => a !== b && (a.properties as Props)?.a2 !== (b.properties as Props)?.a2) as MultiLineString) ?? "";
      const coast = path(mesh(topology, object, (a, b) => a === b) as MultiLineString) ?? "";
      return { shapes, borders, coast };
    });
  return cache[scale]!;
}

function project(lng: number, lat: number): [number, number] {
  return projection([lng, lat]) ?? [W / 2, H / 2];
}

/** One decimal place for every coordinate written into the markup. The server
    and the browser can disagree in the last floating-point digit, which React
    reports as a hydration mismatch. */
const r1 = (value: number) => Math.round(value * 10) / 10;

type Placed = { item: Collaborator; x: number; y: number };
type Cluster = { x: number; y: number; members: Placed[] };

/** Greedy screen-space grouping: markers closer than `radius` merge. */
function clusterize(points: Placed[], t: ZoomTransform, radius: number): Cluster[] {
  const clusters: Cluster[] = [];
  for (const point of points) {
    const [sx, sy] = t.apply([point.x, point.y]);
    const near = clusters.find((cluster) => Math.hypot(cluster.x - sx, cluster.y - sy) < radius);
    if (near) {
      near.members.push(point);
      near.x = near.members.reduce((sum, member) => sum + t.applyX(member.x), 0) / near.members.length;
      near.y = near.members.reduce((sum, member) => sum + t.applyY(member.y), 0) / near.members.length;
    } else clusters.push({ x: sx, y: sy, members: [point] });
  }
  return clusters;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CollaborationMap({
  collaborators,
  locale,
  labels,
  variant = "full",
  emptyHref,
  fullMapHref,
  fullMapLabel,
}: {
  collaborators: Collaborator[];
  locale: string;
  labels: MapLabels;
  variant?: "full" | "compact";
  emptyHref: string;
  fullMapHref?: string;
  fullMapLabel?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const frame = useRef(0);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [shapes, setShapes] = useState<Loaded | null>(null);
  const [detail, setDetail] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [hint, setHint] = useState<"" | "ctrl" | "touch">("");
  // Map units per screen pixel. Markers, labels and hit areas are scaled by
  // this so they keep the same on-screen size however wide the map is drawn.
  const [ui, setUi] = useState(1);
  const hintTimer = useRef(0);

  const placed = useMemo<Placed[]>(() => collaborators.map((item) => { const [x, y] = project(item.lng, item.lat); return { item, x, y }; }), [collaborators]);
  const [hubX, hubY] = useMemo(() => project(HUB.lng, HUB.lat), []);
  const partnerCountries = useMemo(() => new Set(collaborators.map((item) => item.country)), [collaborators]);
  const visible = country ? placed.filter((point) => point.item.country === country) : placed;
  const counts = collaboratorCounts(collaborators);
  const comma = locale === "ar" ? "، " : ", ";
  const active = placed.find((point) => point.item.slug === selected) ?? null;

  // Load the world view once the map is near the screen, the detailed
  // borders only once someone zooms in.
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    let cancelled = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadShapes("110m").then((loaded) => { if (!cancelled) setShapes((current) => current ?? loaded); }).catch((error) => console.error(error));
    }, { rootMargin: "400px" });
    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (detail || t.k < DETAIL_ZOOM) return;
    let cancelled = false;
    loadShapes("50m").then((loaded) => { if (!cancelled) { setShapes(loaded); setDetail(true); } }).catch((error) => console.error(error));
    return () => { cancelled = true; };
  }, [t.k, detail]);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const measure = () => { const width = node.getBoundingClientRect().width; if (width > 0) setUi(W / width); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const flash = useCallback((kind: "ctrl" | "touch") => {
    setHint(kind);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(""), 1600);
  }, []);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([[0, 0], [W, H]])
      .extent([[0, 0], [W, H]])
      .filter((event: Event) => {
        if (event.type === "wheel") return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey;
        if (event.type.startsWith("touch")) return (event as TouchEvent).touches.length > 1;
        return !(event as MouseEvent).button;
      })
      .on("zoom", (event: { transform: ZoomTransform }) => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => setT(event.transform));
      });
    const selection = select(node).call(behavior);
    // d3-zoom sets `touch-action: none`, which would freeze page scrolling on
    // phones. Let one finger scroll the page; two fingers move the map.
    node.style.touchAction = "pan-y";
    const onWheel = (event: WheelEvent) => { if (!event.ctrlKey && !event.metaKey) flash("ctrl"); };
    const onTouch = (event: TouchEvent) => { if (event.touches.length === 1) flash("touch"); };
    node.addEventListener("wheel", onWheel, { passive: true });
    node.addEventListener("touchstart", onTouch, { passive: true });
    zoomRef.current = behavior;
    return () => {
      selection.on(".zoom", null);
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouch);
      cancelAnimationFrame(frame.current);
      window.clearTimeout(hintTimer.current);
    };
  }, [flash]);

  /** Glide (or jump, under reduced motion) to a view centred on x, y at zoom k. */
  const flyTo = useCallback((x: number, y: number, k: number) => {
    const node = svgRef.current;
    const behavior = zoomRef.current;
    if (!node || !behavior) return;
    const selection = select(node);
    const target = zoomIdentity.translate(W / 2 - x * k, H / 2 - y * k).scale(k);
    if (reducedMotion()) { behavior.transform(selection, target); return; }
    const from = t;
    const interpolate = interpolateZoom([(W / 2 - from.x) / from.k, (H / 2 - from.y) / from.k, W / from.k], [x, y, W / k]);
    const duration = Math.min(1400, Math.max(450, interpolate.duration * .9));
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / duration);
      const eased = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      const [cx, cy, width] = interpolate(eased);
      const scale = W / width;
      behavior.transform(selection, zoomIdentity.translate(W / 2 - cx * scale, H / 2 - cy * scale).scale(scale));
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [t]);

  const zoomBy = (factor: number) => {
    const node = svgRef.current;
    if (node && zoomRef.current) zoomRef.current.scaleBy(select(node), factor, [W / 2, H / 2]);
  };

  const choose = useCallback((slug: string | null) => {
    setSelected(slug);
    const point = placed.find((entry) => entry.item.slug === slug);
    if (!point) return;
    // Frame both ends of the arc: the hub and the institution. Zoom so the pair
    // fills about half the map, never past country scale, and sit them a little
    // high so the detail card (bottom corner) does not cover either.
    const dx = Math.abs(point.x - hubX), dy = Math.abs(point.y - hubY);
    const fit = Math.min((W * .5) / Math.max(dx, 1), (H * .45) / Math.max(dy, 1));
    const k = Math.max(1, Math.min(5, fit));
    flyTo((point.x + hubX) / 2, (point.y + hubY) / 2 + (H * .12) / k, k);
  }, [placed, flyTo, hubX, hubY]);

  const clusters = clusterize(visible, t, 22 * ui);
  const hub = t.apply([hubX, hubY]);
  const k = t.k;

  // A gentle curve from the hub to the selected institution, bowed away from
  // the equator side so arcs read as flight paths.
  let arc = "";
  if (active) {
    const [ax, ay] = hub;
    const [bx, by] = t.apply([active.x, active.y]);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const bend = .22;
    arc = `M${r1(ax)},${r1(ay)} Q${r1(mx + dy * bend)},${r1(my - Math.abs(dx) * bend - Math.abs(dy) * .05)} ${r1(bx)},${r1(by)}`;
  }

  const labelNodes = shapes && k >= LABEL_ZOOM
    ? shapes.shapes.filter((shape) => shape.label && shape.label.area * k * k / (ui * ui) > 3500).map((shape) => {
        const [x, y] = t.apply([shape.label!.x, shape.label!.y]);
        return x > -40 && x < W + 40 && y > -20 && y < H + 20
          ? <text key={`${shape.a2}-${shape.label!.x}`} x={r1(x)} y={r1(y)} className="cmap-country-label">{countryName(shape.a2, locale)}</text>
          : null;
      })
    : null;

  const countriesInList = [...partnerCountries].sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale));
  const hasEntries = collaborators.length > 0;

  const card = active && (
    <div className="cmap-card" role="dialog" aria-label={active.item.name}>
      <button type="button" className="cmap-card-close" onClick={() => setSelected(null)} aria-label={labels.close}><IconClose size={16} /></button>
      <p className="cmap-card-place"><IconPin size={15} />{active.item.city}{comma}{countryName(active.item.country, locale)}</p>
      <h3 dir="auto">{active.item.name}</h3>
      {active.item.description && <p className="cmap-card-body" dir="auto">{active.item.description}</p>}
      {active.item.websiteUrl && (
        <a className="text-link" href={active.item.websiteUrl} target="_blank" rel="noopener">{labels.visit}<IconArrowRight size={15} /></a>
      )}
    </div>
  );

  const map = (
    <div className="cmap-stage">
      <svg
        ref={svgRef}
        className={`cmap-svg${shapes ? " is-ready" : ""}`}
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={labels.mapLabel}
      >
        <defs>
          <clipPath id={`cmap-clip-${variant}`}><rect width={W} height={H} /></clipPath>
        </defs>
        <g clipPath={`url(#cmap-clip-${variant})`}>
          <g transform={t.toString()}>
            <path className="cmap-sphere" d={SPHERE} />
            <path className="cmap-graticule" d={GRATICULE} vectorEffect="non-scaling-stroke" />
            {shapes && (
              <>
                <g className="cmap-countries">
                  {shapes.shapes.map((shape, index) => (
                    <path
                      key={`${shape.a2}-${index}`}
                      d={shape.d}
                      className={shape.a2 === HUB.country ? "is-hub" : partnerCountries.has(shape.a2) ? (country === shape.a2 ? "is-partner is-filtered" : "is-partner") : undefined}
                    />
                  ))}
                </g>
                <path className="cmap-borders" d={shapes.borders} vectorEffect="non-scaling-stroke" />
                <path className="cmap-coast" d={shapes.coast} vectorEffect="non-scaling-stroke" />
              </>
            )}
          </g>
          <g className="cmap-labels" style={{ fontSize: `${r1(ui * 105) / 10}px` }}>{labelNodes}</g>
          {arc && <path key={selected} className="cmap-arc" d={arc} pathLength={1} />}
          {/* The hub: always present, never a button (it is us). */}
          <g className="cmap-hub" transform={`translate(${r1(hub[0])},${r1(hub[1])}) scale(${r1(ui * 100) / 100})`} aria-hidden="true">
            <circle className="cmap-hub-pulse" r="7" />
            <circle className="cmap-hub-dot" r="6.5" />
            <text className="cmap-hub-label" x="11" y="4">{labels.hubPlace}</text>
          </g>
          {clusters.map((cluster) => {
            if (cluster.members.length > 1) {
              const xs = cluster.members.map((member) => member.x), ys = cluster.members.map((member) => member.y);
              const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 4);
              return (
                <g
                  key={cluster.members.map((member) => member.item.slug).join("|")}
                  className="cmap-cluster"
                  transform={`translate(${r1(cluster.x)},${r1(cluster.y)}) scale(${r1(ui * 100) / 100})`}
                  role="button"
                  tabIndex={0}
                  aria-label={fill(labels.clusterLabel, { count: cluster.members.length })}
                  onClick={() => flyTo((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, Math.min(MAX_ZOOM, Math.max(k * 2, (W * .5) / spread)))}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); (event.currentTarget as SVGGElement).dispatchEvent(new MouseEvent("click", { bubbles: true })); } }}
                >
                  <circle r="13" />
                  <text y="4.5">{cluster.members.length}</text>
                </g>
              );
            }
            const point = cluster.members[0];
            const isActive = point.item.slug === selected;
            return (
              <g
                key={point.item.slug}
                className={`cmap-marker${isActive ? " is-active" : ""}${hovered === point.item.slug ? " is-hovered" : ""}`}
                transform={`translate(${r1(cluster.x)},${r1(cluster.y)}) scale(${r1(ui * 100) / 100})`}
                role="button"
                tabIndex={0}
                aria-label={[point.item.name, point.item.city, countryName(point.item.country, locale)].join(comma)}
                aria-pressed={isActive}
                onClick={() => choose(isActive ? null : point.item.slug)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(isActive ? null : point.item.slug); } }}
                onMouseEnter={() => setHovered(point.item.slug)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle className="cmap-marker-hit" r="14" />
                <circle className="cmap-marker-dot" r="6" />
                {(isActive || k >= 4) && <text x="10" y="4" className="cmap-marker-label">{point.item.name}</text>}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="cmap-controls">
        <button type="button" onClick={() => zoomBy(1.8)} aria-label={labels.zoomIn} disabled={k >= MAX_ZOOM - .01}>+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.8)} aria-label={labels.zoomOut} disabled={k <= 1.01}>−</button>
        <button type="button" onClick={() => { setSelected(null); flyTo(W / 2, H / 2, 1); }} aria-label={labels.world} disabled={k <= 1.01} className="cmap-world"><IconGlobe size={16} /></button>
      </div>
      <p className={`cmap-hint${hint ? " is-visible" : ""}`} aria-hidden={!hint}>{hint === "touch" ? labels.touchHint : labels.ctrlHint}</p>
      {card}
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="cmap cmap-compact">
        {map}
        <div className="cmap-compact-bar">
          <p>{hasEntries ? fill(labels.count, { institutions: counts.institutions, countries: counts.countries }) : labels.emptyBody}</p>
          {fullMapHref && <Link className="btn btn-primary" href={fullMapHref}>{fullMapLabel}<IconArrowRight size={17} /></Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="cmap cmap-full">
      {map}
      <aside className="cmap-panel" aria-label={labels.listLabel}>
        <p className="cmap-panel-kicker">{labels.listLabel}</p>
        {hasEntries && <p className="cmap-panel-count">{fill(labels.count, { institutions: counts.institutions, countries: counts.countries })}</p>}
        <div className="cmap-panel-scroll">
          <article className="cmap-item cmap-item-hub">
            <p className="cmap-item-tag">{labels.hubPlace}</p>
            <h3>{labels.hubName}</h3>
          </article>
          {hasEntries && countriesInList.length > 1 && (
            <label className="cmap-filter">
              <span>{labels.filterLabel}</span>
              <select value={country} onChange={(event) => { setCountry(event.target.value); setSelected(null); }}>
                <option value="">{labels.allCountries}</option>
                {countriesInList.map((code) => <option key={code} value={code}>{countryName(code, locale)}</option>)}
              </select>
            </label>
          )}
          {hasEntries ? (
            <ul className="cmap-list">
              {visible.map((point) => (
                <li key={point.item.slug}>
                  <button
                    type="button"
                    className={`cmap-item${point.item.slug === selected ? " is-active" : ""}`}
                    onClick={() => choose(point.item.slug)}
                    onMouseEnter={() => setHovered(point.item.slug)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(point.item.slug)}
                    onBlur={() => setHovered(null)}
                  >
                    <span className="cmap-item-name" dir="auto">{point.item.name}</span>
                    <span className="cmap-item-place">{point.item.city}{comma}{countryName(point.item.country, locale)}</span>
                    {point.item.description && <span className="cmap-item-body" dir="auto">{point.item.description}</span>}
                    <span className="cmap-item-go">{labels.showOnMap}<IconArrowRight size={14} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cmap-empty">
              <h3>{labels.emptyTitle}</h3>
              <p>{labels.emptyBody}</p>
              <Link className="btn btn-primary" href={emptyHref}>{labels.emptyCta}<IconArrowRight size={17} /></Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
