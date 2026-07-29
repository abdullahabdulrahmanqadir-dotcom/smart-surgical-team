import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ContactForm from "../../components/ContactForm";
import SocialLinks from "../../components/SocialLinks";
import { IconClock, IconGlobe, IconMail, IconPin } from "../../components/icons";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

const CONTACT_EMAIL = "info@smartsurgicalteam.com";
const ADDRESS = "Majid Bag Main Street, Beside University of Sulaymaniyah Old Campus, Madam Mitterrand, Sulaymaniyah, Iraq";
const TOWER_URL = "https://smarthealth.group/ar";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict}/>
      <main id="main-content" className="contact-page">
        <div className="contact-backdrop" aria-hidden="true"/>
        <div className="contact-shell">
          <header className="contact-intro">
            <span className="eyebrow">Contact Smart Surgical Team</span>
            <h1>Start a useful conversation.</h1>
            <p>Whether you have a clinical education question, an event enquiry, or an idea for collaboration, we would be glad to hear from you.</p>
          </header>
          <div className="contact-layout">
            <section className="contact-panel" aria-labelledby="contact-form-heading">
              <div className="contact-panel-head">
                <span className="auth-kicker">Send us a message</span>
                <h2 id="contact-form-heading">How can we help?</h2>
                <p>Share a few details and the right member of our team will follow up.</p>
              </div>
              <ContactForm />
            </section>
            <aside className="contact-details" aria-labelledby="contact-details-heading">
              <span className="auth-kicker">Direct details</span>
              <h2 id="contact-details-heading">Reach our team.</h2>
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
          </div>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict}/>
    </>
  );
}
