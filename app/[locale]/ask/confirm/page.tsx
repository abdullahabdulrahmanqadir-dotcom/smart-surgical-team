import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConfirmQuestionEmail from "../../../components/ConfirmQuestionEmail";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, type Locale } from "../../../lib/i18n";
import "../ask.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  return {
    title: getDictionary(active).seo.askConfirmTitle,
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmQuestionEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="ask-page ask-page-confirm">
        <div className="ask-shell">
          <ConfirmQuestionEmail locale={active} t={dict.ask} />
        </div>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
