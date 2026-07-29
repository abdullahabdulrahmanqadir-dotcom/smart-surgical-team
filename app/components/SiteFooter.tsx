import { localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";
import { PUBLIC_TOPIC_GROUPS } from "../lib/topics";
import {
  BrandMark,
  IconGlobe,
  IconMail,
  IconPin,
} from "./icons";

// PLACEHOLDER: the address is confirmed, but the contact email and the domain
// are both still to be supplied — the brief lists the domain as not yet chosen.
const CONTACT_EMAIL = "info@smartsurgicalteam.com";
const TOWER_URL = "https://smarthealth.group/ar";
const ADDRESS = "Majid Bag Main Street, Beside University of Sulaymaniyah Old Campus, Madam Mitterrand, Sulaymaniyah, Iraq";
const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/SmartHTA" },
  { label: "Instagram", href: "https://www.instagram.com/smarthealthtowerarabic/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/smart-health-tower/" },
  { label: "TikTok", href: "https://www.tiktok.com/@smarthealthtowerarabic?_t=8cT8B1EIlHy&_r=1" },
  { label: "X", href: "https://twitter.com/smarthealthtow2" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UC03cV_1kafDf1uyZPXx93CA" },
];

/**
 * Extracted from the home page so every page shares one footer. The class names
 * are the originals — their styles already exist in globals.css and the
 * four-column grid depends on this exact structure.
 */
export default function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const home = localePath(locale);

  return (
    <footer className="site-footer" id="contact">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="brand" href={home}>
            <BrandMark size={32} />
            <span className="brand-name">
              {dict.brand.name}
              <small>Head &amp; Neck Education</small>
            </span>
          </a>
          <p>{dict.footer.blurb}</p>
          <div className="socials socials-expanded" aria-label="Smart Health Tower social media">
            {SOCIAL_LINKS.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noreferrer">
                {social.label}
              </a>
            ))}
          </div>
        </div>

        <nav className="footer-col" aria-label={dict.footer.quickLinks}>
          <h3>{dict.footer.quickLinks}</h3>
          <a href={localePath(locale, "contact")}>{dict.footer.contactUs}</a>
          <a href={localePath(locale, "topics")}>{dict.nav.topics}</a>
          <a href={localePath(locale, "events")}>{dict.nav.events}</a>
          <a href={localePath(locale, "about")}>{dict.nav.about}</a>
        </nav>

        <div className="footer-col">
          <h3>{dict.footer.contactUs}</h3>
          <p>
            <IconMail size={16} />
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <p>
            <IconPin size={16} /> {ADDRESS}
          </p>
          <p>
            <IconGlobe size={16} /> <a href={TOWER_URL} target="_blank" rel="noreferrer">smarthealthtower</a>
          </p>
        </div>

        {/* Replaces a hardcoded Sorani column from the pre-i18n design. That
            column existed to show *some* Kurdish on an English-only page; the
            locale switcher does that job properly now, and on /ckb the whole
            page is already Kurdish. */}
        <nav className="footer-col" aria-label={dict.topics.title}>
          <h3>{dict.topics.title}</h3>
          {PUBLIC_TOPIC_GROUPS.map((group) => (
            <a key={group.slug} href={localePath(locale, `topics/${group.slug}`)}>
              {group.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {dict.brand.name}. {dict.footer.rights}
        </span>
        <span className="footer-legal">
          <a href={home}>{dict.footer.privacy}</a>
          <a href={home}>{dict.footer.terms}</a>
        </span>
      </div>
    </footer>
  );
}
