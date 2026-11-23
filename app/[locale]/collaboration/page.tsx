import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CollaborationMap from "../../components/CollaborationMap";
import ScrollMotion from "../../components/ScrollMotion";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { IconArrowRight, IconShield } from "../../components/icons";
import { getCollaborators, mapLabels } from "../../lib/collaborators-server";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { pageMetadata } from "../../lib/seo";
import "./collaboration.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: "collaboration", title: dict.seo.collabTitle, description: dict.seo.collabDescription });
}

/**
 * /:locale/collaboration: the International Breast Surgery Collaboration Map.
 *
 * Reads published collaborators from the database, so it stays Worker-rendered
 * with the layered page cache (AGENTS.md). Spec:
 * docs/superpowers/specs/2026-11-23-breast-summit-and-map-design.md.
 */
export default async function CollaborationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.collab;
  const collaborators = await getCollaborators(active);

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <ScrollMotion />
      <main id="main-content" className="collab-page">
        <div className="collab-shell">
          <header className="collab-intro">
            <nav className="collab-crumbs" aria-label={dict.events.breadcrumb}>
              <Link href={localePath(active, "breast-summit")}>{dict.nav.breastSummit}</Link>
              <span aria-hidden="true">/</span>
              <span>{t.navLabel}</span>
            </nav>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            <p className="collab-consent"><IconShield size={17} />{t.consentNote}</p>
          </header>
          <CollaborationMap
            collaborators={collaborators}
            locale={active}
            labels={mapLabels(t)}
            emptyHref={localePath(active, "contact")}
          />
          <p className="collab-back">
            <Link className="text-link" href={localePath(active, "breast-summit")}>{dict.summit.title}<IconArrowRight size={16} /></Link>
          </p>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
