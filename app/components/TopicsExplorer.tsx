"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Dictionary } from "../lib/dictionaries";
import type { Locale } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import type { TopicIconName } from "./icons";
import type { CaseVideo, TopicGroup } from "../lib/topics";
import TopicGlyph from "./TopicGlyph";
import { IconChevronDown, IconClock, IconFile, IconPlay, IconSearch } from "./icons";

const focusedViews: Record<string, string> = {
  "thyroid-parathyroid": "/anatomy-focus-thyroid.png",
  "salivary-glands": "/anatomy-focus-parotid.png",
  "neck-lymphatic": "/anatomy-focus-lymph.png",
  "skin-soft-tissue": "/anatomy-focus-skin.png",
};

type LibraryCase = CaseVideo & { subTopic: string; imageIcon?: string };

function HeadNeckMap({ active }: { active: string }) {
  return (
    <div className={`content-map content-map--${active}`} aria-hidden="true">
      {/* Static delivery avoids the Next Image compatibility route used by vinext. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="content-map-overview" src="/anatomy-topics-model-v2.png" alt="" />
      {Object.entries(focusedViews).map(([region, src]) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`content-map-focus${active === region ? " is-visible" : ""}`} src={src} alt="" key={region} />
      ))}
    </div>
  );
}

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function CaseCard({ item, icon, t }: { item: LibraryCase; icon: TopicIconName; t: Dictionary["topics"] }) {
  return (
    <article className="content-case-card">
      <div className="content-case-art">
        <span className="content-case-art-glyph" aria-hidden="true">
          <TopicGlyph icon={icon} imageIcon={item.imageIcon} size={96} />
        </span>
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
          <span><IconClock size={14} /> {item.readMinutes} {t.minRead}</span>
        </div>
      </div>
    </article>
  );
}

export default function TopicsExplorer({
  groups,
  locale,
  t,
  initialSlug,
}: {
  groups: TopicGroup[];
  locale: Locale;
  t: Dictionary["topics"];
  initialSlug?: string;
}) {
  const startingSlug = initialSlug && groups.some((group) => group.slug === initialSlug)
    ? initialSlug
    : groups[0]?.slug ?? "";
  const [selected, setSelected] = useState(startingSlug);
  const [subTopic, setSubTopic] = useState("all");
  const [year, setYear] = useState("all");
  const [format, setFormat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const activeGroup = groups.find((group) => group.slug === selected) ?? groups[0];

  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(/\/topics\/([^/?#]+)/);
      const slug = match && groups.some((group) => group.slug === match[1]) ? match[1] : groups[0]?.slug;
      if (slug) setSelected(slug);
      setSubTopic("all");
      setYear("all");
      setFormat("all");
      setSearchQuery("");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [groups]);

  const libraryCases = useMemo<LibraryCase[]>(() => activeGroup?.subTopics.flatMap((topic) =>
    (topic.cases ?? []).map((item) => ({ ...item, subTopic: topic.name, imageIcon: topic.imageIcon })),
  ) ?? [], [activeGroup]);

  const filteredCases = useMemo(() => libraryCases.filter((item) => {
    const searchTerm = searchQuery.trim().toLocaleLowerCase();
    const matchesTopic = subTopic === "all" || item.subTopic === subTopic;
    const matchesYear = year === "all" || item.date.endsWith(year);
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

  function selectTopic(event: MouseEvent, slug: string) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    setSelected(slug);
    setSubTopic("all");
    setYear("all");
    setFormat("all");
    setSearchQuery("");
    window.history.pushState({}, "", localePath(locale, `topics/${slug}`));
  }

  if (!activeGroup) return null;

  return (
    <section className="content-browser" aria-labelledby="content-browser-heading">
      <div className="content-browser-hero">
        <div className="content-browser-hero-copy">
          <p className="section-kicker">{t.kicker}</p>
          <h2 id="content-browser-heading">Learn through the anatomy.</h2>
          <p>{t.intro}</p>
        </div>
        <div className="content-browser-map-wrap">
          <HeadNeckMap active={activeGroup.slug} />
        </div>
      </div>

      <nav className="content-topic-switcher" aria-label="Surgical topics">
        {groups.map((group, index) => {
          const isActive = group.slug === activeGroup.slug;
          return (
            <a
              className={`content-topic-option${isActive ? " is-active" : ""}`}
              href={localePath(locale, `topics/${group.slug}`)}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => selectTopic(event, group.slug)}
              key={group.slug}
            >
              <span className="content-topic-index">0{index + 1}</span>
              <span className="content-topic-glyph" aria-hidden="true"><TopicGlyph icon={group.icon} imageIcon={group.slug === "neck-lymphatic" || group.slug === "skin-soft-tissue" ? undefined : group.imageIcon} size={38} /></span>
              <span><strong>{group.name}</strong><small>{group.blurb}</small></span>
            </a>
          );
        })}
      </nav>

      <div className="content-library-heading">
        <div>
          <p className="section-kicker">{activeGroup.name}</p>
          <h2>Case library</h2>
          <p>{activeGroup.intro}</p>
        </div>
        <span className="content-results" aria-live="polite">{filteredCases.length} {filteredCases.length === 1 ? "case" : "cases"}</span>
      </div>

      <div className="content-filters" aria-label="Filter case library">
        <span className="content-filter-label">Filter by</span>
        <label className="content-search">
          <IconSearch size={17} />
          <span className="visually-hidden">Search cases</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search cases"
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
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <IconChevronDown size={16} />
        </label>
        <label className="content-select">
          <span className="visually-hidden">Content format</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="all">Video & case studies</option>
            <option value="video">Video cases</option>
            <option value="article">Case studies</option>
          </select>
          <IconChevronDown size={16} />
        </label>
        {filtersAreActive ? <button className="content-clear-filters" type="button" onClick={clearFilters}>Clear all</button> : null}
      </div>

      {filteredCases.length > 0 ? (
        <div className="content-case-grid">
          {filteredCases.map((item) => <CaseCard item={item} icon={activeGroup.icon} t={t} key={item.slug} />)}
        </div>
      ) : (
        <div className="content-empty">
          <IconFile size={22} />
          <div><h3>No cases match this search.</h3><p>Try another phrase, or clear the filters to see every case.</p></div>
        </div>
      )}
    </section>
  );
}
