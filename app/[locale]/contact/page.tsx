import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import SocialLinks from "../../components/SocialLinks";
import ScrollMotion from "../../components/ScrollMotion";
import { IconArrowRight, IconClock, IconMail, IconPin } from "../../components/icons";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

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

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict}/>
      <ScrollMotion />
      <main id="main-content" className="contact-page">
        <div className="contact-backdrop" aria-hidden="true"/>
        <div className="contact-shell">
          <header className="contact-intro">
            <span className="eyebrow">{dict.contact.eyebrow}</span>
            <h1>{dict.contact.title}</h1>
            <p>{dict.contact.intro}</p>
          </header>
          <div className="contact-layout">
            <aside className="contact-details" aria-labelledby="contact-details-heading">
              <span className="auth-kicker">{dict.contact.directDetails}</span>
              <h2 id="contact-details-heading">{dict.contact.detailsTitle}</h2>
              <p>{dict.contact.detailsBody}</p>
              <dl>
                <div><dt><IconMail size={19} /> {dict.contact.email}</dt><dd>{dict.contact.emailComingSoon}</dd></div>
                <div><dt><IconPin size={19} /> {dict.contact.location}</dt><dd>{dict.footer.address}</dd></div>
                <div><dt><IconClock size={19} /> {dict.contact.hours}</dt><dd>{dict.contact.hoursValue}</dd></div>
              </dl>
              <div className="contact-social-section">
                <p>{dict.contact.followTower}</p>
                <SocialLinks className="socials contact-socials" t={dict.social} />
              </div>
            </aside>
            <section className="contact-location" aria-labelledby="visit-heading">
              <div className="contact-location-orbit" aria-hidden="true"><span /><span /><i /></div>
              <span className="auth-kicker">{dict.contact.visitUs}</span>
              <h2 id="visit-heading">{dict.contact.towerTitle}</h2>
              <p>{dict.contact.visitBody}</p>
              <a className="contact-directions" href={DIRECTIONS_URL} target="_blank" rel="noreferrer">{dict.contact.getDirections} <IconArrowRight size={17} /></a>
              <small>{dict.contact.shortAddress}</small>
            </section>
          </div>

          {/* Full-width map closes the page so visitors can actually explore the
              area before they hand off to the Maps app. */}
          <section className="contact-map-section" aria-labelledby="map-heading">
            <div className="contact-map-head">
              <div>
                <span className="auth-kicker">{dict.contact.mapKicker}</span>
                <h2 id="map-heading">{dict.contact.mapTitle}</h2>
              </div>
              <a className="contact-map-cta" href={DIRECTIONS_URL} target="_blank" rel="noreferrer">{dict.contact.getDirections} <IconArrowRight size={17} /></a>
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
