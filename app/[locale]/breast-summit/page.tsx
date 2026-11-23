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
import { IconArrowRight, IconCalendar, IconFile, IconGlobe, IconMail, IconPin, IconUsers, IconLayers, IconShield, IconLink, IconCheck, IconClock } from "../../components/icons";
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

/** The official site's pages, in the order a visitor plans a trip. */
const OFFICIAL_LINKS = [
  ["register", "linkRegister", "linkRegisterHint", IconCheck],
  ["programme", "linkProgramme", "linkProgrammeHint", IconClock],
  ["faculty", "linkFaculty", "linkFacultyHint", IconUsers],
  ["venue", "linkVenue", "linkVenueHint", IconPin],
  ["hotels", "linkHotels", "linkHotelsHint", IconLayers],
  ["transportation", "linkTransportation", "linkTransportationHint", IconLink],
  ["travel", "linkTravel", "linkTravelHint", IconShield],
  ["sponsors", "linkSponsors", "linkSponsorsHint", IconFile],
] as const satisfies readonly (readonly [SummitLinkKey, string, string, unknown])[];

const BREAST = /breast/i;

/**
 * /:locale/breast-summit: our companion page for the Second Middle East
 * Breast Summit (2nd MEBS 2027).
 *
 * The official summit site is the destination. Every section here either
 * sends the visitor there or adds something only we have: the collaboration
 * map and our breast research. Spec:
 * docs/superpowers/specs/2026-11-23-breast-summit-and-map-design.md.
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

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <JsonLd data={summitEventJsonLd(active, { title: t.title, description: t.lede, venue: t.venue })} />
      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />
      <main id="main-content" className="summit-page">
        <section className="summit-hero" aria-labelledby="summit-title">
          {/* Rings radiating from one point: the summit's city as a hub. The
              collaboration map in phase 2 picks up the same idea. */}
          <svg className="summit-hero-rings" viewBox="0 0 800 800" aria-hidden="true" focusable="false">
            {[90, 170, 250, 330, 410, 490].map((r) => <circle key={r} cx="400" cy="400" r={r} />)}
          </svg>
          <div className="summit-shell summit-hero-grid">
            <header className="summit-intro">
              <p className="summit-lockup">
                <span className="summit-lockup-mark">{t.kicker}</span>
                <span className="summit-lockup-name">{t.edition}</span>
              </p>
              <h1 id="summit-title">{t.title}</h1>
              <p className="summit-lede">{t.lede}</p>
              <ul className="summit-meta">
                <li><IconCalendar size={18} />{t.dates}</li>
                <li><IconPin size={18} />{t.venue}</li>
              </ul>
              <div className="summit-actions">
                <a className="btn btn-primary btn-lg summit-cta" href={SUMMIT.links.register} {...external}>
                  {t.register}{newTab}<IconArrowRight size={18} />
                </a>
                <a className="btn btn-outline btn-lg summit-cta" href={SUMMIT.officialUrl} {...external}>
                  <IconGlobe size={18} />{t.visitOfficial}{newTab}
                </a>
              </div>
              <p className="summit-official-note">{t.officialNote}</p>
            </header>

            <aside className="summit-plate" aria-label={t.dates}>
              <p className="summit-plate-date">
                <span className="summit-plate-day">{t.dateDay}</span>
                <span className="summit-plate-month">{t.dateMonth} {t.dateYear}</span>
              </p>
              <SummitCountdown
                opensAt={SUMMIT.opensAt}
                closesAt={SUMMIT.closesAt}
                locale={active}
                labels={{ until: t.until, days: t.days, hours: t.hours, minutes: t.minutes, live: t.live, past: t.past }}
              />
            </aside>
          </div>
        </section>

        <section className="summit-shell summit-about" aria-labelledby="summit-about-title">
          <h2 id="summit-about-title">{t.aboutTitle}</h2>
          <div className="summit-about-body">
            <p>{t.aboutBody1}</p>
            <p>{t.aboutBody2}</p>
            <p className="summit-themes-label">{t.themesLabel}</p>
            <ol className="summit-themes">
              {t.themes.map((theme) => <li key={theme}>{theme}</li>)}
            </ol>
            <a className="text-link" href={SUMMIT.links.about} {...external}>{t.aboutMore}<IconArrowRight size={16} />{newTab}</a>
          </div>
        </section>

        <section className="summit-shell summit-faculty" aria-labelledby="summit-faculty-title">
          <div className="summit-section-head">
            <div>
              <h2 id="summit-faculty-title">{t.facultyTitle}</h2>
              <p>{fill(t.facultyIntro, { count: SUMMIT_FACULTY.length, countries })}</p>
            </div>
            <a className="text-link" href={SUMMIT.links.faculty} {...external}>{t.facultyAll}<IconArrowRight size={16} />{newTab}</a>
          </div>
          <ul className="summit-faculty-grid">
            {SUMMIT_FACULTY.map((member) => (
              <li key={member.url}>
                <a href={member.url} {...external}>
                  <img src={member.image} alt="" width={96} height={96} loading="lazy" decoding="async" />
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
                    <span className="summit-official-icon" aria-hidden="true"><Icon size={20} /></span>
                    <span className="summit-official-label">{t[label]}</span>
                    <span className="summit-official-hint">{t[hint]}</span>
                    <IconArrowRight size={17} className="summit-official-arrow" />
                    {newTab}
                  </a>
                </li>
              ))}
            </ul>
            <p className="summit-contact">
              <IconMail size={18} />{t.contactLine}{" "}
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

        <section className="summit-shell summit-previous" aria-labelledby="summit-previous-title">
          <h2 id="summit-previous-title" className="summit-kicker">{t.previousTitle}</h2>
          <p>{t.previousBody}</p>
          <a className="text-link" href={SUMMIT.previousEditionUrl} {...external}>{t.previousLink}<IconArrowRight size={16} />{newTab}</a>
        </section>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
