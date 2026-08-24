import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ScrollMotion from "../../../components/ScrollMotion";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import TopicsExplorer from "../../../components/TopicsExplorer";
import { fill, getDictionary } from "../../../lib/dictionaries";
import { getTopicContent } from "../../../lib/content";
import { LOCALES, isLocale, type Locale } from "../../../lib/i18n";
import { getPublicTopicGroup, localizeTopicGroups, PUBLIC_TOPIC_GROUPS } from "../../../lib/topics";
import { getPublicTopicTree, topicSlugsFor } from "../../../lib/topic-tree";
import { pageMetadata } from "../../../lib/seo";

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
  const topic = dict.taxonomy[group.slug as keyof typeof dict.taxonomy] ?? group.name;
  return pageMetadata({
    locale,
    path: `topics/${group.slug}`,
    title: fill(dict.seo.topicTitle, { topic }),
    description: fill(dict.seo.topicDescription, { topic }),
  });
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
  // Only this group's cases are rendered and serialised. The other topics are
  // fetched by the explorer if and when the reader opens them.
  const dict = getDictionary(active);
  // The subtopics come from the database, so a subtopic added in the admin
  // filters and lists here without a code release.
  const groups = localizeTopicGroups(await getPublicTopicTree(), dict.taxonomy);
  const localizedGroup = groups.find((candidate) => candidate.slug === group.slug) ?? group;
  const items = await getTopicContent(topicSlugsFor(groups.find((candidate) => candidate.slug === group.slug) ?? group));

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
            {localizedGroup.name}
          </h1>
          <TopicsExplorer
            groups={groups}
            locale={active}
            t={dict.topics}
            anatomyLabels={dict.anatomy}
            initialSlug={group.slug}
            initialItems={items}
          />
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
