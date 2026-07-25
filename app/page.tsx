import LibraryPanel from "./components/LibraryPanel";
import SiteHeader from "./components/SiteHeader";
import AnatomyHero from "./components/AnatomyHero";
import ScrollMotion from "./components/ScrollMotion";
import {
  BrandMark,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFile,
  IconGlobe,
  IconLinkedin,
  IconMail,
  IconPin,
  IconPlay,
  IconPlus,
  IconSparkle,
  IconUsers,
  IconYoutube,
  topicIcons,
  type TopicIconName,
} from "./components/icons";

const credentials = [
  "Smart Health Tower",
  "Head & Neck Oncology",
  "Skull Base Unit",
  "Reconstructive Surgery",
  "Kurdistan Board Trainees",
];

type Topic = {
  name: string;
  icon: TopicIconName;
  blurb: string;
  lessons: string;
};

const topics: Topic[] = [
  {
    name: "Thyroid",
    icon: "thyroid",
    blurb: "Thyroidectomy, nerve identification and parathyroid preservation.",
    lessons: "18 lessons",
  },
  {
    name: "Parotid",
    icon: "parotid",
    blurb: "Parotidectomy approaches and facial nerve dissection.",
    lessons: "12 lessons",
  },
  {
    name: "Lymph Nodes",
    icon: "lymph",
    blurb: "Neck dissection by level, staging and nodal disease.",
    lessons: "16 lessons",
  },
  {
    name: "Skin Lesions",
    icon: "skin",
    blurb: "Excision, margins and reconstruction of head & neck skin.",
    lessons: "9 lessons",
  },
];

const webinars = [
  ["MAY", "24", "Role of Imaging in Skull Base Surgery", "Dr. Ava Rashid", "19:00 GMT+3"],
  ["JUN", "07", "Reconstruction of Mandibular Defects", "Dr. Karzan Ahmed", "19:00 GMT+3"],
  ["JUN", "21", "Updates in Salivary Gland Surgery", "Dr. Shwan Omer", "20:00 GMT+3"],
];

const team = [
  ["KA", "Dr. Karzan Ahmed", "Head & Neck Surgeon", "Oncologic Surgery"],
  ["SO", "Dr. Shwan Omer", "Head & Neck Surgeon", "Skull Base Surgery"],
  ["AR", "Dr. Ava Rashid", "Head & Neck Surgeon", "Reconstructive Surgery"],
];

const benefits = [
  "Free account, immediate access",
  "New lecture every week",
  "Certificates for completed tracks",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The contact route redirects back with ?interest=received after a successful save.
  const submitted = (await searchParams)?.interest === "received";

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <SiteHeader />
      <ScrollMotion />

      <main id="top">
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
                  <p>Dr. Karzan Ahmed · Module 3 of 8</p>
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
                Four core tracks, each with operative video, imaging review and follow-up
                discussion.
              </p>
            </div>
            <a className="text-link" href="#library">
              View all topics
              <IconArrowRight size={16} />
            </a>
          </div>

          <div className="topic-grid">
            {topics.map((topic) => {
              const Glyph = topicIcons[topic.icon];
              return (
                <a href="#library" className="topic-card" key={topic.name}>
                  <span className="topic-glyph">
                    <Glyph size={48} />
                  </span>
                  <b>{topic.name}</b>
                  <p>{topic.blurb}</p>
                  <span className="topic-foot">
                    <small>{topic.lessons}</small>
                    <span className="topic-go" aria-hidden="true">
                      <IconArrowRight size={16} />
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* ---------------- Library + featured ---------------- */}
        <section className="section section-muted section-library" id="main-content">
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
            <LibraryPanel />

            <article className="panel featured-panel" id="featured">
              <div className="panel-heading">
                <div>
                  <h2>Featured Surgery</h2>
                  <p className="panel-sub">Editor&apos;s pick, updated weekly.</p>
                </div>
                <span className="badge badge-accent">Featured</span>
              </div>

              <a href="#join" className="featured-media">
                <span className="featured-scene" aria-hidden="true">
                  <i className="scene-ring" />
                  <i className="scene-ring scene-ring-2" />
                  <i className="scene-line" />
                </span>
                <span className="featured-play">
                  <IconPlay size={26} />
                </span>
                <small className="featured-time">24:18</small>
              </a>

              <h3 className="featured-title">Thyroidectomy: Step-by-Step Masterclass</h3>
              <p className="featured-presenter">Dr. Karzan Ahmed · Thyroid &amp; Parathyroid</p>
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
                <b className="poster-author">Dr. Shwan Omer et al.</b>
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

      {/* ---------------- Footer ---------------- */}
      <footer className="site-footer" id="contact">
        <div className="footer-main">
          <div className="footer-brand">
            <a className="brand" href="#top">
              <BrandMark size={32} />
              <span className="brand-name">
                Smart Surgical Team
                <small>Head &amp; Neck Education</small>
              </span>
            </a>
            <p>
              A dedicated academic hub for head &amp; neck surgery education. Expert insights, better
              outcomes.
            </p>
            <div className="socials">
              <a href="#top" aria-label="YouTube">
                <IconYoutube size={18} />
              </a>
              <a href="#top" aria-label="LinkedIn">
                <IconLinkedin size={18} />
              </a>
              <a href="mailto:info@smartsurgicalteam.com" aria-label="Email">
                <IconMail size={18} />
              </a>
            </div>
          </div>

          <nav className="footer-col" aria-label="Quick links">
            <h3>Quick links</h3>
            <a href="#library">Browse</a>
            <a href="#topics">Topics</a>
            <a href="#webinars">Webinars</a>
            <a href="#team">Team</a>
            <a href="#join">Join free</a>
          </nav>

          <div className="footer-col">
            <h3>Contact us</h3>
            <p>
              <IconMail size={16} />
              <a href="mailto:info@smartsurgicalteam.com">info@smartsurgicalteam.com</a>
            </p>
            <p>
              <IconPin size={16} /> Smart Health Tower, Sulaymaniah, Kurdistan Region, Iraq
            </p>
            <p>
              <IconGlobe size={16} /> smartsurgicalteam.com
            </p>
          </div>

          <div className="footer-col footer-kr" dir="rtl" lang="ckb">
            <h3>کوردی</h3>
            <p>بۆ پەیوەندیکردن و زانیاری زیاتر، تکایە پەیوەندیمان پێوە بکەن.</p>
            <p>
              <IconCalendar size={16} /> شەممە – پێنجشەممە، ٩:٠٠ – ١٧:٠٠
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Smart Surgical Team. All rights reserved.</span>
          <span className="footer-legal">
            <a href="#top">Privacy Policy</a>
            <a href="#top">Terms of Use</a>
          </span>
        </div>
      </footer>
    </>
  );
}
