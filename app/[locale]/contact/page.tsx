import type { Metadata } from "next";
import Link from "next/link";
import AskQuestionForm from "../../components/AskQuestionForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import SocialLinks from "../../components/SocialLinks";
import TitleMotion from "../../components/TitleMotion";
import { IconAlert, IconArrowRight, IconCheck, IconClock, IconClose, IconMail, IconUsers } from "../../components/icons";
import { fill, getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { ASK_CONTACT } from "../../lib/patient-questions";
import { pageMetadata } from "../../lib/seo";
import { notFound } from "next/navigation";
import "../ask/ask.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: "contact", title: dict.seo.contactTitle, description: dict.seo.contactDescription });
}

/* Pinned by coordinates rather than by name: searching for "Smart Health Tower"
   drops the map on empty ground, these are the tower itself. */
const MAP_COORDS = "35.5685910,45.4430236";
/* The universal `maps/dir` URL hands off to the Google Maps app on phones and
   routes from the visitor's own location straight to the tower. */
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAP_COORDS}&travelmode=driving`;
/* `output=embed` is the keyless Maps embed, so no API key has to ship. */
/* `t=k` opens on the satellite basemap, so the tower and the block around it are
   visible rather than a flat street diagram. */
const MAP_EMBED_URL = `https://www.google.com/maps?q=${MAP_COORDS}(${encodeURIComponent("Smart Health Tower")})&t=k&hl=en&z=18&output=embed`;

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.ask;

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict}/>
      <ScrollMotion />
      <main id="main-content" className="contact-page">
        <div className="contact-backdrop" aria-hidden="true"/>
        <div className="contact-shell">
          <header className="contact-intro">
            <TitleMotion as="h1" text={dict.contact.title} variant="write" immediate delayMs={70} cursor />
            <p>{dict.contact.intro}</p>
            <a className="btn btn-primary" href={DIRECTIONS_URL} target="_blank" rel="noreferrer">
              {dict.contact.getDirections}<IconArrowRight size={17} />
            </a>
          </header>
          <div className="contact-layout">
            <aside className="contact-details" aria-labelledby="contact-details-heading">
              <TitleMotion as="h2" id="contact-details-heading" text={dict.contact.detailsTitle} variant="focus" />
              <dl>
                <div><dt><IconMail size={19} /> {dict.contact.email}</dt><dd><a href={`mailto:${dict.contact.emailAddress}`} dir="ltr">{dict.contact.emailAddress}</a></dd></div>
                <div><dt><IconClock size={19} /> {dict.contact.hours}</dt><dd>{dict.contact.hoursValue}</dd></div>
                {/* The question form is already the next section down, so this row
                    serves the page's other audience: doctors go to the MDT page. */}
                <div className="contact-doctors">
                  <dt><IconUsers size={19} /> {dict.contact.doctorsLabel}</dt>
                  <dd>
                    <p>{t.doctorBody}</p>
                    <Link className="text-link contact-doctors-link" href={localePath(active, "mdt")}>
                      {t.doctorLink}<IconArrowRight size={17} />
                    </Link>
                  </dd>
                </div>
              </dl>
              <div className="contact-social-section">
                <p>{dict.contact.followTower}</p>
                <SocialLinks className="socials footer-socials contact-socials" t={dict.social} showLabels />
              </div>
            </aside>
            <section className="contact-location" aria-labelledby="visit-heading">
              <div className="contact-location-orbit" aria-hidden="true"><span /><span /><i /></div>
              <TitleMotion as="h2" id="visit-heading" text={dict.contact.towerTitle} variant="ink" />
              <p>{dict.contact.visitBody}</p>
            </section>
          </div>

          {/* The question form (formerly /:locale/ask, which now redirects here).
              Code-defined with no database read, so the page stays cached. The
              guide comes before the form in the DOM, so a screen reader and a
              phone meet the emergency notice and "what we answer" first; on wide
              screens the grid puts the form on the leading side. */}
          <section id="ask" className="contact-ask-section" aria-labelledby="ask-heading">
            <header className="contact-ask-head">
              <TitleMotion as="h2" id="ask-heading" text={t.title} variant="write" cursor />
              <p>{t.intro}</p>
            </header>
            <div className="ask-layout contact-ask-layout">
              <aside className="ask-guide">
                <section className="ask-emergency" aria-labelledby="ask-emergency-title">
                  <IconAlert size={22} />
                  <div>
                    <h3 id="ask-emergency-title">{t.emergencyTitle}</h3>
                    <p>{t.emergencyBody}</p>
                    {ASK_CONTACT.emergencyNumber && (
                      <p className="ask-emergency-call">
                        <a href={`tel:${ASK_CONTACT.emergencyNumber}`}>{fill(t.emergencyCall, { number: ASK_CONTACT.emergencyNumber })}</a>
                      </p>
                    )}
                  </div>
                </section>

                <div className="ask-scope">
                  <section aria-labelledby="ask-can-title">
                    <h3 id="ask-can-title"><IconCheck size={18} className="ask-scope-mark is-yes" />{t.canTitle}</h3>
                    <p>{t.canBody}</p>
                  </section>
                  <section aria-labelledby="ask-cannot-title">
                    <h3 id="ask-cannot-title"><IconClose size={18} className="ask-scope-mark is-no" />{t.cannotTitle}</h3>
                    <p>{t.cannotBody}</p>
                  </section>
                </div>

              </aside>

              <AskQuestionForm locale={active} t={t} />
            </div>
          </section>

          {/* Full-width map closes the page so visitors can actually explore the
              area before they hand off to the Maps app. */}
          <section className="contact-map-section" aria-labelledby="map-heading">
            <div className="contact-map-head">
              <div>
                <TitleMotion as="h2" id="map-heading" text={dict.contact.mapTitle} variant="curtain" />
              </div>
            </div>
            <div className="contact-map">
              <iframe
                src={MAP_EMBED_URL}
                title={dict.contact.mapFrameTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict}/>
    </>
  );
}
