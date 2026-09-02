import type { Dictionary } from "../lib/dictionaries";
import type { ContentCard } from "../lib/content-types";
import { authoredTitleProps, localePath, type Locale } from "../lib/i18n";
import type { TopicIconName } from "./icons";
import TopicGlyph from "./TopicGlyph";
import { contentCardArt } from "../lib/content-thumbnail";
import CardArt from "./CardArt";

/**
 * One case in a grid. Lifted out of `TopicsExplorer` so the library index can
 * render the same card without pulling in that component's client state.
 */
export type LibraryItem = ContentCard & {
  subTopic: string;
  subTopicNames: string[];
  imageIcon?: string;
  date: string;
  hasVideo: boolean;
};

export function CaseCardSkeleton() {
  return (
    <div className="content-case-card is-skeleton" aria-hidden="true">
      <div className="content-case-art"><span className="skeleton-block" /></div>
      <div className="content-case-copy">
        <span className="skeleton-line skeleton-line-xs" />
        <span className="skeleton-line skeleton-line-lg" />
        <span className="skeleton-line" />
        <span className="skeleton-line skeleton-line-sm" />
      </div>
    </div>
  );
}

export default function CaseCard({
  item,
  icon,
  t,
  locale,
}: {
  item: LibraryItem;
  icon: TopicIconName;
  t: Dictionary["topics"];
  locale: Locale;
}) {
  const cardImage = contentCardArt(item);
  return (
    <a className="content-case-card" href={localePath(locale, `library/${item.slug}`)}>
      <div className="content-case-art">
        {cardImage ? <CardArt item={item} className="content-case-thumbnail" labels={{ before: t.beforeLabel, after: t.afterLabel }} /> : <span className="content-case-art-glyph" aria-hidden="true">
          <TopicGlyph icon={icon} imageIcon={item.imageIcon} size={96} />
        </span>}
      </div>
      <div className="content-case-copy">
        <p className="content-case-topic">
          {item.subTopic}
          {item.isTeaching ? <span className="content-case-tag">{t.teachingBadge}</span> : null}
        </p>
        <h3 {...authoredTitleProps(item.title)}>{item.title}</h3>
        <p className="content-case-summary">{item.summary}</p>
        <div className="content-case-meta">
          <span>{item.date}</span>
        </div>
      </div>
    </a>
  );
}
