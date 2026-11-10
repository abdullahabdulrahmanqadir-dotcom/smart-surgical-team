"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import { fill, type Dictionary } from "../lib/dictionaries";
import FilterSelect, { type FilterOption } from "./FilterSelect";
import { IconSearch } from "./icons";

type CaseEntry = {
  slug: string;
  topicSlugs: string[];
  searchText: string;
  card: ReactNode;
};

export default function CaseLibraryExplorer({
  entries,
  topics,
  totalLabel,
  t,
  labels,
}: {
  entries: CaseEntry[];
  topics: FilterOption[];
  totalLabel: string;
  t: Dictionary["libraryIndex"];
  labels: Dictionary["topics"];
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const search = useRef<HTMLInputElement>(null);
  const needle = query.trim().toLocaleLowerCase();
  const filtered = entries.filter((entry) =>
    (topic === "all" || entry.topicSlugs.includes(topic)) && entry.searchText.includes(needle),
  );
  const hasFilters = Boolean(needle) || topic !== "all";

  function clearFilters() {
    setQuery("");
    setTopic("all");
    search.current?.focus();
  }

  return <>
    <div className="content-filters library-index-filters" role="group" aria-label={labels.filterLibrary}>
      <div className="content-filter-grid">
        <label className="content-filter-control content-search">
          <span className="content-control-label">{t.searchCases}</span>
          <span className="content-control-field">
            <IconSearch size={18} aria-hidden="true" />
            <input ref={search} type="search" dir="auto" value={query} onChange={(event) => setQuery(event.target.value)} />
          </span>
        </label>
        <FilterSelect label={labels.surgicalTopics} value={topic} onChange={setTopic}
          options={[{ value: "all", label: labels.backToTopics }, ...topics]} />
      </div>
      <div className="content-filter-summary">
        <p role="status">{hasFilters
          ? fill(labels.filteredResults, { count: filtered.length, total: entries.length })
          : totalLabel}</p>
        {hasFilters && (
          <button type="button" className="content-clear-filters" onClick={clearFilters}>{labels.clearAll}</button>
        )}
      </div>
    </div>
    {filtered.length ? (
      <div className="content-case-grid">
        {filtered.map(({ slug, card }) => <Fragment key={slug}>{card}</Fragment>)}
      </div>
    ) : (
      <div className="events-empty">
        <h2>{labels.noMatchesTitle}</h2>
        <p>{labels.noMatchesBody}</p>
      </div>
    )}
  </>;
}
