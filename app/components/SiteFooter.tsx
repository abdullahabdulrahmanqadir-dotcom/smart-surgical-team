import Link from "next/link";
import { localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";
import { PUBLIC_TOPIC_GROUPS } from "../lib/topics";
import SocialLinks from "./SocialLinks";
import {
  BrandMark,
  IconMail,
  IconPin,
} from "./icons";

const CONTACT_EMAIL = "info@smartsurgicalteam.com";

export default function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const home = localePath(locale);

  return (
    <footer className="site-footer" id="contact">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand" href={home} aria-label={dict.brand.name}>
            <BrandMark size={54} />
            <span className="brand-name">{dict.brand.name}</span>
          </Link>
          <SocialLinks className="socials footer-socials" t={dict.social} showLabels />
        </div>

        <div className="footer-navigation">
          <nav className="footer-col" aria-label={dict.footer.learning}>
            <h3>{dict.footer.learning}</h3>
            <Link href={localePath(locale, "topics")}>{dict.nav.library}</Link>
            <Link href={localePath(locale, "research")}>{dict.nav.research}</Link>
            <Link href={localePath(locale, "posters")}>{dict.nav.posters}</Link>
          </nav>

          <nav className="footer-col" aria-label={dict.footer.teamUpdates}>
            <h3>{dict.footer.teamUpdates}</h3>
            <Link href={localePath(locale, "about")}>{dict.nav.about}</Link>
            <Link href={localePath(locale, "news")}>{dict.nav.news}</Link>
            <Link href={localePath(locale, "events")}>{dict.nav.events}</Link>
          </nav>

          <nav className="footer-col" aria-label={dict.topics.title}>
            <h3>{dict.topics.title}</h3>
            {PUBLIC_TOPIC_GROUPS.map((group) => (
              <Link key={group.slug} href={localePath(locale, `topics/${group.slug}`)}>
                {dict.taxonomy[group.slug as keyof Dictionary["taxonomy"]] ?? group.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer-col">
          <h3>{dict.footer.contactUs}</h3>
          <Link href={localePath(locale, "contact")}>{dict.footer.contactUs}</Link>
          <p>
            <IconMail size={16} />
            <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr">{CONTACT_EMAIL}</a>
          </p>
          <p>
            <IconPin size={16} /> {dict.footer.address}
          </p>
        </div>

      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {dict.brand.name}. {dict.footer.rights}
        </span>
        <span className="footer-legal">
          <Link href={localePath(locale, "privacy")}>{dict.footer.privacy}</Link>
          <Link href={localePath(locale, "terms")}>{dict.footer.terms}</Link>
        </span>
      </div>
    </footer>
  );
}
