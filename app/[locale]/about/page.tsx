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
import JsonLd from "../../components/JsonLd";
import { teamGraph } from "../../lib/structured-data";
import { profileForMember } from "../../lib/team-profiles";

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
    <JsonLd data={teamGraph(active, teamGroups.flatMap((group) => group.members))} />
    <main id="main-content" className="about-page">
      <header className="about-statement">
        <div>
          <h1>{dict.about.pageTitle}</h1>
          <a className="text-link" href="#team-directory">{dict.nav.team}</a>
        </div>
        <div className="about-mission">
          <h2>{dict.about.missionTitle}</h2>
          <p>{dict.about.missionBody} {dict.about.locationBody}</p>
        </div>
      </header>

      <section className="team-directory" id="team-directory" aria-labelledby="team-directory-heading">
        <h2 className="visually-hidden" id="team-directory-heading">{dict.about.teamDirectory}</h2>
        {teamGroups.map((group, index) => <section className={`team-group team-group-${index + 1}`} key={group.title} aria-labelledby={`group-${index}`}>
          <div className="team-group-head"><div><h3 id={`group-${index}`} {...authoredTitleProps(group.title)}>{group.title}</h3>{group.intro && <p>{group.intro}</p>}</div></div>
          <div className="team-profile-grid">
            {group.members.map((member) => <article className="team-profile" key={member.name}>
              <div className="team-portrait"><img src={member.portrait} alt={fill(dict.about.portraitOf, { name: member.name })} /></div>
              <div className="team-profile-copy"><p className="team-role">{member.role}</p><h4 {...authoredTitleProps(member.name)}>{(() => { const page = profileForMember(member.name); return page ? <Link className="team-profile-link" href={localePath(active, `about/${page.slug}`)}>{member.name}</Link> : member.name; })()}</h4><p className="team-credentials">{member.credentials}</p></div>
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
