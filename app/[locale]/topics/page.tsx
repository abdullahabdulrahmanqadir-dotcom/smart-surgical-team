import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ScrollMotion from "../../components/ScrollMotion";
import TopicsExplorer from "../../components/TopicsExplorer";
import { LOCALES, isLocale, localePath, type Locale } from "../../lib/i18n";
import { getDictionary } from "../../lib/dictionaries";
import { PUBLIC_TOPIC_GROUPS } from "../../lib/topics";

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
  const dict = getDictionary(active);

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
          <TopicsExplorer groups={PUBLIC_TOPIC_GROUPS} locale={active} />
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
