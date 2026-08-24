/* Event artwork is maintained by the official MET site, so these direct images
   deliberately avoid a local image optimisation/proxy layer. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { IconArrowRight, IconCalendar, IconCheck, IconFile, IconGlobe, IconPin, IconUsers } from "../../../components/icons";
import { eventDateRange, getPublicEvent, localizeFallbackEvent } from "../../../lib/events";
import { fill, getDictionary } from "../../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../../lib/i18n";
import { pageMetadata, seoDescription } from "../../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const sourceEvent = await getPublicEvent(slug);
  if (!sourceEvent) return { robots: { index: false, follow: false } };
  const event = localizeFallbackEvent(sourceEvent, dict.eventFallback);
  return pageMetadata({
    locale,
    path: `events/${event.slug}`,
    title: fill(dict.seo.eventTitle, { event: event.title }),
    description: seoDescription(event.summary, dict.seo.eventsDescription),
    image: event.image ? { url: event.image, alt: event.title } : undefined,
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale; const dict = getDictionary(active);
  const sourceEvent = await getPublicEvent(slug); if (!sourceEvent) notFound();
  const event = localizeFallbackEvent(sourceEvent, dict.eventFallback);
  const eventType = event.type === "Summit" ? dict.events.summit : event.type === "Webinar" ? dict.events.webinar : event.type === "Workshop" ? dict.events.workshop : dict.events.conference;
  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content">
    <section className="event-detail-hero">{event.image && <div className="event-detail-image"><img src={event.image} alt=""/></div>}<div className="event-detail-hero-inner"><nav className="event-breadcrumb" aria-label={dict.events.breadcrumb}><Link href={localePath(active, "events")}>{dict.events.events}</Link><span>/</span><b {...authoredTitleProps(event.shortTitle)}>{event.shortTitle}</b></nav><div className="event-card-tags"><span className={`event-status event-status-${event.status}`}>{event.status === "past" ? dict.events.pastEvent : dict.events.upcoming}</span><span>{eventType}</span><span>{event.format === "in-person" ? dict.events.inPerson : event.format === "hybrid" ? dict.events.hybrid : dict.events.online}</span></div><h1 {...authoredTitleProps(event.title)}>{event.title}</h1><p>{event.summary}</p><div className="event-detail-facts"><span><IconCalendar size={19}/>{eventDateRange(event, active)}</span><span><IconPin size={19}/>{event.location}</span></div>{event.status === "upcoming" && <a className="btn btn-primary btn-lg" href={event.officialUrl} target="_blank" rel="noreferrer">{dict.events.visitOfficialSite} <IconArrowRight size={18}/></a>}</div></section>
    <section className="event-detail-content"><article><span className="section-kicker">{dict.events.officialProgramme}</span><h2 {...authoredTitleProps(event.title)}>{event.title}</h2><p>{dict.events.programmeIntro}</p><ul className="event-highlights">{event.highlights.map((highlight) => <li key={highlight}><IconCheck size={18}/>{highlight}</li>)}</ul></article><aside className="event-action-panel"><span className="section-kicker">{dict.events.officialSummit}</span><h2>{dict.events.planVisit}</h2><p>{dict.events.visitIntro}</p><a href={event.officialUrl} target="_blank" rel="noreferrer"><IconGlobe size={17}/>{dict.events.eventWebsite} <IconArrowRight size={16}/></a>{event.programmeUrl && <a href={event.programmeUrl} target="_blank" rel="noreferrer"><IconFile size={17}/>{dict.events.viewProgramme} <IconArrowRight size={16}/></a>}{event.facultyUrl && <a href={event.facultyUrl} target="_blank" rel="noreferrer"><IconUsers size={17}/>{dict.events.viewFaculty} <IconArrowRight size={16}/></a>}{event.registrationUrl && <a className="btn btn-primary" href={event.registrationUrl} target="_blank" rel="noreferrer">{dict.events.registerMet} <IconArrowRight size={17}/></a>}</aside></section>
    {event.selectedFaculty.length > 0 && <section className="event-faculty"><div className="section-head"><div><span className="section-kicker">{dict.events.meetFaculty}</span><h2>{dict.events.facultyTitle}</h2></div><a className="text-link" href={event.facultyUrl} target="_blank" rel="noreferrer">{dict.events.viewFaculty} <IconArrowRight size={16}/></a></div><div className="event-faculty-grid">{event.selectedFaculty.map((member) => <article key={member.name}><img src={member.image} alt={fill(dict.events.portraitOf, { name: member.name })} width={109} height={109}/><div><h3>{member.name}</h3><p>{member.specialty} · {member.country}</p></div></article>)}</div></section>}
  </main><SiteFooter locale={active} dict={dict}/></>;
}
