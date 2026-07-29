import { notFound } from "next/navigation";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
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
      <h1 className="visually-hidden">About Smart Surgical Team</h1>

      <section className="about-statement" aria-labelledby="about-statement-title">
        <div><span className="section-kicker">Our approach</span><h2 id="about-statement-title">Precise care. A team approach.</h2></div>
        <p>Our surgeons and specialists work together to plan treatment, provide focused care and support recovery. Through education and collaboration, we help strengthen head and neck care across the region.</p>
      </section>

      <section className="team-directory" aria-label="Team directory">
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
