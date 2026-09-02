import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import { fill, getDictionary } from "../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../lib/i18n";
import { getLocalizedTeamGroups } from "../../lib/team";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: "about", title: dict.seo.aboutTitle, description: dict.seo.aboutDescription });
}

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

      {/* The mission led the page's closing section, which meant the page
          opened on a staff directory and only said what the department is
          about after eighteen portraits. It now introduces the team. */}
      <section className="about-statement" aria-labelledby="about-statement-title">
        <div><h2 id="about-statement-title">{dict.about.missionTitle}</h2></div>
        <p>{dict.about.missionBody} {dict.about.locationBody}</p>
      </section>

      <section className="team-directory" aria-label={dict.about.teamDirectory}>
        {teamGroups.map((group, index) => <section className={`team-group team-group-${index + 1}`} key={group.title} aria-labelledby={`group-${index}`}>
          <div className="team-group-head"><div><h3 id={`group-${index}`} {...authoredTitleProps(group.title)}>{group.title}</h3>{group.intro && <p>{group.intro}</p>}</div></div>
          <div className="team-profile-grid">
            {group.members.map((member) => <article className="team-profile" key={member.name}>
              <div className="team-portrait"><img src={member.portrait} alt={fill(dict.about.portraitOf, { name: member.name })} /></div>
              <div className="team-profile-copy"><p className="team-role">{member.role}</p><h4 {...authoredTitleProps(member.name)}>{member.name}</h4><p className="team-credentials">{member.credentials}</p></div>
            </article>)}
          </div>
        </section>)}
      </section>

      {/* How the team works together reads better once you have met them. */}
      <section className="about-closing"><div><h2>{dict.about.approachTitle}</h2></div><div><p>{dict.about.approachBody}</p><nav className="about-closing-links" aria-label={dict.about.exploreTopics}><Link className="text-link" href={localePath(active, "topics")}>{dict.about.exploreTopics}</Link><Link className="text-link" href={localePath(active, "research")}>{dict.about.exploreResearch}</Link></nav></div></section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
