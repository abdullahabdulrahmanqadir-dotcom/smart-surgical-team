import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentPlayer from "../../../components/ContentPlayer";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import SaveCaseButton from "../../../components/SaveCaseButton";
import MemberContentGate from "../../../components/MemberContentGate";
import ImageGallery from "../../../components/ImageGallery";
import { IconArrowRight, IconClock, IconFile, IconPlay } from "../../../components/icons";
import { CASE_SUMMARY_FIELDS, getContent, getContentForMember, getLibraryContent, type CaseSummary } from "../../../lib/content";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";
import { getPublicTopicGroup } from "../../../lib/topics";
import { contentThumbnailUrl } from "../../../lib/content-thumbnail";
import { TEAM_GROUPS } from "../../../lib/team";

const staffPortraits = new Map(TEAM_GROUPS.flatMap((group) => group.members.map((member) => [member.name, member.portrait])));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const content = await getContent((await params).id);
  return content ? { title: `${content.title} | Smart Surgical Team`, description: content.summary } : { title: "Content not found | Smart Surgical Team" };
}

export default async function ContentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const [dict, content, allContent] = [getDictionary(active), await getContent(id), await getLibraryContent()];
  if (!content) {
    const memberContent = await getContentForMember(id);
    if (memberContent?.accessLevel === "members_only") return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict} /><main id="main-content" className="content-page"><MemberContentGate identifier={id} locale={active} /></main><SiteFooter locale={active} dict={dict} /></>;
    notFound();
  }
  const related = allContent.filter((item) => item.id !== content.id && (item.topicSlug === content.topicSlug || item.kind === content.kind)).slice(0, 3);
  const home = localePath(active);
  const typeLabel = content.kind === "webinar_recording" ? "Recorded webinar" : content.kind === "poster" ? "E-poster" : content.kind === "case_article" ? "Case article" : "Operative video";
  // Some content sits under a taxonomy group that is not published yet
  // (visible: false), and linking there would 404. Show the label instead.
  const topicIsPublished = Boolean(getPublicTopicGroup(content.topicSlug));
  const summarySections = CASE_SUMMARY_FIELDS
    .map(({ key, label }) => ({ key, label, value: content.caseSummary?.[key]?.trim() }))
    .filter((section): section is { key: keyof CaseSummary; label: string; value: string } => Boolean(section.value));
  const documents = content.media?.filter((item) => item.kind === "document") ?? [];
  const contributors = content.contributors.length ? content.contributors : [content.presenter];

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict} />
    <main id="main-content" className="content-page">
      <nav className="content-breadcrumb" aria-label="Breadcrumb"><Link href={`${home}#library`}>Library</Link><span>/</span>{topicIsPublished ? <Link href={localePath(active, `topics/${content.topicSlug}`)}>{content.topic}</Link> : <span>{content.topic}</span>}<span>/</span><b>{content.title}</b></nav>
      <div className="content-heading"><div><span className="content-kicker">{typeLabel} · {content.level}</span><h1>{content.title}</h1><p>{content.summary}</p></div><SaveCaseButton locale={active} item={{ slug: content.slug, title: content.title, summary: content.summary, topic: content.topic, format: typeLabel, duration: content.duration }} /></div>

      <div className="content-grid">
        <section className="content-main"><ContentPlayer content={content} />
          {content.bodyHtml ? <section className="member-rich-content" dangerouslySetInnerHTML={{ __html: content.bodyHtml }} /> : null}
          {documents.length ? <section className="content-downloads" aria-labelledby="content-downloads-title"><div className="section-mini-head"><div><span className="section-kicker">Resources</span><h2 id="content-downloads-title">Downloads</h2></div></div><ul>{documents.map((item) => <li key={item.id}><a href={item.publicUrl} target="_blank" rel="noreferrer"><IconFile size={18}/>{item.caption || item.altText || "Download document"}</a></li>)}</ul></section> : null}
          <section className="case-summary-panel" aria-labelledby="case-summary-title">
            <div className="section-mini-head"><div><span className="section-kicker">Overview</span><h2 id="case-summary-title">Case details</h2></div>{summarySections.length ? <span className="badge">{typeLabel}</span> : null}</div>
            {summarySections.length ? (
              <dl className="case-summary-list">
                {summarySections.map(({ key, label, value }) => <div key={key}><dt>{label}</dt><dd dangerouslySetInnerHTML={{ __html: value }} /></div>)}
              </dl>
            ) : (
              <div className="case-summary-empty"><IconFile size={20} /><div><b>Case detail is not published yet.</b><span>Presentation, imaging, procedure, histopathology and outcome appear here once the team has reviewed and de-identified them.</span></div></div>
            )}
          </section>
        </section>
        <aside className="content-aside">
          <section className="presenter-card"><span className="aside-label">{contributors.length === 1 ? "Contributor" : "Contributors"}</span><div className="presenter-list">{contributors.map((contributor) => { const portrait = contributor.photoUrl || staffPortraits.get(contributor.name); return <div className="presenter-identity" key={contributor.name}>{portrait ? <img className="presenter-avatar presenter-photo" src={portrait} alt={`Portrait of ${contributor.name}`} /> : <span className="presenter-avatar" aria-hidden="true">{contributor.initials}</span>}<div><h2>{contributor.name}</h2><p>{contributor.role}</p></div></div>; })}</div><Link href={localePath(active, "about")} className="text-link presenter-team-link">View team <IconArrowRight size={15} /></Link></section>
          <section className="details-card"><span className="aside-label">Content details</span><dl><div><dt>Format</dt><dd>{typeLabel}</dd></div><div><dt>Topic</dt><dd>{content.topic}</dd></div><div><dt>Level</dt><dd>{content.level}</dd></div></dl></section>
          <ImageGallery images={content.media?.filter((item) => item.kind === "image") ?? []} />
        </aside>
      </div>

      <section className="related-section" aria-labelledby="related-title"><div className="section-mini-head"><div><span className="section-kicker">Keep learning</span><h2 id="related-title">Related content</h2></div><Link className="text-link" href={`${home}#library`}>View library <IconArrowRight size={16} /></Link></div><div className="related-grid">
        {related.map((item, index) => { const thumbnail = contentThumbnailUrl(item); return <Link href={localePath(active, `library/${item.slug}`)} className="related-card" key={item.id}><div className={`related-art tone-${(index % 4) + 1}`}>{thumbnail ? <img className="related-thumbnail" src={thumbnail} alt=""/> : null}<span className="related-play"><IconPlay size={18} /></span><small>{item.duration}</small></div><span className="related-topic">{item.topic}</span><h3>{item.title}</h3><p><IconClock size={14} /> {item.kind === "webinar_recording" ? "Recorded webinar" : "Video lesson"}</p></Link>; })}
      </div></section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
