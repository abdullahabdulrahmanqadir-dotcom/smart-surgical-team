import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import ResearchCover from "../components/ResearchCover";
import SiteFooter from "../components/SiteFooter";
import AnatomyHero from "../components/AnatomyHero";
import IntroductionVideo from "../components/IntroductionVideo";
import NewsBanner from "../components/NewsBanner";
import ScrollMotion from "../components/ScrollMotion";
import TopicGlyph from "../components/TopicGlyph";
import {
  IconArrowRight,
  IconClock,
  IconGlobe,
  IconPlus,
  IconSparkle,
} from "../components/icons";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../lib/i18n";
import { fill, getDictionary, type Dictionary } from "../lib/dictionaries";
import { FEATURED_TOPICS } from "../lib/topics";
import { getPublicEvents, eventDateRange, localizeFallbackEvent } from "../lib/events";
import { getLocalizedTeamGroups } from "../lib/team";
import { getNewsItems, getPinnedNewsItem, localizedText } from "../lib/news";
import { getResearches } from "../lib/research";

/** Shared shell so the placeholder and the resolved panel are the same shape
    and nothing shifts when the rows arrive. Headings are passed in because the
    same shell carries either the events or the newsroom.

    `loading` says which of the two this is. It is not inferred from a missing
    prop any more: the newsroom has no count to put in the badge, and reading
    that absence as "still waiting" left a shimmering placeholder next to
    content that had already arrived. */
function SidePanel({
  href,
  title,
  intro,
  linkLabel,
  badge,
  loading = false,
  children,
}: {
  href?: string;
  title?: string;
  intro?: string;
  linkLabel?: string;
  badge?: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article className="panel" id="events">
      <div className="panel-heading">
        {/* The placeholder cannot name itself: which panel this becomes is
            decided by the events read it is waiting on. Announcing "Upcoming
            Events" and then resolving to the newsroom is worse than a blank. */}
        <div>
          {loading ? <span className="skeleton-line skeleton-line-lg" /> : <h2>{title}</h2>}
          {loading ? <span className="skeleton-line skeleton-line-sm" /> : <p className="panel-sub">{intro}</p>}
        </div>
        {loading ? <span className="badge is-skeleton"><span className="skeleton-line skeleton-line-xs" /></span> : badge ? <span className="badge">{badge}</span> : null}
      </div>
      <div className="webinar-list">
        {loading ? [0, 1, 2].map((index) => (
          <div className="webinar-row is-skeleton" key={index} aria-hidden="true">
            <span className="date-chip"><span className="skeleton-block" /></span>
            <span className="webinar-body">
              <span className="skeleton-line skeleton-line-lg" />
              <span className="skeleton-line skeleton-line-sm" />
            </span>
          </div>
        )) : children}
      </div>
      {loading ? (
        <span className="panel-link is-skeleton"><span className="skeleton-line skeleton-line-sm" /></span>
      ) : href && linkLabel ? (
        <Link className="panel-link" href={href}>
          {linkLabel}
          <IconArrowRight size={16} />
        </Link>
      ) : null}
    </article>
  );
}

function SidePanelSkeleton() {
  return <SidePanel loading />;
}

/**
 * Between summits this panel used to render an empty list under a "0 upcoming"
 * badge. It now falls through to the newsroom, which always has something in
 * it, and switches back to events on its own as soon as one is scheduled.
 */
async function EventsOrNews({ locale, t, eventT }: { locale: Locale; t: Dictionary["home"]; eventT: Dictionary["eventFallback"] }) {
  const events = (await getPublicEvents()).map((event) => localizeFallbackEvent(event, eventT));
  const upcoming = events.filter((event) => event.status === "upcoming").slice(0, 3);

  if (!upcoming.length) {
    const news = (await getNewsItems()).slice(0, 3);
    if (!news.length) return null;
    return (
      <SidePanel href={localePath(locale, "news")} title={t.newsTitle} intro={t.newsIntro} linkLabel={t.viewAllNews}>
        {news.map((item) => {
          const title = localizedText(locale, item.title, item.titleAr).value;
          const published = item.date ? new Date(`${item.date}T12:00:00`) : null;
          return (
            <Link href={localePath(locale, `news/${item.slug}`)} className="webinar-row" key={item.slug}>
              <span className="date-chip">
                {published ? (
                  <>
                    <b>{new Intl.DateTimeFormat(locale, { month: "short" }).format(published)}</b>
                    <strong>{published.getDate()}</strong>
                  </>
                ) : (
                  <b>{item.category?.name ?? ""}</b>
                )}
              </span>
              <span className="webinar-body">
                <h3 {...authoredTitleProps(title)}>{title}</h3>
                <p>{localizedText(locale, item.summary, item.summaryAr).value}</p>
              </span>
              <span className="row-action" aria-hidden="true">
                <IconPlus size={16} />
              </span>
            </Link>
          );
        })}
      </SidePanel>
    );
  }

  return (
    <SidePanel
      href={localePath(locale, "events")}
      title={t.eventsTitle}
      intro={t.eventsIntro}
      linkLabel={t.viewAllEvents}
      badge={fill(t.upcomingCount, { count: upcoming.length })}
    >
      {upcoming.map((event) => (
        <Link href={localePath(locale, `events/${event.slug}`)} className="webinar-row" key={event.slug}>
          <span className="date-chip">
            <b>{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${event.startDate}T12:00:00`))}</b>
            <strong>{new Date(`${event.startDate}T12:00:00`).getDate()}</strong>
          </span>
          <span className="webinar-body">
            <h3 {...authoredTitleProps(event.title)}>{event.title}</h3>
            <p>{event.location}</p>
            <small>
              <IconClock size={13} /> {eventDateRange(event, locale)}
            </small>
          </span>
          <span className="row-action" aria-hidden="true">
            <IconPlus size={16} />
          </span>
        </Link>
      ))}
    </SidePanel>
  );
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const featuredTeam = getLocalizedTeamGroups(dict.team)[0].members.slice(0, 3);
  const credentials = [dict.home.credentialTower, dict.home.credentialDepartment];
  const research = await getResearches();
  const latestResearch = research[0];
  // At most one item is ever pinned; the banner is the homepage's only news.
  const pinnedNews = await getPinnedNewsItem();
  // Abstracts can be rich HTML; the card excerpt wants clean text.
  const latestResearchExcerpt = latestResearch?.abstract ? latestResearch.abstract.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

  return (
    <>
      <a className="skip-link" href="#main-content">
        {dict.nav.skipToContent}
      </a>

      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />

      <main id="main-content">
        {/* ---------------- Hero ---------------- */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              {/* The pinned announcement leads the hero column, above the
                  eyebrow: it is the one thing on the page that changes, so it
                  reads first and then hands off to the standing headline. */}
              {pinnedNews ? <NewsBanner locale={active} item={pinnedNews} t={dict.news} /> : null}
              <p className="eyebrow">
                <IconSparkle size={15} />
                {dict.brand.location}
              </p>
              <h1>
                {dict.brand.tagline}
              </h1>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" href={localePath(active, "topics")}>
                  {dict.cta.exploreLibrary}
                  <IconArrowRight size={18} />
                </Link>
              </div>
            </div>

            <AnatomyHero t={dict.anatomyHero} />
            {/* <div className="hero-visual" aria-hidden="true">
              <div className="hero-glow" />
              <div className="hero-grid-dots" />

              <div className="hero-card hero-card-player">
                <div className="player-frame">
                  <span className="player-badge">Now playing</span>
                  <span className="player-play">
                    <IconPlay size={22} />
                  </span>
                  <span className="player-time">24:18</span>
                </div>
                <div className="player-meta">
                  <h3>Thyroidectomy: Step-by-Step Masterclass</h3>
                  <p>Smart Surgical Team · Module 3 of 8</p>
                  <span className="progress">
                    <span className="progress-track">
                      <span className="progress-fill" style={{ width: "62%" }} />
                    </span>
                    <span className="progress-value">62%</span>
                  </span>
                </div>
              </div>

              <div className="hero-card hero-card-live">
                <span className="pulse-dot" />
                <div>
                  <strong>Live webinar</strong>
                  <span>Skull base imaging · in 3 days</span>
                </div>
              </div>

              <div className="hero-card hero-card-stat">
                <span className="stat-icon">
                  <IconLayers size={18} />
                </span>
                <div>
                  <strong>4 tracks</strong>
                  <span>Structured curriculum</span>
                </div>
              </div>
            </div> */}
          </div>

          <div className="credential-strip">
            <p>{dict.home.builtWith}</p>
            <ul>
              {credentials.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- Topics ---------------- */}
        <section className="section section-topics" id="topics" aria-labelledby="topics-heading">
          <div className="section-head">
            <div>
              <h2 id="topics-heading">{dict.topics.title}</h2>
              <p className="section-sub">{dict.home.topicsIntro}</p>
            </div>
            <Link className="text-link" href={localePath(active, "topics")}>
              {dict.home.viewAllTopics}
              <IconArrowRight size={16} />
            </Link>
          </div>

          <div className="topic-grid">
            {FEATURED_TOPICS.map((topic) => {
              return (
                <Link
                  href={localePath(active, `topics/${topic.slug}`)}
                  className="topic-card"
                  key={topic.slug}
                >
                  <span className={`topic-glyph${topic.imageIcon ? " topic-glyph-image" : ""}`}>
                    <TopicGlyph icon={topic.icon} imageIcon={topic.imageIcon} size={64} />
                  </span>
                  <b>{dict.taxonomy[topic.slug as keyof typeof dict.taxonomy] ?? topic.name}</b>
                  <p>{dict.taxonomy[`${topic.slug}-blurb` as keyof typeof dict.taxonomy] ?? topic.blurb}</p>
                  <span className="topic-foot">
                    <small>{dict.topics.exploreGroup}</small>
                    <span className="topic-go" aria-hidden="true">
                      <IconArrowRight size={16} />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {latestResearch && <section className="section section-research-preview" aria-labelledby="research-preview-heading">
          <div className="research-preview-head"><div><h2 id="research-preview-heading">{dict.home.researchTitle}</h2></div><Link className="text-link" href={localePath(active, "research")}>{dict.home.exploreResearch} <IconArrowRight size={16}/></Link></div>
          <Link className="research-preview-card" href={localePath(active, `research/${latestResearch.id}`)}>
            <div className="research-preview-media"><ResearchCover title={latestResearch.title} label={latestResearch.topic?.name ?? dict.research.unfiled} palette={latestResearch.palette} paletteKey={latestResearch.journal}/></div>
            <div className="research-preview-body"><span className="research-preview-kicker">{fill(dict.home.latestPublication, { year: latestResearch.year })}</span>{latestResearchExcerpt && <p className="research-preview-excerpt">{latestResearchExcerpt}</p>}<span className="research-preview-cta">{dict.home.readResearch} <IconArrowRight size={16}/></span></div>
          </Link>
        </section>}

        {/* ---------------- Introduction video ---------------- */}
        <section className="section section-muted section-introduction" id="introduction" aria-labelledby="introduction-heading">
          <div className="section-head">
            <div>
              <h2 id="introduction-heading">{dict.home.introductionTitle}</h2>
            </div>
            <span className="badge badge-accent">{dict.home.clinicOverview}</span>
          </div>

          {/* The stage carries the gutter so the player lines up with every
              other section instead of bleeding past them. */}
          <div className="introduction-stage"><IntroductionVideo t={dict.introduction} /></div>
        </section>

        {/* ---------------- Expert team + upcoming events ---------------- */}
        <section className="section section-muted section-library" id="library">
          <div className="dashboard">
          <article className="panel team-feature-panel" id="team" aria-labelledby="team-heading">
            <div className="panel-heading">
              <div>
                <h2 id="team-heading">{dict.home.teamTitle}</h2>
                <p className="panel-sub">{dict.home.teamIntro}</p>
              </div>
              <span className="badge">{fill(dict.home.featuredCount, { count: featuredTeam.length })}</span>
            </div>
            <div className="team-feature-list">
              {featuredTeam.map((member) => (
                <Link href={localePath(active, "about")} className="team-feature-card" key={member.name}>
                  <span className="team-feature-portrait"><img src={member.portrait} alt={fill(dict.home.portraitOf, { name: member.name })} width={96} height={96} loading="lazy" decoding="async"/></span>
                  <span className="team-feature-body">
                    <h3 {...authoredTitleProps(member.name)}>{member.name}</h3>
                    <p>{member.role}</p>
                    <small>{member.credentials}</small>
                  </span>
                  <span className="row-action" aria-hidden="true">
                    <IconArrowRight size={16} />
                  </span>
                </Link>
              ))}
            </div>
            <Link className="panel-link" href={localePath(active, "about")}>
              {dict.home.meetFullTeam}
              <IconArrowRight size={16} />
            </Link>
          </article>

          {/* The rest of the homepage is static and no longer waits behind
              this database read: the panel arrives with placeholder rows and
              fills in when the events resolve. */}
          <Suspense fallback={<SidePanelSkeleton />}>
            <EventsOrNews locale={active} t={dict.home} eventT={dict.eventFallback} />
          </Suspense>
          </div>
        </section>

        {/* ---------------- Vision ---------------- */}
        <section className="section section-vision" id="about" aria-labelledby="vision-heading" hidden>
          <div className="vision-panel">
            <div className="vision-block">
              <span className="vision-icon">
                <IconGlobe size={22} />
              </span>
              <div>
                <h2 id="vision-heading">{dict.home.visionTitle}</h2>
                <p>{dict.home.visionBody}</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
