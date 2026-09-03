import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LazyImage from "../../../components/LazyImage";
import ContentPlayer from "../../../components/ContentPlayer";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import ScrollMotion from "../../../components/ScrollMotion";
import SaveCaseButton from "../../../components/SaveCaseButton";
import MemberContentGate from "../../../components/MemberContentGate";
import ImageGallery from "../../../components/ImageGallery";
import BackToPrevious from "../../../components/BackToPrevious";
import { IconArrowRight, IconFile } from "../../../components/icons";
import { getContent, getContentForMember, getLibraryContent, proseClass, resolveCaseSections, type ContentKind } from "../../../lib/content";
import { fill, getDictionary, type Dictionary } from "../../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../../lib/i18n";
import { contentCardArt } from "../../../lib/content-thumbnail";
import CardArt from "../../../components/CardArt";
import { TEAM_GROUPS } from "../../../lib/team";
import TranslatableContent from "../../../components/TranslatableContent";
import { pageMetadata, seoDescription } from "../../../lib/seo";

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
async function RelatedContent({ locale, contentId, topicSlug, kind }: { locale: Locale; contentId: string; topicSlug: string; kind: ContentKind }) {
  const dict = getDictionary(locale);
  const allContent = await getLibraryContent();
  const related = allContent.filter((item) => item.id !== contentId && (item.topicSlug === topicSlug || item.kind === kind)).slice(0, 3);
  if (!related.length) return <div className="related-grid" />;

  return (
    <div className="related-grid">
      {related.map((item, index) => {
        const art = contentCardArt(item);
        return (
          <Link href={localePath(locale, `library/${item.slug}`)} className="related-card" key={item.id}>
            <div className={`related-art tone-${(index % 4) + 1}`}>
              {art ? <CardArt item={item} className="related-thumbnail" labels={{ before: dict.media.beforeLabel, after: dict.media.afterLabel }} /> : null}
            </div>
            <span className="related-topic">{item.topic}</span>
            <h3 {...authoredTitleProps(item.title)}>{item.title}</h3>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Also where a missing case is turned away.
 *
 * `notFound()` from the component below cannot set the status: this segment has
 * a `loading.tsx`, so the shell — skeleton and a 200 — is already flushed by the
 * time the record resolves, and a crawler is handed an indexable "Loading case"
 * page for anything that does not exist. Metadata is awaited before the first
 * byte, so refusing here is what actually produces a 404. The record read is
 * cached, so asking for it twice costs one query.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const content = await getContent(id);
  // A members-only case is not missing — the page renders its gate — so only a
  // record that is absent for members too is a genuine 404.
  if (!content && (await getContentForMember(id))?.accessLevel !== "members_only") notFound();
  return content ? pageMetadata({
    locale: active,
    path: `library/${content.slug}`,
    title: `${content.title} | ${dict.brand.name}`,
    description: seoDescription(content.summary, dict.seo.topicsDescription),
    ...(content.thumbnailUrl ? { image: { url: content.thumbnailUrl, alt: content.title } } : {}),
  }) : { title: `${dict.library.contentNotFound} | ${dict.brand.name}`, robots: { index: false, follow: false } };
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
    if (memberContent?.accessLevel === "members_only") return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict} /><ScrollMotion/><main id="main-content" className="content-page"><MemberContentGate identifier={id} locale={active} t={dict.memberContent} mediaT={dict.media} caseSummaryT={dict.caseSummary} /></main><SiteFooter locale={active} dict={dict} /></>;
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
  // A before/after pair takes the hero as a single split frame; each half stays
  // clickable, so the pair is dropped from the sidebar gallery like a single
  // hero image is.
  const pairImages = content.thumbnailSource === "before_after" && content.beforeUrl && content.afterUrl
    ? [images.find((item) => item.publicUrl === content.beforeUrl), images.find((item) => item.publicUrl === content.afterUrl)].filter((item) => item !== undefined)
    : [];
  const heroPair = !content.videoUrl && pairImages.length === 2 ? pairImages : null;
  const mainImage = content.videoUrl || heroPair
    ? undefined
    : (content.thumbnailSource === "image" && content.thumbnailUrl
        ? images.find((item) => item.publicUrl === content.thumbnailUrl)
        : undefined) ?? images[0];
  const heroImages = heroPair ?? (mainImage ? [mainImage] : []);
  const galleryImages = heroImages.length ? images.filter((item) => !heroImages.some((hero) => hero.id === item.id)) : images;
  const contributors = content.contributors.length ? content.contributors : [{ ...content.presenter, photoUrl: undefined as string | undefined }];
  // An e-poster keeps its sheet in `posterUrl` rather than in the media
  // gallery, and has no video for the player to fall back on. Without these two
  // the page showed a title and a summary and withheld the poster itself along
  // with the link to the paper, which is the whole of what the record is for.
  // The `/posters` archive already renders both; this is the same treatment for
  // the same record reached through the library or a topic.
  const posterSheet = content.kind === "poster" && content.posterUrl && !images.some((item) => item.publicUrl === content.posterUrl)
    ? [{ id: `${content.id}-poster`, publicUrl: content.posterUrl, altText: fill(dict.posters.posterAlt, { title: content.title }), caption: content.title }]
    : [];
  const posterCta = content.kind === "poster" && content.posterCtaText && content.posterCtaUrl
    ? { text: content.posterCtaText, url: content.posterCtaUrl }
    : null;

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict} />
    <ScrollMotion />
    <main id="main-content" className="content-page">
      <nav className="content-breadcrumb" aria-label={dict.library.breadcrumb}><Link href={localePath(active, "topics")}>{dict.library.content}</Link><span>/</span><BackToPrevious fallback={localePath(active, "topics")}>{content.topic}</BackToPrevious><span>/</span><b {...authoredTitleProps(content.title)}>{content.title}</b></nav>
      <div className="content-heading"><div><span className="content-kicker">{typeLabel} · {content.level}</span><h1 {...authoredTitleProps(content.title)}>{content.title}</h1><p>{content.summary}</p></div><SaveCaseButton locale={active} item={{ slug: content.slug, title: content.title, summary: content.summary, topic: content.topic, format: typeLabel, duration: content.duration }} t={dict.saveCase} /></div>

      <div className="content-grid">
        <section className="content-main"><ContentPlayer content={content} t={dict.media} />
          {posterSheet.length || posterCta ? (
            <div className="poster-display">
              {posterSheet.length ? <ImageGallery images={posterSheet} label={dict.posters.openPoster} t={dict.media} presentation="poster" /> : null}
              {posterCta ? <a className="poster-resource-link" href={posterCta.url} target="_blank" rel="noopener noreferrer"><span>{posterCta.text}</span><IconArrowRight size={17} /></a> : null}
            </div>
          ) : null}
          {heroImages.length ? <ImageGallery images={heroImages} t={dict.media} presentation="hero" pair={Boolean(heroPair)} /> : null}
          {documents.length ? <section className="content-downloads" aria-labelledby="content-downloads-title"><div className="section-mini-head"><div><h2 id="content-downloads-title">{dict.library.downloads}</h2></div></div><ul>{documents.map((item) => <li key={item.id}><a href={item.publicUrl} target="_blank" rel="noreferrer"><IconFile size={18}/>{item.caption || item.altText || dict.library.downloadDocument}</a></li>)}</ul></section> : null}
          <section className="case-summary-panel" aria-labelledby="case-summary-title">
            <div className="section-mini-head"><div><h2 id="case-summary-title">{dict.library.caseDetails}</h2></div>{summarySections.length ? <span className="badge">{typeLabel}</span> : null}</div>
            {summarySections.length ? (
              // The <dt> headings are translated UI; only the <dd> bodies are
              // English database prose, so the wrapper marks those alone.
              <TranslatableContent
                locale={active}
                autoTranslate={active === "ar"}
                labels={{
                  translate: dict.library.translateCase,
                  translating: dict.library.translatingCase,
                  downloading: dict.library.downloadingModel,
                  showOriginal: dict.library.showOriginalCase,
                  failed: dict.library.translateFailed,
                }}
              >
                <dl className={proseClass("case-summary-list", content.justifyBody)}>
                  {summarySections.map(({ key, label, body }) => <div key={key}><dt translate="no" lang={active}>{label}</dt><dd dangerouslySetInnerHTML={{ __html: body }} /></div>)}
                </dl>
              </TranslatableContent>
            ) : (
              <div className="case-summary-empty"><IconFile size={20} /><div><b>{dict.library.caseEmptyTitle}</b><span>{dict.library.caseEmptyBody}</span></div></div>
            )}
          </section>
        </section>
        <aside className="content-aside">
          <section className="presenter-card"><span className="aside-label">{contributors.length === 1 ? dict.library.contributor : dict.library.contributors}</span><div className="presenter-list">{contributors.map((contributor) => { const portrait = contributor.photoUrl || staffPortraits.get(contributor.name); return <div className="presenter-identity" key={contributor.name}>{portrait ? <LazyImage className="presenter-avatar presenter-photo" src={portrait} alt={fill(dict.library.portraitOf, { name: contributor.name })} /> :<span className="presenter-avatar" aria-hidden="true">{contributor.initials}</span>}<div><h2>{contributor.name}</h2><p>{contributor.role}</p></div></div>; })}</div><Link href={localePath(active, "about")} className="text-link presenter-team-link">{dict.library.viewTeam} <IconArrowRight size={15} /></Link></section>
          <section className="details-card"><span className="aside-label">{dict.library.contentDetails}</span><dl><div><dt>{dict.library.format}</dt><dd>{typeLabel}</dd></div><div><dt>{dict.library.topic}</dt><dd>{content.topic}</dd></div><div><dt>{dict.library.level}</dt><dd>{content.level}</dd></div></dl></section>
          <ImageGallery images={galleryImages} t={dict.media} />
        </aside>
      </div>

      <section className="related-section" aria-labelledby="related-title"><div className="section-mini-head"><div><h2 id="related-title">{dict.library.relatedContent}</h2></div><Link className="text-link" href={`${home}#library`}>{dict.library.viewLibrary} <IconArrowRight size={16} /></Link></div>
        {/* Suggestions are worth showing but not worth delaying the case for.
            The reader gets the article as soon as it is ready; the rail fills
            in behind placeholder cards a moment later. */}
        <Suspense fallback={<RelatedSkeleton t={dict.library} />}>
          <RelatedContent locale={active} contentId={content.id} topicSlug={content.topicSlug} kind={content.kind} />
        </Suspense>
      </section>
    </main>
    <SiteFooter locale={active} dict={dict} />
  </>;
}
