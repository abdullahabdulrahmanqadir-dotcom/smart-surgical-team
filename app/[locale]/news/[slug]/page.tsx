import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ImageGallery from "../../../components/ImageGallery";
import NewsShare from "../../../components/NewsShare";
import ResearchCover from "../../../components/ResearchCover";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import TranslatableContent from "../../../components/TranslatableContent";
import { IconArrowRight } from "../../../components/icons";
import { getContent } from "../../../lib/content";
import { fill, getDictionary, type Dictionary } from "../../../lib/dictionaries";
import { getPublicEvent } from "../../../lib/events";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../../lib/i18n";
import { categoryLabel, getNewsItem, getNewsItems, localizedSections, localizedText, newsCoverImage, newsDate, newsGalleryImages, newsItemShape, type NewsItem, type NewsRelation } from "../../../lib/news";
import { getResearchById } from "../../../lib/research";
import { pageMetadata, seoDescription } from "../../../lib/seo";

type Params = { locale: string; slug: string };

/** The one related record an item points at, resolved to something linkable. */
type Related = { label: string; title: string; href: string };

/**
 * Turns `{ type, ref }` into a card.
 *
 * Reads the record rather than trusting the reference: an event that was
 * unpublished, or a case whose slug changed, must drop the card instead of
 * rendering a link into a 404.
 */
async function resolveRelated(locale: Locale, relation: NewsRelation, t: Dictionary["news"]): Promise<Related | null> {
  if (relation.type === "event") {
    const event = await getPublicEvent(relation.ref);
    return event ? { label: t.relatedEvent, title: event.title, href: localePath(locale, `events/${event.slug}`) } : null;
  }
  if (relation.type === "content") {
    const record = await getContent(relation.ref);
    return record ? { label: t.relatedCase, title: record.title, href: localePath(locale, `library/${record.slug}`) } : null;
  }
  const paper = await getResearchById(relation.ref);
  return paper ? { label: t.relatedResearch, title: paper.title, href: localePath(locale, `research/${paper.id}`) } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const item = await getNewsItem(slug);
  if (!item) return { robots: { index: false, follow: false } };
  const title = localizedText(locale, item.title, item.titleAr).value;
  const summary = localizedText(locale, item.summary, item.summaryAr).value;
  return {
    ...pageMetadata({
      locale,
      path: `news/${item.slug}`,
      title: fill(dict.seo.newsItemTitle, { title }),
      description: seoDescription(summary, dict.seo.newsDescription),
      ...(item.coverUrl ? { image: { url: item.coverUrl, alt: newsCoverImage(item)?.altText || title } } : {}),
    }),
    // A link-only item has no writing of its own: this page is a courtesy
    // destination if its URL is shared, not a page to index. Indexing it would
    // offer a thin summary in competition with the article it points at, and it
    // is deliberately absent from the sitemap for the same reason.
    ...(newsItemShape(item) === "link" ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function NewsItemPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.news;
  const item = await getNewsItem(slug);
  if (!item) notFound();

  const title = localizedText(active, item.title, item.titleAr).value;
  const summary = localizedText(active, item.summary, item.summaryAr).value;
  const label = categoryLabel(active, item.category) || t.unfiled;
  const date = newsDate(item.date, active);
  const { sections, translated } = localizedSections(active, item);
  const related = item.related ? await resolveRelated(active, item.related, t) : null;
  const more = (await getNewsItems()).filter((other: NewsItem) => other.slug !== item.slug).slice(0, 3);
  // The cover is one of the item's own photographs, so the hero borrows that
  // image's alt text and caption, and the strip below shows the rest.
  const cover = newsCoverImage(item);
  const gallery = newsGalleryImages(item);

  const body = sections.length
    ? sections.map((section) => <section key={section.key}>
        <h2>{section.label}</h2>
        <div className="rich-text" dangerouslySetInnerHTML={{ __html: section.body }}/>
      </section>)
    : <p>{summary}</p>;

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict}/>
    <main id="main-content" className="news-detail-page">
      <nav className="news-breadcrumb" aria-label={t.breadcrumb}>
        <Link href={localePath(active, "news")}>{dict.nav.news}</Link>
        <span>/</span>
        <b {...authoredTitleProps(title)}>{title}</b>
      </nav>

      <header className="news-detail-heading">
        <span className="news-detail-tags">
          <span className="news-card-category">{label}</span>
          {date ? <time dateTime={item.date}>{date}</time> : null}
        </span>
        <h1 {...authoredTitleProps(title)}>{title}</h1>
        {summary ? <p className="news-detail-summary">{summary}</p> : null}
      </header>

      {cover
        ? <div className="news-detail-cover">
            <ImageGallery presentation="hero" images={[{ id: `${item.id}-cover`, publicUrl: cover.publicUrl, altText: cover.altText || title, caption: cover.caption }]} label={title} t={dict.media}/>
          </div>
        : <div className="news-detail-cover news-detail-cover-generated">
            <ResearchCover title={title} label={label} paletteKey={item.category?.slug || item.slug}/>
          </div>}

      <article className="news-detail-body">
        {/* Arabic written by the editor is real prose and is shown as it is.
            Anything still in English on an Arabic page is offered to the
            reader's in-place translator instead — the same treatment cases,
            posters and research get. */}
        {active === "ar" && !translated
          ? <TranslatableContent
              locale={active}
              autoTranslate
              className="news-translatable-sections"
              labels={{
                translate: dict.library.translateCase,
                translating: dict.library.translatingCase,
                downloading: dict.library.downloadingModel,
                showOriginal: dict.library.showOriginalCase,
                failed: dict.library.translateFailed,
              }}
            >{body}</TranslatableContent>
          : body}

        {item.linkUrl ? <a className="news-original-link" href={item.linkUrl} target="_blank" rel="noopener noreferrer">
          <span>{t.readOriginal}</span>
          <IconArrowRight size={17}/>
        </a> : null}

        <NewsShare title={title} t={t}/>
      </article>

      {gallery.length ? <div className="news-detail-gallery">
        <ImageGallery
          images={gallery.map((image, index) => ({ id: `${item.id}-media-${index}`, publicUrl: image.publicUrl, altText: image.altText, caption: image.caption }))}
          label={t.galleryLabel}
          t={dict.media}
        />
      </div> : null}

      {related ? <aside className="news-related" aria-labelledby="news-related-heading">
        <span className="section-kicker" id="news-related-heading">{t.relatedLabel}</span>
        <Link className="news-related-card" href={related.href}>
          <span className="news-related-kind">{related.label}</span>
          <b {...authoredTitleProps(related.title)}>{related.title}</b>
          <span className="news-related-go" aria-hidden="true"><IconArrowRight size={17}/></span>
        </Link>
      </aside> : null}

      {more.length ? <section className="news-more" aria-labelledby="news-more-heading">
        <h2 id="news-more-heading">{t.moreNews}</h2>
        <div className="news-more-list">
          {more.map((other) => {
            const otherTitle = localizedText(active, other.title, other.titleAr).value;
            const otherDate = newsDate(other.date, active);
            const external = newsItemShape(other) === "link";
            const inner = <>
              <span className="news-more-meta">
                <span className="news-card-category">{categoryLabel(active, other.category) || t.unfiled}</span>
                {otherDate ? <time dateTime={other.date}>{otherDate}</time> : null}
              </span>
              <b {...authoredTitleProps(otherTitle)}>{otherTitle}</b>
            </>;
            return external
              ? <a className="news-more-card" key={other.id} href={other.linkUrl} target="_blank" rel="noopener noreferrer">{inner}</a>
              : <Link className="news-more-card" key={other.id} href={localePath(active, `news/${other.slug}`)}>{inner}</Link>;
          })}
        </div>
      </section> : null}

      <Link className="news-back" href={localePath(active, "news")}><IconArrowRight size={16}/> {t.backToNews}</Link>
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
