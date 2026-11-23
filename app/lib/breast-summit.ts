/**
 * The Second Middle East Breast Summit (2nd MEBS 2027): the facts our
 * /breast-summit page shows.
 *
 * The official summit site (ibs.smarthealth.group) is the event's home and
 * owns registration, the programme, faculty and travel. Our page is a
 * companion that sends visitors there, so everything here is either a link
 * into that site or a fact copied from it. Re-check against the official site
 * whenever it changes. Last read: 2026-11-23.
 *
 * Spec: docs/superpowers/specs/2026-11-23-breast-summit-and-map-design.md.
 */

const OFFICIAL = "https://ibs.smarthealth.group";

export const SUMMIT = {
  slug: "breast-summit",
  /** Opening and closing day, local dates. */
  startDate: "2027-09-02",
  endDate: "2027-09-03",
  /** Countdown target: the start of opening day in Sulaymaniyah (UTC+3). The
      session start time is not published yet, so this counts to the day. */
  opensAt: "2027-09-02T00:00:00+03:00",
  closesAt: "2027-09-04T00:00:00+03:00",
  officialUrl: `${OFFICIAL}/`,
  contactEmail: "ibcs@smarthealth.group",
  previousEditionUrl: `${OFFICIAL}/previous-events/5`,
  links: {
    register: `${OFFICIAL}/register`,
    programme: `${OFFICIAL}/program`,
    faculty: `${OFFICIAL}/faculty`,
    about: `${OFFICIAL}/about`,
    venue: `${OFFICIAL}/venue`,
    hotels: `${OFFICIAL}/hotels`,
    transportation: `${OFFICIAL}/transportation`,
    travel: `${OFFICIAL}/travel`,
    sponsors: `${OFFICIAL}/sponsors`,
    contact: `${OFFICIAL}/contact`,
  },
} as const;

export type SummitLinkKey = keyof typeof SUMMIT.links;

type Specialty = { en: string; ar: string };

const SPECIALTY = {
  breastInterventionalRadiology: { en: "Breast Interventional Radiology", ar: "الأشعة التداخلية للثدي" },
  breastOncoplastic: { en: "Breast Surgery & Oncoplastic Surgery", ar: "جراحة الثدي والجراحة التجميلية الورمية" },
  consultantOncoplastic: { en: "Consultant Oncoplastic Breast Surgeon", ar: "استشاري جراحة الثدي التجميلية الورمية" },
  seniorConsultantOncoplastic: { en: "Senior Consultant Oncoplastic Breast Surgeon", ar: "استشاري أول في جراحة الثدي التجميلية الورمية" },
  consultantBreast: { en: "Consultant Breast Surgeon", ar: "استشاري جراحة الثدي" },
  histopathologist: { en: "Histopathologist", ar: "اختصاصي علم الأنسجة المرضية" },
  radiologist: { en: "Radiologist", ar: "اختصاصي الأشعة" },
} as const satisfies Record<string, Specialty>;

export type SummitFaculty = {
  name: string;
  specialty: Specialty;
  /** ISO 3166-1 alpha-2, rendered through `countryName`. */
  country: string;
  image: string;
  /** The member's own page on the official site. */
  url: string;
};

const PHOTO = "https://event.smarthealth.group/api/Assets/Speakers";

/** In the official site's order. Names stay in Latin script in both locales. */
export const SUMMIT_FACULTY: SummitFaculty[] = [
  { name: "Prof. Maan Hachmi", specialty: SPECIALTY.breastInterventionalRadiology, country: "AE", image: `${PHOTO}/f10c9792-c1ef-473c-839f-ec16a15dafd6-1080x1080.jpg`, url: `${OFFICIAL}/faculty/158` },
  { name: "Prof. Régis Paulinelli", specialty: SPECIALTY.breastOncoplastic, country: "BR", image: `${PHOTO}/7f6cde10-46f3-4f9b-9cb5-2948a1b49659-1080x1080.jpeg`, url: `${OFFICIAL}/faculty/161` },
  { name: "Asst. Prof. Giuseppe Catanuto", specialty: SPECIALTY.consultantOncoplastic, country: "IT", image: `${PHOTO}/5c7124fc-5215-4e09-a18b-b25b60dee7e6-1687x1687.jpeg`, url: `${OFFICIAL}/faculty/159` },
  { name: "Dr. Omar Layth Qassid (AL-Harbi)", specialty: SPECIALTY.histopathologist, country: "AE", image: `${PHOTO}/adb16a49-09dc-461e-b8dc-e14b20046e6a-1080x1080.png`, url: `${OFFICIAL}/faculty/76` },
  { name: "Dr. Lana Rezan Abdulaziz", specialty: SPECIALTY.radiologist, country: "IQ", image: `${PHOTO}/1bff97ac-5aca-474b-8771-d05a26863176-1080x1080.png`, url: `${OFFICIAL}/faculty/50` },
  { name: "Dr. Miaad Al-Ataar", specialty: SPECIALTY.radiologist, country: "GB", image: `${PHOTO}/eecd6318-7f54-4d89-9eb4-bfbbfe0d95b0-1080x1080.png`, url: `${OFFICIAL}/faculty/47` },
  { name: "Dr. Dhirar Ansarei", specialty: SPECIALTY.seniorConsultantOncoplastic, country: "AE", image: `${PHOTO}/73fc9556-68a7-4c9f-97d2-e1dadc9746e7-1080x1080.jpg`, url: `${OFFICIAL}/faculty/157` },
  { name: "Dr. Mohamed Ahmed Abdelaal", specialty: SPECIALTY.consultantBreast, country: "EG", image: `${PHOTO}/a877ae66-c473-46dc-b250-1779e27ca0c0-1080x1080.jpeg`, url: `${OFFICIAL}/faculty/160` },
  { name: "Dr. Enam Azez Khalel Al-Tameemi", specialty: SPECIALTY.radiologist, country: "IQ", image: `${PHOTO}/1e9cc5e6-7538-4418-931d-e4c022dd95e5-1080x1080.png`, url: `${OFFICIAL}/faculty/49` },
  { name: "Dr. Areege Mustafa Kamal Al Hasani", specialty: SPECIALTY.histopathologist, country: "IQ", image: `${PHOTO}/3c293b57-7043-473e-9534-8ba66da28a64-1080x1080.png`, url: `${OFFICIAL}/faculty/77` },
];

/** Where the summit stands today, from the dates alone. */
export function summitPhase(now = new Date()): "upcoming" | "live" | "past" {
  if (now < new Date(SUMMIT.opensAt)) return "upcoming";
  if (now < new Date(SUMMIT.closesAt)) return "live";
  return "past";
}
