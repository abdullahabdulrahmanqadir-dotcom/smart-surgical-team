/* Event artwork is maintained by the official MET site, so these direct images
   deliberately avoid a local image optimisation/proxy layer. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { IconArrowRight, IconCalendar, IconCheck, IconFile, IconGlobe, IconPin, IconUsers } from "../../../components/icons";
import { eventDateRange, getPublicEvent } from "../../../lib/events";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";

export default async function EventDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const event = await getPublicEvent(slug); if (!event) notFound();
  const active: Locale = locale; const dict = getDictionary(active);
  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content">
    <section className="event-detail-hero">{event.image && <div className="event-detail-image"><img src={event.image} alt=""/></div>}<div className="event-detail-hero-inner"><nav className="event-breadcrumb" aria-label="Breadcrumb"><Link href={localePath(active, "events")}>Events</Link><span>/</span><b>{event.shortTitle}</b></nav><div className="event-card-tags"><span className={`event-status event-status-${event.status}`}>{event.status === "past" ? "Past event" : "Upcoming"}</span><span>{event.type}</span><span>{event.format.replace("-", " ")}</span></div><h1>{event.title}</h1><p>{event.summary}</p><div className="event-detail-facts"><span><IconCalendar size={19}/>{eventDateRange(event)}</span><span><IconPin size={19}/>{event.location}</span></div>{event.status === "upcoming" && <a className="btn btn-primary btn-lg" href={event.officialUrl} target="_blank" rel="noreferrer">Visit official event site <IconArrowRight size={18}/></a>}</div></section>
    <section className="event-detail-content"><article><span className="section-kicker">Official programme</span><h2>2nd Middle East Thyroid Summit</h2><p>The official MET Summit information lists the following programme formats.</p><ul className="event-highlights">{event.highlights.map((highlight) => <li key={highlight}><IconCheck size={18}/>{highlight}</li>)}</ul></article><aside className="event-action-panel"><span className="section-kicker">Official MET Summit</span><h2>Plan your visit</h2><p>Programme, faculty, registration and event information are maintained by the official summit team.</p><a href={event.officialUrl} target="_blank" rel="noreferrer"><IconGlobe size={17}/>Event website <IconArrowRight size={16}/></a>{event.programmeUrl && <a href={event.programmeUrl} target="_blank" rel="noreferrer"><IconFile size={17}/>View programme <IconArrowRight size={16}/></a>}{event.facultyUrl && <a href={event.facultyUrl} target="_blank" rel="noreferrer"><IconUsers size={17}/>View all faculty <IconArrowRight size={16}/></a>}{event.registrationUrl && <a className="btn btn-primary" href={event.registrationUrl} target="_blank" rel="noreferrer">Register on MET site <IconArrowRight size={17}/></a>}</aside></section>
    {event.selectedFaculty.length > 0 && <section className="event-faculty"><div className="section-head"><div><span className="section-kicker">Meet the faculty</span><h2>A selection of summit contributors</h2></div><a className="text-link" href={event.facultyUrl} target="_blank" rel="noreferrer">View all faculty <IconArrowRight size={16}/></a></div><div className="event-faculty-grid">{event.selectedFaculty.map((member) => <article key={member.name}><img src={member.image} alt={`Portrait of ${member.name}`} width={109} height={109}/><div><h3>{member.name}</h3><p>{member.specialty} · {member.country}</p></div></article>)}</div></section>}
  </main><SiteFooter locale={active} dict={dict}/></>;
}
