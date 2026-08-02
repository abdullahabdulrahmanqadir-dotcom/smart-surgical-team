"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Dictionary } from "../lib/dictionaries";
import type { ContentRecord } from "../lib/content";
import type { Locale } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import type { TopicIconName } from "./icons";
import type { TopicGroup } from "../lib/topics";
import TopicGlyph from "./TopicGlyph";
import HeadNeckMap from "./HeadNeckMap";
import { fill } from "../lib/dictionaries";
import { contentThumbnailUrl } from "../lib/content-thumbnail";
import { IconChevronDown, IconClock, IconFile, IconPlay, IconSearch } from "./icons";

type LibraryItem = ContentRecord & { subTopic: string; subTopicNames: string[]; imageIcon?: string; date: string; hasVideo: boolean };

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function CaseCard({ item, icon, t, locale }: { item: LibraryItem; icon: TopicIconName; t: Dictionary["topics"]; locale: Locale }) {
  const cardImage = contentThumbnailUrl(item);
  return (
    <a className="content-case-card" href={localePath(locale, `library/${item.slug}`)}>
      <div className="content-case-art">
        {cardImage ? <img className="content-case-thumbnail" src={cardImage} alt=""/> : <span className="content-case-art-glyph" aria-hidden="true">
          <TopicGlyph icon={icon} imageIcon={item.imageIcon} size={96} />
        </span>}
        <span className="content-case-type">
          {item.hasVideo ? <IconPlay size={12} /> : <IconFile size={12} />}
          {item.hasVideo ? t.caseVideoLabel : t.caseReadLabel}
        </span>
      </div>
      <div className="content-case-copy">
        <p className="content-case-topic">{item.subTopic}</p>
        <h3>{item.title}</h3>
        <p className="content-case-summary">{item.summary}</p>
        <div className="content-case-meta">
          <span>{item.date}</span>
          {item.duration ? <span><IconClock size={14} /> {item.duration}</span> : null}
        </div>
      </div>
    </a>
  );
}

export default function TopicsExplorer({
  groups,
  locale,
  t,
  initialSlug,
  items,
}: {
  groups: TopicGroup[];
  locale: Locale;
  t: Dictionary["topics"];
  initialSlug?: string;
  items: ContentRecord[];
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

  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(/\/topics\/([^/?#]+)/);
      setSelected(match && groups.some((group) => group.slug === match[1]) ? match[1] : null);
      setSubTopic("all");
      setYear("all");
      setFormat("all");
      setSearchQuery("");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [groups]);

  const libraryCases = useMemo<LibraryItem[]>(() => {
    if (!activeGroup) return [];
    return items
      .filter((item) => item.topics.some(({ slug }) => slug === activeGroup.slug || activeGroup.subTopics.some((topic) => topic.slug === slug)))
      .map((item) => {
        // An item can carry several subtopics. Only the first was kept, so
        // filtering by any of its other subtopics made the item disappear.
        const matchingSubTopics = activeGroup.subTopics.filter((topic) => item.topics.some(({ slug }) => slug === topic.slug));
        const matchingSubTopic = matchingSubTopics[0];
        const date = item.publishedAt ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(item.publishedAt)) : "Recently added";
        return {
          ...item,
          subTopic: matchingSubTopic?.name ?? activeGroup.name,
          subTopicNames: matchingSubTopics.length ? matchingSubTopics.map((topic) => topic.name) : [activeGroup.name],
          imageIcon: matchingSubTopic?.imageIcon ?? activeGroup.imageIcon,
          date,
          hasVideo: item.kind === "video" || item.kind === "webinar_recording",
        };
      });
  }, [activeGroup, items]);
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

  return (
    <section className="content-browser" aria-labelledby="content-browser-heading">
      <div className="content-browser-hero">
        <div className="content-browser-hero-copy">
          <p className="section-kicker">{t.kicker}</p>
          <h2 id="content-browser-heading">Learn through the anatomy.</h2>
          <p>{activeGroup ? fill(t.guideIntroActive, { name: activeGroup.name }) : t.guideIntro}</p>
        </div>
        <div className="content-browser-map-wrap">
          <HeadNeckMap
            active={activeGroup?.slug ?? null}
            labels={regionLabels}
            onSelect={openTopic}
            onReset={clearTopic}
            resetLabel={t.mapReset}
          />
        </div>
      </div>

      <nav className="content-topic-switcher" aria-label="Surgical topics">
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
        <div className="content-prompt">
          <p className="section-kicker">{t.guideKicker}</p>
          <h2>{t.guideTitle}</h2>
          <p>{t.chooseRegion}</p>
        </div>
      ) : (
      <>
      <div className="content-library-heading">
        <div>
          <p className="section-kicker">{activeGroup.name}</p>
          <h2>Content library</h2>
          <p>{activeGroup.intro}</p>
        </div>
        <span className="content-results" aria-live="polite">{filteredCases.length} {filteredCases.length === 1 ? "item" : "items"}</span>
      </div>

      <div className="content-filters" aria-label="Filter case library">
        <span className="content-filter-label">Filter by</span>
        <label className="content-search">
          <IconSearch size={17} />
          <span className="visually-hidden">Search content</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search content"
          />
        </label>
        <label className="content-select">
          <span className="visually-hidden">Subtopic</span>
          <select value={subTopic} onChange={(event) => setSubTopic(event.target.value)}>
            <option value="all">All subtopics</option>
            {activeGroup.subTopics.map((topic) => <option value={topic.name} key={topic.slug}>{topic.name}</option>)}
          </select>
          <IconChevronDown size={16} />
        </label>
        <label className="content-select">
          <span className="visually-hidden">Publication year</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">Any time</option>
            {availableYears.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
          <IconChevronDown size={16} />
        </label>
        <label className="content-select">
          <span className="visually-hidden">Content format</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="all">All formats</option>
            <option value="video">Video lessons</option>
            <option value="article">Articles & resources</option>
          </select>
          <IconChevronDown size={16} />
        </label>
        {filtersAreActive ? <button className="content-clear-filters" type="button" onClick={clearFilters}>Clear all</button> : null}
      </div>

      {filteredCases.length > 0 ? (
        <div className="content-case-grid">
          {filteredCases.map((item) => <CaseCard item={item} icon={activeGroup.icon} t={t} locale={locale} key={item.slug} />)}
        </div>
      ) : (
        <div className="content-empty">
          <IconFile size={22} />
          <div><h3>No content matches this search.</h3><p>Try another phrase, or clear the filters to see every published item.</p></div>
        </div>
      )}
      </>
      )}
    </section>
  );
}
