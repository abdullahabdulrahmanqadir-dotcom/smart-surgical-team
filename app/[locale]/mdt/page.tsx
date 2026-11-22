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
  // Labels are title-like ("Head and neck surgery"), so a middot line reads
  // cleaner than a sentence joined with "and", and needs no per-language grammar.
  const list = (items: string[]) => items.join(" · ");

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="ask-page mdt-page">
        <div className="ask-shell">
          <header className="ask-intro mdt-intro">
            <p className="section-kicker">{t.kicker}</p>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            <a className="btn btn-primary mdt-cta" href="#mdt-form">{t.ctaInquiry}<IconArrowRight size={17} /></a>
          </header>

          {/* A ruled fact sheet, like the contact page's details list. The
              lists come from MDT_FACTS (confirmed facts only). */}
          <dl className="mdt-facts" aria-label={t.factsLabel}>
            <div>
              <dt>{t.factSpecialties}</dt>
              <dd>{list(MDT_FACTS.specialties.map((specialty) => t[SPECIALTY_LABEL[specialty]]))}</dd>
            </div>
            <div>
              <dt>{t.factCases}</dt>
              <dd>{list(MDT_FACTS.caseAreas.map((area) => t[CASE_LABEL[area]]))}</dd>
            </div>
            <div>
              <dt>{t.factSchedule}</dt>
              <dd>{MDT_FACTS.schedule ? MDT_FACTS.schedule[active] : t.meetPending}</dd>
            </div>
          </dl>

          <section className="mdt-ways" aria-labelledby="mdt-ways-title">
            <h2 id="mdt-ways-title">{t.waysTitle}</h2>
            <p>{t.waysIntro}</p>
            {/* Alternatives, not steps: a list without numbers. */}
            <ul>
              {WAYS.map(([title, body]) => (
                <li key={title}>
                  <h3>{t[title]}</h3>
                  <p>{t[body]}</p>
                </li>
              ))}
            </ul>
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
                    <Link className="text-link" href={`${localePath(active, "contact")}#ask`}>{t.patientLink}<IconArrowRight size={15} /></Link>
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
