import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AnatomyHero from "../components/AnatomyHero";
import ScrollMotion from "../components/ScrollMotion";
import TopicGlyph from "../components/TopicGlyph";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconGlobe,
  IconPlay,
  IconPlus,
  IconSparkle,
} from "../components/icons";
import { isLocale, localePath, type Locale } from "../lib/i18n";
import { getDictionary } from "../lib/dictionaries";
import { getLibraryContent } from "../lib/content";
import { FEATURED_TOPICS } from "../lib/topics";
import { EVENTS, eventDateRange } from "../lib/events";
import { TEAM_GROUPS } from "../lib/team";

const credentials = [
  "Smart Health Tower",
  "Head & Neck department",
];

const featuredTeam = TEAM_GROUPS[0].members.slice(0, 3);

const benefits = [
  "Free account, immediate access",
  "New lecture every week",
  "Certificates for completed tracks",
];

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const latestPost = (await getLibraryContent())[0];
  const upcomingEvents = EVENTS.filter((event) => event.status === "upcoming");
  // The contact route redirects back with ?interest=received after a successful save.
  const submitted = (await searchParams)?.interest === "received";

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

        {/* ---------------- Upcoming events + about ---------------- */}
        <section className="section section-muted section-library" id="library">
          <div className="section-head">
            <div>
              <span className="section-kicker">Stay connected</span>
              <h2>Upcoming events and LATEST UPDATES</h2>
              <p className="section-sub">
                Join the conversations, teaching sessions and community behind Smart Surgical
                Team.
              </p>
            </div>
          </div>

          <div className="dashboard">
            <article className="panel" id="events">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming Events</h2>
                  <p className="panel-sub">Live sessions, discussions and learning opportunities.</p>
                </div>
                <span className="badge">{upcomingEvents.length} upcoming</span>
              </div>
              <div className="webinar-list">
                {upcomingEvents.map((event) => (
                  <Link href={localePath(active, `events/${event.slug}`)} className="webinar-row" key={event.slug}>
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
              </div>
              <Link className="panel-link" href={localePath(active, "events")}>
                View all events
                <IconArrowRight size={16} />
              </Link>
            </article>

            <article className="panel featured-panel" id="featured">
              <div className="panel-heading">
                <div>
                  <h2>Latest Post</h2>
                  <p className="panel-sub">New from Smart Surgical Team.</p>
                </div>
                <span className="badge badge-accent">Latest</span>
              </div>

              <Link href={localePath(active, `library/${latestPost.slug}`)} className="featured-media">
                <span className="featured-scene" aria-hidden="true">
                  <i className="scene-ring" />
                  <i className="scene-ring scene-ring-2" />
                  <i className="scene-line" />
                </span>
                <span className="featured-play">
                  <IconPlay size={26} />
                </span>
                <small className="featured-time">{latestPost.duration}</small>
              </Link>

              <h3 className="featured-title">{latestPost.title}</h3>
              <p className="featured-presenter">{latestPost.presenter.name} · {latestPost.topic}</p>
              <p className="featured-copy">
                {latestPost.summary}
              </p>

            </article>
          </div>
        </section>

        {/* ---------------- Expert team ---------------- */}
        <section className="section section-explore" id="team" aria-labelledby="team-heading">
          <article className="panel team-feature-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">The people behind the work</span>
                <h2 id="team-heading">Our Expert Team</h2>
                <p className="panel-sub">Practising head, neck and thyroid surgeons leading clinical care and education.</p>
              </div>
              <Link className="text-link" href={localePath(active, "about")}>
                Meet the full team
                <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="team-feature-list">
              {featuredTeam.map((member) => (
                <Link href={localePath(active, "about")} className="team-feature-card" key={member.name}>
                  <span className="team-feature-portrait"><img src={member.portrait} alt={`Portrait of ${member.name}`} width={96} height={96}/></span>
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
          </article>
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
            <form className="cta-form" action="/api/contact" method="post">
              {submitted && (
                <p className="cta-success" role="status">
                  <IconCheck size={16} />
                  Thanks — we have your details and will be in touch shortly.
                </p>
              )}
              <input type="hidden" name="source" value="homepage-join" />
              <label htmlFor="cta-email">Work email</label>
              <input
                id="cta-email"
                name="email"
                type="email"
                required
                placeholder="you@hospital.org"
                autoComplete="email"
              />
              <button className="btn btn-primary btn-lg" type="submit">
                Create free account
                <IconArrowRight size={18} />
              </button>
              <small>No cost. Immediate access. Unsubscribe any time.</small>
            </form>
          </div>
        </section>
      </main>

      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
