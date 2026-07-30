/* Event artwork is maintained by the official MET site, so these direct images
   deliberately avoid a local image optimisation/proxy layer. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import EventsExplorer from "../../components/EventsExplorer";
import { IconArrowRight, IconCalendar, IconPin } from "../../components/icons";
import { eventDateRange, getPublicEvents } from "../../lib/events";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const events = await getPublicEvents();
  const featured = events.find((event) => event.status === "upcoming") ?? events[0];
  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content">
    <section className="events-hero"><div className="events-hero-photo" aria-hidden="true"><img src="/events/smart-health-tower-events-hero.png" alt=""/></div><div className="events-hero-inner"><div className="events-hero-copy"><span className="eyebrow">Smart Surgical Team events</span><h1>Learn together.<br/><span>Move surgery forward.</span></h1><p>Meet the conferences, workshops and teaching moments connecting the region’s head and neck community.</p><a className="btn btn-primary btn-lg" href="#all-events">Browse events <IconArrowRight size={18}/></a></div></div></section>
    <section className="featured-event-section"><div className="featured-event"><div className="featured-event-art">{featured.image && <img src={featured.image} alt=""/>}<div className="featured-event-stamp"><span>Featured event</span><strong>27–28<br/>AUG</strong></div></div><div className="featured-event-copy"><div className="event-card-tags"><span className="event-status event-status-upcoming">Upcoming</span><span>{featured.type}</span></div><h2>{featured.title}</h2><p>{featured.summary}</p><div className="featured-event-meta"><span><IconCalendar size={18}/>{eventDateRange(featured)}</span><span><IconPin size={18}/>{featured.location}</span></div><Link className="btn btn-primary" href={localePath(active, `events/${featured.slug}`)}>Explore the summit <IconArrowRight size={17}/></Link></div></div></section>
    <div id="all-events"><EventsExplorer locale={active} events={events}/></div>
  </main><SiteFooter locale={active} dict={dict}/></>;
}
