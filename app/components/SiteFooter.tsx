import { localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";
import { PUBLIC_TOPIC_GROUPS } from "../lib/topics";
import {
  BrandMark,
  IconGlobe,
  IconLinkedin,
  IconMail,
  IconPin,
  IconYoutube,
} from "./icons";

// PLACEHOLDER: the address is confirmed, but the contact email and the domain
// are both still to be supplied — the brief lists the domain as not yet chosen.
const CONTACT_EMAIL = "info@smartsurgicalteam.com";
const SITE_DOMAIN = "smartsurgicalteam.com";
const ADDRESS = "Smart Health Tower, Sulaymaniah, Kurdistan Region, Iraq";

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
          <div className="socials">
            <a href={home} aria-label="YouTube">
              <IconYoutube size={18} />
            </a>
            <a href={home} aria-label="LinkedIn">
              <IconLinkedin size={18} />
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} aria-label={dict.nav.contact}>
              <IconMail size={18} />
            </a>
          </div>
        </div>

        <nav className="footer-col" aria-label={dict.footer.quickLinks}>
          <h3>{dict.footer.quickLinks}</h3>
          <a href={`${home}#library`}>{dict.nav.library}</a>
          <a href={localePath(locale, "topics")}>{dict.nav.topics}</a>
          <a href={`${home}#webinars`}>{dict.nav.webinars}</a>
          <a href={`${home}#team`}>{dict.nav.team}</a>
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
            <IconGlobe size={16} /> {SITE_DOMAIN}
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
