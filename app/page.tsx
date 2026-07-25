const topics = [
  ["Thyroid & Parathyroid", "THY"],
  ["Salivary Gland", "SAL"],
  ["Laryngeal Surgery", "LAR"],
  ["Oral Cavity Surgery", "ORL"],
  ["Oncologic Reconstruction", "ONC"],
  ["Skull Base Surgery", "SKL"],
  ["Sinus & Nasal Surgery", "SIN"],
  ["Pediatric Head & Neck", "PED"],
];

const libraryItems = [
  ["Transoral Robotic Surgery for Oropharyngeal Cancer", "Dr. Karzan Ahmed", "18:24", "65%"],
  ["Selective Neck Dissection: Levels II–IV", "Dr. Shwan Omer", "14:02", "42%"],
  ["Thyroidectomy: Tips for Safe Parathyroid Preservation", "Dr. Ava Rashid", "22:31", "80%"],
];

const webinars = [
  ["MAY", "24", "Role of Imaging in Skull Base Surgery", "Dr. Ava Rashid"],
  ["JUN", "07", "Reconstruction of Mandibular Defects", "Dr. Karzan Ahmed"],
  ["JUN", "21", "Updates in Salivary Gland Surgery", "Dr. Shwan Omer"],
];

const team = [
  ["KA", "Dr. Karzan Ahmed", "Head & Neck Surgeon\nOncologic Surgery"],
  ["SO", "Dr. Shwan Omer", "Head & Neck Surgeon\nSkull Base Surgery"],
  ["AR", "Dr. Ava Rashid", "Head & Neck Surgeon\nReconstructive Surgery"],
];

export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header mock-header">
        <a className="brand mock-brand" href="#top" aria-label="Smart Surgical Team home">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>Smart Surgical Team</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#library">Browse</a><a href="#topics">Topics <span aria-hidden="true">⌄</span></a><a href="#webinars">Webinars</a><a href="#team">Team</a><a href="#contact">Contact</a>
        </nav>
        <div className="header-actions"><button className="language-switch" type="button"><b>EN</b><span>کوردی</span></button><button className="theme-toggle" type="button" aria-label="Switch colour mode"><i /></button></div>
      </header>

      <section className="mock-hero" id="top">
        <div className="hero-illustration" aria-hidden="true" />
        <div className="hero-copy">
          <h1>Head &amp; Neck<br />Surgery,<br />Guided by Expertise.</h1>
          <a className="primary-button" href="#library">Explore the Library <span aria-hidden="true">→</span></a>
        </div>
        <div className="orbit orbit-book" aria-hidden="true">▯</div>
        <div className="orbit orbit-play" aria-hidden="true">▶</div>
        <div className="orbit orbit-user" aria-hidden="true">♙</div>
      </section>

      <section className="topic-strip" id="topics" aria-labelledby="topics-heading">
        <div className="topic-title"><span /><h2 id="topics-heading">Browse by Topic</h2></div>
        <div className="topic-grid">
          {topics.map(([name, mark]) => <a href="#library" className="topic-card" key={name}><span className="topic-glyph" aria-hidden="true">{mark}</span><b>{name}</b></a>)}
        </div>
        <a className="view-link" href="#library">View all topics <span aria-hidden="true">→</span></a>
      </section>

      <section className="dashboard" id="main-content">
        <article className="library-panel" id="library">
          <h2>Content Library</h2>
          <div className="library-tabs"><button className="selected" type="button">Videos</button><button type="button">Webinars</button><button type="button">E-Posters</button></div>
          <div className="library-filter"><label><span aria-hidden="true">⌕</span><input aria-label="Search videos" placeholder="Search videos..." /></label><button type="button">All Topics⌄</button></div>
          <div className="library-list">
            {libraryItems.map(([title, doctor, duration, progress], index) => <a href="#sign-in" className="library-row" key={title}>
              <div className={`video-thumb thumb-${index + 1}`}><span className="play-icon" aria-hidden="true">▶</span><small>{duration}</small></div>
              <div className="library-details"><h3>{title}</h3><p>{doctor}</p><div className="progress"><i style={{ width: progress }} /><span>{progress}</span></div></div>
            </a>)}
          </div>
          <a className="panel-link" href="#sign-in">View all videos <span aria-hidden="true">→</span></a>
        </article>

        <article className="featured-panel">
          <div className="panel-heading"><h2>Featured Surgery</h2><span>Featured</span></div>
          <a href="#sign-in" className="featured-image"><img src="/anatomy-hero.png" alt="Detailed head and neck anatomy illustration" /><i className="big-play" aria-hidden="true">▶</i><small>24:18</small></a>
          <h3>Thyroidectomy: Step-by-Step Masterclass</h3><p className="presenter">Dr. Karzan Ahmed</p><p className="feature-copy">A comprehensive walkthrough of thyroid surgery with key technical points and pearls.</p>
          <div className="slider-dots" aria-label="Featured items"><i className="active" /><i /><i /><i /></div>
        </article>
      </section>

      <section className="lower-grid">
        <article className="poster-panel"><h2>Latest E-Poster</h2><div className="poster-art"><p>OUTCOMES OF TRANSORAL<br />ROBOTIC SURGERY</p><span>KEY FINDINGS</span><i>High local control rates<br />Low complication profile<br />Improved functional outcomes</i><b>By Dr. Shwan Omer et al.</b></div><a className="panel-link" href="#sign-in">View e-poster <span aria-hidden="true">→</span></a></article>
        <article className="webinar-panel" id="webinars"><h2>Upcoming Webinars</h2>{webinars.map(([month, date, title, doctor]) => <a href="#sign-in" className="webinar-row" key={title}><div className="date"><b>{month}</b><strong>{date}</strong></div><div><h3>{title}</h3><p>{doctor}</p><small>◷ 19:00 GMT</small></div><i aria-hidden="true">＋</i></a>)}<a className="panel-link" href="#sign-in">View all webinars <span aria-hidden="true">→</span></a></article>
        <article className="team-panel" id="team"><div className="panel-heading"><h2>Our Expert Team</h2><a href="#contact">View all team →</a></div>{team.map(([initials, name, role]) => <a href="#contact" className="team-row" key={name}><span className="portrait" aria-hidden="true">{initials}</span><div><h3>{name}</h3><p>{role.split("\n").map((line) => <span key={line}>{line}</span>)}</p></div></a>)}</article>
      </section>

      <section className="vision-panel"><div className="vision-en"><span className="vision-icon" aria-hidden="true">◉</span><div><h2>Our Vision</h2><p>To be the leading global platform for head and neck surgical education—empowering surgeons and improving patient outcomes through knowledge, collaboration, and innovation.</p></div></div><div className="vision-divider" /><div className="vision-kr" dir="rtl"><h2>چاوەڕوانی / دیدگای ئێمە</h2><p>ببین پێشکەشکەری پلاتفۆرمێکی پێشەنگی پەروەردەی نەشتەرگەری سەر و گەردن بێت، بە بەهێزکردنی نەشتەرگەران و بەشداریکردن لە باشترکردنی ئەنجامەکانی چارەسەری بۆ نەخۆش.</p></div><span className="vision-icon right" aria-hidden="true">◉</span></section>

      <footer id="contact">
        <div className="footer-main"><div className="footer-brand"><a className="brand mock-brand" href="#top"><span className="brand-mark" aria-hidden="true"><i /></span><span>Smart Surgical Team</span></a><p>A dedicated academic hub for head &amp; neck surgery education. Expert insights. Better outcomes.</p><div className="socials"><a href="#top" aria-label="YouTube">▶</a><a href="#top" aria-label="LinkedIn">in</a><a href="mailto:info@smartsurgicalteam.com" aria-label="Email">✉</a></div></div><div><h3>Quick Links</h3><a href="#library">Browse</a><a href="#topics">Topics</a><a href="#webinars">Webinars</a><a href="#team">Team</a><a href="#contact">Contact</a></div><div><h3>Contact Us</h3><p>✉ info@smartsurgicalteam.com</p><p>⌖ Erbil, Kurdistan Region, Iraq</p><p>◎ smartsurgicalteam.com</p></div><div className="footer-kr" dir="rtl"><h3>کوردی</h3><p>بۆ پەیوەندی کردن و زانیاری زیاتر، تکایە پەیوەندیمان پێوە بکەن.</p><p>✉ info@smartsurgicalteam.com</p></div></div><div className="footer-bottom"><span>© 2026 Smart Surgical Team. All rights reserved.</span><span><a href="#top">Privacy Policy</a><a href="#top">Terms of Use</a></span></div>
      </footer>
    </main>
  );
}
