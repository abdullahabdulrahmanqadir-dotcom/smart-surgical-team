import type { Metadata } from "next";
import Link from "next/link";
import AskQuestionForm from "../../components/AskQuestionForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import SocialLinks from "../../components/SocialLinks";
import { IconAlert, IconArrowRight, IconCheck, IconClock, IconClose, IconMail, IconPhone, IconShield, IconUsers, IconWhatsApp } from "../../components/icons";
import { fill, getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { ASK_CONTACT, REPLY_WITHIN_WORKING_DAYS } from "../../lib/patient-questions";
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
            <h1>{dict.contact.title}</h1>
            <p>{dict.contact.intro}</p>
            <a className="btn btn-primary" href={DIRECTIONS_URL} target="_blank" rel="noreferrer">
              {dict.contact.getDirections}<IconArrowRight size={17} />
            </a>
          </header>
          <div className="contact-layout">
            <aside className="contact-details" aria-labelledby="contact-details-heading">
              <h2 id="contact-details-heading">{dict.contact.detailsTitle}</h2>
              <dl>
                <div><dt><IconMail size={19} /> {dict.contact.email}</dt><dd><a href={`mailto:${dict.contact.emailAddress}`} dir="ltr">{dict.contact.emailAddress}</a></dd></div>
                <div><dt><IconClock size={19} /> {dict.contact.hours}</dt><dd>{dict.contact.hoursValue}</dd></div>
                {/* Questions go through the form below so they land in the private
                    Admin inbox rather than an unattended mailbox. */}
                <div className="contact-ask">
                  <dt><IconWhatsApp size={19} /> {dict.contact.askLabel}</dt>
                  <dd>
                    <p>{dict.contact.askBody}</p>
                    <a className="btn btn-primary contact-ask-link" href="#ask">
                      {dict.contact.askLink}<IconArrowRight size={17} />
                    </a>
                  </dd>
                </div>
              </dl>
              <div className="contact-social-section">
                <p>{dict.contact.followTower}</p>
                <SocialLinks className="socials contact-socials" t={dict.social} />
              </div>
            </aside>
            <section className="contact-location" aria-labelledby="visit-heading">
              <div className="contact-location-orbit" aria-hidden="true"><span /><span /><i /></div>
              <h2 id="visit-heading">{dict.contact.towerTitle}</h2>
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
              <h2 id="ask-heading">{t.title}</h2>
              <p>{t.intro}</p>
            </header>
            <div className="ask-layout">
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
                    <h3 id="ask-can-title"><span className="ask-scope-mark is-yes"><IconCheck size={15} /></span>{t.canTitle}</h3>
                    <p>{t.canBody}</p>
                  </section>
                  <section aria-labelledby="ask-cannot-title">
                    <h3 id="ask-cannot-title"><span className="ask-scope-mark is-no"><IconClose size={15} /></span>{t.cannotTitle}</h3>
                    <p>{t.cannotBody}</p>
                  </section>
                </div>

                <dl className="ask-facts">
                  <div>
                    <dt><IconPhone size={18} />{t.bookTitle}</dt>
                    <dd>
                      {ASK_CONTACT.bookingPhone
                        ? <>{t.bookBody} <a href={`tel:${ASK_CONTACT.bookingPhone}`} dir="ltr">{ASK_CONTACT.bookingPhone}</a></>
                        : <a className="text-link" href="#visit-heading">{t.bookFallback}<IconArrowRight size={15} /></a>}
                    </dd>
                  </div>
                  <div>
                    <dt><IconClock size={18} />{t.replyTitle}</dt>
                    <dd>{fill(t.replyBody, { days: String(REPLY_WITHIN_WORKING_DAYS) })}</dd>
                  </div>
                  <div>
                    <dt><IconShield size={18} />{t.privacyTitle}</dt>
                    <dd>{t.privacyBody} <Link className="text-link" href={localePath(active, "privacy")}>{t.privacyLink}</Link></dd>
                  </div>
                  <div className="ask-doctor">
                    <dt><IconUsers size={18} />{t.doctorTitle}</dt>
                    <dd>
                      {t.doctorBody}{" "}
                      <Link className="text-link" href={localePath(active, "mdt")}>{t.doctorLink}<IconArrowRight size={15} /></Link>
                    </dd>
                  </div>
                </dl>
              </aside>

              <AskQuestionForm locale={active} t={t} />
            </div>
          </section>

          {/* Full-width map closes the page so visitors can actually explore the
              area before they hand off to the Maps app. */}
          <section className="contact-map-section" aria-labelledby="map-heading">
            <div className="contact-map-head">
              <div>
                <h2 id="map-heading">{dict.contact.mapTitle}</h2>
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
