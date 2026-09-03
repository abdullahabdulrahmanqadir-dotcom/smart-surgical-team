import type { Metadata } from "next";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import ResearchExplorer from "../../components/ResearchExplorer";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { getResearches, getResearchTopics } from "../../lib/research";
import { notFound } from "next/navigation";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: "research", title: dict.seo.researchTitle, description: dict.seo.researchDescription });
}

export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const [publications, topics] = await Promise.all([getResearches(), getResearchTopics()]);
  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><ScrollMotion/><main id="main-content">
    <ResearchExplorer publications={publications} topics={topics} locale={active} t={dict.research}/>
  </main><SiteFooter locale={active} dict={dict}/></>;
}
