"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconArrowRight, IconCalendar, IconPin } from "./icons";
// From `event-data`, not `events`: this is a client component, and `events`
// pulls in `next/cache`, which has no browser equivalent.
import { eventDateRange, type TeamEvent } from "../lib/event-data";
import { authoredTitleProps, localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";
import FilterSelect from "./FilterSelect";

export default function EventsExplorer({ locale, events, t }: { locale: Locale; events: TeamEvent[]; t: Dictionary["events"] }) {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [topic, setTopic] = useState("all");
  const [format, setFormat] = useState("all");
  const [year, setYear] = useState("all");
  const filtered = useMemo(() => events.filter((event) =>
    (status === "all" || event.status === status) &&
    (type === "all" || event.type === type) &&
    (topic === "all" || event.topic === topic) &&
    (format === "all" || event.format === format) &&
    (year === "all" || event.startDate.startsWith(year))), [events, status, type, topic, format, year]);
  const activeFilters = [status, type, topic, format, year].some((value) => value !== "all");
  const options = <T extends string>(items: T[]) => [...new Set(items)];
  const typeLabel = (value: string) => ({ Summit: t.summit, Webinar: t.webinar, Workshop: t.workshop, Conference: t.conference }[value] ?? value);
  const topicLabel = (value: string) => ({ "Thyroid & Endocrine Surgery": t.thyroidEndocrine, "Thyroid & Head & Neck Surgery": t.thyroidHeadNeck, "Head & Neck Surgery": t.headNeck, "Clinical Education": t.education }[value] ?? value);
  const formatLabel = (value: string) => ({ "in-person": t.inPerson, hybrid: t.hybrid, online: t.online }[value] ?? value);
  const renderEvent = (event: TeamEvent) => <Link className="event-row" href={localePath(locale, `events/${event.slug}`)} key={event.slug}>
    <div className="event-row-date"><b>{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${event.startDate}T12:00:00`))}</b><strong>{new Date(`${event.startDate}T12:00:00`).getDate()}</strong><span>{event.startDate.slice(0, 4)}</span></div>
    <div className="event-row-copy"><div className="event-card-tags"><span className={`event-status event-status-${event.status}`}>{event.status === "past" ? t.pastEvent : t.upcoming}</span><span>{typeLabel(event.type)}</span><span>{formatLabel(event.format)}</span></div><h3 {...authoredTitleProps(event.title)}>{event.title}</h3><p>{event.summary}</p><div className="event-meta"><span><IconCalendar size={15}/>{eventDateRange(event, locale)}</span><span><IconPin size={15}/>{event.location}</span></div></div>
    <span className="event-row-go" aria-hidden="true"><IconArrowRight size={19}/></span>
  </Link>;
  const upcoming = filtered.filter((event) => event.status === "upcoming");
  const past = filtered.filter((event) => event.status === "past");

  return <section className="events-collection" aria-labelledby="all-events-heading">
    <div className="events-collection-heading">
      <div><span className="section-kicker">{t.exploreCalendar}</span><h2 id="all-events-heading">{t.allEvents}</h2></div>
      <p>{t.collectionIntro}</p>
    </div>
    <div className="event-filters" aria-label={t.filterEvents}>
      <FilterSelect className="event-filter-control" label={t.status} value={status} onChange={setStatus} options={[{ value: "all", label: t.allStatuses }, { value: "upcoming", label: t.upcoming }, { value: "past", label: t.past }]} />
      <FilterSelect className="event-filter-control" label={t.type} value={type} onChange={setType} options={[{ value: "all", label: t.allTypes }, ...options(events.map((event) => event.type)).map((value) => ({ value, label: typeLabel(value) }))]} />
      <FilterSelect className="event-filter-control" label={t.topic} value={topic} onChange={setTopic} options={[{ value: "all", label: t.allTopics }, ...options(events.map((event) => event.topic)).map((value) => ({ value, label: topicLabel(value) }))]} />
      <FilterSelect className="event-filter-control" label={t.format} value={format} onChange={setFormat} options={[{ value: "all", label: t.allFormats }, ...options(events.map((event) => event.format)).map((value) => ({ value, label: formatLabel(value) }))]} />
      <FilterSelect className="event-filter-control" label={t.year} value={year} onChange={setYear} options={[{ value: "all", label: t.allYears }, ...options(events.map((event) => event.startDate.slice(0, 4))).sort((a, b) => b.localeCompare(a)).map((value) => ({ value, label: value }))]} />
      {activeFilters && <button type="button" className="event-filter-clear" onClick={() => { setStatus("all"); setType("all"); setTopic("all"); setFormat("all"); setYear("all"); }}>{t.clearFilters}</button>}
    </div>
    <div aria-live="polite">
      {upcoming.length > 0 && <section className="event-group" aria-labelledby="upcoming-events-heading"><div className="event-group-heading"><span className="event-group-marker event-group-marker-upcoming"/><div><span className="section-kicker">{t.comingUp}</span><h3 id="upcoming-events-heading">{t.upcomingEvents}</h3></div></div><div className="event-list">{upcoming.map(renderEvent)}</div></section>}
      {past.length > 0 && <section className="event-group event-group-past" aria-labelledby="past-events-heading"><div className="event-group-heading"><span className="event-group-marker event-group-marker-past"/><div><span className="section-kicker">{t.archive}</span><h3 id="past-events-heading">{t.pastEvents}</h3></div></div><div className="event-list">{past.map(renderEvent)}</div></section>}
      {!filtered.length && <div className="events-empty"><h3>{t.noMatches}</h3><p>{t.noMatchesBody}</p></div>}
    </div>
  </section>;
}
