/**
 * Event shapes, the built-in event records and the date formatters.
 *
 * Deliberately free of server-only imports. Client components render events
 * too, and when the Supabase read and its `next/cache` wrapper lived in this
 * module the browser bundle pulled in `AsyncLocalStorage` and crashed on load.
 * Server-side reads live in `events.ts`, which re-exports everything here.
 */

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


/**
 * Day range and month for the featured-event stamp. The card used to print a
 * hardcoded "27–28 AUG", which stayed on screen once a different event became
 * featured.
 */
export function eventDateStamp(event: TeamEvent, locale: string) {
  const start = new Date(`${event.startDate}T12:00:00`);
  const end = new Date(`${event.endDate}T12:00:00`);
  const day = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);
  return {
    days: event.startDate === event.endDate ? day(start) : `${day(start)}–${day(end)}`,
    month: new Intl.DateTimeFormat(locale, { month: "short" }).format(start).toUpperCase(),
  };
}

export function eventDateRange(event: TeamEvent, locale: string) {
  const start = new Date(`${event.startDate}T12:00:00`);
  const end = new Date(`${event.endDate}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(date);

  return sameMonth
    ? `${format(start, { day: "numeric" })}–${format(end, { day: "numeric", month: "long", year: "numeric" })}`
    : `${format(start, { day: "numeric", month: "short" })} – ${format(end, { day: "numeric", month: "short", year: "numeric" })}`;
}
