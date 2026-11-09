import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ThyroidPlate from "../components/ThyroidPlate";
import IntroductionVideo from "../components/IntroductionVideo";
import NewsBanner from "../components/NewsBanner";
import { IconArrowRight } from "../components/icons";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../lib/i18n";
import { fill, getDictionary, type Dictionary } from "../lib/dictionaries";
import { FEATURED_TOPICS } from "../lib/topics";
import { getPublicEvents, eventDateRange, localizeFallbackEvent } from "../lib/events";
import { getLocalizedTeamGroups } from "../lib/team";
import { getNewsItems, localizedText, newsDate } from "../lib/news";
import { getResearches } from "../lib/research";
import { profileForMember } from "../lib/team-profiles";
import "./home-editorial.css";

async function UpcomingEvents({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const events = await getPublicEvents();
  const upcoming = events.filter((event) => event.status === "upcoming").slice(0, 2);

  return upcoming.map((item) => {
    const event = localizeFallbackEvent(item, dict.eventFallback);
    return (
      <li key={event.slug}>
        <p>{eventDateRange(event, locale)}</p>
        <Link href={localePath(locale, `events/${event.slug}`)} {...authoredTitleProps(event.title)}>
          {event.title}
        </Link>
      </li>
    );
  });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const t = dict.home;
  const [research, news] = await Promise.all([getResearches(), getNewsItems()]);
  const latestResearch = research[0];
  const pinnedNews = news.find((item) => item.pinned);
  const latestNews = news.slice(0, 2);
  const featuredTeam = getLocalizedTeamGroups(dict.team)[0].members.slice(0, 3);
  const founder = profileForMember(featuredTeam[0].name);

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="editorial-home">
        <section className="editorial-wrap editorial-hero" aria-labelledby="home-title">
          <div>
            <p className="editorial-kicker">{dict.brand.location}</p>
            <h1 id="home-title">{t.heroTitle}</h1>
            <p className="editorial-intro">{t.heroIntro}</p>
            <div className="editorial-actions">
              <Link className="btn btn-primary" href={localePath(active, "topics")}>
                {dict.cta.exploreLibrary}<IconArrowRight size={17} />
              </Link>
              <Link className="btn btn-outline" href={localePath(active, "research")}>{t.browseResearch}</Link>
            </div>
            <Link className="editorial-byline" href={localePath(active, founder ? `about/${founder.slug}` : "about")}>
              {t.builtWith}
            </Link>
          </div>
          <ThyroidPlate label={t.anatomyLabel} />
        </section>

        {pinnedNews && <div className="editorial-announcement">
          <NewsBanner locale={active} item={pinnedNews} t={dict.news} />
        </div>}

        <section className="editorial-wrap editorial-band editorial-topic-band" id="topics" aria-labelledby="topics-heading">
          <div className="editorial-heading">
            <h2 id="topics-heading">{dict.topics.title}</h2>
            <Link className="text-link" href={localePath(active, "topics")}>{t.viewAllTopics}<IconArrowRight size={16} /></Link>
          </div>
          <ul className="editorial-topics">
            {FEATURED_TOPICS.map((topic) => (
              <li key={topic.slug}>
                <Link href={localePath(active, `topics/${topic.slug}`)}>
                  <strong>{dict.taxonomy[topic.slug as keyof typeof dict.taxonomy] ?? topic.name}</strong>
                  <span>{dict.taxonomy[`${topic.slug}-blurb` as keyof typeof dict.taxonomy] ?? topic.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="editorial-updates">
          <div className="editorial-wrap editorial-band editorial-columns editorial-update-columns">
            <section className="editorial-update-panel editorial-research-panel" aria-labelledby="research-preview-heading">
              <h2 id="research-preview-heading">{t.researchTitle}</h2>
              {latestResearch && (
                <article className="editorial-citation">
                  <p className="editorial-label">{fill(t.latestPublication, { year: latestResearch.year })}</p>
                  <h3><Link href={localePath(active, `research/${latestResearch.id}`)} {...authoredTitleProps(latestResearch.title)}>
                    {latestResearch.title}
                  </Link></h3>
                  <p><bdi>{latestResearch.journal}</bdi>{latestResearch.topic && <> · <bdi>{latestResearch.topic.name}</bdi></>}</p>
                </article>
              )}
              <Link className="text-link" href={localePath(active, "research")}>{t.exploreResearch}<IconArrowRight size={16} /></Link>
            </section>
            <section className="editorial-update-panel" id="events" aria-labelledby="updates-heading">
              <h2 id="updates-heading">{t.updatesTitle}</h2>
              <div className="editorial-update-group">
                <h3>{t.newsTitle}</h3>
                <ul className="editorial-update-list">
                  {latestNews.map((item) => {
                    const title = localizedText(active, item.title, item.titleAr).value;
                    const date = newsDate(item.date, active);
                    return (
                      <li key={item.slug}>
                        {date && <p><time dateTime={item.date}>{date}</time></p>}
                        <Link href={localePath(active, `news/${item.slug}`)} {...authoredTitleProps(title)}>{title}</Link>
                      </li>
                    );
                  })}
                </ul>
                <Link className="text-link" href={localePath(active, "news")}>{t.viewAllNews}<IconArrowRight size={16} /></Link>
              </div>
              <div className="editorial-update-group">
                <h3>{dict.nav.events}</h3>
                <ul className="editorial-update-list">
                  <Suspense fallback={null}><UpcomingEvents locale={active} dict={dict} /></Suspense>
                </ul>
                <Link className="text-link" href={localePath(active, "events")}>{t.viewAllEvents}<IconArrowRight size={16} /></Link>
              </div>
            </section>
          </div>
        </div>

        <section className="editorial-wrap editorial-band" id="library" aria-labelledby="introduction-heading">
          <div className="editorial-heading">
            <h2 id="introduction-heading">{t.introductionTitle}</h2>
            <Link className="text-link" href={localePath(active, "about")}>{t.meetFullTeam}<IconArrowRight size={16} /></Link>
          </div>
          <div className="editorial-columns editorial-team-columns" id="team">
            <ul className="editorial-team">
              {featuredTeam.map((member) => {
                const profile = profileForMember(member.name);
                return (
                  <li key={member.name}>
                    <Link href={localePath(active, profile ? `about/${profile.slug}` : "about")}>
                      <img src={member.portrait} alt="" width={64} height={64} loading="lazy" decoding="async" />
                      <span><strong {...authoredTitleProps(member.name)}>{member.name}</strong><small>{member.credentials}</small></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="editorial-introduction" id="introduction">
              <h3>{t.clinicOverview}</h3>
              <IntroductionVideo t={dict.introduction} />
            </div>
          </div>
          <ul className="editorial-credentials">
            <li>{t.proofOperations}</li>
            <li>{t.proofPapers}</li>
            <li>{t.proofSummit}</li>
          </ul>
        </section>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
