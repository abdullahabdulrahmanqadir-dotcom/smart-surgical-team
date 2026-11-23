/* Faculty portraits are served by the summit organiser's own asset host, like
   the MET faculty on the events pages, so they skip the local image layer. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CollaborationMap from "../../components/CollaborationMap";
import JsonLd from "../../components/JsonLd";
import ResearchCover from "../../components/ResearchCover";
import ScrollMotion from "../../components/ScrollMotion";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import SummitCountdown from "../../components/SummitCountdown";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconAward,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconCompass,
  IconMail,
  IconPassport,
  IconPin,
  IconUsers,
} from "../../components/icons";
import { SUMMIT, SUMMIT_FACULTY, type SummitLinkKey } from "../../lib/breast-summit";
import { getCollaborators, mapLabels } from "../../lib/collaborators-server";
import { countryName } from "../../lib/countries";
import { fill, getDictionary } from "../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../lib/i18n";
import { getResearches } from "../../lib/research";
import { pageMetadata } from "../../lib/seo";
import { summitEventJsonLd } from "../../lib/structured-data";
import "./breast-summit.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: SUMMIT.slug, title: dict.seo.summitTitle, description: dict.seo.summitDescription });
}

/** Official summit site pages, ordered in the sequence a delegate plans attendance. */
const OFFICIAL_LINKS = [
  ["register", "linkRegister", "linkRegisterHint", IconClipboard],
  ["programme", "linkProgramme", "linkProgrammeHint", IconCalendar],
  ["faculty", "linkFaculty", "linkFacultyHint", IconUsers],
  ["venue", "linkVenue", "linkVenueHint", IconPin],
  ["hotels", "linkHotels", "linkHotelsHint", IconBuilding],
  ["transportation", "linkTransportation", "linkTransportationHint", IconCompass],
  ["travel", "linkTravel", "linkTravelHint", IconPassport],
  ["sponsors", "linkSponsors", "linkSponsorsHint", IconAward],
] as const satisfies readonly (readonly [SummitLinkKey, string, string, unknown])[];

const BREAST = /breast/i;

/** Deterministic concentric dotted radial rings echoing the official MEBS 2027
    banner's signature blush-pink dotted motif without using heavy raster art. */
const HERO_DOTS = (() => {
  const dots: { cx: number; cy: number; r: number; o: number }[] = [];
  const rings = [64, 112, 160, 208, 256, 304, 352];
  for (let ri = 0; ri < rings.length; ri++) {
    const radius = rings[ri];
    const count = 18 + ri * 9;
    const opacity = Number((0.46 - ri * 0.055).toFixed(2));
    const dotR = ri < 2 ? 2.1 : ri < 5 ? 1.75 : 1.4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dots.push({
        cx: Math.round((400 + Math.cos(a) * radius) * 10) / 10,
        cy: Math.round((400 + Math.sin(a) * radius) * 10) / 10,
        r: dotR,
        o: opacity,
      });
    }
  }
  return dots;
})();

/**
 * /:locale/breast-summit: companion page for the Second Middle East Breast
 * Summit (2nd MEBS 2027), dressed in the official MEBS 2027 charcoal, crisp
 * white, and berry-crimson (#c43c63) palette.
 *
 * The official summit site (ibs.smarthealth.group) remains the primary
 * destination for registration, programme, faculty, and travel. This page
 * pairs direct official links with what only Smart Surgical Team maintains:
 * the international collaboration map and our published breast research.
 */
export default async function BreastSummitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.summit;

  const [researches, collaborators] = await Promise.all([getResearches(), getCollaborators(active)]);
  const papers = researches.filter((paper) => BREAST.test(paper.topic?.slug ?? "") || BREAST.test(paper.topic?.name ?? ""));
  const breastTopic = papers.find((paper) => paper.topic)?.topic?.slug;
  const latestPapers = papers.slice(0, 3);
  const countries = new Set(SUMMIT_FACULTY.map((member) => member.country)).size;
  const external = { target: "_blank", rel: "noopener" } as const;
  const newTab = <span className="visually-hidden"> {t.newTab}</span>;
  const stepFormat = new Intl.NumberFormat(active === "ar" ? "ar" : "en", { minimumIntegerDigits: 2 });

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <JsonLd data={summitEventJsonLd(active, { title: t.title, description: t.lede, venue: t.venue })} />
      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />
      <main id="main-content" className="summit-page">
        <section className="summit-hero" aria-labelledby="summit-title">
          {/* Subtle blush-rose dotted radial field echoing the official MEBS 2027
              hero artwork without crowding the typography. */}
          <svg className="summit-hero-dots" viewBox="0 0 800 800" aria-hidden="true" focusable="false">
            <circle cx="400" cy="400" r="6" className="summit-hero-hub-dot" />
            {HERO_DOTS.map((dot, index) => (
              <circle key={index} cx={dot.cx} cy={dot.cy} r={dot.r} fillOpacity={dot.o} />
            ))}
          </svg>

          <div className="summit-shell summit-hero-inner">
            <header className="summit-intro">
              <div className="summit-brand">
                <img
                  className="summit-brand-logo"
                  src="/mebs-logo.webp"
                  alt=""
                  width={560}
                  height={270}
                  decoding="async"
                  fetchPriority="high"
                />
                <span className="summit-brand-divider" aria-hidden="true" />
                <p className="summit-eyebrow">
                  <span className="summit-eyebrow-mark" dir="ltr">{t.kicker}</span>
                  <span className="summit-eyebrow-edition">{t.edition}</span>
                </p>
              </div>
              <h1 id="summit-title">{t.title}</h1>
              <p className="summit-slogan">{t.slogan}</p>
              <div className="summit-actions">
                <a className="btn btn-lg summit-cta-primary" href={SUMMIT.links.register} {...external}>
                  {t.register}{newTab}<IconArrowUpRight size={18} className="summit-ext-icon" />
                </a>
                <a className="summit-cta-link" href={SUMMIT.officialUrl} {...external}>
                  <span dir="ltr">{t.visitOfficial}</span>{newTab}<IconArrowUpRight size={16} className="summit-ext-icon" />
                </a>
              </div>
            </header>

            <div className="summit-hero-bar">
              <div className="summit-hero-facts">
                <p className="summit-hero-date">
                  <span className="summit-plate-day" dir="ltr">{t.dateDay}</span>{" "}
                  <span>{t.dateMonth} {t.dateYear}</span>
                </p>
                <span className="summit-hero-divider" aria-hidden="true" />
                <p className="summit-hero-venue">{t.venueShort}</p>
              </div>
              <SummitCountdown
                opensAt={SUMMIT.opensAt}
                closesAt={SUMMIT.closesAt}
                locale={active}
                labels={{ until: t.until, days: t.days, hours: t.hours, minutes: t.minutes, live: t.live, past: t.past }}
              />
            </div>
          </div>
        </section>

        <section className="summit-shell summit-about" aria-labelledby="summit-about-title">
          <div className="summit-about-head">
            <h2 id="summit-about-title">{t.aboutTitle}</h2>
          </div>
          <div className="summit-about-body">
            <p>{t.aboutBody1}</p>
            <p>{t.aboutBody2}</p>
            <p className="summit-themes-label">{t.themesLabel}</p>
            <ol className="summit-themes">
              {t.themes.map((theme, index) => (
                <li key={theme}>
                  <span className="summit-theme-num" aria-hidden="true">{stepFormat.format(index + 1)}</span>
                  <span className="summit-theme-text">{theme}</span>
                </li>
              ))}
            </ol>
            <a className="text-link summit-ext-link" href={SUMMIT.links.about} {...external}>
              {t.aboutMore}<IconArrowUpRight size={16} className="summit-ext-icon" />{newTab}
            </a>
          </div>
        </section>

        <section className="summit-shell summit-faculty" aria-labelledby="summit-faculty-title">
          <div className="summit-section-head">
            <div>
              <h2 id="summit-faculty-title">{t.facultyTitle}</h2>
              <p>{fill(t.facultyIntro, { count: SUMMIT_FACULTY.length, countries })}</p>
            </div>
            <a className="text-link summit-ext-link" href={SUMMIT.links.faculty} {...external}>
              {t.facultyAll}<IconArrowUpRight size={16} className="summit-ext-icon" />{newTab}
            </a>
          </div>
          <ul className="summit-faculty-grid">
            {SUMMIT_FACULTY.map((member) => (
              <li key={member.url}>
                <a href={member.url} {...external} title={t.facultyProfile}>
                  <span className="summit-faculty-portrait">
                    <img src={member.image} alt="" width={240} height={240} loading="lazy" decoding="async" />
                    <span className="summit-faculty-ext" aria-hidden="true">
                      <IconArrowUpRight size={15} className="summit-ext-icon" />
                    </span>
                  </span>
                  <span className="summit-faculty-name" {...authoredTitleProps(member.name)}>{member.name}</span>
                  <span className="summit-faculty-role">{member.specialty[active]}</span>
                  <span className="summit-faculty-country">{countryName(member.country, active)}</span>
                  {newTab}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="summit-official" aria-labelledby="summit-official-title">
          <div className="summit-shell">
            <div className="summit-section-head">
              <div>
                <h2 id="summit-official-title">{t.officialTitle}</h2>
                <p>{t.officialIntro}</p>
              </div>
            </div>
            <ul className="summit-official-grid">
              {OFFICIAL_LINKS.map(([key, label, hint, Icon]) => (
                <li key={key}>
                  <a href={SUMMIT.links[key]} {...external}>
                    <span className="summit-official-top" aria-hidden="true">
                      <Icon size={19} className="summit-official-icon" />
                      <IconArrowUpRight size={16} className="summit-official-arrow summit-ext-icon" />
                    </span>
                    <span className="summit-official-label">{t[label]}</span>
                    <span className="summit-official-hint">{t[hint]}</span>
                    {newTab}
                  </a>
                </li>
              ))}
            </ul>
            <p className="summit-contact">
              <IconMail size={17} />
              <span>{t.contactLine}</span>
              <a className="text-link" href={`mailto:${SUMMIT.contactEmail}`} dir="ltr">{SUMMIT.contactEmail}</a>
            </p>
          </div>
        </section>

        <section className="summit-shell summit-map" aria-labelledby="summit-map-title">
          <div className="summit-section-head">
            <div>
              <p className="summit-kicker">{dict.collab.summitKicker}</p>
              <h2 id="summit-map-title">{dict.collab.summitTitle}</h2>
              <p>{dict.collab.summitIntro}</p>
            </div>
          </div>
          <CollaborationMap
            collaborators={collaborators}
            locale={active}
            labels={mapLabels(dict.collab)}
            variant="compact"
            emptyHref={localePath(active, "contact")}
            fullMapHref={localePath(active, "collaboration")}
            fullMapLabel={dict.collab.openFullMap}
          />
        </section>

        {latestPapers.length > 0 && (
          <section className="summit-shell summit-additions" aria-labelledby="summit-additions-title">
            <div className="summit-section-head">
              <div>
                <p className="summit-kicker">{t.additionsKicker}</p>
                <h2 id="summit-additions-title">{t.additionsTitle}</h2>
                <p>{t.additionsIntro}</p>
              </div>
              <Link className="text-link" href={`${localePath(active, "research")}${breastTopic ? `?topic=${encodeURIComponent(breastTopic)}` : ""}`}>
                {t.allResearch}<IconArrowRight size={16} />
              </Link>
            </div>
            <div className="research-card-grid summit-papers">
              {latestPapers.map((paper) => (
                <Link className="research-card research-card-link" href={localePath(active, `research/${paper.id}`)} key={paper.id}>
                  <ResearchCover title={paper.title} label={paper.topic?.name ?? ""} palette={paper.palette} paletteKey={paper.journal} />
                  <div className="research-card-copy">
                    <p className="research-authors">{paper.authors}</p>
                    <div className="research-card-footer">
                      <p className="research-card-date">{paper.year}</p>
                      <span className="research-read">{dict.research.readResearch} <IconArrowRight size={16} /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="summit-shell summit-previous-wrap" aria-labelledby="summit-previous-title">
          <div className="summit-previous">
            <div className="summit-previous-copy">
              <h2 id="summit-previous-title" className="summit-kicker">{t.previousTitle}</h2>
              <p>{t.previousBody}</p>
            </div>
            <a className="text-link summit-ext-link" href={SUMMIT.previousEditionUrl} {...external}>
              {t.previousLink}<IconArrowUpRight size={16} className="summit-ext-icon" />{newTab}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
