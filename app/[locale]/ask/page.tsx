import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AskQuestionForm from "../../components/AskQuestionForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { IconAlert, IconArrowRight, IconCheck, IconClock, IconClose, IconPhone, IconShield } from "../../components/icons";
import { fill, getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { ASK_CONTACT, REPLY_WITHIN_WORKING_DAYS } from "../../lib/patient-questions";
import { pageMetadata } from "../../lib/seo";
import "./ask.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return {
    ...pageMetadata({ locale: active, path: "ask", title: dict.seo.askTitle, description: dict.seo.askDescription }),
    // Built but not launched (phase 1 of docs/patient-questions-plan.md):
    // kept out of search until it is linked from the site.
    robots: { index: false, follow: true },
  };
}

/**
 * /:locale/ask — patients send the team a general question.
 *
 * Code-defined like /contact, with no database read, so it is cached by the
 * same Worker/browser layers. The notices sit in the DOM before the form, so
 * a screen reader and a phone both meet "what we answer" and the emergency
 * notice first; on wide screens the grid puts the form on the leading side.
 */
export default async function AskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.ask;
  const days = String(REPLY_WITHIN_WORKING_DAYS);

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="ask-page">
        <div className="ask-shell">
          <header className="ask-intro">
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
          </header>

          <div className="ask-layout">
            <aside className="ask-guide">
              <section className="ask-emergency" aria-labelledby="ask-emergency-title">
                <IconAlert size={22} />
                <div>
                  <h2 id="ask-emergency-title">{t.emergencyTitle}</h2>
                  <p>{t.emergencyBody}</p>
                  {ASK_CONTACT.emergencyNumber && (
                    <p className="ask-emergency-call">
                      <a href={`tel:${ASK_CONTACT.emergencyNumber}`} dir="ltr">{fill(t.emergencyCall, { number: ASK_CONTACT.emergencyNumber })}</a>
                    </p>
                  )}
                </div>
              </section>

              <div className="ask-scope">
                <section aria-labelledby="ask-can-title">
                  <h2 id="ask-can-title"><span className="ask-scope-mark is-yes"><IconCheck size={15} /></span>{t.canTitle}</h2>
                  <p>{t.canBody}</p>
                </section>
                <section aria-labelledby="ask-cannot-title">
                  <h2 id="ask-cannot-title"><span className="ask-scope-mark is-no"><IconClose size={15} /></span>{t.cannotTitle}</h2>
                  <p>{t.cannotBody}</p>
                </section>
              </div>

              <dl className="ask-facts">
                <div>
                  <dt><IconPhone size={18} />{t.bookTitle}</dt>
                  <dd>
                    {ASK_CONTACT.bookingPhone
                      ? <>{t.bookBody} <a href={`tel:${ASK_CONTACT.bookingPhone}`} dir="ltr">{ASK_CONTACT.bookingPhone}</a></>
                      : <Link className="text-link" href={localePath(active, "contact")}>{t.bookFallback}<IconArrowRight size={15} /></Link>}
                  </dd>
                </div>
                <div>
                  <dt><IconClock size={18} />{t.replyTitle}</dt>
                  <dd>{fill(t.replyBody, { days })}</dd>
                </div>
                <div>
                  <dt><IconShield size={18} />{t.privacyTitle}</dt>
                  <dd>{t.privacyBody} <Link className="text-link" href={localePath(active, "privacy")}>{t.privacyLink}</Link></dd>
                </div>
              </dl>
            </aside>

            <AskQuestionForm locale={active} t={t} />
          </div>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
