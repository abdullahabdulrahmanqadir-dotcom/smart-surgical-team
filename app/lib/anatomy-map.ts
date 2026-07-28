/**
 * Camera geometry for the head-and-neck map on the Topics page.
 *
 * The map is a single illustration with a CSS camera flown over it, rather than
 * a set of independent pictures cross-faded into each other. That is what makes
 * the zoom read as one continuous move: every focused view is literally the same
 * pixels as the overview, pushed in.
 *
 * There is deliberately only one plate. Separately drawn detail views have to be
 * registered against the master pixel for pixel or they visibly jump when the
 * camera arrives, and that registration proved impossible to get reliably. The
 * master already shows every region, so the camera magnifies it and lets depth
 * of field do the rest.
 *
 * The master is the coordinate space; the numbers below are percentages of it.
 */

/** The master plate: the whole head and neck, and the camera's home position. */
export const ANATOMY_PLATE = {
  src: "/anatomy-topics-model-v2.webp",
  /** Intrinsic size, used to hold the stage at the plate's aspect ratio so that
   *  a focus point in plate percent lands on the same pixel on screen. */
  width: 1122,
  height: 1402,
};

export type AnatomyRegion = {
  /** Mirrors a TopicGroup slug — how the map and the case library stay in sync. */
  slug: string;
  /** Focus point, as a percentage of the master plate. */
  x: number;
  y: number;
  /** How far the camera pushes in. 1 is the overview. */
  zoom: number;
  /** Radius of the sharp area around the focus point, in plate percent. */
  radius: number;
  /**
   * How the plate tilts as the camera arrives, in degrees. Turning the plane so
   * the chosen region faces the viewer is what makes the move read as a change
   * of viewpoint rather than a zoom. Keep it small — past about 10 degrees a
   * flat plate stops looking like a body and starts looking like a poster.
   *
   * tiltY turns the plate about its vertical axis, tiltX about its horizontal.
   * Both pivot on the focus point, so the region stays centred.
   */
  tiltX: number;
  tiltY: number;
  /** Short name shown in the callout box. Kept brief so the box stays inside
   *  the stage at every viewport — the full topic name is on the card below. */
  label: string;
  /** Which way the leader line runs out to its label box. */
  side: "left" | "right";
};

/**
 * Focus points are measured on the structures themselves: the parotid gland,
 * the left jugular node chain, the thyroid isthmus, and the pigmented lesion on
 * the cheek.
 *
 * Two things to know before changing these.
 *
 * Zoom trades against sharpness. The camera magnifies the master rather than
 * swapping in a higher-resolution image, so the tighter the push-in the softer
 * the result. The small targets are pushed hardest because they have to be —
 * the lesion is only a few percent of the plate across.
 *
 * Sign conventions for tilt follow the engine, not intuition: a positive tiltY
 * brings the plate's left side toward the viewer, and a positive tiltX brings
 * its bottom forward. So a region left of centre wants a positive tiltY, and
 * one below centre wants a positive tiltX. That is what turns it to face you.
 */
export const ANATOMY_REGIONS: AnatomyRegion[] = [
  {
    slug: "thyroid-parathyroid",
    x: 55, y: 75.5, zoom: 3, radius: 12,
    tiltX: 5, tiltY: -3, label: "Thyroid", side: "right",
  },
  {
    slug: "salivary-glands",
    x: 41, y: 47, zoom: 3, radius: 12,
    tiltX: 0, tiltY: 6, label: "Salivary", side: "left",
  },
  {
    slug: "neck-lymphatic",
    x: 38, y: 68, zoom: 2.8, radius: 13,
    tiltX: 3, tiltY: 8, label: "Lymph", side: "left",
  },
  {
    slug: "skin-soft-tissue",
    x: 50.6, y: 44, zoom: 3.6, radius: 10,
    tiltX: -4, tiltY: -2, label: "Skin", side: "right",
  },
];

export function getAnatomyRegion(slug: string | null): AnatomyRegion | null {
  if (!slug) return null;
  return ANATOMY_REGIONS.find((region) => region.slug === slug) ?? null;
}
