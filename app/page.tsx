export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Smart Surgical Team home">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>SMART <b>SURGICAL</b><small>TEAM</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#library">Library</a><a href="#specialties">Specialties</a><a href="#webinars">Webinars</a><a href="#team">Our team</a>
        </nav>
        <div className="header-actions"><button className="language" type="button" aria-label="Switch to Sorani Kurdish">کوردی</button><a className="text-link" href="#sign-in">Sign in</a><a className="button button-small" href="#library">Explore library</a></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">SMART HEALTH TOWER · SULAYMANIAH</p>
          <h1>Learning that keeps <em>surgery</em> moving forward.</h1>
          <p className="hero-intro">A calm, practical home for head and neck surgery education—built for clinicians, trainees, and curious patients.</p>
          <div className="hero-actions"><a className="button" href="#library">Explore the library <span aria-hidden="true">→</span></a><a className="inline-link" href="#webinars">See upcoming sessions <span aria-hidden="true">↗</span></a></div>
          <div className="hero-proof" aria-label="Platform highlights"><div><strong>5</strong><span>Specialty areas</span></div><div><strong>1</strong><span>Trusted surgical team</span></div><div><strong>∞</strong><span>Questions worth exploring</span></div></div>
        </div>
        <div className="hero-art" aria-hidden="true"><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-neck" /><span className="art-head" /><span className="art-contour contour-one" /><span className="art-contour contour-two" /><span className="art-node node-one" /><span className="art-node node-two" /><span className="art-node node-three" /><p>Precision<br />in practice</p></div>
      </section>

      <section className="intro-band" id="main-content"><p className="eyebrow">THE SST LEARNING PLATFORM</p><p className="statement">Understand the procedure. Follow the anatomy. Learn from the people doing the work.</p><a href="#specialties" className="arrow-link">Discover our specialties <span aria-hidden="true">→</span></a></section>

      <section className="library-section" id="library" aria-labelledby="library-heading">
        <div className="section-heading"><div><p className="eyebrow">CURATED LEARNING</p><h2 id="library-heading">Start with what matters now.</h2></div><a className="arrow-link" href="#sign-in">View all learning <span aria-hidden="true">→</span></a></div>
        <div className="content-grid">
          <article className="feature-card"><div className="feature-visual visual-thyroid"><span>01</span><p>THYROID<br />&amp; PARATHYROID</p></div><div className="card-body"><p className="card-meta">SURGICAL VIDEO · 42 MIN</p><h3>Thyroidectomy: a considered approach to safe dissection</h3><p>Key anatomical landmarks, careful planning, and a clear operative sequence.</p><a href="#sign-in" className="card-link">Watch in the library <span aria-hidden="true">→</span></a></div></article>
          <article className="feature-card compact-card"><div className="feature-visual visual-webinar"><span>LIVE</span><p>CLINICAL<br />CONVERSATIONS</p></div><div className="card-body"><p className="card-meta">WEBINAR · 14 AUG · 18:00</p><h3>What a neck mass asks us to notice</h3><p>A live discussion with the Smart Surgical Team.</p><a href="#webinars" className="card-link">Reserve a place <span aria-hidden="true">→</span></a></div></article>
          <aside className="member-card" id="sign-in"><p className="eyebrow">YOUR SST SPACE</p><h3>Save learning that stays with you.</h3><p>Members can build a personal library, pick up where they left off, and register for webinars.</p><a className="button button-light" href="#contact">Create an account <span aria-hidden="true">→</span></a><p className="member-note">Google or email sign-in · Free member access</p></aside>
        </div>
      </section>

      <section className="specialties" id="specialties" aria-labelledby="specialties-heading"><div className="section-heading"><div><p className="eyebrow">FOCUSED EXPERTISE</p><h2 id="specialties-heading">Explore by specialty.</h2></div><p className="section-note">Clear paths into the procedures and questions that shape head and neck care.</p></div><div className="topic-list"><a href="#library"><span>01</span><b>Thyroid &amp; Parathyroid</b><i>Thyroid · Parathyroid</i><em aria-hidden="true">→</em></a><a href="#library"><span>02</span><b>Salivary Glands</b><i>Parotid</i><em aria-hidden="true">→</em></a><a href="#library"><span>03</span><b>Neck &amp; Lymphatic Surgery</b><i>Lymph nodes · Neck masses</i><em aria-hidden="true">→</em></a><a href="#library"><span>04</span><b>Skin &amp; Soft Tissue</b><i>Skin lesions</i><em aria-hidden="true">→</em></a><a href="#library"><span>05</span><b>Upper Aerodigestive Tract</b><i>Oral cavity · Larynx</i><em aria-hidden="true">→</em></a></div></section>

      <section className="webinar-section" id="webinars"><div><p className="eyebrow">LIVE LEARNING</p><h2>Bring your questions<br />into the room.</h2><p>Live sessions and on-demand recordings that make space for the details behind every decision.</p><a className="button" href="#contact">See webinars <span aria-hidden="true">→</span></a></div><div className="webinar-date"><span>14</span><b>AUGUST<br />2026</b><i>18:00<br />BAGHDAD</i><p>Neck masses: from first finding to a surgical plan</p></div></section>

      <section className="team-section" id="team"><div><p className="eyebrow">OUR PEOPLE</p><h2>Guided by the<br /><em>team behind the care.</em></h2></div><div className="team-copy"><p>Smart Surgical Team brings together a focused group of surgeons and contributors at Smart Health Tower. We share knowledge in the same spirit we approach care: carefully, openly, and with patients at the centre.</p><a href="#contact" className="arrow-link">Meet the team <span aria-hidden="true">→</span></a></div></section>

      <section className="contact-section" id="contact"><p className="eyebrow">STAY CONNECTED</p><h2>A better surgical conversation starts here.</h2><p>We are preparing the platform for its first members. Share your email and we’ll let you know when the library opens.</p><form className="interest-form" action="/api/contact" method="post"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /><input type="hidden" name="source" value="launch-interest" /><button className="button" type="submit">Keep me updated <span aria-hidden="true">→</span></button></form></section>
      <footer><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><i /></span><span>SMART <b>SURGICAL</b><small>TEAM</small></span></a><p>Head &amp; Neck Surgery, Guided by Expertise.</p><span>© 2026 Smart Surgical Team · Sulaymaniah, Kurdistan, Iraq</span></footer>
    </main>
  );
}
