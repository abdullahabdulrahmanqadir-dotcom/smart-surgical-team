"use client";

import { geoEqualEarth, geoGraticule10, geoInterpolate, geoPath } from "d3-geo";
import { interpolateZoom } from "d3-interpolate";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { FeatureCollection, Geometry, MultiLineString, Polygon } from "geojson";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { HUB, collaboratorCounts, type Collaborator } from "../lib/collaborators";
import { countryName } from "../lib/countries";
import { fill } from "../lib/dictionaries";
import FilterSelect from "./FilterSelect";
import { IconArrowRight, IconArrowUpRight, IconClose, IconCrosshair, IconGlobe, IconMinus, IconPin, IconPlus } from "./icons";
import "./collaboration-map.css";

/**
 * International Breast Surgery Collaboration Map.
 *
 * High-frame-rate cartography: Natural Earth country shapes (public/maps, built
 * by scripts/build-world-map.mjs) projected with Equal Earth (rotated -11° so
 * the antimeridian sits cleanly in the Bering Strait and Antarctica is cropped)
 * are compiled once into GPU-friendly Path2D objects and painted onto a Retina
 * <canvas> directly on every gesture frame — zero React re-renders during drag,
 * wheel zoom, kinetic glide, or camera flights.
 *
 * Internationally recognised country borders only (spec 2026-11-23).
 *
 * Interactive pins, clusters, and the Sulaymaniyah hub are real accessible
 * <button> elements positioned with GPU translate3d() in lockstep with the
 * canvas. Gestures never hijack page scroll: wheel zoom requires Ctrl/Cmd and
 * touch uses two fingers, with a brief hint otherwise.
 */

const WORLD_W = 1000;
const BASE_PROJ = geoEqualEarth().rotate([-11, 0]).fitWidth(WORLD_W, { type: "Sphere" });
const [, Y_NORTH] = BASE_PROJ([11, 79]) ?? [0, 0];
const [, Y_SOUTH] = BASE_PROJ([11, -56]) ?? [0, 480];
const PAD_Y = 10;
const WORLD_H = Math.ceil(Y_SOUTH - Y_NORTH + PAD_Y * 2);

const projection = geoEqualEarth()
  .rotate([-11, 0])
  .scale(BASE_PROJ.scale())
  .translate([WORLD_W / 2, BASE_PROJ.translate()[1] - Y_NORTH + PAD_Y]);

const geoPathGen = geoPath(projection);
const GRATICULE_D = geoPathGen(geoGraticule10()) ?? "";

const MAX_ZOOM_MULT = 12;
const DETAIL_SCALE = 1.65;
const LABEL_SCALE = 1.45;
const HUB_ID = "__hub__";

type LabelInfo = { a2: string; x: number; y: number; area: number };
type LoadedAtlas = {
  scale: "110m" | "50m";
  allLand: Path2D;
  byCountry: Map<string, Path2D>;
  borders: Path2D;
  coast: Path2D;
  graticule: Path2D;
  labels: LabelInfo[];
};
type Props = { a2?: string };
type Countries = GeometryCollection<Props>;

export type MapLabels = {
  mapLabel: string;
  zoomIn: string;
  zoomOut: string;
  focusHub: string;
  world: string;
  ctrlHint: string;
  touchHint: string;
  hubTag: string;
  hubName: string;
  hubPlace: string;
  hubCity: string;
  hubBody: string;
  countOne: string;
  countOneCountry: string;
  countMany: string;
  showingFiltered: string;
  clearFilter: string;
  allCountries: string;
  filterLabel: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  compactEmptyBody: string;
  consentNote: string;
  legendHub: string;
  legendInstitution: string;
  visit: string;
  close: string;
  showOnMap: string;
  clusterLabel: string;
  listLabel: string;
};

type Palette = {
  oceanInner: string;
  oceanOuter: string;
  coastHalo: string;
  land: string;
  border: string;
  coast: string;
  partner: string;
  partnerHover: string;
  partnerStrong: string;
  partnerBorder: string;
  partnerBorderStrong: string;
  hubCountry: string;
  hubCountryHover: string;
  hubBorder: string;
  rose: string;
  primary: string;
  label: string;
  labelStrong: string;
  labelHalo: string;
  font: string;
};

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type GeoCache = {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  k: number;
  padX: number;
  padY: number;
  cacheW: number;
  cacheH: number;
  styleKey: string;
};

const atlasCache: Partial<Record<"110m" | "50m", Promise<LoadedAtlas>>> = {};

function loadAtlas(scale: "110m" | "50m"): Promise<LoadedAtlas> {
  atlasCache[scale] ??= fetch(`/maps/world-${scale}.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`map ${scale}: ${response.status}`);
      return response.json() as Promise<Topology<{ countries: Countries }>>;
    })
    .then((topology: Topology<{ countries: Countries }>) => {
      const object = topology.objects.countries;
      const collection = feature(topology, object) as FeatureCollection<Geometry, Props>;

      const allLand = new Path2D();
      const byCountry = new Map<string, Path2D>();
      const labels: LabelInfo[] = [];

      for (const item of collection.features) {
        const a2 = item.properties?.a2 ?? "";
        // Omit Antarctica so inhabited continents fill the atlas frame.
        if (a2 === "AQ") continue;
        const d = geoPathGen(item);
        if (!d) continue;
        const path2d = new Path2D(d);
        allLand.addPath(path2d);
        if (a2) {
          const existing = byCountry.get(a2);
          if (existing) existing.addPath(path2d);
          else byCountry.set(a2, path2d);
        }

        let best: { x: number; y: number; area: number } | undefined;
        const polygons: Polygon[] = item.geometry.type === "MultiPolygon"
          ? item.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }))
          : item.geometry.type === "Polygon" ? [item.geometry] : [];
        for (const polygon of polygons) {
          const area = geoPathGen.area(polygon);
          if (!best || area > best.area) {
            const [x, y] = geoPathGen.centroid(polygon);
            best = { x, y, area };
          }
        }
        if (a2 && best && Number.isFinite(best.x) && Number.isFinite(best.y)) {
          labels.push({ a2, x: best.x, y: best.y, area: best.area });
        }
      }

      // Largest landmasses first so collision culling always favours major countries.
      labels.sort((a, b) => b.area - a.area);

      // Borders only between shapes with distinct ISO codes (Somaliland and
      // Northern Cyprus remain seamlessly folded into Somalia and Cyprus).
      const bordersD = geoPathGen(
        mesh(
          topology,
          object,
          (a, b) =>
            a !== b &&
            (a.properties as Props)?.a2 !== "AQ" &&
            (b.properties as Props)?.a2 !== "AQ" &&
            (a.properties as Props)?.a2 !== (b.properties as Props)?.a2,
        ) as MultiLineString,
      ) ?? "";
      const coastD = geoPathGen(
        mesh(topology, object, (a, b) => a === b && (a.properties as Props)?.a2 !== "AQ") as MultiLineString,
      ) ?? "";

      return {
        scale,
        allLand,
        byCountry,
        borders: new Path2D(bordersD),
        coast: new Path2D(coastD),
        graticule: new Path2D(GRATICULE_D),
        labels,
      };
    });
  return atlasCache[scale]!;
}

function project(lng: number, lat: number): [number, number] {
  return projection([lng, lat]) ?? [WORLD_W / 2, WORLD_H / 2];
}

type Placed = { item: Collaborator; x: number; y: number };
type Cluster = {
  key: string;
  x: number;
  y: number;
  members: Placed[];
  spider?: { point: Placed; x: number; y: number }[];
};

function clusterize(points: Placed[], t: ZoomTransform, radius: number, spiderfy: boolean): Cluster[] {
  const clusters: Cluster[] = [];
  for (const point of points) {
    const [sx, sy] = t.apply([point.x, point.y]);
    const near = clusters.find((cluster) => Math.hypot(cluster.x - sx, cluster.y - sy) < radius);
    if (near) {
      near.members.push(point);
      near.x = near.members.reduce((sum, member) => sum + t.applyX(member.x), 0) / near.members.length;
      near.y = near.members.reduce((sum, member) => sum + t.applyY(member.y), 0) / near.members.length;
    } else {
      clusters.push({ key: "", x: sx, y: sy, members: [point] });
    }
  }
  for (const cluster of clusters) {
    cluster.key = cluster.members.map((member) => member.item.slug).join("|");
    if (spiderfy && cluster.members.length > 1) {
      const n = cluster.members.length;
      const ringR = Math.min(34, 15 + n * 2.5);
      cluster.spider = cluster.members.map((point, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / n;
        return { point, x: cluster.x + Math.cos(angle) * ringR, y: cluster.y + Math.sin(angle) * ringR };
      });
    }
  }
  return clusters;
}

/** Fingerprint of how pins are currently grouped so React only re-renders pins
    when a cluster splits/merges, never during ordinary smooth panning. */
function clusterSignature(clusters: Cluster[]): string {
  return clusters.map((c) => `${c.spider ? "S" : c.members.length > 1 ? "C" : "P"}:${c.key}`).join(";");
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Precompute world-space points along the true spherical geodesic path once
    when an institution is selected (re-projecting to screen space is trivial). */
function computeGeodesicWorldPoints(targetLng: number, targetLat: number): [number, number][] {
  const interp = geoInterpolate([HUB.lng, HUB.lat], [targetLng, targetLat]);
  const steps = 40;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const [lng, lat] = interp(i / steps);
    pts.push(project(lng, lat));
  }
  return pts;
}

function clampTransform(transform: ZoomTransform, stageW: number, stageH: number, minScale: number): ZoomTransform {
  const k = Math.max(minScale, transform.k);
  const contentW = WORLD_W * k;
  const contentH = WORLD_H * k;
  const x = contentW <= stageW
    ? (stageW - contentW) / 2
    : Math.min(0, Math.max(stageW - contentW, transform.x));
  const y = contentH <= stageH
    ? (stageH - contentH) / 2
    : Math.min(0, Math.max(stageH - contentH, transform.y));
  return zoomIdentity.translate(x, y).scale(k);
}

function defaultTransformFor(stageW: number, stageH: number, hasPartners: boolean, hubX: number, hubY: number): ZoomTransform {
  const fitW = stageW / WORLD_W;
  const fitH = stageH / WORLD_H;
  const aspect = stageW / Math.max(stageH, 1);

  if (aspect < 1.25 && !hasPartners) {
    const k = Math.max(fitH * 1.18, fitW * 1.75);
    const [cx, cy] = project(30, 26);
    return clampTransform(zoomIdentity.translate(stageW / 2 - cx * k, stageH / 2 - cy * k).scale(k), stageW, stageH, fitW);
  }

  // On phone screens with collaborators, start at exact full-world fit so every
  // continent stays visible and the Reset button begins cleanly disabled.
  if (stageW <= 640 && hasPartners) {
    const k = Math.min(fitW, fitH);
    return clampTransform(zoomIdentity.translate((stageW - WORLD_W * k) / 2, (stageH - WORLD_H * k) / 2).scale(k), stageW, stageH, k);
  }

  const k = Math.min(fitW * 1.24, Math.max(fitW * 1.04, fitH * 0.96));
  const focusX = hasPartners ? WORLD_W * 0.5 : (WORLD_W * 0.5 + hubX * 0.16) / 1.16;
  const focusY = hasPartners ? WORLD_H * 0.49 : (WORLD_H * 0.48 + hubY * 0.1) / 1.1;
  return clampTransform(zoomIdentity.translate(stageW / 2 - focusX * k, stageH / 2 - focusY * k).scale(k), stageW, stageH, fitW);
}

function formatCount(counts: { institutions: number; countries: number }, labels: MapLabels) {
  if (counts.institutions === 1) return labels.countOne;
  if (counts.countries === 1) return fill(labels.countOneCountry, { institutions: counts.institutions });
  return fill(labels.countMany, { institutions: counts.institutions, countries: counts.countries });
}

function readPalette(element: HTMLElement): Palette {
  const s = getComputedStyle(element);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    oceanInner: v("--cmap-ocean-inner", "#e2ebef"),
    oceanOuter: v("--cmap-ocean-outer", "#d3e0e6"),
    coastHalo: v("--cmap-coast-halo", "rgba(30,48,58,0.08)"),
    land: v("--cmap-land", "#fcfbfb"),
    border: v("--cmap-border", "#cfd6dc"),
    coast: v("--cmap-coast", "#8696a1"),
    partner: v("--cmap-partner", "#f0acc1"),
    partnerHover: v("--cmap-partner-hover", "#e483a2"),
    partnerStrong: v("--cmap-partner-strong", "#d14d77"),
    partnerBorder: v("--cmap-partner-border", "#d47091"),
    partnerBorderStrong: v("--cmap-partner-border-strong", "#9b2347"),
    hubCountry: v("--cmap-hub-country", "#ebd099"),
    hubCountryHover: v("--cmap-hub-country-hover", "#dfba6f"),
    hubBorder: v("--cmap-hub-border", "#ad7e2f"),
    rose: v("--cmap-rose", "#b82e58"),
    primary: v("--primary", "#c43c63"),
    label: v("--cmap-label", "#576067"),
    labelStrong: v("--cmap-label-strong", "#1c2226"),
    labelHalo: v("--cmap-label-halo", "rgba(255,255,255,0.94)"),
    font: s.fontFamily || "Inter, system-ui, sans-serif",
  };
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
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinsRef = useRef<HTMLDivElement>(null);
  const hubBtnRef = useRef<HTMLButtonElement>(null);
  const pinElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);

  const atlas110Ref = useRef<LoadedAtlas | null>(null);
  const atlas50Ref = useRef<LoadedAtlas | null>(null);
  const paletteRef = useRef<Palette | null>(null);
  const oceanGradRef = useRef<{ key: string; grad: CanvasGradient } | null>(null);
  const geoCacheRef = useRef<GeoCache | null>(null);
  const hitCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const hoveredCountryRef = useRef<string | null>(null);

  const animFrameRef = useRef(0);
  const arcFrameRef = useRef(0);
  const arcStartRef = useRef(0);
  const hoverRafRef = useRef(0);
  const hoverPtRef = useRef<{ x: number; y: number } | null>(null);
  const syncingD3Ref = useRef(false);
  const lastDetailTickRef = useRef(0);
  const isGestureRef = useRef(false);
  const dragSamplesRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const initializedRef = useRef(false);
  const detailRequestedRef = useRef(false);
  const clusterSigRef = useRef("");
  const hintTimerRef = useRef(0);

  const [size, setSize] = useState<{ w: number; h: number }>({ w: WORLD_W, h: WORLD_H });
  const sizeRef = useRef(size);

  const tRef = useRef<ZoomTransform>(zoomIdentity);
  const [ready, setReady] = useState(false);
  const [detailTick, setDetailTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [hint, setHint] = useState<"" | "ctrl" | "touch">("");
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [zoomBounds, setZoomBounds] = useState({ canIn: true, canOut: false, atWorld: true });

  const isRtl = locale === "ar";
  const comma = isRtl ? "، " : ", ";

  const placed = useMemo<Placed[]>(
    () => collaborators.map((item) => {
      const [x, y] = project(item.lng, item.lat);
      return { item, x, y };
    }),
    [collaborators],
  );
  const [hubX, hubY] = useMemo(() => project(HUB.lng, HUB.lat), []);
  const partnerCountries = useMemo(() => new Set(collaborators.map((item) => item.country)), [collaborators]);
  const visible = useMemo(
    () => (country ? placed.filter((point) => point.item.country === country) : placed),
    [country, placed],
  );
  const counts = collaboratorCounts(collaborators);
  const hasEntries = collaborators.length > 0;
  const activeInstitution = useMemo(
    () => (selected && selected !== HUB_ID ? placed.find((point) => point.item.slug === selected) ?? null : null),
    [placed, selected],
  );
  const hoveredInstitutionCountry = useMemo(
    () => (hovered ? placed.find((point) => point.item.slug === hovered)?.item.country ?? null : null),
    [placed, hovered],
  );
  const hubSelected = selected === HUB_ID;

  const arcWorldPts = useMemo(
    () => (activeInstitution ? computeGeodesicWorldPoints(activeInstitution.item.lng, activeInstitution.item.lat) : null),
    [activeInstitution],
  );

  const minScale = Math.min(size.w / WORLD_W, size.h / WORLD_H);
  const fitWidthScale = size.w / WORLD_W;
  const maxScale = fitWidthScale * MAX_ZOOM_MULT;

  // Keep latest reactive values accessible to the zero-React-render draw loop.
  const stateRef = useRef({
    visible,
    partnerCountries,
    country,
    selected,
    hovered,
    hoveredInstitutionCountry,
    activeInstitution,
    hubSelected,
    arcWorldPts,
    minScale,
    maxScale,
    isRtl,
    locale,
    hubPlace: labels.hubPlace,
  });

  useIsomorphicLayoutEffect(() => {
    sizeRef.current = size;
    stateRef.current = {
      visible,
      partnerCountries,
      country,
      selected,
      hovered,
      hoveredInstitutionCountry,
      activeInstitution,
      hubSelected,
      arcWorldPts,
      minScale,
      maxScale,
      isRtl,
      locale,
      hubPlace: labels.hubPlace,
    };
  }, [size, visible, partnerCountries, country, selected, hovered, hoveredInstitutionCountry, activeInstitution, hubSelected, arcWorldPts, minScale, maxScale, isRtl, locale, labels.hubPlace]);

  const syncD3Transform = useCallback((transform: ZoomTransform) => {
    const node = canvasRef.current;
    const behavior = zoomRef.current;
    if (!node || !behavior) return;
    syncingD3Ref.current = true;
    behavior.transform(select(node), transform);
    syncingD3Ref.current = false;
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
      syncD3Transform(tRef.current);
    }
  }, [syncD3Transform]);

  /** Paint the entire map canvas AND position every interactive DOM pin in the
      same synchronous frame — zero React re-renders during drag, zoom, or fly.
      Static vector geography is baked into an overscanned offscreen canvas so
      every pan frame is a single ~0.1ms GPU texture blit. */
  const renderFrame = useCallback((transform?: ZoomTransform, forceCrisp = false) => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const t = transform ?? tRef.current;
    const { w, h } = sizeRef.current;
    const st = stateRef.current;
    if (w < 40 || h < 40) return;

    if (!paletteRef.current) paletteRef.current = readPalette(root);
    const pal = paletteRef.current;

    // Lazy-upgrade to 1:50m detailed shapes once zoomed past DETAIL_SCALE.
    if (!detailRequestedRef.current && t.k >= DETAIL_SCALE) {
      detailRequestedRef.current = true;
      loadAtlas("50m")
        .then((loaded) => {
          atlas50Ref.current = loaded;
          geoCacheRef.current = null;
          setDetailTick((n) => n + 1);
        })
        .catch((error) => console.error(error));
    }

    const atlas = t.k >= DETAIL_SCALE && atlas50Ref.current
      ? atlas50Ref.current
      : atlas110Ref.current;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      oceanGradRef.current = null;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Ocean background gradient (cached per size + theme).
    const gradKey = `${w}x${h}:${pal.oceanInner}:${pal.oceanOuter}`;
    if (!oceanGradRef.current || oceanGradRef.current.key !== gradKey) {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, Math.max(w, h) * 0.68);
      grad.addColorStop(0, pal.oceanInner);
      grad.addColorStop(1, pal.oceanOuter);
      oceanGradRef.current = { key: gradKey, grad };
    }
    ctx.fillStyle = oceanGradRef.current.grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Overscanned offscreen geography cache -> ~0.1ms GPU blit on pan & fly!
    // Selection and hover stay OUT of styleKey so clicking/hovering a country
    // NEVER invalidates or re-rasterizes the full world map.
    if (atlas) {
      const focusCountry = st.country || st.activeInstitution?.item.country || "";
      const styleKey = `${atlas.scale}|${pal.land}|${pal.border}|${pal.coast}|${pal.partner}|${pal.hubCountry}|${st.partnerCountries.size}`;
      const isMoving = isGestureRef.current || animFrameRef.current !== 0;
      let cache = geoCacheRef.current;
      let canBlit = false;

      if (cache && cache.styleKey === styleKey) {
        const ratio = t.k / cache.k;
        const dx = t.x - (cache.x + cache.padX) * ratio;
        const dy = t.y - (cache.y + cache.padY) * ratio;
        const dw = cache.cacheW * ratio;
        const dh = cache.cacheH * ratio;
        const covers = dx <= 1 && dy <= 1 && dx + dw >= w - 1 && dy + dh >= h - 1;
        const crispEnough = forceCrisp
          ? Math.abs(ratio - 1) < 0.002
          : isMoving
            ? ratio >= 0.35 && ratio <= 2.8
            : Math.abs(ratio - 1) < 0.002;
        if (covers && crispEnough) {
          ctx.drawImage(cache.canvas, dx, dy, dw, dh);
          canBlit = true;
        }
      }

      if (!canBlit) {
        const padX = Math.round(w * 0.5);
        const padY = Math.round(h * 0.5);
        const cacheW = w + padX * 2;
        const cacheH = h + padY * 2;
        const cacheDpr = Math.min(dpr, 3000 / Math.max(cacheW, cacheH));
        const off = cache?.canvas ?? document.createElement("canvas");
        const offW = Math.max(1, Math.round(cacheW * cacheDpr));
        const offH = Math.max(1, Math.round(cacheH * cacheDpr));
        if (off.width !== offW || off.height !== offH) {
          off.width = offW;
          off.height = offH;
        }
        const octx = off.getContext("2d");
        if (octx) {
          octx.setTransform(cacheDpr, 0, 0, cacheDpr, 0, 0);
          octx.clearRect(0, 0, cacheW, cacheH);
          octx.save();
          octx.translate(t.x + padX, t.y + padY);
          octx.scale(t.k, t.k);
          octx.lineJoin = "round";
          octx.lineCap = "round";

          // Graticule
          octx.strokeStyle = pal.coast;
          octx.globalAlpha = 0.2;
          octx.lineWidth = 0.55 / t.k;
          octx.stroke(atlas.graticule);
          octx.globalAlpha = 1;

          // Subtle coastal bathymetry halo beneath land polygons
          octx.strokeStyle = pal.coastHalo;
          octx.lineWidth = 2.4 / t.k;
          octx.stroke(atlas.coast);

          // All inhabited land in one Path2D draw
          octx.fillStyle = pal.land;
          octx.fill(atlas.allLand);

          // Coordinating hub country (Iraq) in dignified slate tone
          const hubCountryPath = atlas.byCountry.get(HUB.country);
          if (hubCountryPath) {
            octx.fillStyle = pal.hubCountry;
            octx.fill(hubCountryPath);
          }

          // Collaborating countries in distinct MEBS satin rose
          for (const code of st.partnerCountries) {
            if (code === HUB.country) continue;
            const countryPath = atlas.byCountry.get(code);
            if (!countryPath) continue;
            octx.fillStyle = pal.partner;
            octx.fill(countryPath);
          }

          // Internationally recognised country borders
          octx.strokeStyle = pal.border;
          octx.lineWidth = 0.78 / t.k;
          octx.stroke(atlas.borders);

          // Crisp coastline
          octx.strokeStyle = pal.coast;
          octx.lineWidth = 0.85 / t.k;
          octx.stroke(atlas.coast);

          // Distinct rim outlines for Iraq hub + partner countries so even small
          // participating countries stand out sharply at world zoom
          if (hubCountryPath) {
            octx.strokeStyle = pal.hubBorder;
            octx.lineWidth = 0.95 / t.k;
            octx.stroke(hubCountryPath);
          }
          for (const code of st.partnerCountries) {
            if (code === HUB.country) continue;
            const countryPath = atlas.byCountry.get(code);
            if (!countryPath) continue;
            octx.strokeStyle = pal.partnerBorder;
            octx.lineWidth = 1.05 / t.k;
            octx.stroke(countryPath);
          }
          octx.restore();

          cache = { canvas: off, x: t.x, y: t.y, k: t.k, padX, padY, cacheW, cacheH, styleKey };
          geoCacheRef.current = cache;
          ctx.drawImage(off, -padX, -padY, cacheW, cacheH);
        }
      }

      // Live lightweight active + hover country highlights (0.05ms, zero cache rebuild).
      const activeCode = st.hubSelected ? HUB.country : focusCountry;
      const liveHoverCountry = hoveredCountryRef.current ?? st.hoveredInstitutionCountry;
      if (activeCode || liveHoverCountry) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(t.k, t.k);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (activeCode) {
          const activePath = atlas.byCountry.get(activeCode);
          if (activePath) {
            const isHub = activeCode === HUB.country && !st.partnerCountries.has(HUB.country);
            ctx.fillStyle = isHub ? pal.hubCountryHover : pal.partnerStrong;
            ctx.fill(activePath);
            ctx.strokeStyle = isHub ? pal.hubBorder : pal.partnerBorderStrong;
            ctx.lineWidth = 1.5 / t.k;
            ctx.stroke(activePath);
          }
        }
        if (liveHoverCountry && liveHoverCountry !== activeCode) {
          const hoveredPath = atlas.byCountry.get(liveHoverCountry);
          if (hoveredPath) {
            const isPartner = st.partnerCountries.has(liveHoverCountry) && liveHoverCountry !== HUB.country;
            ctx.fillStyle = isPartner ? pal.partnerHover : pal.hubCountryHover;
            ctx.fill(hoveredPath);
            ctx.strokeStyle = isPartner ? pal.partnerBorderStrong : pal.hubBorder;
            ctx.lineWidth = 1.55 / t.k;
            ctx.stroke(hoveredPath);
          }
        }
        ctx.restore();
      }
    }

    // 3. Position hub & calculate current clusters / spiderfy positions.
    const [hx, hy] = t.apply([hubX, hubY]);
    if (hubBtnRef.current) {
      hubBtnRef.current.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
    }

    const spiderfy = t.k >= st.maxScale * 0.72;
    const clusterRadius = w <= 480 ? 18 : 26;
    const currentClusters = clusterize(st.visible, t, clusterRadius, spiderfy);
    const sig = clusterSignature(currentClusters);
    if (sig !== clusterSigRef.current) {
      clusterSigRef.current = sig;
      setClusters(currentClusters);
    }

    // Position every currently mounted marker / cluster button directly on GPU.
    for (const cluster of currentClusters) {
      if (cluster.members.length > 1 && !cluster.spider) {
        const el = pinElsRef.current.get(`C:${cluster.key}`);
        if (el) el.style.transform = `translate3d(${cluster.x}px, ${cluster.y}px, 0)`;
      } else {
        const items = cluster.spider ?? [{ point: cluster.members[0], x: cluster.x, y: cluster.y }];
        if (cluster.spider) {
          // Draw crisp spiderfy hairline spokes on canvas in exact sync with pins.
          ctx.save();
          ctx.strokeStyle = pal.primary;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          for (const item of cluster.spider) {
            ctx.moveTo(cluster.x, cluster.y);
            ctx.lineTo(item.x, item.y);
          }
          ctx.stroke();
          ctx.fillStyle = pal.primary;
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          ctx.arc(cluster.x, cluster.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        for (const item of items) {
          const el = pinElsRef.current.get(`P:${item.point.item.slug}`);
          if (el) el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
        }
      }
    }

    // Precompute screen geodesic arc so both label collision clearance and arc
    // stroking share exact coordinates without labels getting bisected by arcs.
    let fullArcPoints: [number, number][] | null = null;
    if (st.arcWorldPts && st.arcWorldPts.length > 1) {
      const pts = st.arcWorldPts.map(([wx, wy]) => t.apply([wx, wy]));
      const [sx0, sy0] = pts[0];
      const [sx1, sy1] = pts[pts.length - 1];
      const dx = sx1 - sx0;
      const dy = sy1 - sy0;
      const dist = Math.hypot(dx, dy);
      if (dist >= 2) {
        let nx = -dy / dist;
        let ny = dx / dist;
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const lift = Math.min(24, Math.max(8, dist * 0.11));
        fullArcPoints = pts.map(([px, py], i) => {
          const u = i / (pts.length - 1);
          const offset = Math.sin(Math.PI * u) * lift;
          return [px + nx * offset, py + ny * offset];
        });
      }
    }

    // 4. Collision-filtered country labels past regional zoom.
    if (atlas && t.k >= LABEL_SCALE) {
      type Box = { x1: number; y1: number; x2: number; y2: number };
      const toolbarBox: Box = w <= 640
        ? (st.isRtl ? { x1: w - 176, y1: 0, x2: w, y2: 52 } : { x1: 0, y1: 0, x2: 176, y2: 52 })
        : (st.isRtl ? { x1: w - 64, y1: 0, x2: w, y2: 184 } : { x1: 0, y1: 0, x2: 64, y2: 184 });
      const occupied: Box[] = [
        toolbarBox,
        st.isRtl ? { x1: w - 230, y1: h - 48, x2: w, y2: h } : { x1: 0, y1: h - 48, x2: 230, y2: h },
        { x1: hx - (st.isRtl ? 105 : 16), y1: hy - 16, x2: hx + (st.isRtl ? 16 : 105), y2: hy + 16 },
      ];
      if (st.selected && w > 640) {
        occupied.push(
          st.isRtl ? { x1: 0, y1: h - 210, x2: 356, y2: h } : { x1: w - 356, y1: h - 210, x2: w, y2: h },
        );
      }
      if (fullArcPoints) {
        for (let i = 0; i < fullArcPoints.length; i += 2) {
          const [ax, ay] = fullArcPoints[i];
          occupied.push({ x1: ax - 9, y1: ay - 9, x2: ax + 9, y2: ay + 9 });
        }
      }

      const fontSize = st.isRtl ? 12 : 10.5;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.strokeStyle = pal.labelHalo;
      ctx.lineWidth = 3;
      if ("direction" in ctx) ctx.direction = st.isRtl ? "rtl" : "ltr";

      for (const item of atlas.labels) {
        if (item.area * t.k * t.k <= 2200) continue;
        const [sx, sy] = t.apply([item.x, item.y]);
        if (sx < 34 || sx > w - 34 || sy < 20 || sy > h - 22) continue;
        const name = countryName(item.a2, st.locale);
        const halfW = Math.min(82, Math.max(22, name.length * (st.isRtl ? 3.9 : 3.4) + 8));
        const box: Box = { x1: sx - halfW, y1: sy - 9, x2: sx + halfW, y2: sy + 9 };
        if (occupied.some((other) => !(box.x2 < other.x1 || box.x1 > other.x2 || box.y2 < other.y1 || box.y1 > other.y2))) {
          continue;
        }
        occupied.push(box);
        const highlighted = item.a2 === HUB.country || st.partnerCountries.has(item.a2);
        ctx.font = `${highlighted ? 700 : 600} ${fontSize}px ${pal.font}`;
        ctx.fillStyle = highlighted ? pal.labelStrong : pal.label;
        ctx.strokeText(name, sx, sy);
        ctx.fillText(name, sx, sy);
      }
      ctx.restore();
    }

    // 5. Spherical geodesic arc from Sulaymaniyah to active collaborating centre.
    if (fullArcPoints && fullArcPoints.length > 1) {
      const arcRaw = arcStartRef.current > 0
        ? Math.min(1, Math.max(0, (performance.now() - arcStartRef.current) / 520))
        : 1;
      const arcProgress = 1 - Math.pow(1 - arcRaw, 3);
      const exact = (fullArcPoints.length - 1) * arcProgress;
      const maxIdx = Math.max(1, Math.floor(exact));
      const frac = exact - maxIdx;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i <= maxIdx; i++) {
        if (i === 0) ctx.moveTo(fullArcPoints[i][0], fullArcPoints[i][1]);
        else ctx.lineTo(fullArcPoints[i][0], fullArcPoints[i][1]);
      }
      if (frac > 0.01 && maxIdx < fullArcPoints.length - 1) {
        const [xPrev, yPrev] = fullArcPoints[maxIdx];
        const [xNext, yNext] = fullArcPoints[maxIdx + 1];
        ctx.lineTo(xPrev + (xNext - xPrev) * frac, yPrev + (yNext - yPrev) * frac);
      }
      ctx.strokeStyle = pal.labelHalo;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.strokeStyle = pal.rose;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 6. Hub label + concise active/hovered city pin label (always crisp & zero-drift).
    const isPhone = w <= 640;
    const compactMobileWorld = w <= 480 && t.k <= st.minScale * 1.15;
    const hubFontSize = compactMobileWorld
      ? (st.isRtl ? 11 : 10)
      : isPhone
        ? (st.isRtl ? 11.5 : 10.5)
        : (st.isRtl ? 12.5 : 11.5);
    ctx.save();
    ctx.font = `700 ${hubFontSize}px ${pal.font}`;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = pal.labelHalo;
    ctx.lineWidth = 3.5;
    ctx.fillStyle = pal.labelStrong;
    if ("direction" in ctx) ctx.direction = st.isRtl ? "rtl" : "ltr";

    if (compactMobileWorld) {
      // On narrow mobile world views, anchor Sulaymaniyah in the open Eurasian
      // space above-east of Iraq so it clears both Europe clusters and Tokyo.
      ctx.textAlign = st.isRtl ? "right" : "left";
      const offsetX = st.isRtl ? -4 : 4;
      ctx.strokeText(st.hubPlace, hx + offsetX, hy - 14);
      ctx.fillText(st.hubPlace, hx + offsetX, hy - 14);
    } else {
      const edgePad = isPhone ? 86 : 110;
      const hubNearRight = hx > w - edgePad;
      const hubNearLeft = hx < edgePad;
      const hubPlaceLeft = st.isRtl ? !hubNearLeft : hubNearRight;
      ctx.textAlign = hubPlaceLeft ? "right" : "left";
      const hubLabelX = hx + (hubPlaceLeft ? -11 : 11);
      ctx.strokeText(st.hubPlace, hubLabelX, hy);
      ctx.fillText(st.hubPlace, hubLabelX, hy);
    }

    for (const cluster of currentClusters) {
      if (cluster.members.length > 1 && !cluster.spider) continue;
      const items = cluster.spider ?? [{ point: cluster.members[0], x: cluster.x, y: cluster.y }];
      for (const { point, x, y } of items) {
        if (point.item.slug !== st.selected && point.item.slug !== st.hovered) continue;
        const nearRight = x > w - 135;
        const nearLeft = x < 135;
        const placeLeft = st.isRtl ? !nearLeft : nearRight;
        ctx.textAlign = placeLeft ? "right" : "left";
        const lx = x + (placeLeft ? -11 : 11);
        ctx.strokeText(point.item.city, lx, y);
        ctx.fillText(point.item.city, lx, y);
      }
    }
    ctx.restore();
  }, [hubX, hubY]);

  const syncZoomControls = useCallback(() => {
    const t = tRef.current;
    const st = stateRef.current;
    const next = {
      canIn: t.k < st.maxScale * 0.99,
      canOut: t.k > st.minScale * 1.01,
      atWorld: t.k <= st.minScale * 1.02 && !st.selected,
    };
    setZoomBounds((prev) =>
      prev.canIn === next.canIn && prev.canOut === next.canOut && prev.atWorld === next.atWorld ? prev : next,
    );
  }, []);

  // Measure canvas stage container cleanly.
  useEffect(() => {
    const node = canvasWrapRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w > 40 && h > 40) {
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Re-read palette on light/dark theme toggle or webfont load.
  useEffect(() => {
    const refreshPalette = () => {
      if (rootRef.current) {
        paletteRef.current = readPalette(rootRef.current);
        oceanGradRef.current = null;
        geoCacheRef.current = null;
        renderFrame(undefined, true);
      }
    };
    const observer = new MutationObserver(refreshPalette);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(refreshPalette).catch(() => {});
    return () => observer.disconnect();
  }, [renderFrame]);

  // Load 1:110m world atlas immediately on full page or near viewport on embed.
  useEffect(() => {
    let cancelled = false;
    const startLoad = () => {
      loadAtlas("110m")
        .then((loaded) => {
          if (cancelled) return;
          atlas110Ref.current = loaded;
          setReady(true);
          renderFrame();
        })
        .catch((error) => console.error(error));
    };
    if (variant === "full") {
      startLoad();
      return () => { cancelled = true; };
    }
    const node = canvasWrapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      startLoad();
    }, { rootMargin: "500px" });
    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, [variant, renderFrame]);

  // Repaint before browser paint whenever selection, hover, filter, or cluster
  // grouping changes so newly mounted pins never flash at (0, 0). Only force a
  // full crisp cache bake on the single tick when 1:50m detail actually loads.
  useIsomorphicLayoutEffect(() => {
    const detailUpgraded = detailTick !== lastDetailTickRef.current;
    lastDetailTickRef.current = detailTick;
    renderFrame(undefined, detailUpgraded);
    syncZoomControls();
  }, [selected, hovered, country, clusters, size, detailTick, renderFrame, syncZoomControls]);

  // Unified geodesic arc draw-in: renderFrame derives arc progress directly from
  // arcStartRef, so a flight animation drives it with zero competing RAF loops.
  // Only schedule a continuation RAF when no camera flight is already ticking.
  useEffect(() => {
    if (arcFrameRef.current) {
      cancelAnimationFrame(arcFrameRef.current);
      arcFrameRef.current = 0;
    }
    if (!activeInstitution || reducedMotion()) {
      arcStartRef.current = 0;
      renderFrame();
      return;
    }
    if (arcStartRef.current === 0) arcStartRef.current = performance.now();
    const step = () => {
      const done = performance.now() - arcStartRef.current >= 520;
      if (animFrameRef.current === 0) renderFrame();
      if (!done) {
        arcFrameRef.current = requestAnimationFrame(step);
      } else {
        arcStartRef.current = 0;
        arcFrameRef.current = 0;
        if (animFrameRef.current === 0) renderFrame();
      }
    };
    arcFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (arcFrameRef.current) {
        cancelAnimationFrame(arcFrameRef.current);
        arcFrameRef.current = 0;
      }
    };
  }, [activeInstitution, renderFrame]);

  const flash = useCallback((kind: "ctrl" | "touch") => {
    setHint(kind);
    window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setHint(""), 1500);
  }, []);

  // Configure d3-zoom directly on the <canvas> with kinetic drag inertia.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;

    const startInertia = (vx: number, vy: number) => {
      if (reducedMotion()) return;
      cancelAnimation();
      let velX = vx;
      let velY = vy;
      let last = performance.now();

      const step = (now: number) => {
        const dt = Math.min(32, Math.max(4, now - last));
        last = now;
        const decay = Math.pow(0.91, dt / 16.667);
        velX *= decay;
        velY *= decay;
        if (Math.hypot(velX, velY) < 0.025) {
          animFrameRef.current = 0;
          syncD3Transform(tRef.current);
          renderFrame(tRef.current, true);
          syncZoomControls();
          return;
        }
        const cur = tRef.current;
        const { w, h } = sizeRef.current;
        const next = clampTransform(
          zoomIdentity.translate(cur.x + velX * dt, cur.y + velY * dt).scale(cur.k),
          w,
          h,
          stateRef.current.minScale,
        );
        if (Math.abs(next.x - cur.x) < 0.05 && Math.abs(next.y - cur.y) < 0.05) {
          animFrameRef.current = 0;
          syncD3Transform(tRef.current);
          renderFrame(tRef.current, true);
          syncZoomControls();
          return;
        }
        tRef.current = next;
        renderFrame(next);
        animFrameRef.current = requestAnimationFrame(step);
      };
      animFrameRef.current = requestAnimationFrame(step);
    };

    const behavior = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([minScale, maxScale])
      .translateExtent([[0, 0], [WORLD_W, WORLD_H]])
      .extent([[0, 0], [size.w, size.h]])
      .constrain((transform, extent) => {
        const w = extent[1][0] - extent[0][0];
        const h = extent[1][1] - extent[0][1];
        return clampTransform(transform, w, h, stateRef.current.minScale);
      })
      .wheelDelta((event: WheelEvent) => {
        // Smoother proportional zoom for both trackpad pinch and mouse wheel
        const modeScale = event.deltaMode === 1 ? 0.045 : event.deltaMode ? 1 : 0.0028;
        return -event.deltaY * modeScale * (event.ctrlKey ? 2.4 : 1);
      })
      .filter((event: Event) => {
        if (event.type === "wheel") return true;
        if (event.type.startsWith("touch")) return (event as TouchEvent).touches.length > 1;
        return !(event as MouseEvent).button;
      })
      .on("start", (event: { sourceEvent?: Event | null }) => {
        if (syncingD3Ref.current) return;
        if (event.sourceEvent) {
          cancelAnimation();
          isGestureRef.current = true;
          dragSamplesRef.current = [];
          if (hoveredCountryRef.current !== null) {
            hoveredCountryRef.current = null;
            node.classList.remove("is-clickable");
          }
        }
      })
      .on("zoom", (event: { transform: ZoomTransform; sourceEvent?: Event | null }) => {
        if (syncingD3Ref.current) return;
        const next = event.transform;
        tRef.current = next;
        // Track recent drag samples for smooth kinetic release glide.
        if (event.sourceEvent && event.sourceEvent.type !== "wheel") {
          const now = performance.now();
          const samples = dragSamplesRef.current;
          samples.push({ x: next.x, y: next.y, time: now });
          while (samples.length > 6 || (samples.length > 2 && now - samples[0].time > 90)) {
            samples.shift();
          }
        }
        // Synchronous 0-frame-lag paint!
        renderFrame(next);
      })
      .on("end", (event: { sourceEvent?: Event | null }) => {
        if (syncingD3Ref.current || !event.sourceEvent) return;
        isGestureRef.current = false;
        const samples = dragSamplesRef.current;
        dragSamplesRef.current = [];
        const now = performance.now();
        if (samples.length >= 2 && event.sourceEvent.type !== "wheel") {
          const first = samples[0];
          const last = samples[samples.length - 1];
          const dt = last.time - first.time;
          if (dt > 8 && now - last.time < 55) {
            const vx = Math.max(-2.2, Math.min(2.2, (last.x - first.x) / dt));
            const vy = Math.max(-2.2, Math.min(2.2, (last.y - first.y) / dt));
            if (Math.hypot(vx, vy) > 0.14) {
              startInertia(vx, vy);
              return;
            }
          }
        }
        renderFrame(tRef.current, true);
        syncZoomControls();
      });

    const selection = select(node).call(behavior);
    node.style.touchAction = "pan-y";
    zoomRef.current = behavior;

    const nextTransform = initializedRef.current
      ? clampTransform(tRef.current, size.w, size.h, minScale)
      : defaultTransformFor(size.w, size.h, hasEntries, hubX, hubY);
    if (size.w !== WORLD_W || size.h !== WORLD_H) initializedRef.current = true;
    tRef.current = nextTransform;
    syncD3Transform(nextTransform);
    renderFrame(nextTransform);
    syncZoomControls();

    // Only hint two-finger panning when a single-finger gesture drags horizontally
    // across the map — never on normal taps on countries/pins or vertical scrolling.
    let touchOrigin: { x: number; y: number } | null = null;
    const pinsEl = pinsRef.current;
    const onPinsWheel = (event: WheelEvent) => {
      event.preventDefault();
      node.dispatchEvent(new WheelEvent("wheel", {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        bubbles: false,
        cancelable: true,
      }));
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchOrigin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      } else {
        touchOrigin = null;
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touchOrigin || event.touches.length !== 1) return;
      const dx = Math.abs(event.touches[0].clientX - touchOrigin.x);
      const dy = Math.abs(event.touches[0].clientY - touchOrigin.y);
      if (dx > 18 && dx > dy * 1.15) {
        touchOrigin = null;
        flash("touch");
      } else if (dy > 18) {
        touchOrigin = null;
      }
    };
    const onTouchEnd = () => { touchOrigin = null; };
    pinsEl?.addEventListener("wheel", onPinsWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      selection.on(".zoom", null);
      pinsEl?.removeEventListener("wheel", onPinsWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimation();
      if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
      window.clearTimeout(hintTimerRef.current);
    };
  }, [size.w, size.h, minScale, maxScale, hasEntries, hubX, hubY, flash, cancelAnimation, syncD3Transform, renderFrame, syncZoomControls]);

  // Escape closes any open detail card.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  /** Smooth camera flight with zero React renders and zero d3 event overhead
      per frame — blits directly on the GPU and paints one crisp Retina pass on landing. */
  const flyToTransform = useCallback((target: ZoomTransform, maxDuration = 540) => {
    const node = canvasRef.current;
    if (!node) return;
    cancelAnimation();
    const { w, h } = sizeRef.current;
    const clamped = clampTransform(target, w, h, stateRef.current.minScale);
    if (reducedMotion()) {
      tRef.current = clamped;
      syncD3Transform(clamped);
      renderFrame(clamped, true);
      syncZoomControls();
      return;
    }
    const from = tRef.current;
    const startView: [number, number, number] = [
      (w / 2 - from.x) / from.k,
      (h / 2 - from.y) / from.k,
      w / from.k,
    ];
    const endView: [number, number, number] = [
      (w / 2 - clamped.x) / clamped.k,
      (h / 2 - clamped.y) / clamped.k,
      w / clamped.k,
    ];
    const interp = interpolateZoom(startView, endView);
    const duration = Math.min(maxDuration, Math.max(200, interp.duration * 0.46));
    const start = performance.now();

    const step = (now: number) => {
      const u = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - u, 3);
      const [cx, cy, viewW] = interp(eased);
      const scale = w / viewW;
      const next = clampTransform(
        zoomIdentity.translate(w / 2 - cx * scale, h / 2 - cy * scale).scale(scale),
        w,
        h,
        stateRef.current.minScale,
      );
      tRef.current = next;
      renderFrame(next);
      if (u < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        animFrameRef.current = 0;
        syncD3Transform(next);
        renderFrame(next, true);
        syncZoomControls();
      }
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, [cancelAnimation, syncD3Transform, renderFrame, syncZoomControls]);

  const flyTo = useCallback((wx: number, wy: number, k: number, maxDuration = 540) => {
    const { w, h } = sizeRef.current;
    const clampedK = Math.max(stateRef.current.minScale, Math.min(stateRef.current.maxScale, k));
    flyToTransform(zoomIdentity.translate(w / 2 - wx * clampedK, h / 2 - wy * clampedK).scale(clampedK), maxDuration);
  }, [flyToTransform]);

  const zoomBy = useCallback((factor: number) => {
    const from = tRef.current;
    const { w, h } = sizeRef.current;
    const cx = (w / 2 - from.x) / from.k;
    const cy = (h / 2 - from.y) / from.k;
    flyTo(cx, cy, from.k * factor, 220);
  }, [flyTo]);

  const resetWorld = useCallback(() => {
    setSelected(null);
    const { w, h } = sizeRef.current;
    const worldScale = stateRef.current.minScale;
    flyToTransform(
      zoomIdentity.translate((w - WORLD_W * worldScale) / 2, (h - WORLD_H * worldScale) / 2).scale(worldScale),
      460,
    );
  }, [flyToTransform]);

  const scrollMapIntoViewOnMobile = useCallback(() => {
    if (typeof window === "undefined" || window.innerWidth > 1000) return;
    stageRef.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "nearest" });
  }, []);

  const focusHub = useCallback((openCard = true, fromList = false) => {
    setSelected((current) => (openCard ? HUB_ID : current === HUB_ID ? null : current));
    const { w } = sizeRef.current;
    flyTo(hubX, hubY + (w > 640 ? 22 : 0), Math.max(fitWidthScale * 3.4, minScale * 3.4), 500);
    if (fromList) scrollMapIntoViewOnMobile();
  }, [hubX, hubY, fitWidthScale, minScale, flyTo, scrollMapIntoViewOnMobile]);

  const choose = useCallback((slug: string | null, fromList = false) => {
    if (slug && slug !== HUB_ID && !reducedMotion()) {
      arcStartRef.current = performance.now();
    } else {
      arcStartRef.current = 0;
    }
    setSelected(slug);
    if (!slug) return;
    if (slug === HUB_ID) {
      focusHub(true, fromList);
      return;
    }
    const point = placed.find((entry) => entry.item.slug === slug);
    if (!point) return;
    if (fromList) scrollMapIntoViewOnMobile();
    const { w, h } = sizeRef.current;
    const dx = Math.abs(point.x - hubX);
    const dy = Math.abs(point.y - hubY);
    const isPhone = w <= 640;
    const fitK = Math.min((w * (isPhone ? 0.5 : 0.58)) / Math.max(dx, 20), (h * (isPhone ? 0.42 : 0.5)) / Math.max(dy, 20));
    const k = Math.max(stateRef.current.minScale, Math.min(fitWidthScale * 4.8, fitK));
    // Desktop shifts arc slightly up to clear the floating bottom card; phones
    // nudge the arc slightly down to clear the horizontal top zoom toolbar.
    const yOffset = isPhone ? -14 / k : (h * 0.1) / k;
    flyTo((point.x + hubX) / 2, (point.y + hubY) / 2 + yOffset, k, 520);
  }, [placed, focusHub, scrollMapIntoViewOnMobile, hubX, hubY, fitWidthScale, flyTo]);

  const expandCluster = useCallback((cluster: Cluster) => {
    const xs = cluster.members.map((member) => member.x);
    const ys = cluster.members.map((member) => member.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spreadX = maxX - minX;
    const spreadY = maxY - minY;
    const { w, h } = sizeRef.current;
    const sameCity = Math.max(spreadX, spreadY) < 4;
    const fitK = sameCity
      ? stateRef.current.maxScale * 0.86
      : Math.min((w * 0.52) / Math.max(spreadX, 8), (h * 0.52) / Math.max(spreadY, 8));
    flyTo((minX + maxX) / 2, (minY + maxY) / 2, Math.min(stateRef.current.maxScale, Math.max(tRef.current.k * 2.1, fitK)), 480);
  }, [flyTo]);

  const setPinRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) pinElsRef.current.set(key, el);
    else pinElsRef.current.delete(key);
  }, []);

  /** Native Path2D hit-test against clickable partner countries and the Iraq hub
      in world coordinates (~0.05ms, zero React re-renders). */
  const hitTestCountry = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const t = tRef.current;
    const atlas = t.k >= DETAIL_SCALE && atlas50Ref.current ? atlas50Ref.current : atlas110Ref.current;
    if (!atlas) return null;
    let hitCtx = hitCtxRef.current;
    if (!hitCtx) {
      const scratch = document.createElement("canvas");
      scratch.width = 1;
      scratch.height = 1;
      hitCtx = scratch.getContext("2d");
      if (!hitCtx) return null;
      hitCtxRef.current = hitCtx;
    }
    const rect = canvas.getBoundingClientRect();
    const [wx, wy] = t.invert([clientX - rect.left, clientY - rect.top]);
    hitCtx.setTransform(1, 0, 0, 1, 0, 0);

    for (const code of stateRef.current.partnerCountries) {
      const path = atlas.byCountry.get(code);
      if (path && hitCtx.isPointInPath(path, wx, wy)) return code;
    }
    const hubPath = atlas.byCountry.get(HUB.country);
    if (hubPath && hitCtx.isPointInPath(hubPath, wx, wy)) return HUB.country;
    return null;
  }, []);

  const countriesInList = useMemo(
    () => [...partnerCountries].sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale)),
    [partnerCountries, locale],
  );
  const countryFilterOptions = useMemo(
    () => [
      { value: "", label: labels.allCountries },
      ...countriesInList.map((code) => ({ value: code, label: countryName(code, locale) })),
    ],
    [countriesInList, labels.allCountries, locale],
  );

  const card = activeInstitution ? (
    <div className="cmap-card" role="dialog" aria-label={activeInstitution.item.name}>
      <button type="button" className="cmap-card-close" onClick={() => setSelected(null)} aria-label={labels.close}>
        <IconClose size={15} />
      </button>
      <p className="cmap-card-place">
        <IconPin size={14} />
        {activeInstitution.item.city}{comma}{countryName(activeInstitution.item.country, locale)}
      </p>
      <h3 dir="auto">{activeInstitution.item.name}</h3>
      {activeInstitution.item.description && <p className="cmap-card-body" dir="auto">{activeInstitution.item.description}</p>}
      {activeInstitution.item.websiteUrl && (
        <a className="text-link cmap-card-link" href={activeInstitution.item.websiteUrl} target="_blank" rel="noopener">
          {labels.visit}<IconArrowUpRight size={15} />
        </a>
      )}
    </div>
  ) : hubSelected ? (
    <div className="cmap-card cmap-card-hub" role="dialog" aria-label={labels.hubName}>
      <button type="button" className="cmap-card-close" onClick={() => setSelected(null)} aria-label={labels.close}>
        <IconClose size={15} />
      </button>
      <p className="cmap-card-place">{labels.hubTag}</p>
      <h3>{labels.hubName}</h3>
      <p className="cmap-card-sub">{labels.hubCity}</p>
      <p className="cmap-card-body">{labels.hubBody}</p>
    </div>
  ) : null;

  const map = (
    <div className="cmap-stage" ref={stageRef}>
      <div className="cmap-canvas" ref={canvasWrapRef}>
        <canvas
          ref={canvasRef}
          className={`cmap-gl${ready ? " is-ready" : ""}`}
          role="img"
          aria-label={labels.mapLabel}
          onPointerDown={(event) => { pointerDownRef.current = { x: event.clientX, y: event.clientY }; }}
          onPointerMove={(event) => {
            if (isGestureRef.current || animFrameRef.current !== 0 || event.pointerType === "touch") return;
            hoverPtRef.current = { x: event.clientX, y: event.clientY };
            if (hoverRafRef.current) return;
            hoverRafRef.current = requestAnimationFrame(() => {
              hoverRafRef.current = 0;
              if (isGestureRef.current || animFrameRef.current !== 0 || !hoverPtRef.current) return;
              const hit = hitTestCountry(hoverPtRef.current.x, hoverPtRef.current.y);
              if (hit !== hoveredCountryRef.current) {
                hoveredCountryRef.current = hit;
                canvasRef.current?.classList.toggle("is-clickable", Boolean(hit));
                renderFrame();
              }
            });
          }}
          onPointerLeave={() => {
            hoverPtRef.current = null;
            if (hoverRafRef.current) {
              cancelAnimationFrame(hoverRafRef.current);
              hoverRafRef.current = 0;
            }
            if (hoveredCountryRef.current !== null) {
              hoveredCountryRef.current = null;
              canvasRef.current?.classList.remove("is-clickable");
              renderFrame();
            }
          }}
          onClick={(event) => {
            const down = pointerDownRef.current;
            pointerDownRef.current = null;
            if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
            const hit = hitTestCountry(event.clientX, event.clientY);
            if (hit) {
              const matches = placed.filter((entry) => entry.item.country === hit);
              if (matches.length > 0) {
                if (country && country !== hit) setCountry("");
                const currentIdx = matches.findIndex((entry) => entry.item.slug === selected);
                const next = matches[(currentIdx + 1) % matches.length];
                choose(next.item.slug);
                return;
              }
              if (hit === HUB.country) {
                focusHub(true);
                return;
              }
            }
            if (selected) setSelected(null);
          }}
        />

        {/* Real accessible <button> markers positioned directly on the GPU in
            lockstep with the Retina canvas (zero React renders during drag). */}
        <div ref={pinsRef} className={`cmap-pins${ready ? " is-ready" : ""}`}>
          <button
            ref={hubBtnRef}
            type="button"
            className={`cmap-pin cmap-pin-hub${hubSelected ? " is-active" : ""}`}
            aria-label={`${labels.hubName}${comma}${labels.hubPlace}`}
            aria-pressed={hubSelected}
            onClick={() => (hubSelected ? setSelected(null) : focusHub(true))}
          >
            <span className="cmap-pin-pulse" aria-hidden="true" />
            <span className="cmap-pin-hub-dot" aria-hidden="true" />
          </button>

          {clusters.map((cluster) => {
            if (cluster.members.length > 1 && !cluster.spider) {
              return (
                <button
                  key={`C:${cluster.key}`}
                  ref={(el) => setPinRef(`C:${cluster.key}`, el)}
                  type="button"
                  className="cmap-pin cmap-pin-cluster"
                  aria-label={fill(labels.clusterLabel, { count: cluster.members.length })}
                  onClick={() => expandCluster(cluster)}
                >
                  <span className="cmap-pin-cluster-dot">{cluster.members.length}</span>
                </button>
              );
            }
            const items = cluster.spider ?? [{ point: cluster.members[0], x: cluster.x, y: cluster.y }];
            return items.map(({ point }) => {
              const isActive = point.item.slug === selected;
              const isHovered = hovered === point.item.slug;
              return (
                <button
                  key={`P:${point.item.slug}`}
                  ref={(el) => setPinRef(`P:${point.item.slug}`, el)}
                  type="button"
                  className={`cmap-pin cmap-pin-marker${isActive ? " is-active" : ""}${isHovered ? " is-hovered" : ""}`}
                  aria-label={[point.item.name, point.item.city, countryName(point.item.country, locale)].join(comma)}
                  aria-pressed={isActive}
                  onClick={() => choose(isActive ? null : point.item.slug)}
                  onMouseEnter={() => setHovered(point.item.slug)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="cmap-pin-marker-dot" aria-hidden="true" />
                </button>
              );
            });
          })}
        </div>

        <div className="cmap-controls" role="toolbar" aria-label={labels.mapLabel}>
          <button type="button" onClick={() => zoomBy(1.75)} aria-label={labels.zoomIn} title={labels.zoomIn} disabled={!zoomBounds.canIn}>
            <IconPlus size={16} />
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.75)} aria-label={labels.zoomOut} title={labels.zoomOut} disabled={!zoomBounds.canOut}>
            <IconMinus size={16} />
          </button>
          <button type="button" onClick={() => focusHub(true)} aria-label={labels.focusHub} title={labels.focusHub}>
            <IconCrosshair size={16} />
          </button>
          <button type="button" onClick={resetWorld} aria-label={labels.world} title={labels.world} disabled={zoomBounds.atWorld}>
            <IconGlobe size={16} />
          </button>
        </div>

        <div className="cmap-legend" aria-hidden="true">
          <span className="cmap-legend-item">
            <i className="cmap-legend-dot is-hub" />
            {labels.legendHub}
          </span>
          {hasEntries && (
            <span className="cmap-legend-item">
              <i className="cmap-legend-dot is-institution" />
              {labels.legendInstitution}
            </span>
          )}
        </div>

        <p className={`cmap-hint${hint ? " is-visible" : ""}`} aria-hidden={!hint}>
          {hint === "touch" ? labels.touchHint : labels.ctrlHint}
        </p>
      </div>
      {card}
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="cmap cmap-compact" ref={rootRef}>
        {map}
        <div className="cmap-compact-bar">
          <p>{hasEntries ? formatCount(counts, labels) : labels.compactEmptyBody}</p>
          <div className="cmap-compact-actions">
            {!hasEntries && (
              <Link className="text-link cmap-compact-secondary" href={emptyHref}>
                {labels.emptyCta}<IconArrowRight size={15} />
              </Link>
            )}
            {fullMapHref && (
              <Link className="btn btn-primary" href={fullMapHref}>
                {fullMapLabel}<IconArrowRight size={17} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cmap cmap-full" ref={rootRef}>
      {map}
      <aside className="cmap-panel" aria-label={labels.listLabel}>
        <header className="cmap-panel-head">
          <p className="cmap-panel-kicker">{labels.listLabel}</p>
          {hasEntries && <p className="cmap-panel-count">{formatCount(counts, labels)}</p>}
        </header>

        {hasEntries && countriesInList.length > 1 && (
          <div className="cmap-filter">
            <FilterSelect
              label={labels.filterLabel}
              value={country}
              options={countryFilterOptions}
              onChange={(next) => { setCountry(next); setSelected(null); }}
            />
            {country && (
              <div className="cmap-filter-meta">
                <span>{fill(labels.showingFiltered, { count: visible.length, country: countryName(country, locale) })}</span>
                <button type="button" className="cmap-filter-clear" onClick={() => { setCountry(""); setSelected(null); }}>
                  {labels.clearFilter}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="cmap-panel-scroll">
          <button
            type="button"
            className={`cmap-hub-row${hubSelected ? " is-active" : ""}`}
            onClick={() => focusHub(true, true)}
          >
            <span className="cmap-hub-row-tag">{labels.hubTag}</span>
            <span className="cmap-hub-row-name">{labels.hubName}</span>
            <span className="cmap-hub-row-place">{labels.hubCity}</span>
          </button>

          {hasEntries ? (
            <ul className="cmap-list">
              {visible.map((point) => (
                <li key={point.item.slug}>
                  <button
                    type="button"
                    className={`cmap-item${point.item.slug === selected ? " is-active" : ""}${point.item.slug === hovered ? " is-hovered" : ""}`}
                    onClick={() => choose(point.item.slug, true)}
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
              <h2>{labels.emptyTitle}</h2>
              <p>{labels.emptyBody}</p>
              <Link className="btn btn-primary cmap-empty-btn" href={emptyHref}>
                {labels.emptyCta}<IconArrowRight size={17} />
              </Link>
            </div>
          )}
        </div>

        <footer className="cmap-panel-foot">
          <p>{labels.consentNote}</p>
        </footer>
      </aside>
    </div>
  );
}
