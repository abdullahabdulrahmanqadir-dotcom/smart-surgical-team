import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "../../../components/JsonLd";
import ScrollMotion from "../../../components/ScrollMotion";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { IconArrowRight } from "../../../components/icons";
import { fill, getDictionary } from "../../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../../lib/i18n";
import { getResearches, staffMemberFor } from "../../../lib/research";
import { pageMetadata } from "../../../lib/seo";
import { profilePageJsonLd } from "../../../lib/structured-data";
import { TEAM_GROUPS, getLocalizedTeamGroups } from "../../../lib/team";
import { getTeamProfile } from "../../../lib/team-profiles";

type Params = { locale: string; slug: string };

// No generateStaticParams: the page lists the member's papers from the
// database, so it stays Worker-rendered like every other content page.

function resolve(locale: Locale, slug: string) {
  const profile = getTeamProfile(slug);
  const member = profile && TEAM_GROUPS.flatMap((group) => group.members).find((candidate) => candidate.name === profile.memberName);
  if (!profile || !member) return null;
  const dict = getDictionary(locale);
  // The roster copy the About page shows, for role and credentials in this locale.
  const team = new Map(getLocalizedTeamGroups(dict.team).flatMap((group) => group.members).map((entry) => [entry.name, entry]));
  return { profile, member, shown: team.get(member.name) ?? member, copy: profile.copy[locale], dict };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const found = resolve(locale, slug);
  if (!found) notFound();
  const { member, profile, copy } = found;
  return pageMetadata({
    locale,
    path: `about/${profile.slug}`,
    title: `${member.name}, ${copy.headline} | SST`,
    description: copy.intro.length > 160 ? `${copy.intro.slice(0, copy.intro.lastIndexOf(" ", 157))}…` : copy.intro,
    image: { url: member.portrait, alt: member.name },
  });
}

export default async function TeamProfilePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const found = resolve(active, slug);
  if (!found) notFound();
  const { profile, member, shown, copy, dict } = found;
  const t = dict.teamProfile;

  const papers = (await getResearches()).filter((paper) =>
    (paper.contributors ?? []).some((author) => staffMemberFor(author.name)?.name === member.name));

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <JsonLd data={profilePageJsonLd(active, member, shown, profile)} />
    <SiteHeader locale={active} dict={dict} />
    <ScrollMotion />
    <main id="main-content" className="about-page member-profile">
      <section className="member-profile-hero">
        <div className="member-profile-portrait"><img src={member.portrait} alt={fill(t.portraitOf, { name: member.name })} /></div>
        <div className="member-profile-intro">
          <Link className="text-link member-profile-back" href={localePath(active, "about")}>{t.backToTeam}</Link>
          <p className="member-profile-kicker">{copy.kicker}</p>
          <h1 {...authoredTitleProps(member.name)}>{member.name}</h1>
          <p className="member-profile-headline">{copy.headline}</p>
          <p className="member-profile-credentials">{shown.role} · {shown.credentials}</p>
          <p className="member-profile-lede">{copy.intro}</p>
        </div>
      </section>

      <section className="member-profile-highlights" aria-label={copy.headline}>
        <dl>
          {copy.highlights.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>
      </section>

      <div className="member-profile-body">
        {copy.sections.map((section) => <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>)}
          {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </section>)}

        {papers.length > 0 && <section>
          <h2>{t.publicationsTitle}</h2>
          <p>{fill(t.publicationsCount, { count: papers.length })}</p>
          <ul className="member-profile-papers">
            {papers.slice(0, 6).map((paper) => <li key={paper.id}>
              <Link href={localePath(active, `research/${paper.id}`)} {...authoredTitleProps(paper.title)}>{paper.title}</Link>
              <small>{[paper.journal, paper.year].filter(Boolean).join(" · ")}</small>
            </li>)}
          </ul>
          <Link className="text-link" href={localePath(active, "research")}>{t.viewAllResearch} <IconArrowRight size={16} /></Link>
        </section>}

        <section>
          <h2>{t.elsewhereTitle}</h2>
          <ul className="member-profile-links">
            {profile.links.map((link) => <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}</a></li>)}
          </ul>
        </section>
      </div>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
