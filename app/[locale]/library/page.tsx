import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import CaseCard, { type LibraryItem } from "../../components/CaseCard";
import CaseLibraryExplorer from "../../components/CaseLibraryExplorer";
import { IconArrowRight } from "../../components/icons";
import { getLibraryContent } from "../../lib/content";
import { fill, getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { pageMetadata } from "../../lib/seo";
import { getPublicTopicTree } from "../../lib/topic-tree";
import { localizeTopicGroups, PUBLIC_TOPIC_GROUPS } from "../../lib/topics";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: "library", title: dict.seo.libraryTitle, description: dict.seo.libraryDescription });
}

/**
 * `/library` had no index. Seventy-seven `/library/<slug>` pages existed and
 * were in the sitemap, but the parent path returned a bare "Not Found", so
 * anyone who trimmed a URL or followed a truncated link hit a dead end. Cases
 * were reachable only by drilling through a topic.
 */
export default async function LibraryIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.libraryIndex;

  const [cards, tree] = await Promise.all([getLibraryContent(), getPublicTopicTree()]);
  const groups = localizeTopicGroups(tree, dict.taxonomy);
  const fallbackGroup = groups[0] ?? PUBLIC_TOPIC_GROUPS[0];
  const subTopicIndex = new Map(
    groups.flatMap((group) =>
      group.subTopics.map((sub) => [sub.slug, { group, sub }] as const),
    ),
  );
  const groupIndex = new Map(groups.map((group) => [group.slug, group] as const));

  const items = cards
    .slice()
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .map((card) => {
      // A card carries every topic it is filed under; the first that resolves
      // to a known sub-topic decides the label and the fallback glyph.
      const match = card.topics.map(({ slug }) => subTopicIndex.get(slug)).find(Boolean);
      const group = match?.group ?? groupIndex.get(card.topicSlug) ?? fallbackGroup;
      const name = match?.sub.name ?? groupIndex.get(card.topicSlug)?.name ?? (card.topic || group.name);
      const item: LibraryItem = {
        ...card,
        subTopic: name,
        subTopicNames: [name],
        imageIcon: match?.sub.imageIcon ?? group.imageIcon,
        date: card.publishedAt
          ? new Intl.DateTimeFormat(active, { month: "short", year: "numeric" }).format(new Date(card.publishedAt))
          : dict.topics.recentlyAdded,
        hasVideo: card.kind === "video" || card.kind === "webinar_recording",
      };
      const topicSlugs = [...new Set([card.topicSlug, ...card.topics.map(({ slug }) => slug)]
        .map((slug) => subTopicIndex.get(slug)?.group.slug ?? slug))];
      const searchText = [card.title, card.summary, name, ...card.topics.map(({ name }) => name),
        ...topicSlugs.map((slug) => groupIndex.get(slug)?.name)].join(" ").toLocaleLowerCase();
      return {
        slug: item.slug,
        topicSlugs,
        searchText,
        card: <CaseCard item={item} icon={group.icon} t={dict.topics} locale={active} />,
      };
    });
  const usedTopics = new Set(items.flatMap(({ topicSlugs }) => topicSlugs));
  const filterTopics = groups.filter(({ slug }) => usedTopics.has(slug))
    .map(({ slug, name }) => ({ value: slug, label: name }));

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="library-index">
        <header className="library-index-head">
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
          <p className="library-index-count">
            {items.length === 1 ? t.countOne : fill(t.countMany, { count: items.length })}
          </p>
          <Link className="text-link" href={localePath(active, "topics")}>
            {t.browseByTopic}
            <IconArrowRight size={16} />
          </Link>
        </header>

        {items.length ? (
          <CaseLibraryExplorer entries={items} topics={filterTopics} t={t} labels={dict.topics} />
        ) : (
          <div className="events-empty">
            <h2>{t.empty}</h2>
            <p>{t.emptyBody}</p>
          </div>
        )}
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
