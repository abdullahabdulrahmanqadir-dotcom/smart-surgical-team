import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "../../components/LegalPage";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale } from "../../lib/i18n";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const active = isLocale(locale) ? locale : "en"; const dict = getDictionary(active); return pageMetadata({ locale: active, path: "terms", title: dict.seo.termsTitle, description: dict.seo.termsDescription }); }
export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); const dict = getDictionary(locale); return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={locale} dict={dict}/><ScrollMotion/><div id="main-content"><LegalPage locale={locale} kind="terms"/></div><SiteFooter locale={locale} dict={dict}/></>; }
