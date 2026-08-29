import Link from "next/link";
import NewsBannerDismiss from "./NewsBannerDismiss";
import { IconArrowRight } from "./icons";
import { localizedText, newsItemShape, type NewsItem } from "../lib/news-data";
import { authoredTitleProps, localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";

/** The key the reader's dismissal is remembered under, holding the item's id. */
export const NEWS_DISMISS_KEY = "sst-news-dismissed";

/**
 * The pinned announcement across the top of the homepage.
 *
 * Rendered on the server, hidden in the browser. That order matters: the
 * homepage HTML is cached and shared by every reader — see
 * `worker/page-cache.ts` — so the markup cannot vary by who is looking. The
 * dismissal is therefore applied by the inline script below, before paint,
 * exactly as the stored colour mode is applied in the layout. One shared
 * document, personalised locally.
 *
 * The dismissal stores the item's **id**, not a flag, so pinning a different
 * announcement brings the banner back on its own: the stored id no longer
 * matches. Storage being unavailable simply means the banner stays visible.
 */
export default function NewsBanner({ locale, item, t }: { locale: Locale; item: NewsItem; t: Dictionary["news"] }) {
  const title = localizedText(locale, item.title, item.titleAr).value;
  const external = newsItemShape(item) === "link";
  const href = external ? item.linkUrl : localePath(locale, `news/${item.slug}`);
  const label = <>
    <span className="news-banner-label">{t.bannerLabel}</span>
    <span className="news-banner-title" {...authoredTitleProps(title)}>{title}</span>
    <span className="news-banner-go">{external ? t.opensExternal : t.readMore}<IconArrowRight size={15}/></span>
  </>;

  return <>
    {/* `suppressHydrationWarning` because the script below sets
        `data-dismissed` on this element before React hydrates it — the same
        contract the layout has with the colour-mode script. */}
    <aside className="news-banner" data-news-banner data-news-id={item.id} suppressHydrationWarning>
      {external
        ? <a className="news-banner-link" href={href} target="_blank" rel="noopener noreferrer">{label}</a>
        : <Link className="news-banner-link" href={href}>{label}</Link>}
      <NewsBannerDismiss itemId={item.id} label={t.bannerDismiss}/>
    </aside>
    <script
      // Runs immediately after the element, so a banner the reader has already
      // dismissed is never painted even once.
      dangerouslySetInnerHTML={{
        __html: `try{var b=document.querySelector('[data-news-banner]');if(b&&localStorage.getItem(${JSON.stringify(NEWS_DISMISS_KEY)})===b.dataset.newsId){b.dataset.dismissed='1'}}catch(e){}`,
      }}
    />
  </>;
}
