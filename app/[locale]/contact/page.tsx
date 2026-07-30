import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import SocialLinks from "../../components/SocialLinks";
import ScrollMotion from "../../components/ScrollMotion";
import { IconArrowRight, IconClock, IconGlobe, IconMail, IconPin } from "../../components/icons";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

const CONTACT_EMAIL = "info@smartsurgicalteam.com";
const ADDRESS = "Majid Bag Main Street, Beside University of Sulaymaniyah Old Campus, Madam Mitterrand, Sulaymaniyah, Iraq";
const TOWER_URL = "https://smarthealth.group/ar";
const DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Smart Health Tower, Sulaymaniyah, Iraq")}`;

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
            <span className="eyebrow">Contact Smart Surgical Team</span>
            <h1>Find our team.</h1>
            <p>Visit Smart Health Tower or use the details below to connect with Smart Surgical Team.</p>
          </header>
          <div className="contact-layout">
            <aside className="contact-details" aria-labelledby="contact-details-heading">
              <span className="auth-kicker">Direct details</span>
              <h2 id="contact-details-heading">Our details.</h2>
              <p>For general enquiries, email is the quickest way to reach us. You are also welcome to visit us at Smart Health Tower.</p>
              <dl>
                <div><dt><IconMail size={19} /> Email</dt><dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd></div>
                <div><dt><IconPin size={19} /> Location</dt><dd>{ADDRESS}</dd></div>
                <div><dt><IconClock size={19} /> Hours</dt><dd>Saturday to Thursday</dd></div>
                <div><dt><IconGlobe size={19} /> Online</dt><dd><a href={TOWER_URL} target="_blank" rel="noreferrer">smarthealthtower</a></dd></div>
              </dl>
              <div className="contact-social-section">
                <p>Follow Smart Health Tower</p>
                <SocialLinks className="socials contact-socials" />
              </div>
            </aside>
            <section className="contact-location" aria-labelledby="visit-heading">
              <div className="contact-location-orbit" aria-hidden="true"><span /><span /><i /></div>
              <span className="auth-kicker">Visit us</span>
              <h2 id="visit-heading">Smart Health Tower.</h2>
              <p>Located beside the University of Sulaymaniyah Old Campus, our team is easy to find when you need to visit in person.</p>
              <a className="contact-directions" href={DIRECTIONS_URL} target="_blank" rel="noreferrer">Get directions <IconArrowRight size={17} /></a>
              <small>Majid Bag Main Street · Sulaymaniyah, Iraq</small>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict}/>
    </>
  );
}
