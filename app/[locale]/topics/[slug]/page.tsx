import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ScrollMotion from "../../../components/ScrollMotion";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import TopicGlyph from "../../../components/TopicGlyph";
import TopicHero from "../../../components/TopicHero";
import {
  IconArrowRight,
  IconFile,
  IconSparkle,
} from "../../../components/icons";
import { getDictionary } from "../../../lib/dictionaries";
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

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<TopicPageParams>;
}) {
  const { locale, slug } = await params;
  const group = getPublicTopicGroup(slug);
  if (!isLocale(locale) || !group) notFound();

  const active: Locale = locale;
  const dict = getDictionary(active);
  const related = PUBLIC_TOPIC_GROUPS.filter((candidate) => candidate.slug !== group.slug);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {dict.nav.skipToContent}
      </a>

      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />

      <main id="main-content">
        <TopicHero title={group.name} intro={group.intro}>
          <Link className="topic-hero-back" href={localePath(active, "topics")}>
            <IconArrowRight className="topic-hero-back-arrow" size={16} />
            {dict.topics.backToTopics}
          </Link>
        </TopicHero>

        <section className="section topic-detail" aria-labelledby="focus-heading">
          <div className="topic-detail-heading" data-scroll-reveal>
            <span
              className={`topic-detail-glyph${group.imageIcon ? " topic-glyph-image" : ""}`}
              aria-hidden="true"
            >
              <TopicGlyph
                icon={group.icon}
                imageIcon={group.imageIcon}
                size={58}
              />
            </span>
            <div>
              <p className="section-kicker">{dict.topics.focusAreas}</p>
              <h2 id="focus-heading">{group.name}</h2>
            </div>
          </div>

          <div className="topic-detail-grid">
            <div className="subtopic-list" data-scroll-reveal>
              {group.subTopics.map((subTopic, index) => (
                <article className="subtopic-item" key={subTopic.slug}>
                  <span className="subtopic-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="subtopic-icon" aria-hidden="true">
                    <TopicGlyph
                      icon={group.icon}
                      imageIcon={subTopic.imageIcon}
                      size={46}
                    />
                  </span>
                  <h3>{subTopic.name}</h3>
                </article>
              ))}
            </div>

            <aside className="topic-empty-state" data-scroll-reveal>
              <span className="topic-empty-icon" aria-hidden="true">
                <IconFile size={26} />
                <IconSparkle className="topic-empty-sparkle" size={16} />
              </span>
              <p className="section-kicker">{dict.topics.collectionKicker}</p>
              <h2>{dict.topics.collectionTitle}</h2>
              <p>{dict.topics.collectionBody}</p>
            </aside>
          </div>
        </section>

        <section
          className="section section-muted topic-related"
          aria-labelledby="related-topics-heading"
        >
          <div className="section-head">
            <div>
              <span className="section-kicker">{dict.topics.kicker}</span>
              <h2 id="related-topics-heading">{dict.topics.otherTopics}</h2>
            </div>
            <Link className="text-link" href={localePath(active, "topics")}>
              {dict.topics.backToTopics}
              <IconArrowRight size={16} />
            </Link>
          </div>

          <div className="topic-related-grid">
            {related.map((candidate) => {
              return (
                <Link
                  className="topic-related-card"
                  href={localePath(active, `topics/${candidate.slug}`)}
                  key={candidate.slug}
                >
                  <span className="topic-related-glyph" aria-hidden="true">
                    <TopicGlyph
                      icon={candidate.icon}
                      imageIcon={candidate.imageIcon}
                      size={40}
                    />
                  </span>
                  <strong>{candidate.name}</strong>
                  <IconArrowRight className="topic-related-arrow" size={16} />
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
