import {
  Newsreader,
  Outfit,
  Playfair_Display,
  Inter,
  Public_Sans,
  Noto_Kufi_Arabic,
  Noto_Naskh_Arabic,
  IBM_Plex_Sans_Arabic,
  Reem_Kufi,
  Vazirmatn,
} from "next/font/google";
import "./specimen.css";

// Type specimen for choosing the site's pairing. Not linked from navigation;
// delete this route once the pairing is locked in Phase 0.

const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "600"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "700"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"] });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500"] });

const notoKufi = Noto_Kufi_Arabic({ subsets: ["arabic"], weight: ["400", "700"] });
const notoNaskh = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "600"] });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "600"] });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["400", "700"] });
const vazirmatn = Vazirmatn({ subsets: ["arabic"], weight: ["400", "700"] });

const EN_HEADING = "Head & Neck Surgery, Guided by Expertise.";
const EN_BODY =
  "A structured surgical education platform from Smart Health Tower in Sulaymaniah — videos, webinars and e-posters covering thyroid, parotid, neck and skin surgery.";
const EN_EYEBROW = "Thyroid & Parathyroid";

const AR_HEADING = "جراحة الرأس والرقبة، بخبرة موثوقة.";
const AR_BODY =
  "منصة تعليمية متخصصة في جراحة الرأس والرقبة من برج الصحة الذكي في السليمانية — مقاطع جراحية وندوات وملصقات إلكترونية.";
const AR_EYEBROW = "الغدة الدرقية وجارات الدرقية";

type Pairing = {
  id: string;
  name: string;
  rationale: string;
  latinHeading: string;
  latinBody: string;
  arabicHeading: string;
  arabicBody: string;
  arabicNames: string;
};

const PAIRINGS: Pairing[] = [
  {
    id: "A",
    name: "Modern serif headings + clean sans body",
    rationale:
      "Editorial and journal-like. Warmest of the three; reads as an established institution rather than a startup.",
    latinHeading: newsreader.className,
    latinBody: inter.className,
    arabicHeading: notoKufi.className,
    arabicBody: notoNaskh.className,
    arabicNames: "Noto Kufi Arabic / Noto Naskh Arabic",
  },
  {
    id: "B",
    name: "Refined geometric sans throughout",
    rationale:
      "Contemporary and product-like. Cleanest and most neutral; relies on weight and scale rather than contrast of face.",
    latinHeading: outfit.className,
    latinBody: inter.className,
    arabicHeading: vazirmatn.className,
    arabicBody: vazirmatn.className,
    arabicNames: "Vazirmatn (both weights)",
  },
  {
    id: "C",
    name: "High-contrast display + humanist body",
    rationale:
      "Boldest and most fashion-forward. Highest impact, but carries the most risk of reading as a design studio rather than a surgical team.",
    latinHeading: playfair.className,
    latinBody: publicSans.className,
    arabicHeading: reemKufi.className,
    arabicBody: plexArabic.className,
    arabicNames: "Reem Kufi / IBM Plex Sans Arabic",
  },
];

const LATIN_NAMES: Record<string, string> = {
  A: "Newsreader / Inter",
  B: "Outfit / Inter",
  C: "Playfair Display / Public Sans",
};

function Sample({
  dir,
  lang,
  eyebrow,
  heading,
  body,
  headingClass,
  bodyClass,
  fontNames,
  scriptLabel,
}: {
  dir: "ltr" | "rtl";
  lang: string;
  eyebrow: string;
  heading: string;
  body: string;
  headingClass: string;
  bodyClass: string;
  fontNames: string;
  scriptLabel: string;
}) {
  return (
    <div className="spec-sample" dir={dir} lang={lang}>
      <div className="spec-sample-meta" dir="ltr">
        <span>{scriptLabel}</span>
        <span>{fontNames}</span>
      </div>
      <p className={`spec-eyebrow ${bodyClass}`}>{eyebrow}</p>
      <h3 className={`spec-heading ${headingClass}`}>{heading}</h3>
      <p className={`spec-body ${bodyClass}`}>{body}</p>
    </div>
  );
}

export default function SpecimenPage() {
  return (
    <main className="spec-page">
      <header className="spec-intro">
        <p className="spec-kicker">Smart Surgical Team — type specimen</p>
        <h1 className="spec-title">Pick a pairing</h1>
        <p className="spec-lede">
          Each block below is the same content set in one candidate pairing, in both
          locales. Arabic blocks are the deciding test: if any character renders as a box,
          or visibly different from the rest of the line, that font does not properly
          support Arabic and is disqualified regardless of how it looks.
        </p>
      </header>

      {PAIRINGS.map((p) => (
        <section key={p.id} className="spec-pairing">
          <div className="spec-pairing-head">
            <span className="spec-badge">{p.id}</span>
            <div>
              <h2 className="spec-pairing-name">{p.name}</h2>
              <p className="spec-pairing-note">{p.rationale}</p>
            </div>
          </div>

          <Sample
            dir="ltr"
            lang="en"
            scriptLabel="English"
            fontNames={LATIN_NAMES[p.id]}
            eyebrow={EN_EYEBROW}
            heading={EN_HEADING}
            body={EN_BODY}
            headingClass={p.latinHeading}
            bodyClass={p.latinBody}
          />
          <Sample
            dir="rtl"
            lang="ar"
            scriptLabel="Arabic"
            fontNames={p.arabicNames}
            eyebrow={AR_EYEBROW}
            heading={AR_HEADING}
            body={AR_BODY}
            headingClass={p.arabicHeading}
            bodyClass={p.arabicBody}
          />
        </section>
      ))}
    </main>
  );
}
