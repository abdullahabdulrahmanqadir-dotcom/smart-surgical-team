"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LazyImage from "./LazyImage";
import { IconArrowRight } from "./icons";
// From `news-data`, not `news`: this is a client component, and `news` pulls in
// `next/cache`, which has no browser equivalent.
import { categoryLabel, localizedText, newsCoverImage, newsDate, newsItemShape, type NewsCategory, type NewsItem } from "../lib/news-data";
import { authoredTitleProps, localePath, type Locale } from "../lib/i18n";
import { fill, type Dictionary } from "../lib/dictionaries";

const ALL = "all";

/**
 * Filtering happens here rather than through the URL. The feed is one short
 * list — every item is already in the payload — so a chip is instant, and the
 * page cache keeps serving one shared copy of the HTML.
 */
export default function NewsExplorer({ locale, items, categories, t }: { locale: Locale; items: NewsItem[]; categories: NewsCategory[]; t: Dictionary["news"] }) {
  const [category, setCategory] = useState(ALL);

  // Only categories something is actually filed under are offered: a chip that
  // can only ever produce an empty feed is worse than no chip.
  const used = useMemo(() => {
    const slugs = new Set(items.map((item) => item.category?.slug).filter(Boolean));
    return categories.filter((entry) => slugs.has(entry.slug));
  }, [categories, items]);

  const filtered = useMemo(
    () => category === ALL ? items : items.filter((item) => item.category?.slug === category),
    [category, items],
  );
  const number = new Intl.NumberFormat(locale);

  function story(item: NewsItem) {
    const title = localizedText(locale, item.title, item.titleAr).value;
    const summary = localizedText(locale, item.summary, item.summaryAr).value;
    const label = categoryLabel(locale, item.category) || t.unfiled;
    const date = newsDate(item.date, locale);
    const external = newsItemShape(item) === "link";

    const body = <>
      <div className="news-entry-copy">
        <span className="news-card-tags">
          {date ? <time dateTime={item.date}>{date}</time> : null}
          <span className="news-card-category">{label}</span>
          {external ? <span className="news-card-external">{t.externalBadge}</span> : null}
        </span>
        <h2 {...authoredTitleProps(title)}>{title}</h2>
        {summary ? <span className="news-card-summary" {...authoredTitleProps(summary)}>{summary}</span> : null}
        <span className="news-card-action">
          {external ? t.opensExternal : t.readMore}
          <IconArrowRight size={16}/>
        </span>
      </div>
      {item.coverUrl && (
        <span className="news-entry-media">
          <LazyImage src={item.coverUrl} alt={newsCoverImage(item)?.altText || ""} />
        </span>
      )}
    </>;

    return external
      ? <a className="news-entry is-external" href={item.linkUrl} target="_blank" rel="noopener noreferrer">{body}</a>
      : <Link className="news-entry" href={localePath(locale, `news/${item.slug}`)}>{body}</Link>;
  }

  return <section className="news-feed" aria-labelledby="news-feed-heading">
    <div className="news-feed-head">
      <div>
        <h1 id="news-feed-heading">{t.heroTitle} {t.heroAccent}</h1>
        <p className="section-sub">{t.heroIntro}</p>
      </div>
    </div>

    {used.length > 1 ? <div className="news-chips" role="group" aria-label={t.filterLabel}>
      <button type="button" className={category === ALL ? "is-active" : undefined} aria-pressed={category === ALL} onClick={() => setCategory(ALL)}>{t.allCategories}</button>
      {used.map((entry) => <button
        key={entry.id}
        type="button"
        className={category === entry.slug ? "is-active" : undefined}
        aria-pressed={category === entry.slug}
        onClick={() => setCategory(entry.slug)}
      >{categoryLabel(locale, entry)}</button>)}
    </div> : null}

    <p role="status" className="visually-hidden">{fill(t.filteredCount, { count: number.format(filtered.length) })}</p>
    <div>
      {filtered.length ? <ul className="news-entry-list">
        {filtered.map((item) => <li key={item.id}>{story(item)}</li>)}
      </ul> : <div className="news-empty">
        <h2>{items.length ? t.noMatchesTitle : t.emptyTitle}</h2>
        <p>{items.length ? t.noMatchesBody : t.emptyBody}</p>
        {items.length ? <button type="button" className="btn btn-outline" onClick={() => setCategory(ALL)}>{t.allCategories}</button> : null}
      </div>}
    </div>
  </section>;
}
