import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ScrollMotion from "../../components/ScrollMotion";
import TopicsExplorer from "../../components/TopicsExplorer";
import { LOCALES, isLocale, localePath, type Locale } from "../../lib/i18n";
import { getDictionary } from "../../lib/dictionaries";
import { localizeTopicGroups, PUBLIC_TOPIC_GROUPS } from "../../lib/topics";
import { getLibraryContent } from "../../lib/content";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");

  return {
    title: `${dict.topics.title} | ${dict.brand.name}`,
    description: dict.topics.intro,
    alternates: { canonical: localePath(isLocale(locale) ? locale : "en", "topics") },
  };
}

export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const active: Locale = locale;
  // No topic is selected on this route, so no cases are rendered — this page
  // used to fetch and serialise the entire published catalogue in order to
  // display none of it. Each topic is now fetched when the reader opens it.
  const dict = getDictionary(active);
  const groups = localizeTopicGroups(PUBLIC_TOPIC_GROUPS, dict.taxonomy);
  const latestCase = (await getLibraryContent())[0];

  return (
    <>
      <a className="skip-link" href="#main-content">
        {dict.nav.skipToContent}
      </a>

      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />

      <main id="main-content">
        <section className="section section-topic-index" aria-labelledby="topic-index-heading">
          <h1 className="visually-hidden" id="topic-index-heading">{dict.topics.title}</h1>
          <TopicsExplorer groups={groups} locale={active} t={dict.topics} anatomyLabels={dict.anatomy} initialLatestCase={latestCase} />
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
