import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ScrollMotion from "../../../components/ScrollMotion";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import TopicsExplorer from "../../../components/TopicsExplorer";
import { getDictionary } from "../../../lib/dictionaries";
import { getLibraryContent } from "../../../lib/content";
import { LOCALES, isLocale, localePath, type Locale } from "../../../lib/i18n";
import { getPublicTopicGroup, PUBLIC_TOPIC_GROUPS } from "../../../lib/topics";

type TopicPageParams = {
  locale: string;
  slug: string;
};

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    PUBLIC_TOPIC_GROUPS.map((group) => ({ locale, slug: group.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<TopicPageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const group = getPublicTopicGroup(slug);
  if (!isLocale(locale) || !group) notFound();

  const dict = getDictionary(locale);
  return {
    title: `${group.name} | ${dict.brand.name}`,
    description: group.intro,
    alternates: {
      canonical: localePath(locale, `topics/${group.slug}`),
    },
  };
}

/**
 * A topic detail URL is a deep-link into the Topics explorer, not a separate
 * page. It server-renders the shared experience already opened on this group,
 * so the URL stays shareable and crawlable while there is only one experience
 * to maintain.
 */
export default async function TopicDetailPage({
  params,
}: {
  params: Promise<TopicPageParams>;
}) {
  const { locale, slug } = await params;
  const group = getPublicTopicGroup(slug);
  if (!isLocale(locale) || !group) notFound();

  const active: Locale = locale;
  const [dict, items] = [getDictionary(active), await getLibraryContent()];

  return (
    <>
      <a className="skip-link" href="#main-content">
        {dict.nav.skipToContent}
      </a>

      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />

      <main id="main-content">
        <section className="section section-topic-index" aria-labelledby="topic-detail-heading">
          <h1 className="visually-hidden" id="topic-detail-heading">
            {group.name}
          </h1>
          <TopicsExplorer
            groups={PUBLIC_TOPIC_GROUPS}
            locale={active}
            t={dict.topics}
            initialSlug={group.slug}
            items={items}
          />
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
