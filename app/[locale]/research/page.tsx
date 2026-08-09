import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ResearchExplorer from "../../components/ResearchExplorer";
import ScrollMotion from "../../components/ScrollMotion";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { getResearches } from "../../lib/research";
import { notFound } from "next/navigation";

export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const publications = await getResearches();
  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><ScrollMotion/><main id="main-content">
    <ResearchExplorer publications={publications} locale={active} t={dict.research}/>
  </main><SiteFooter locale={active} dict={dict}/></>;
}
