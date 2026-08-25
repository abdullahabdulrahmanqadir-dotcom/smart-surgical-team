"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Dictionary } from "../lib/dictionaries";
import type { ContentCard } from "../lib/content-types";
import type { Locale } from "../lib/i18n";
import { authoredTitleProps, localePath } from "../lib/i18n";
import type { TopicIconName } from "./icons";
import type { TopicGroup } from "../lib/topics";
import TopicGlyph from "./TopicGlyph";
import HeadNeckMap from "./HeadNeckMap";
import { fill } from "../lib/dictionaries";
import { contentCardArt } from "../lib/content-thumbnail";
import CardArt from "./CardArt";
import FilterSelect from "./FilterSelect";
import { IconFile, IconSearch } from "./icons";

type LibraryItem = ContentCard & { subTopic: string; subTopicNames: string[]; imageIcon?: string; date: string; hasVideo: boolean };

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Placeholder cards shown while a topic's cases are being fetched, so the
    grid keeps its shape instead of collapsing to nothing. */
function CaseCardSkeleton() {
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

function CaseCard({ item, icon, t, locale }: { item: LibraryItem; icon: TopicIconName; t: Dictionary["topics"]; locale: Locale }) {
  const cardImage = contentCardArt(item);
  return (
    <a className="content-case-card" href={localePath(locale, `library/${item.slug}`)}>
      <div className="content-case-art">
        {cardImage ? <CardArt item={item} className="content-case-thumbnail" labels={{ before: t.beforeLabel, after: t.afterLabel }} /> : <span className="content-case-art-glyph" aria-hidden="true">
          <TopicGlyph icon={icon} imageIcon={item.imageIcon} size={96} />
        </span>}
      </div>
      <div className="content-case-copy">
        <p className="content-case-topic">{item.subTopic}</p>
        <h3 {...authoredTitleProps(item.title)}>{item.title}</h3>
        <p className="content-case-summary">{item.summary}</p>
        <div className="content-case-meta">
          <span>{item.date}</span>
        </div>
      </div>
    </a>
  );
}

function LatestCaseCard({ item, icon, t, locale }: { item: LibraryItem; icon: TopicIconName; t: Dictionary["topics"]; locale: Locale }) {
  const cardImage = contentCardArt(item);
  return <a className="latest-case-card" href={localePath(locale, `library/${item.slug}`)}>
    <div className="latest-case-art">{cardImage
      ? (cardImage.kind === "single"
        ? <img src={cardImage.url} alt="" loading="eager" decoding="async" />
        : <CardArt item={item} eager labels={{ before: t.beforeLabel, after: t.afterLabel }} />)
      : <TopicGlyph icon={icon} imageIcon={item.imageIcon} size={104} />}</div>
    <div className="latest-case-copy"><p className="content-case-topic">{item.subTopic}</p><h2 {...authoredTitleProps(item.title)}>{item.title}</h2><p>{item.summary}</p><div className="content-case-meta"><span>{item.date}</span></div></div>
  </a>;
}

export default function TopicsExplorer({
  groups,
  locale,
  t,
  anatomyLabels,
  initialSlug,
  initialItems = [],
  initialLatestCase,
}: {
  groups: TopicGroup[];
  locale: Locale;
  t: Dictionary["topics"];
  anatomyLabels: Dictionary["anatomy"];
  initialSlug?: string;
  /** Cases for `initialSlug` only. Every other topic is fetched when opened. */
  initialItems?: ContentCard[];
  initialLatestCase?: ContentCard;
}) {
  // No slug means the whole head and neck, with nothing chosen yet. The map
  // waits for a click rather than opening a topic on the reader's behalf.
  const startingSlug = initialSlug && groups.some((group) => group.slug === initialSlug)
    ? initialSlug
    : null;
  const [selected, setSelected] = useState<string | null>(startingSlug);
  const [subTopic, setSubTopic] = useState("all");
  const [year, setYear] = useState("all");
  const [format, setFormat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const activeGroup = groups.find((group) => group.slug === selected) ?? null;

  // Cases arrive one topic at a time and are kept, so re-opening a topic the
  // reader has already visited is instant and costs no further requests.
  const [casesByTopic, setCasesByTopic] = useState<Record<string, ContentCard[]>>(
    startingSlug ? { [startingSlug]: initialItems } : {},
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const inFlight = useRef(new Set<string>());
  // Mirrors the keys of `casesByTopic` so the loader can decide whether it has
  // work to do without reading state it is not rendering from.
  const held = useRef(new Set(startingSlug ? [startingSlug] : []));
  const loaded = Object.prototype.hasOwnProperty.call(casesByTopic, selected ?? "");
  const isLoading = Boolean(selected) && !loaded;

  /** Called from wherever a topic becomes the selected one, rather than from an
      effect watching the selection: opening a topic is the event, and driving
      the request from it avoids a render pass that exists only to notice. */
  const loadTopic = useCallback(async (slug: string) => {
    if (inFlight.current.has(slug) || held.current.has(slug)) return;
    inFlight.current.add(slug);
    setLoadFailed(false);
    try {
      const response = await fetch(`/api/topics/${encodeURIComponent(slug)}/cases`);
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const payload = (await response.json()) as { items?: ContentCard[] };
      held.current.add(slug);
      setCasesByTopic((current) => ({ ...current, [slug]: payload.items ?? [] }));
    } catch {
      // Leaving the topic unrecorded keeps the retry path open: selecting it
      // again re-runs this fetch rather than caching an empty library.
      setLoadFailed(true);
    } finally {
      inFlight.current.delete(slug);
    }
  }, []);

  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(/\/topics\/([^/?#]+)/);
      const slug = match && groups.some((group) => group.slug === match[1]) ? match[1] : null;
      setSelected(slug);
      setSubTopic("all");
      setYear("all");
      setFormat("all");
      setSearchQuery("");
      // Back and forward can land on a topic this session has not fetched yet.
      // `loadTopic` is a no-op for one that is already held.
      if (slug) void loadTopic(slug);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [groups, loadTopic]);

  const libraryCases = useMemo<LibraryItem[]>(() => {
    if (!activeGroup) return [];
    return (casesByTopic[activeGroup.slug] ?? [])
      .filter((item) => item.topics.some(({ slug }) => slug === activeGroup.slug || activeGroup.subTopics.some((topic) => topic.slug === slug)))
      .map((item) => {
        // An item can carry several subtopics. Only the first was kept, so
        // filtering by any of its other subtopics made the item disappear.
        const matchingSubTopics = activeGroup.subTopics.filter((topic) => item.topics.some(({ slug }) => slug === topic.slug));
        const matchingSubTopic = matchingSubTopics[0];
        const date = item.publishedAt ? new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(item.publishedAt)) : t.recentlyAdded;
        return {
          ...item,
          subTopic: matchingSubTopic?.name ?? activeGroup.name,
          subTopicNames: matchingSubTopics.length ? matchingSubTopics.map((topic) => topic.name) : [activeGroup.name],
          imageIcon: matchingSubTopic?.imageIcon ?? activeGroup.imageIcon,
          date,
          hasVideo: item.kind === "video" || item.kind === "webinar_recording",
        };
      });
  }, [activeGroup, casesByTopic, locale, t.recentlyAdded]);
  const availableYears = useMemo(() => [...new Set(libraryCases.flatMap((item) => item.publishedAt ? [item.publishedAt.slice(0, 4)] : []))].sort((a, b) => b.localeCompare(a)), [libraryCases]);

  const filteredCases = useMemo(() => libraryCases.filter((item) => {
    const searchTerm = searchQuery.trim().toLocaleLowerCase();
    const matchesTopic = subTopic === "all" || item.subTopicNames.includes(subTopic);
    const matchesYear = year === "all" || item.publishedAt?.startsWith(year);
    const matchesFormat = format === "all" || (format === "video" ? item.hasVideo : !item.hasVideo);
    const matchesSearch = !searchTerm || [item.title, item.summary, item.subTopic, item.date]
      .join(" ")
      .toLocaleLowerCase()
      .includes(searchTerm);
    return matchesTopic && matchesYear && matchesFormat && matchesSearch;
  }), [format, libraryCases, searchQuery, subTopic, year]);

  const filtersAreActive = subTopic !== "all" || year !== "all" || format !== "all" || searchQuery.trim().length > 0;

  function clearFilters() {
    setSearchQuery("");
    setSubTopic("all");
    setYear("all");
    setFormat("all");
  }

  function openTopic(slug: string) {
    // Fired here rather than from an effect watching `selected`: choosing a
    // topic is the event that needs its cases.
    void loadTopic(slug);
    setSelected(slug);
    setSubTopic("all");
    setYear("all");
    setFormat("all");
    setSearchQuery("");
    window.history.pushState({}, "", localePath(locale, `topics/${slug}`));
  }

  function selectTopic(event: MouseEvent, slug: string) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    openTopic(slug);
  }

  /** Pulls the camera back out to the whole head and neck. */
  function clearTopic() {
    setSelected(null);
    clearFilters();
    window.history.pushState({}, "", localePath(locale, "topics"));
  }

  const regionLabels = Object.fromEntries(groups.map((group) => [group.slug, group.name]));
  const latestCase = useMemo<LibraryItem | null>(() => {
    if (!initialLatestCase) return null;
    const group = groups.find((candidate) => initialLatestCase.topics.some(({ slug }) => slug === candidate.slug || candidate.subTopics.some((topic) => topic.slug === slug)));
    if (!group) return null;
    const subTopic = group.subTopics.find((topic) => initialLatestCase.topics.some(({ slug }) => slug === topic.slug));
    return { ...initialLatestCase, subTopic: subTopic?.name ?? group.name, subTopicNames: [subTopic?.name ?? group.name], imageIcon: subTopic?.imageIcon ?? group.imageIcon, date: initialLatestCase.publishedAt ? new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(initialLatestCase.publishedAt)) : t.recentlyAdded, hasVideo: initialLatestCase.kind === "video" || initialLatestCase.kind === "webinar_recording" };
  }, [groups, initialLatestCase, locale, t.recentlyAdded]);
  const latestGroup = latestCase ? groups.find((group) => latestCase.topics.some(({ slug }) => slug === group.slug || group.subTopics.some((topic) => topic.slug === slug))) : null;

  return (
    <section className="content-browser" aria-labelledby="content-browser-heading">
      <div className="content-browser-hero">
        <div className="content-browser-hero-copy">
          <p className="section-kicker">{t.kicker}</p>
          <h2 id="content-browser-heading">{t.learnThroughAnatomy}</h2>
          <p>{activeGroup ? fill(t.guideIntroActive, { name: activeGroup.name }) : t.guideIntro}</p>
        </div>
        <div className="content-browser-map-wrap">
          <HeadNeckMap
            active={activeGroup?.slug ?? null}
            labels={regionLabels}
            fallbackLabels={anatomyLabels}
            onSelect={openTopic}
            onReset={clearTopic}
            resetLabel={t.mapReset}
          />
        </div>
      </div>

      <nav className="content-topic-switcher" aria-label={t.surgicalTopics}>
        {groups.map((group, index) => {
          const isActive = group.slug === activeGroup?.slug;
          return (
            <a
              className={`content-topic-option${isActive ? " is-active" : ""}`}
              href={localePath(locale, `topics/${group.slug}`)}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => selectTopic(event, group.slug)}
              key={group.slug}
            >
              <span className="content-topic-index">0{index + 1}</span>
              <span className="content-topic-glyph" aria-hidden="true"><TopicGlyph icon={group.icon} imageIcon={group.imageIcon} size={38} /></span>
              <span><strong>{group.name}</strong><small>{group.blurb}</small></span>
            </a>
          );
        })}
      </nav>

      {!activeGroup ? (
        <>
        <div className="content-prompt">
          <p className="section-kicker">{t.guideKicker}</p>
          <h2>{t.guideTitle}</h2>
          <p>{t.chooseRegion}</p>
        </div>
        {latestCase && latestGroup ? <section className="latest-case-section" aria-labelledby="latest-case-heading"><div className="latest-case-heading"><h2 id="latest-case-heading">{t.latestCase}</h2></div><LatestCaseCard item={latestCase} icon={latestGroup.icon} t={t} locale={locale}/></section> : null}
        </>
      ) : (
      <>
      <div className="content-library-heading">
        <div>
          <p className="section-kicker">{activeGroup.name}</p>
          <h2>{t.contentLibrary}</h2>
          <p>{activeGroup.intro}</p>
        </div>
      </div>

      <div className={`content-filters${filtersAreActive ? " has-active-filters" : ""}`} aria-label={t.filterLibrary}>
        <div className="content-filter-header">
          <span className="content-filter-label">{t.filterBy}</span>
          <span className="content-filter-total" aria-live="polite">
            {isLoading
              ? t.loadingItems
              : fill(libraryCases.length === 1 ? t.itemCount : t.itemCountPlural, {
                  count: libraryCases.length,
                  topic: activeGroup.name,
                })}
          </span>
        </div>
        <div className="content-filter-grid">
          <label className="content-filter-control content-search">
            <span className="content-control-label">{t.searchContent}</span>
            <span className="content-control-field">
              <IconSearch size={17} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.searchContent}
              />
            </span>
          </label>
          <FilterSelect
            label={t.subtopic}
            value={subTopic}
            options={[
              { value: "all", label: t.allSubtopics },
              ...activeGroup.subTopics.map((topic) => ({ value: topic.name, label: topic.name })),
            ]}
            onChange={setSubTopic}
          />
          <FilterSelect
            label={t.publicationYear}
            value={year}
            options={[
              { value: "all", label: t.anyTime },
              ...availableYears.map((value) => ({ value, label: value })),
            ]}
            onChange={setYear}
          />
          <FilterSelect
            label={t.contentFormat}
            value={format}
            options={[
              { value: "all", label: t.allFormats },
              { value: "video", label: t.videoLessons },
              { value: "article", label: t.articlesResources },
            ]}
            onChange={setFormat}
          />
        </div>
        {filtersAreActive ? (
          <div className="content-filter-summary" aria-live="polite">
            <p>{fill(t.filteredResults, { count: filteredCases.length, total: libraryCases.length })}</p>
            <button className="content-clear-filters" type="button" onClick={clearFilters}>{t.clearAll}</button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="content-case-grid" role="status" aria-label={fill(t.loadingTopicContent, { name: activeGroup.name })}>
          {[0, 1, 2].map((index) => <CaseCardSkeleton key={index} />)}
        </div>
      ) : loadFailed ? (
        <div className="content-empty">
          <IconFile size={22} />
          <div>
            <h3>{t.loadErrorTitle}</h3>
            <p>{t.loadErrorIntro} <button type="button" className="text-link" onClick={() => void loadTopic(activeGroup.slug)}>{t.tryAgain}</button>.</p>
          </div>
        </div>
      ) : filteredCases.length > 0 ? (
        <div className="content-case-grid">
          {filteredCases.map((item) => <CaseCard item={item} icon={activeGroup.icon} t={t} locale={locale} key={item.slug} />)}
        </div>
      ) : (
        <div className="content-empty">
          <IconFile size={22} />
          <div><h3>{t.noMatchesTitle}</h3><p>{t.noMatchesBody}</p></div>
        </div>
      )}
      </>
      )}
    </section>
  );
}
