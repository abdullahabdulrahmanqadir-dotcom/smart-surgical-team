/* Event artwork is maintained by the official MET site, so these direct images
   deliberately avoid a local image optimisation/proxy layer. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import EventsExplorer from "../../components/EventsExplorer";
import { IconArrowRight, IconCalendar, IconPin } from "../../components/icons";
import { eventDateRange, eventDateStamp, eventTypeLabel, getPublicEvents, localizeFallbackEvent } from "../../lib/events";
import { getDictionary } from "../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({
    locale: active,
    path: "events",
    title: dict.seo.eventsTitle,
    description: dict.seo.eventsDescription,
    image: { url: "/events/smart-health-tower-events-hero.webp", alt: dict.events.heroEyebrow },
  });
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const events = (await getPublicEvents()).map((event) => localizeFallbackEvent(event, dict.eventFallback));
  // With nothing upcoming the page is an archive, and saying otherwise made it
  // promise a calendar it did not have. The featured slot is dropped entirely
  // rather than badging a past event as "featured" — it returns on its own the
  // moment an upcoming event is published.
  const featured = events.find((event) => event.status === "upcoming");
  const hero = featured
    ? { title: dict.events.heroTitle, accent: dict.events.heroAccent }
    : { title: dict.events.archiveHeroTitle, accent: dict.events.archiveHeroAccent };
  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content">
    <section className="events-hero"><div className="events-hero-photo" aria-hidden="true"><img src="/events/smart-health-tower-events-hero.webp" alt=""/></div><div className="events-hero-inner"><div className="events-hero-copy"><h1>{hero.title}<br/><span>{hero.accent}</span></h1></div></div></section>
    {featured && <section className="featured-event-section"><div className="featured-event"><div className="featured-event-art">{featured.image && <img src={featured.image} alt=""/>}<div className="featured-event-stamp"><span>{dict.events.featuredEvent}</span><strong>{eventDateStamp(featured, active).days}<br/>{eventDateStamp(featured, active).month}</strong></div></div><div className="featured-event-copy"><div className="event-card-tags"><span className={`event-status event-status-${featured.status}`}>{featured.status === "past" ? dict.events.pastEvent : dict.events.upcoming}</span><span>{eventTypeLabel(featured.type, dict.events)}</span></div><h2 {...authoredTitleProps(featured.title)}>{featured.title}</h2><p>{featured.summary}</p><div className="featured-event-meta"><span><IconCalendar size={18}/>{eventDateRange(featured, active)}</span><span><IconPin size={18}/>{featured.location}</span></div><Link className="btn btn-primary" href={localePath(active, `events/${featured.slug}`)}>{dict.events.exploreSummit} <IconArrowRight size={17}/></Link></div></div></section>}
    <div id="all-events"><EventsExplorer locale={active} events={events} t={dict.events}/></div>
  </main><SiteFooter locale={active} dict={dict}/></>;
}
