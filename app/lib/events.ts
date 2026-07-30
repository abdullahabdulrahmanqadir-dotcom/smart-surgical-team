export type EventStatus = "upcoming" | "past";
export type EventFormat = "in-person" | "hybrid" | "online";

export type TeamEvent = {
  slug: string;
  title: string;
  shortTitle: string;
  status: EventStatus;
  type: "Summit" | "Webinar" | "Workshop" | "Conference";
  topic: string;
  format: EventFormat;
  startDate: string;
  endDate: string;
  location: string;
  summary: string;
  image?: string;
  officialUrl: string;
  registrationUrl?: string;
  programmeUrl?: string;
  facultyUrl?: string;
  highlights: string[];
  selectedFaculty: { name: string; specialty: string; country: string; image: string }[];
};

export const EVENTS: TeamEvent[] = [
  {
    slug: "second-middle-east-thyroid-summit",
    title: "Second Middle East Thyroid Summit",
    shortTitle: "2nd MET Summit",
    status: "upcoming",
    type: "Summit",
    topic: "Thyroid & Endocrine Surgery",
    format: "in-person",
    startDate: "2026-08-27",
    endDate: "2026-08-28",
    location: "Smart Health Tower, Sulaymaniyah, Iraq",
    summary:
      "A two-day regional summit bringing together specialists across thyroid disease and cancer care for scientific exchange, practical education and multidisciplinary collaboration.",
    image: "/events/met-summit-official-main.png",
    officialUrl: "https://mets.smarthealth.group/",
    registrationUrl: "https://mets.smarthealth.group/register",
    programmeUrl: "https://mets.smarthealth.group/program",
    facultyUrl: "https://mets.smarthealth.group/faculty",
    highlights: [
      "Expert-led scientific panels",
      "Live surgical demonstrations",
      "Hands-on workshops",
      "Tumour board simulations",
    ],
    selectedFaculty: [
      { name: "Prof. Dr. Abdulwahid Mohammed Salih", specialty: "Head, Neck & Breast Surgeon", country: "Iraq", image: "https://event.smarthealth.group/api/Assets/Speakers/65cc8c8b-aeb7-47aa-93c0-e1876f3007b1-1080x1080.png" },
      { name: "Prof. Dr. Julie A. Sosa", specialty: "Endocrine Surgeon", country: "United States of America", image: "https://event.smarthealth.group/api/Assets/Speakers/4b05c8dc-8eba-47e5-bdd7-46f1fa4ceb2a-1080x1080.png" },
      { name: "Prof. Dr. Kyung Tae", specialty: "Otolaryngologist - Head and Neck Surgeon", country: "Korea, Republic of", image: "https://event.smarthealth.group/api/Assets/Speakers/40d9a06e-70d7-4864-9f89-ef4dcc07cdf7-1080x1080.png" },
      { name: "Prof. Dr. Neil Tolley", specialty: "Otolaryngologist - Head and Neck Surgeon", country: "United Kingdom", image: "https://event.smarthealth.group/api/Assets/Speakers/575c38ad-aaaf-4d3f-91ab-2219aecbbb01-1080x1080.png" },
    ],
  },
  {
    slug: "first-met-summit-2024",
    title: "First Middle East Thyroid Summit",
    shortTitle: "1st MET Summit",
    status: "past",
    type: "Summit",
    topic: "Thyroid & Head & Neck Surgery",
    format: "hybrid",
    startDate: "2024-07-03",
    endDate: "2024-07-04",
    location: "Smart Health Tower, Sulaymaniyah, Iraq",
    summary:
      "The inaugural Middle East Thyroid Summit brought regional and international specialists together to share advances in thyroid and head and neck surgery.",
    officialUrl: "https://mets.smarthealth.group/previous-events/7",
    highlights: ["Scientific programme", "International collaboration", "On-demand recordings"],
    selectedFaculty: [],
  },
];

export function getEvent(slug: string) {
  return EVENTS.find((event) => event.slug === slug);
}

function canUseEventsDatabase() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function getPublicEvents(): Promise<TeamEvent[]> {
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

export async function getPublicEvent(slug: string) { return (await getPublicEvents()).find((event) => event.slug === slug); }

export function eventDateRange(event: TeamEvent) {
  const start = new Date(`${event.startDate}T12:00:00`);
  const end = new Date(`${event.endDate}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en", options).format(date);

  return sameMonth
    ? `${format(start, { day: "numeric" })}–${format(end, { day: "numeric", month: "long", year: "numeric" })}`
    : `${format(start, { day: "numeric", month: "short" })} – ${format(end, { day: "numeric", month: "short", year: "numeric" })}`;
}
import { getSupabaseServerClient } from "../../lib/supabase/server";
