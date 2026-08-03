"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconArrowRight, IconCalendar, IconPin } from "./icons";
// From `event-data`, not `events`: this is a client component, and `events`
// pulls in `next/cache`, which has no browser equivalent.
import { eventDateRange, type TeamEvent } from "../lib/event-data";
import { localePath, type Locale } from "../lib/i18n";

export default function EventsExplorer({ locale, events }: { locale: Locale; events: TeamEvent[] }) {
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
  const renderEvent = (event: TeamEvent) => <Link className="event-row" href={localePath(locale, `events/${event.slug}`)} key={event.slug}>
    <div className="event-row-date"><b>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${event.startDate}T12:00:00`))}</b><strong>{new Date(`${event.startDate}T12:00:00`).getDate()}</strong><span>{event.startDate.slice(0, 4)}</span></div>
    <div className="event-row-copy"><div className="event-card-tags"><span className={`event-status event-status-${event.status}`}>{event.status === "past" ? "Past event" : "Upcoming"}</span><span>{event.type}</span><span>{event.format.replace("-", " ")}</span></div><h3>{event.title}</h3><p>{event.summary}</p><div className="event-meta"><span><IconCalendar size={15}/>{eventDateRange(event)}</span><span><IconPin size={15}/>{event.location}</span></div></div>
    <span className="event-row-go" aria-hidden="true"><IconArrowRight size={19}/></span>
  </Link>;
  const upcoming = filtered.filter((event) => event.status === "upcoming");
  const past = filtered.filter((event) => event.status === "past");

  return <section className="events-collection" aria-labelledby="all-events-heading">
    <div className="events-collection-heading">
      <div><span className="section-kicker">Explore the calendar</span><h2 id="all-events-heading">All events</h2></div>
      <p>Browse what is ahead and revisit the activity that has brought our clinical community together.</p>
    </div>
    <div className="event-filters" aria-label="Filter events">
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select></label>
      <label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{options(events.map((event) => event.type)).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Topic<select value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">All topics</option>{options(events.map((event) => event.topic)).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}><option value="all">All formats</option>{options(events.map((event) => event.format)).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Year<select value={year} onChange={(e) => setYear(e.target.value)}><option value="all">All years</option>{options(events.map((event) => event.startDate.slice(0, 4))).sort((a, b) => b.localeCompare(a)).map((value) => <option key={value}>{value}</option>)}</select></label>
      {activeFilters && <button type="button" className="event-filter-clear" onClick={() => { setStatus("all"); setType("all"); setTopic("all"); setFormat("all"); setYear("all"); }}>Clear filters</button>}
    </div>
    <div aria-live="polite">
      {upcoming.length > 0 && <section className="event-group" aria-labelledby="upcoming-events-heading"><div className="event-group-heading"><span className="event-group-marker event-group-marker-upcoming"/><div><span className="section-kicker">Coming up</span><h3 id="upcoming-events-heading">Upcoming events</h3></div></div><div className="event-list">{upcoming.map(renderEvent)}</div></section>}
      {past.length > 0 && <section className="event-group event-group-past" aria-labelledby="past-events-heading"><div className="event-group-heading"><span className="event-group-marker event-group-marker-past"/><div><span className="section-kicker">Our archive</span><h3 id="past-events-heading">Past events</h3></div></div><div className="event-list">{past.map(renderEvent)}</div></section>}
      {!filtered.length && <div className="events-empty"><h3>No events match those filters.</h3><p>Try clearing a filter to see the full calendar.</p></div>}
    </div>
  </section>;
}
