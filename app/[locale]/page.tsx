import Link from "next/link";
import LibraryPanel from "../components/LibraryPanel";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AnatomyHero from "../components/AnatomyHero";
import ScrollMotion from "../components/ScrollMotion";
import TopicGlyph from "../components/TopicGlyph";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconFile,
  IconGlobe,
  IconPlay,
  IconPlus,
  IconSparkle,
  IconUsers,
} from "../components/icons";
import { isLocale, localePath, type Locale } from "../lib/i18n";
import { getDictionary } from "../lib/dictionaries";
import { getLibraryContent } from "../lib/content";
import { FEATURED_TOPICS } from "../lib/topics";

const credentials = [
  "Smart Health Tower",
  "Head & Neck Oncology",
  "Skull Base Unit",
  "Reconstructive Surgery",
  "Kurdistan Board Trainees",
];

const webinars = [
  ["MAY", "24", "Role of Imaging in Skull Base Surgery", "Smart Surgical Team", "19:00 GMT+3"],
  ["JUN", "07", "Reconstruction of Mandibular Defects", "Smart Surgical Team", "19:00 GMT+3"],
  ["JUN", "21", "Updates in Salivary Gland Surgery", "Smart Surgical Team", "20:00 GMT+3"],
];

const team = [
  ["ST", "Smart Surgical Team", "Head & Neck Surgery", "Oncologic Surgery"],
  ["ST", "Smart Surgical Team", "Head & Neck Surgery", "Skull Base Surgery"],
  ["ST", "Smart Surgical Team", "Head & Neck Surgery", "Reconstructive Surgery"],
];

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
  const libraryContent = await getLibraryContent();
  const featuredContent = libraryContent[0];

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
                <a className="btn btn-primary btn-lg" href="#library">
                  Explore the Library
                  <IconArrowRight size={18} />
                </a>
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
                  <span
                    className={`topic-glyph${topic.imageIcon ? " topic-glyph-image" : ""}`}
                  >
                    <TopicGlyph
                      icon={topic.icon}
                      imageIcon={topic.imageIcon}
                      size={64}
                    />
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

        {/* ---------------- Library + featured ---------------- */}
        <section className="section section-muted section-library" id="library">
          <div className="section-head">
            <div>
              <span className="section-kicker">Learn</span>
              <h2>Everything in one library</h2>
              <p className="section-sub">
                Pick up where you left off, or start a new track — your progress is saved across
                devices.
              </p>
            </div>
          </div>

          <div className="dashboard">
            <LibraryPanel items={libraryContent} locale={active} />

            <article className="panel featured-panel" id="featured">
              <div className="panel-heading">
                <div>
                  <h2>Featured Surgery</h2>
                  <p className="panel-sub">Editor&apos;s pick, updated weekly.</p>
                </div>
                <span className="badge badge-accent">Featured</span>
              </div>

              <Link href={localePath(active, `library/${featuredContent.slug}`)} className="featured-media">
                <span className="featured-scene" aria-hidden="true">
                  <i className="scene-ring" />
                  <i className="scene-ring scene-ring-2" />
                  <i className="scene-line" />
                </span>
                <span className="featured-play">
                  <IconPlay size={26} />
                </span>
                <small className="featured-time">{featuredContent.duration}</small>
              </Link>

              <h3 className="featured-title">{featuredContent.title}</h3>
              <p className="featured-presenter">Smart Surgical Team · Thyroid &amp; Parathyroid</p>
              <p className="featured-copy">
                A full walkthrough of total thyroidectomy — exposure, recurrent laryngeal nerve
                identification, parathyroid preservation and haemostasis, with intra-operative
                commentary and key technical pearls.
              </p>

              <ul className="featured-facts">
                <li>
                  <IconClock size={16} /> 24 min
                </li>
                <li>
                  <IconUsers size={16} /> 480 learners
                </li>
                <li>
                  <IconFile size={16} /> Notes included
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* ---------------- Lower grid ---------------- */}
        <section className="section section-explore">
          <div className="lower-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Latest E-Poster</h2>
                  <p className="panel-sub">Research from the unit.</p>
                </div>
              </div>
              <div className="poster-art">
                <span className="poster-tag">Poster · 2026</span>
                <p className="poster-title">
                  Outcomes of Transoral
                  <br />
                  Robotic Surgery
                </p>
                <span className="poster-label">Key findings</span>
                <ul className="poster-list">
                  <li>
                    <IconCheck size={14} /> High local control rates
                  </li>
                  <li>
                    <IconCheck size={14} /> Low complication profile
                  </li>
                  <li>
                    <IconCheck size={14} /> Improved functional outcomes
                  </li>
                </ul>
                <b className="poster-author">Smart Surgical Team</b>
              </div>
              <a className="panel-link" href="#join">
                View e-poster
                <IconArrowRight size={16} />
              </a>
            </article>

            <article className="panel" id="webinars">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming Webinars</h2>
                  <p className="panel-sub">Live, with Q&amp;A. Recordings for members.</p>
                </div>
                <span className="badge">3 scheduled</span>
              </div>
              <div className="webinar-list">
                {webinars.map(([month, date, title, doctor, time]) => (
                  <a href="#join" className="webinar-row" key={title}>
                    <span className="date-chip">
                      <b>{month}</b>
                      <strong>{date}</strong>
                    </span>
                    <span className="webinar-body">
                      <h3>{title}</h3>
                      <p>{doctor}</p>
                      <small>
                        <IconClock size={13} /> {time}
                      </small>
                    </span>
                    <span className="row-action" aria-hidden="true">
                      <IconPlus size={16} />
                    </span>
                  </a>
                ))}
              </div>
              <a className="panel-link" href="#join">
                View all webinars
                <IconArrowRight size={16} />
              </a>
            </article>

            <article className="panel" id="team">
              <div className="panel-heading">
                <div>
                  <h2>Our Expert Team</h2>
                  <p className="panel-sub">Practising head &amp; neck surgeons.</p>
                </div>
              </div>
              <div className="team-list">
                {team.map(([initials, name, role, focus]) => (
                  <a href="#contact" className="team-row" key={name}>
                    <span className="portrait">{initials}</span>
                    <span className="team-body">
                      <h3>{name}</h3>
                      <p>{role}</p>
                      <small>{focus}</small>
                    </span>
                    <span className="row-action" aria-hidden="true">
                      <IconArrowRight size={16} />
                    </span>
                  </a>
                ))}
              </div>
              <a className="panel-link" href="#contact">
                View all team
                <IconArrowRight size={16} />
              </a>
            </article>
          </div>
        </section>

        {/* ---------------- Vision ---------------- */}
        <section className="section section-vision" aria-labelledby="vision-heading">
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
