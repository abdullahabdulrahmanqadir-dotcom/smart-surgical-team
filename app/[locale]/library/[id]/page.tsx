import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentPlayer from "../../../components/ContentPlayer";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { IconArrowRight, IconClock, IconFile, IconPlay } from "../../../components/icons";
import { CASE_SUMMARY_FIELDS, getContent, getLibraryContent, type CaseSummary } from "../../../lib/content";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";
import { getPublicTopicGroup } from "../../../lib/topics";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const content = await getContent((await params).id);
  return content ? { title: `${content.title} | Smart Surgical Team`, description: content.summary } : { title: "Content not found | Smart Surgical Team" };
}

export default async function ContentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const [dict, content, allContent] = [getDictionary(active), await getContent(id), await getLibraryContent()];
  if (!content) notFound();
  const related = allContent.filter((item) => item.id !== content.id && (item.topicSlug === content.topicSlug || item.kind === content.kind)).slice(0, 3);
  const home = localePath(active);
  const typeLabel = content.kind === "webinar_recording" ? "Recorded webinar" : content.kind === "poster" ? "E-poster" : "Operative video";
  // Some content sits under a taxonomy group that is not published yet
  // (visible: false), and linking there would 404. Show the label instead.
  const topicIsPublished = Boolean(getPublicTopicGroup(content.topicSlug));
  const summarySections = CASE_SUMMARY_FIELDS
    .map(({ key, label }) => ({ key, label, value: content.caseSummary?.[key]?.trim() }))
    .filter((section): section is { key: keyof CaseSummary; label: string; value: string } => Boolean(section.value));

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict} />
    <main id="main-content" className="content-page">
      <nav className="content-breadcrumb" aria-label="Breadcrumb"><Link href={`${home}#library`}>Library</Link><span>/</span>{topicIsPublished ? <Link href={localePath(active, `topics/${content.topicSlug}`)}>{content.topic}</Link> : <span>{content.topic}</span>}<span>/</span><b>{content.title}</b></nav>
      <div className="content-heading"><div><span className="content-kicker">{typeLabel} · {content.level}</span><h1>{content.title}</h1><p>{content.summary}</p></div><button className="save-button" type="button"><span>+</span> Save for later</button></div>

      <div className="content-grid">
        <section className="content-main"><ContentPlayer content={content} />
          <section className="case-summary-panel" aria-labelledby="case-summary-title">
            <div className="section-mini-head"><div><span className="section-kicker">Clinical record</span><h2 id="case-summary-title">Case summary</h2></div>{summarySections.length ? <span className="badge">{typeLabel}</span> : null}</div>
            {summarySections.length ? (
              <dl className="case-summary-list">
                {summarySections.map(({ key, label, value }) => <div key={key}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            ) : (
              <div className="case-summary-empty"><IconFile size={20} /><div><b>Case detail is not published yet.</b><span>Presentation, imaging, procedure, histopathology and outcome appear here once the team has reviewed and de-identified them.</span></div></div>
            )}
          </section>
        </section>
        <aside className="content-aside">
          <section className="presenter-card"><span className="aside-label">Presenter</span><div className="presenter-identity"><span className="presenter-avatar">{content.presenter.initials}</span><div><h2>{content.presenter.name}</h2><p>{content.presenter.role}</p></div></div><p className="presenter-copy">{content.presenter.bio || "Contributor to Smart Surgical Team education."}</p><Link href={`${home}#team`} className="text-link">View team <IconArrowRight size={15} /></Link></section>
          <section className="details-card"><span className="aside-label">Content details</span><dl><div><dt>Format</dt><dd>{typeLabel}</dd></div><div><dt>Duration</dt><dd>{content.duration}</dd></div><div><dt>Topic</dt><dd>{content.topic}</dd></div><div><dt>Level</dt><dd>{content.level}</dd></div></dl></section>
        </aside>
      </div>

      <section className="related-section" aria-labelledby="related-title"><div className="section-mini-head"><div><span className="section-kicker">Keep learning</span><h2 id="related-title">Related content</h2></div><Link className="text-link" href={`${home}#library`}>View library <IconArrowRight size={16} /></Link></div><div className="related-grid">
        {related.map((item, index) => <Link href={localePath(active, `library/${item.slug}`)} className="related-card" key={item.id}><div className={`related-art tone-${(index % 4) + 1}`}><span className="related-play"><IconPlay size={18} /></span><small>{item.duration}</small></div><span className="related-topic">{item.topic}</span><h3>{item.title}</h3><p><IconClock size={14} /> {item.kind === "webinar_recording" ? "Recorded webinar" : "Video lesson"}</p></Link>)}
      </div></section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
