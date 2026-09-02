"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LazyImage from "./LazyImage";
import ResearchCover from "./ResearchCover";
import { IconArrowRight } from "./icons";
// From `news-data`, not `news`: this is a client component, and `news` pulls in
// `next/cache`, which has no browser equivalent.
import { categoryLabel, localizedText, newsDate, newsItemShape, type NewsCategory, type NewsItem } from "../lib/news-data";
import { authoredTitleProps, localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";

const ALL = "all";

/**
 * The news feed: a lead story, then a grid, filtered by category chips.
 *
 * The lead is always the newest item of whatever is showing, so choosing a
 * category re-leads with that category's newest rather than leaving a heading
 * over a story the filter has excluded.
 *
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
  const [lead, ...rest] = filtered;

  function card(item: NewsItem, lead = false) {
    const title = localizedText(locale, item.title, item.titleAr).value;
    const summary = localizedText(locale, item.summary, item.summaryAr).value;
    const label = categoryLabel(locale, item.category) || t.unfiled;
    const date = newsDate(item.date, locale);
    const external = newsItemShape(item) === "link";

    const body = <>
      <span className={lead ? "news-lead-media" : "news-card-media"}>
        {item.coverUrl
          ? <LazyImage className="news-card-image" src={item.coverUrl} alt={item.media[0]?.altText || title} eager={lead}/>
          // No photograph: the cover is drawn from the item's own headline and
          // coloured by its category, so the grid never carries a hole.
          : <ResearchCover title={title} label={label} paletteKey={item.category?.slug || item.slug}/>}
      </span>
      <span className={lead ? "news-lead-body" : "news-card-body"}>
        <span className="news-card-tags">
          <span className="news-card-category">{label}</span>
          {date ? <time dateTime={item.date}>{date}</time> : null}
          {external ? <span className="news-card-external">{t.externalBadge}</span> : null}
        </span>
        {/* A real heading: these cards carry the feed's only titles, and the
            grid needs headings to be navigable. */}
        {lead
          ? <h2 className="news-lead-title" {...authoredTitleProps(title)}>{title}</h2>
          : <h3 className="news-card-title" {...authoredTitleProps(title)}>{title}</h3>}
        {summary ? <span className="news-card-summary">{summary}</span> : null}
        <span className="news-card-action">
          {external ? t.opensExternal : t.readMore}
          <IconArrowRight size={16}/>
        </span>
      </span>
    </>;

    const className = lead ? "news-lead" : "news-card";
    // The §2 rule, rendered: an item with no body of its own is a card that
    // leaves the site, so it is an anchor rather than a route link.
    return external
      ? <a className={`${className} is-external`} key={item.id} href={item.linkUrl} target="_blank" rel="noopener noreferrer">{body}</a>
      : <Link className={className} key={item.id} href={localePath(locale, `news/${item.slug}`)}>{body}</Link>;
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

    <div aria-live="polite">
      {lead ? <>
        {card(lead, true)}
        {rest.length ? <div className="news-grid">{rest.map((item) => card(item))}</div> : null}
      </> : <div className="news-empty">
        <h2>{items.length ? t.noMatchesTitle : t.emptyTitle}</h2>
        <p>{items.length ? t.noMatchesBody : t.emptyBody}</p>
        {items.length ? <button type="button" className="btn btn-outline" onClick={() => setCategory(ALL)}>{t.allCategories}</button> : null}
      </div>}
    </div>
  </section>;
}
