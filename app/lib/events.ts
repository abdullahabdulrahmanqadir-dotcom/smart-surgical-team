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
      { name: "Prof. Dr. Abdulwahid M. Salih", specialty: "Head & Neck Surgeon", country: "Iraq", image: "https://event.smarthealth.group/api/Assets/Speakers/65cc8c8b-aeb7-47aa-93c0-e1876f3007b1-1080x1080.png" },
      { name: "Dr. Mohammad Ghatasheh", specialty: "Radiologist", country: "Jordan", image: "https://event.smarthealth.group/api/Assets/Speakers/c4f7b095-65c6-46dc-bfb7-e2aa699c9ccd-1080x1080.png" },
      { name: "Dr. Amr Redha", specialty: "Endocrine Surgeon", country: "Oman", image: "https://event.smarthealth.group/api/Assets/Speakers/9c58d31e-6204-4539-a9d3-ea0576358924-1080x1080.png" },
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
