import type { Metadata } from "next";
import Link from "next/link";
import ContentPlayer from "../../../components/ContentPlayer";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { IconArrowRight, IconClock, IconFile, IconPlay, IconUsers } from "../../../components/icons";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";

export function generateMetadata(): Metadata {
  return {
    title: "Thyroidectomy: Step-by-Step Masterclass | Smart Surgical Team",
    description: "A practical video masterclass in total thyroidectomy.",
  };
}

const related = [
  ["Thyroid surgery", "Protecting the Recurrent Laryngeal Nerve", "18:42", "tone-1"],
  ["Endocrine surgery", "Parathyroid Autotransplantation: Key Decisions", "16:08", "tone-3"],
  ["Operative series", "Central Neck Dissection: Anatomic Planes", "27:51", "tone-2"],
];

export default async function ContentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const home = localePath(active);

  return (
    <>
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="content-page">
        <nav className="content-breadcrumb" aria-label="Breadcrumb">
          <Link href={`${home}#library`}>Library</Link><span>/</span>
          <Link href={localePath(active, "topics/thyroid")}>Thyroid &amp; Parathyroid</Link><span>/</span>
          <b>Thyroidectomy masterclass</b>
        </nav>

        <div className="content-heading">
          <div>
            <span className="content-kicker">Operative video · Intermediate</span>
            <h1>Thyroidectomy: Step-by-Step Masterclass</h1>
            <p>Refine a safe, reproducible approach to total thyroidectomy with intra-operative commentary and technical pearls.</p>
          </div>
          <button className="save-button" type="button"><span>+</span> Save for later</button>
        </div>

        <div className="content-grid">
          <section className="content-main">
            <ContentPlayer />

            <section className="discussion-panel" aria-labelledby="discussion-title">
              <div className="section-mini-head">
                <div><span className="section-kicker">Community</span><h2 id="discussion-title">Discussion</h2></div>
                <span className="badge">0 comments</span>
              </div>
              <div className="discussion-empty">
                <span>Share a thought or question with fellow learners.</span>
                <button type="button" className="btn btn-primary">Join the discussion <IconArrowRight size={16} /></button>
              </div>
            </section>
          </section>

          <aside className="content-aside">
            <section className="presenter-card">
              <span className="aside-label">Presenter</span>
              <div className="presenter-identity"><span className="presenter-avatar">KA</span><div><h2>Dr. Karzan Ahmed</h2><p>Head &amp; Neck Surgeon</p></div></div>
              <p className="presenter-copy">Special interest in thyroid, parathyroid and oncologic surgery at Smart Health Tower.</p>
              <Link href={`${home}#team`} className="text-link">View profile <IconArrowRight size={15} /></Link>
            </section>

            <section className="details-card">
              <span className="aside-label">Lecture details</span>
              <dl>
                <div><dt>Format</dt><dd>Video lecture</dd></div>
                <div><dt>Duration</dt><dd>24:18</dd></div>
                <div><dt>Topic</dt><dd>Thyroid &amp; Parathyroid</dd></div>
                <div><dt>Level</dt><dd>Intermediate</dd></div>
              </dl>
              <button type="button" className="reference-button"><IconFile size={16} /> Copy reference</button>
            </section>
          </aside>
        </div>

        <section className="related-section" aria-labelledby="related-title">
          <div className="section-mini-head"><div><span className="section-kicker">Keep learning</span><h2 id="related-title">Related content</h2></div><Link className="text-link" href={`${home}#library`}>View library <IconArrowRight size={16} /></Link></div>
          <div className="related-grid">
            {related.map(([topic, title, time, tone]) => (
              <Link href={localePath(active, "library/400467")} className="related-card" key={title}>
                <div className={`related-art ${tone}`}><span className="related-play"><IconPlay size={18} /></span><small>{time}</small></div>
                <span className="related-topic">{topic}</span><h3>{title}</h3><p><IconClock size={14} /> Video lesson</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
