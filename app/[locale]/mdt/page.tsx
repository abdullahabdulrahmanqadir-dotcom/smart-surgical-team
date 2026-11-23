import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MdtInquiryForm from "../../components/MdtInquiryForm";
import SiteFooter from "../../components/SiteFooter";
import ScrollMotion from "../../components/ScrollMotion";
import SiteHeader from "../../components/SiteHeader";
import { IconAlert, IconArrowRight, IconCalendar, IconClock, IconFile, IconLayers, IconLink, IconMail, IconUser, IconUsers } from "../../components/icons";
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
  ["wayPresentTitle", "wayPresentBody", IconFile],
  ["wayCollaborateTitle", "wayCollaborateBody", IconLink],
] as const;

const STEPS = [
  ["step1Title", "step1Body", IconMail],
  ["step2Title", "step2Body", IconCalendar],
  ["step3Title", "step3Body", IconUsers],
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
  const chips = (items: string[]) => (
    <ul className="mdt-chips">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />
      <main id="main-content" className="ask-page mdt-page">
        <div className="ask-shell">
          {/* Intro and fact panel share the first screen on wide displays, so
              a visiting doctor sees who meets and on what cases without
              scrolling; on phones the facts follow the intro. */}
          <div className="mdt-hero">
            <header className="ask-intro mdt-intro">
              {/* The department that runs the meeting, as a lockup rather than
                  a kicker: the brand mark stays Latin in both locales. */}
              <p className="mdt-dept">
                <span className="mdt-dept-mark">{dict.brand.short}</span>{" "}
                <span className="mdt-dept-name">{t.department}</span>
              </p>
              <h1>{t.title}</h1>
              <p className="mdt-lede">{t.intro}</p>
              <a className="btn btn-primary mdt-cta" href="#mdt-form">{t.ctaInquiry}<IconArrowRight size={17} /></a>
            </header>

            {/* The lists come from MDT_FACTS (confirmed facts only). The stage
                holds the decorative depth layers behind the floating panel. */}
            <div className="mdt-facts-stage">
            <dl className="mdt-facts" aria-label={t.factsLabel}>
              <div>
                <dt><IconLayers size={18} />{t.factSpecialties}</dt>
                <dd>{chips(MDT_FACTS.specialties.map((specialty) => t[SPECIALTY_LABEL[specialty]]))}</dd>
              </div>
              <div>
                <dt><IconFile size={18} />{t.factCases}</dt>
                <dd>{chips(MDT_FACTS.caseAreas.map((area) => t[CASE_LABEL[area]]))}</dd>
              </div>
              <div>
                <dt><IconClock size={18} />{t.factSchedule}</dt>
                <dd>{MDT_FACTS.schedule ? MDT_FACTS.schedule[active] : t.meetPending}</dd>
              </div>
            </dl>
            </div>
          </div>

          <section className="mdt-ways" aria-labelledby="mdt-ways-title">
            <div className="mdt-section-head">
              <h2 id="mdt-ways-title">{t.waysTitle}</h2>
              <p>{t.waysIntro}</p>
            </div>
            {/* Alternatives, not steps: a list without numbers. */}
            <ul>
              {WAYS.map(([title, body, Icon]) => (
                <li key={title} className="mdt-way">
                  <span className="mdt-way-icon" aria-hidden="true"><Icon size={22} /></span>
                  <h3>{t[title]}</h3>
                  <p>{t[body]}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mdt-steps" aria-labelledby="mdt-steps-title">
            <div className="mdt-section-head">
              <h2 id="mdt-steps-title">{t.stepsTitle}</h2>
            </div>
            {/* A real sequence, so an ordered list with visible numbers. */}
            <ol>
              {STEPS.map(([title, body, Icon], index) => (
                <li key={title} className="mdt-step">
                  <span className="mdt-step-marker" aria-hidden="true">
                    <span className="mdt-step-number">{index + 1}</span>
                    <Icon size={20} />
                  </span>
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
