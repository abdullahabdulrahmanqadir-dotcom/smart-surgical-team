import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "../../components/LegalPage";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale } from "../../lib/i18n";

export function generateMetadata(): Metadata { return { title: "Terms of Use | Smart Surgical Team", robots: { index: true, follow: true } }; }
export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); const dict = getDictionary(locale); return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={locale} dict={dict}/><div id="main-content"><LegalPage locale={locale} kind="terms"/></div><SiteFooter locale={locale} dict={dict}/></>; }
