import { notFound } from "next/navigation";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { IconGlobe, IconPin, IconUsers } from "../../components/icons";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { TEAM_GROUPS } from "../../lib/team";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict} />
    <main id="main-content" className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero-orbit about-hero-orbit-one" aria-hidden="true" />
        <div className="about-hero-orbit about-hero-orbit-two" aria-hidden="true" />
        <div className="about-hero-inner">
          <span className="eyebrow"><IconUsers size={15} /> About Smart Surgical Team</span>
          <h1 id="about-title">Surgical expertise,<br /><span>working as one team.</span></h1>
          <p>Smart Surgical Team brings together surgeons and multidisciplinary specialists dedicated to thoughtful, evidence-informed care across thyroid and head and neck surgery.</p>
          <div className="about-hero-facts">
            <span><IconPin size={17} /> Smart Health Tower · Sulaymaniyah</span>
            <span><IconGlobe size={17} /> Clinical care · Education · Collaboration</span>
          </div>
        </div>
      </section>

      <section className="about-statement" aria-labelledby="about-statement-title">
        <div><span className="section-kicker">Our approach</span><h2 id="about-statement-title">Care that is precise, collaborative and human.</h2></div>
        <p>We pair focused surgical practice with a collaborative approach to diagnosis, treatment planning and follow-up. Alongside clinical care, our team contributes to surgical education and professional exchange—helping strengthen head and neck care across our region.</p>
      </section>

      <section className="team-directory" aria-labelledby="team-directory-title">
        <div className="team-directory-head"><div><span className="section-kicker">Our people</span><h2 id="team-directory-title">Meet the team</h2></div><p>Dedicated clinicians and research staff working across every stage of care.</p></div>
        {TEAM_GROUPS.map((group, index) => <section className={`team-group team-group-${index + 1}`} key={group.title} aria-labelledby={`group-${index}`}>
          <div className="team-group-head"><span className="team-group-number">0{index + 1}</span><div><h3 id={`group-${index}`}>{group.title}</h3>{group.intro && <p>{group.intro}</p>}</div></div>
          <div className="team-profile-grid">
            {group.members.map((member) => <article className="team-profile" key={member.name}>
              <div className="team-portrait"><img src={member.portrait} alt={`Portrait of ${member.name}`} /></div>
              <div className="team-profile-copy"><p className="team-role">{member.role}</p><h4>{member.name}</h4><p className="team-credentials">{member.credentials}</p></div>
            </article>)}
          </div>
        </section>)}
      </section>

      <section className="about-closing"><div><span className="section-kicker">Our mission</span><h2>Advancing head and neck surgery through care, learning and partnership.</h2></div><p>We are building a trusted home for specialist surgical care and practical education—grounded in clinical excellence and strengthened by the people behind it.</p></section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
