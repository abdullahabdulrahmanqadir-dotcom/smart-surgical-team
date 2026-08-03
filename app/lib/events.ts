import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { EVENTS, type TeamEvent } from "./event-data";

/**
 * Server-side event reads.
 *
 * Import this only from server components and route handlers. Anything a
 * client component needs — types, the built-in records, the date formatters —
 * lives in `./event-data`, which carries no server imports. Reaching for this
 * module from a `"use client"` file drags `next/cache` into the browser bundle,
 * where `AsyncLocalStorage` does not exist.
 */

export * from "./event-data";

function canUseEventsDatabase() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }

export const EVENTS_CACHE_TAG = "published-events";

async function fetchPublicEvents(): Promise<TeamEvent[]> {
  if (!canUseEventsDatabase()) return EVENTS;
  try {
    const { data, error } = await getSupabaseServerClient().from("events").select("*").eq("status", "published").order("starts_at", { ascending: false });
    if (error || !data?.length) return EVENTS;
    const today = new Date().toISOString().slice(0, 10);
    return data.map((event) => {
      const startDate = event.starts_at ? String(event.starts_at).slice(0, 10) : today;
      const endDate = event.ends_at ? String(event.ends_at).slice(0, 10) : startDate;
      return { slug: event.slug, title: event.title, shortTitle: event.title, status: endDate < today ? "past" : "upcoming", type: event.event_type || "Event", topic: event.topic || "Clinical education", format: event.format === "hybrid" || event.format === "online" ? event.format : "in-person", startDate, endDate, location: event.location || "Location to be confirmed", summary: event.summary || "Event details will be published shortly.", image: event.image_url || undefined, officialUrl: event.official_url || event.registration_url || "#", registrationUrl: event.registration_url || undefined, programmeUrl: event.programme_url || undefined, facultyUrl: event.faculty_url || undefined, highlights: Array.isArray(event.highlights) ? event.highlights : [], selectedFaculty: Array.isArray(event.faculty) ? event.faculty : [] } as TeamEvent;
    });
  } catch { return EVENTS; }
}

/** Events change rarely, so a short shared cache keeps the homepage and the
    events pages off the database for almost every visitor. */
export const getPublicEvents = unstable_cache(fetchPublicEvents, ["public-events"], { revalidate: 60, tags: [EVENTS_CACHE_TAG] });

export async function getPublicEvent(slug: string) { return (await getPublicEvents()).find((event) => event.slug === slug); }
