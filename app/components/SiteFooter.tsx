import { localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";
import { TOPIC_GROUPS } from "../lib/topics";
import { BrandMark, IconMail, IconPin } from "./icons";

/**
 * Shared across every page. Routes that do not exist yet stay as in-page
 * anchors on the home page rather than shipping as dead links.
 */
export default function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a className="brand" href={localePath(locale)}>
            <BrandMark />
            <span className="brand-name">
              {dict.brand.name}
              <small>Head &amp; Neck Education</small>
            </span>
          </a>
          <p className="footer-tagline">{dict.brand.tagline}</p>
          <p className="footer-address">
            <IconPin size={15} />
            {dict.brand.location}
          </p>
        </div>

        <nav className="footer-col" aria-label={dict.footer.explore}>
          <h2 className="footer-heading">{dict.footer.explore}</h2>
          <ul>
            <li>
              <a href={localePath(locale, "topics")}>{dict.nav.topics}</a>
            </li>
            <li>
              <a href={localePath(locale) + "#library"}>{dict.nav.library}</a>
            </li>
            <li>
              <a href={localePath(locale) + "#webinars"}>{dict.nav.webinars}</a>
            </li>
          </ul>
        </nav>

        <nav className="footer-col" aria-label={dict.topics.title}>
          <h2 className="footer-heading">{dict.topics.title}</h2>
          <ul>
            {TOPIC_GROUPS.map((group) => (
              <li key={group.slug}>
                <a href={localePath(locale, `topics/${group.slug}`)}>{group.name}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-label={dict.footer.connect}>
          <h2 className="footer-heading">{dict.footer.connect}</h2>
          <ul>
            <li>
              <a href={localePath(locale) + "#contact"}>
                <IconMail size={15} />
                {dict.nav.contact}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="footer-base">
        <p>
          © {year} {dict.brand.name}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
