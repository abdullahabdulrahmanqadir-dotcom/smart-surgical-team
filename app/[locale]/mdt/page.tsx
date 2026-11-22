import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MdtInquiryForm from "../../components/MdtInquiryForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { IconAlert, IconArrowRight, IconClock, IconShield, IconUser } from "../../components/icons";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { MDT_FACTS, type MdtCaseArea, type MdtSpecialty } from "../../lib/mdt-inquiries";
import { pageMetadata } from "../../lib/seo";
import "../ask/ask.css";
import "./mdt.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return {
    ...pageMetadata({ locale: active, path: "mdt", title: dict.seo.mdtTitle, description: dict.seo.mdtDescription }),
    // Built but not launched (phase 1 of the MDT spec): kept out of search
    // until the team confirms the facts and it is linked from the site.
    robots: { index: false, follow: true },
  };
}

const SPECIALTY_LABEL = {
  endocrineSurgery: "specialtyEndocrineSurgery",
  breastSurgery: "specialtyBreastSurgery",
  headNeckSurgery: "specialtyHeadNeckSurgery",
  endocrinology: "specialtyEndocrinology",
  radiology: "specialtyRadiology",
  pathology: "specialtyPathology",
  oncology: "specialtyOncology",
  nuclearMedicine: "specialtyNuclearMedicine",
} as const satisfies Record<MdtSpecialty, string>;

const CASE_LABEL = {
  thyroid: "caseThyroid",
  parathyroid: "caseParathyroid",
  breast: "caseBreast",
  headNeck: "caseHeadNeck",
} as const satisfies Record<MdtCaseArea, string>;

const WAYS = [
  ["wayPresentTitle", "wayPresentBody"],
  ["wayAttendTitle", "wayAttendBody"],
  ["wayObserveTitle", "wayObserveBody"],
  ["wayCollaborateTitle", "wayCollaborateBody"],
] as const;

/**
 * /:locale/mdt — tells outside doctors, teams and institutes about our MDT
 * and takes an inquiry. A front door only: everything else is agreed by email.
 *
 * Code-defined with no database read, so it is cached like /ask and /contact.
 * Spec: docs/superpowers/specs/2026-11-22-mdt-front-door-design.md.
 */
export default async function MdtPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.mdt;

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="ask-page mdt-page">
        <div className="ask-shell">
          <header className="ask-intro">
            <p className="section-kicker">{t.kicker}</p>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
          </header>

          <div className="mdt-overview">
            <section className="mdt-panel" aria-labelledby="mdt-who-title">
              <h2 id="mdt-who-title">{t.whoTitle}</h2>
              <p>{t.whoIntro}</p>
              <ul className="mdt-chips">
                {MDT_FACTS.specialties.map((specialty) => <li key={specialty}>{t[SPECIALTY_LABEL[specialty]]}</li>)}
              </ul>
            </section>
            <section className="mdt-panel" aria-labelledby="mdt-cases-title">
              <h2 id="mdt-cases-title">{t.casesTitle}</h2>
              <ul className="mdt-chips">
                {MDT_FACTS.caseAreas.map((area) => <li key={area}>{t[CASE_LABEL[area]]}</li>)}
              </ul>
            </section>
            <section className="mdt-panel" aria-labelledby="mdt-meet-title">
              <h2 id="mdt-meet-title">{t.meetTitle}</h2>
              <p>{MDT_FACTS.schedule ? MDT_FACTS.schedule[active] : t.meetPending}</p>
            </section>
          </div>

          <section className="mdt-ways" aria-labelledby="mdt-ways-title">
            <h2 id="mdt-ways-title">{t.waysTitle}</h2>
            <p>{t.waysIntro}</p>
            <ol>
              {WAYS.map(([title, body]) => (
                <li key={title}>
                  <h3>{t[title]}</h3>
                  <p>{t[body]}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="ask-layout mdt-form-layout" id="mdt-form">
            <aside className="ask-guide">
              <section className="ask-emergency" aria-labelledby="mdt-notice-title">
                <IconAlert size={22} />
                <div>
                  <h2 id="mdt-notice-title">{t.noticeTitle}</h2>
                  <p>{t.noticeBody}</p>
                </div>
              </section>

              <dl className="ask-facts">
                <div>
                  <dt><IconClock size={18} />{t.nextTitle}</dt>
                  <dd>{t.nextBody}</dd>
                </div>
                <div>
                  <dt><IconShield size={18} />{t.privacyTitle}</dt>
                  <dd>{t.privacyBody} <Link className="text-link" href={localePath(active, "privacy")}>{t.privacyLink}</Link></dd>
                </div>
                <div className="mdt-patient">
                  <dt><IconUser size={18} />{t.patientTitle}</dt>
                  <dd>
                    {t.patientBody}{" "}
                    <Link className="text-link" href={localePath(active, "ask")}>{t.patientLink}<IconArrowRight size={15} /></Link>
                  </dd>
                </div>
              </dl>
            </aside>

            <MdtInquiryForm locale={active} t={t} />
          </div>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
