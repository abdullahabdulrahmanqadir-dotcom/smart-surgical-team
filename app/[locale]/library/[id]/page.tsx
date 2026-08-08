import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LazyImage from "../../../components/LazyImage";
import ContentPlayer from "../../../components/ContentPlayer";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import SaveCaseButton from "../../../components/SaveCaseButton";
import MemberContentGate from "../../../components/MemberContentGate";
import ImageGallery from "../../../components/ImageGallery";
import BackToPrevious from "../../../components/BackToPrevious";
import { IconArrowRight, IconClock, IconFile, IconPlay } from "../../../components/icons";
import { getContent, getContentForMember, getLibraryContent, resolveCaseSections, type ContentKind } from "../../../lib/content";
import { fill, getDictionary, type Dictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";
import { contentThumbnailUrl } from "../../../lib/content-thumbnail";
import { TEAM_GROUPS } from "../../../lib/team";

const staffPortraits = new Map(TEAM_GROUPS.flatMap((group) => group.members.map((member) => [member.name, member.portrait])));

function RelatedSkeleton({ t }: { t: Dictionary["library"] }) {
  return (
    <div className="related-grid" role="status" aria-label={t.loadingRelated}>
      {[0, 1, 2].map((index) => (
        <div className="related-card is-skeleton" key={index} aria-hidden="true">
          <div className="related-art"><span className="skeleton-block" /></div>
          <span className="related-topic"><span className="skeleton-line skeleton-line-xs" /></span>
          <h3><span className="skeleton-line skeleton-line-lg" /></h3>
          <p><span className="skeleton-line skeleton-line-sm" /></p>
        </div>
      ))}
    </div>
  );
}

/** Streamed separately from the case itself so the article never waits on it. */
async function RelatedContent({ locale, t, contentId, topicSlug, kind }: { locale: Locale; t: Dictionary["library"]; contentId: string; topicSlug: string; kind: ContentKind }) {
  const allContent = await getLibraryContent();
  const related = allContent.filter((item) => item.id !== contentId && (item.topicSlug === topicSlug || item.kind === kind)).slice(0, 3);
  if (!related.length) return <div className="related-grid" />;

  return (
    <div className="related-grid">
      {related.map((item, index) => {
        const thumbnail = contentThumbnailUrl(item);
        return (
          <Link href={localePath(locale, `library/${item.slug}`)} className="related-card" key={item.id}>
            <div className={`related-art tone-${(index % 4) + 1}`}>
              {thumbnail ? <LazyImage className="related-thumbnail" src={thumbnail} /> : null}
              <span className="related-play"><IconPlay size={18} /></span>
            </div>
            <span className="related-topic">{item.topic}</span>
            <h3>{item.title}</h3>
            <p><IconClock size={14} /> {item.kind === "webinar_recording" ? t.recordedWebinar : t.videoLesson}</p>
          </Link>
        );
      })}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const content = await getContent(id);
  return content ? { title: `${content.title} | ${dict.brand.name}`, description: content.summary } : { title: `${dict.library.contentNotFound} | ${dict.brand.name}` };
}

export default async function ContentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  // The catalogue read used to be awaited after this one inside an array
  // literal, so it did not even start until the case had resolved — two serial
  // round trips before a byte of HTML could be sent. The related rail now
  // streams in separately instead (see RelatedContent below), so the case
  // itself is the only thing this render waits for.
  const content = await getContent(id);
  if (!content) {
    const memberContent = await getContentForMember(id);
    if (memberContent?.accessLevel === "members_only") return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict} /><main id="main-content" className="content-page"><MemberContentGate identifier={id} locale={active} /></main><SiteFooter locale={active} dict={dict} /></>;
    notFound();
  }
  const home = localePath(active);
  const typeLabel = content.kind === "webinar_recording" ? dict.library.recordedWebinar : content.kind === "poster" ? dict.library.ePoster : content.kind === "case_article" ? dict.library.caseArticle : dict.library.operativeVideo;
  const summarySections = resolveCaseSections(content, dict.caseSummary);
  const documents = content.media?.filter((item) => item.kind === "document") ?? [];
  const images = content.media?.filter((item) => item.kind === "image") ?? [];
  // With no video, the case still deserves a lead visual. The image chosen as
  // the card thumbnail becomes the hero shown where the player would be; if none
  // was chosen, the first uploaded image stands in. The hero is then dropped
  // from the sidebar gallery so it is never shown twice.
  const mainImage = content.videoUrl
    ? undefined
    : (content.thumbnailSource === "image" && content.thumbnailUrl
        ? images.find((item) => item.publicUrl === content.thumbnailUrl)
        : undefined) ?? images[0];
  const galleryImages = mainImage ? images.filter((item) => item.id !== mainImage.id) : images;
  const contributors = content.contributors.length ? content.contributors : [{ ...content.presenter, photoUrl: undefined as string | undefined }];

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict} />
    <main id="main-content" className="content-page">
      <nav className="content-breadcrumb" aria-label={dict.library.breadcrumb}><Link href={localePath(active, "topics")}>{dict.library.content}</Link><span>/</span><BackToPrevious fallback={localePath(active, "topics")}>{content.topic}</BackToPrevious><span>/</span><b>{content.title}</b></nav>
      <div className="content-heading"><div><span className="content-kicker">{typeLabel} · {content.level}</span><h1>{content.title}</h1><p>{content.summary}</p></div><SaveCaseButton locale={active} item={{ slug: content.slug, title: content.title, summary: content.summary, topic: content.topic, format: typeLabel, duration: content.duration }} /></div>

      <div className="content-grid">
        <section className="content-main"><ContentPlayer content={content} />
          {mainImage ? <figure className="content-hero-image"><LazyImage src={mainImage.publicUrl} alt={mainImage.altText ?? content.title} />{mainImage.caption ? <figcaption>{mainImage.caption}</figcaption> : null}</figure> : null}
          {documents.length ? <section className="content-downloads" aria-labelledby="content-downloads-title"><div className="section-mini-head"><div><span className="section-kicker">{dict.library.resources}</span><h2 id="content-downloads-title">{dict.library.downloads}</h2></div></div><ul>{documents.map((item) => <li key={item.id}><a href={item.publicUrl} target="_blank" rel="noreferrer"><IconFile size={18}/>{item.caption || item.altText || dict.library.downloadDocument}</a></li>)}</ul></section> : null}
          <section className="case-summary-panel" aria-labelledby="case-summary-title">
            <div className="section-mini-head"><div><span className="section-kicker">{dict.library.overview}</span><h2 id="case-summary-title">{dict.library.caseDetails}</h2></div>{summarySections.length ? <span className="badge">{typeLabel}</span> : null}</div>
            {summarySections.length ? (
              <dl className="case-summary-list">
                {summarySections.map(({ key, label, body }) => <div key={key}><dt>{label}</dt><dd dangerouslySetInnerHTML={{ __html: body }} /></div>)}
              </dl>
            ) : (
              <div className="case-summary-empty"><IconFile size={20} /><div><b>{dict.library.caseEmptyTitle}</b><span>{dict.library.caseEmptyBody}</span></div></div>
            )}
          </section>
        </section>
        <aside className="content-aside">
          <section className="presenter-card"><span className="aside-label">{contributors.length === 1 ? dict.library.contributor : dict.library.contributors}</span><div className="presenter-list">{contributors.map((contributor) => { const portrait = contributor.photoUrl || staffPortraits.get(contributor.name); return <div className="presenter-identity" key={contributor.name}>{portrait ? <LazyImage className="presenter-avatar presenter-photo" src={portrait} alt={fill(dict.library.portraitOf, { name: contributor.name })} /> :<span className="presenter-avatar" aria-hidden="true">{contributor.initials}</span>}<div><h2>{contributor.name}</h2><p>{contributor.role}</p></div></div>; })}</div><Link href={localePath(active, "about")} className="text-link presenter-team-link">{dict.library.viewTeam} <IconArrowRight size={15} /></Link></section>
          <section className="details-card"><span className="aside-label">{dict.library.contentDetails}</span><dl><div><dt>{dict.library.format}</dt><dd>{typeLabel}</dd></div><div><dt>{dict.library.topic}</dt><dd>{content.topic}</dd></div><div><dt>{dict.library.level}</dt><dd>{content.level}</dd></div></dl></section>
          <ImageGallery images={galleryImages} />
        </aside>
      </div>

      <section className="related-section" aria-labelledby="related-title"><div className="section-mini-head"><div><span className="section-kicker">{dict.library.keepLearning}</span><h2 id="related-title">{dict.library.relatedContent}</h2></div><Link className="text-link" href={`${home}#library`}>{dict.library.viewLibrary} <IconArrowRight size={16} /></Link></div>
        {/* Suggestions are worth showing but not worth delaying the case for.
            The reader gets the article as soon as it is ready; the rail fills
            in behind placeholder cards a moment later. */}
        <Suspense fallback={<RelatedSkeleton t={dict.library} />}>
          <RelatedContent locale={active} t={dict.library} contentId={content.id} topicSlug={content.topicSlug} kind={content.kind} />
        </Suspense>
      </section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
