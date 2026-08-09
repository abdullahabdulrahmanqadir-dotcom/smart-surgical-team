import { notFound } from "next/navigation";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import { fill, getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { getLocalizedTeamGroups } from "../../lib/team";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const teamGroups = getLocalizedTeamGroups(dict.team);

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict} />
    <ScrollMotion />
    <main id="main-content" className="about-page">
      <h1 className="visually-hidden">{dict.about.pageTitle}</h1>

      <section className="about-statement" aria-labelledby="about-statement-title">
        <div><span className="section-kicker">{dict.about.approachKicker}</span><h2 id="about-statement-title">{dict.about.approachTitle}</h2></div>
        <p>{dict.about.approachBody}</p>
      </section>

      <section className="team-directory" aria-label={dict.about.teamDirectory}>
        {teamGroups.map((group, index) => <section className={`team-group team-group-${index + 1}`} key={group.title} aria-labelledby={`group-${index}`}>
          <div className="team-group-head"><span className="team-group-number">0{index + 1}</span><div><h3 id={`group-${index}`}>{group.title}</h3>{group.intro && <p>{group.intro}</p>}</div></div>
          <div className="team-profile-grid">
            {group.members.map((member) => <article className="team-profile" key={member.name}>
              <div className="team-portrait"><img src={member.portrait} alt={fill(dict.about.portraitOf, { name: member.name })} /></div>
              <div className="team-profile-copy"><p className="team-role">{member.role}</p><h4>{member.name}</h4><p className="team-credentials">{member.credentials}</p></div>
            </article>)}
          </div>
        </section>)}
      </section>

      <section className="about-closing"><div><span className="section-kicker">{dict.about.missionKicker}</span><h2>{dict.about.missionTitle}</h2></div><p>{dict.about.missionBody}</p></section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
