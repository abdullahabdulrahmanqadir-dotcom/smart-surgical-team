import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import TopicHero from "../../components/TopicHero";
import ScrollMotion from "../../components/ScrollMotion";
import { IconArrowRight, topicIcons } from "../../components/icons";
import { LOCALES, isLocale, localePath, type Locale } from "../../lib/i18n";
import { getDictionary } from "../../lib/dictionaries";
import { TOPIC_GROUPS } from "../../lib/topics";

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
        <TopicHero
          eyebrow={dict.topics.kicker}
          title={dict.topics.title}
          intro="Five surgical tracks covering the head and neck, each built from operative video, imaging review and follow-up discussion."
        />

        <section className="section section-topic-index" aria-labelledby="topic-index-heading">
          <h2 className="visually-hidden" id="topic-index-heading">
            {dict.topics.title}
          </h2>

          <div className="topic-index-grid">
            {TOPIC_GROUPS.map((group) => {
              const Glyph = topicIcons[group.icon];

              return (
                <a
                  className="topic-card topic-card-lg"
                  key={group.slug}
                  href={localePath(active, `topics/${group.slug}`)}
                >
                  <span className="topic-glyph">
                    <Glyph size={52} />
                  </span>
                  <b>{group.name}</b>
                  <p>{group.blurb}</p>
                  <span className="topic-foot">
                    <small>
                      {group.subTopics.map((sub) => sub.name).join(" · ")}
                    </small>
                    <span className="topic-go" aria-hidden="true">
                      <IconArrowRight size={16} />
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
