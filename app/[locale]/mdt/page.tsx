import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MdtInquiryForm from "../../components/MdtInquiryForm";
import MdtWriteText from "../../components/MdtWriteText";
import TitleMotion from "../../components/TitleMotion";
import SiteFooter from "../../components/SiteFooter";
import ScrollMotion from "../../components/ScrollMotion";
import SiteHeader from "../../components/SiteHeader";
import { IconAlert, IconArrowRight, IconCalendar, IconClock, IconFile, IconLayers, IconMail, IconUser, IconUsers } from "../../components/icons";
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
  salivaryGlands: "caseSalivaryGlands",
  lymphNodes: "caseLymphNodes",
  skinSoftTissue: "caseSkinSoftTissue",
  neckMasses: "caseNeckMasses",
  breast: "caseBreast",
  headNeck: "caseHeadNeck",
} as const satisfies Record<MdtCaseArea, string>;

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
  const renderList = (items: string[], className: string) => (
    <ul className={className}>
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
                <span className="mdt-dept-name">
                  <MdtWriteText text={t.department} immediate delayMs={240} stepMs={65} wordDurationMs={340} />
                </span>
              </p>
              <TitleMotion as="h1" text={t.title} variant="write" immediate delayMs={100} stepMs={90} wordDurationMs={400} cursor />
              <p className="mdt-lede">
                <MdtWriteText text={t.intro} immediate delayMs={420} stepMs={26} wordDurationMs={300} />
              </p>
              <a className="btn btn-primary mdt-cta" href="#mdt-form">{t.ctaInquiry}<IconArrowRight size={17} /></a>
            </header>

            {/* The lists come from MDT_FACTS (confirmed facts only). The stage
                holds the subtle layered paper sheet behind the brief. */}
            <div className="mdt-facts-stage">
            <dl className="mdt-facts" aria-label={t.factsLabel}>
              <div className="mdt-fact-specialties">
                <dt><IconLayers size={15} />{t.factSpecialties}</dt>
                <dd>{renderList(MDT_FACTS.specialties.map((specialty) => t[SPECIALTY_LABEL[specialty]]), "mdt-specialty-list")}</dd>
              </div>
              <div className="mdt-fact-cases">
                <dt><IconFile size={15} />{t.factCases}</dt>
                <dd>{renderList(MDT_FACTS.caseAreas.map((area) => t[CASE_LABEL[area]]), "mdt-case-tags")}</dd>
              </div>
              <div className="mdt-fact-schedule">
                <dt><IconClock size={15} />{t.factSchedule}</dt>
                <dd>
                  <MdtWriteText
                    text={MDT_FACTS.schedule ? MDT_FACTS.schedule[active] : t.meetPending}
                    immediate
                    delayMs={580}
                    stepMs={30}
                    wordDurationMs={300}
                  />
                </dd>
              </div>
            </dl>
            </div>
          </div>

          <section className="mdt-steps" aria-labelledby="mdt-steps-title">
            <div className="mdt-section-head">
              <TitleMotion as="h2" id="mdt-steps-title" text={t.stepsTitle} variant="curtain" delayMs={40} />
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
                  <TitleMotion as="h2" id="mdt-notice-title" text={t.noticeTitle} variant="focus" delayMs={60} />
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
