import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AnatomyHero from "../components/AnatomyHero";
import IntroductionVideo from "../components/IntroductionVideo";
import JoinCtaLink from "../components/JoinCtaLink";
import ScrollMotion from "../components/ScrollMotion";
import TopicGlyph from "../components/TopicGlyph";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconFile,
  IconGlobe,
  IconPlus,
  IconSparkle,
} from "../components/icons";
import { isLocale, localePath, type Locale } from "../lib/i18n";
import { getDictionary } from "../lib/dictionaries";
import { FEATURED_TOPICS } from "../lib/topics";
import { getPublicEvents, eventDateRange } from "../lib/events";
import { TEAM_GROUPS } from "../lib/team";
import { getResearches } from "../lib/research";

const credentials = [
  "Smart Health Tower",
  "Head & Neck department",
];

const featuredTeam = TEAM_GROUPS[0].members.slice(0, 3);

const benefits = [
  "Free account, immediate access",
  "New lecture every week",
  "Save cases for your next study session",
];

/** Shared shell so the placeholder and the resolved panel are the same shape
    and nothing shifts when the events arrive. */
function UpcomingEventsPanel({ locale, badge, children }: { locale: Locale; badge?: string; children?: React.ReactNode }) {
  return (
    <article className="panel" id="events">
      <div className="panel-heading">
        <div>
          <h2>Upcoming Events</h2>
          <p className="panel-sub">Live sessions, discussions and learning opportunities.</p>
        </div>
        {badge ? <span className="badge">{badge}</span> : <span className="badge is-skeleton"><span className="skeleton-line skeleton-line-xs" /></span>}
      </div>
      <div className="webinar-list">
        {children ?? [0, 1, 2].map((index) => (
          <div className="webinar-row is-skeleton" key={index} aria-hidden="true">
            <span className="date-chip"><span className="skeleton-block" /></span>
            <span className="webinar-body">
              <span className="skeleton-line skeleton-line-lg" />
              <span className="skeleton-line skeleton-line-sm" />
            </span>
          </div>
        ))}
      </div>
      <Link className="panel-link" href={localePath(locale, "events")}>
        View all events
        <IconArrowRight size={16} />
      </Link>
    </article>
  );
}

async function UpcomingEvents({ locale }: { locale: Locale }) {
  const events = await getPublicEvents();
  const upcoming = events.filter((event) => event.status === "upcoming").slice(0, 3);

  return (
    <UpcomingEventsPanel locale={locale} badge={`${upcoming.length} upcoming`}>
      {upcoming.map((event) => (
        <Link href={localePath(locale, `events/${event.slug}`)} className="webinar-row" key={event.slug}>
          <span className="date-chip">
            <b>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${event.startDate}T12:00:00`))}</b>
            <strong>{new Date(`${event.startDate}T12:00:00`).getDate()}</strong>
          </span>
          <span className="webinar-body">
            <h3>{event.title}</h3>
            <p>{event.location}</p>
            <small>
              <IconClock size={13} /> {eventDateRange(event)}
            </small>
          </span>
          <span className="row-action" aria-hidden="true">
            <IconPlus size={16} />
          </span>
        </Link>
      ))}
    </UpcomingEventsPanel>
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
  const research = await getResearches();
  const latestResearch = research[0];
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
              <p className="eyebrow">
                <IconSparkle size={15} />
                Smart Health Tower · Sulaymaniah, Kurdistan
              </p>
              <h1>
                Head &amp; Neck Surgery,{" "}
                <span className="headline-accent">Guided by Expertise.</span>
              </h1>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" href={localePath(active, "topics")}>
                  Explore the Library
                  <IconArrowRight size={18} />
                </Link>
              </div>
            </div>

            <AnatomyHero />
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
            <p>Built with clinicians from</p>
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
              <span className="section-kicker">Curriculum</span>
              <h2 id="topics-heading">Browse by Topic</h2>
              <p className="section-sub">
                Four highlighted surgical areas from the complete head and neck curriculum.
              </p>
            </div>
            <Link className="text-link" href={localePath(active, "topics")}>
              View all topics
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
                  <b>{topic.name}</b>
                  <p>{topic.blurb}</p>
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
          <div className="research-preview-head"><div><span className="section-kicker">From our research desk</span><h2 id="research-preview-heading">Evidence, shared.</h2><p>Published clinical research from the Smart Health Tower community.</p></div><Link className="text-link" href={localePath(active, "research")}>Explore all research <IconArrowRight size={16}/></Link></div>
          <Link className="research-preview-card" href={localePath(active, `research/${latestResearch.id}`)}>
            <div className="research-preview-media">{latestResearch.imageUrl ? <img src={latestResearch.imageUrl} alt="" loading="lazy"/> : <span className="research-preview-placeholder"><IconFile size={40}/></span>}<span className="research-preview-badge">{latestResearch.category}</span></div>
            <div className="research-preview-body"><span className="research-preview-kicker">Latest publication · {latestResearch.year}</span><h3>{latestResearch.title}</h3>{latestResearchExcerpt && <p className="research-preview-excerpt">{latestResearchExcerpt}</p>}<span className="research-preview-cta">Read research <IconArrowRight size={16}/></span></div>
          </Link>
        </section>}

        {/* ---------------- Introduction video ---------------- */}
        <section className="section section-muted section-introduction" id="introduction" aria-labelledby="introduction-heading">
          <div className="section-head">
            <div>
              <span className="section-kicker">Introducing the clinic</span>
              <h2 id="introduction-heading">Meet Smart Surgical Team</h2>
              <p className="section-sub">
                A short tour of the clinic, the team and the care pathway behind every case we
                publish.
              </p>
            </div>
            <span className="badge badge-accent">Clinic overview</span>
          </div>

          {/* The stage carries the gutter so the player lines up with every
              other section instead of bleeding past them. */}
          <div className="introduction-stage"><IntroductionVideo /></div>
        </section>

        {/* ---------------- Expert team + upcoming events ---------------- */}
        <section className="section section-muted section-library" id="library">
          <div className="dashboard">
          <article className="panel team-feature-panel" id="team" aria-labelledby="team-heading">
            <div className="panel-heading">
              <div>
                <h2 id="team-heading">Our Expert Team</h2>
                <p className="panel-sub">Practising head, neck and thyroid surgeons leading clinical care and education.</p>
              </div>
              <span className="badge">{featuredTeam.length} featured</span>
            </div>
            <div className="team-feature-list">
              {featuredTeam.map((member) => (
                <Link href={localePath(active, "about")} className="team-feature-card" key={member.name}>
                  <span className="team-feature-portrait"><img src={member.portrait} alt={`Portrait of ${member.name}`} width={96} height={96} loading="lazy" decoding="async"/></span>
                  <span className="team-feature-body">
                    <h3>{member.name}</h3>
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
              Meet the full team
              <IconArrowRight size={16} />
            </Link>
          </article>

          {/* The rest of the homepage is static and no longer waits behind
              this database read: the panel arrives with placeholder rows and
              fills in when the events resolve. */}
          <Suspense fallback={<UpcomingEventsPanel locale={active} />}>
            <UpcomingEvents locale={active} />
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
                <h2 id="vision-heading">Our Vision</h2>
                <p>
                  To be the leading global platform for head and neck surgical education —
                  empowering surgeons and improving patient outcomes through knowledge,
                  collaboration and innovation.
                </p>
              </div>
            </div>
            <span className="vision-divider" aria-hidden="true" />
            <div className="vision-block vision-kr" dir="rtl" lang="ckb">
              <span className="vision-icon">
                <IconGlobe size={22} />
              </span>
              <div>
                <h2>دیدگای ئێمە</h2>
                <p>
                  ببینە پلاتفۆرمی پێشەنگی پەروەردەی نەشتەرگەری سەر و گەردن، بە بەهێزکردنی نەشتەرگەران
                  و بەشداریکردن لە باشترکردنی ئەنجامەکانی چارەسەری نەخۆشەکان.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Join CTA ---------------- */}
        <section className="cta-band" id="join">
          <div className="cta-inner">
            <div>
              <h2>Start learning with the team today</h2>
              <p>
                Create a free account to unlock the full library, join live webinars and track your
                progress across every subspecialty track.
              </p>
              <ul className="cta-benefits">
                {benefits.map((benefit) => (
                  <li key={benefit}>
                    <IconCheck size={15} /> {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <JoinCtaLink locale={active} />
          </div>
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
