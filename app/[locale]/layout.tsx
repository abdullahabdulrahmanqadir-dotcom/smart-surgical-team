import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Literata, Inter, Noto_Naskh_Arabic, IBM_Plex_Sans_Arabic } from "next/font/google";
import { LOCALES, LOCALE_META, isLocale, type Locale } from "../lib/i18n";
import { getDictionary } from "../lib/dictionaries";
import { seoAlternates } from "../lib/seo";
import GoogleAnalytics from "../components/GoogleAnalytics";
import "../globals.css";

// Type revised 2026-09-02. The display face was Newsreader, which is one of
// the most-used serifs on the web right now and read as a default rather than
// a choice. Literata is a reading serif drawn for long text, sturdier and more
// institutional, and rare on marketing sites. Same three weights, so no
// component's font-weight had to move.
//
// The Arabic pair echoes the Latin pair's register rather than being an
// unrelated default: Noto Naskh Arabic (calligraphic, serif-adjacent) for the
// display role, IBM Plex Sans Arabic (humanist sans) for Inter's body role.
// The Arabic faces are attached on Arabic pages only — see `fontVariables`.
// All four are self-hosted at build time by next/font.
const literata = Literata({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-display-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-body-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// The Arabic faces are attached only on Arabic pages. Attached everywhere,
// the language menu's one Arabic word ("العربية") was enough to pull every
// Naskh and Plex Arabic subset onto every English page — a few hundred
// kilobytes of webfont for a single dropdown label, which now falls back to
// the reader's own Arabic font.
const LATIN_FONTS = [literata.variable, inter.variable].join(" ");
const ARABIC_FONTS = [notoNaskh.variable, plexArabic.variable].join(" ");

function fontVariables(locale: Locale) {
  return locale === "ar" ? `${LATIN_FONTS} ${ARABIC_FONTS}` : LATIN_FONTS;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "smart-surgical-team.pages.dev";
  // Falling back to https on a local dev host makes icon/OG URLs unreachable.
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const title = dict.seo.homeTitle;
  const description = dict.seo.homeDescription;

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    manifest: "/manifest.webmanifest",
    title,
    description,
    verification: {
      google: "r9oYyfOdYpMIg6pXNiBhv9-fUilFXtcSwYRrc9K4Y-A",
    },
    // Lets search engines serve the right language and keeps localized pages
    // from competing as duplicate content.
    alternates: seoAlternates(active),
    icons: { icon: "/sst-mark.png", shortcut: "/sst-mark.png", apple: "/sst-mark.png" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: LOCALE_META[active].htmlLang,
      images: [{ url: "/og-team.jpg", width: 1728, height: 904, alt: dict.brand.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-team.jpg"] },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { dir, htmlLang } = LOCALE_META[locale];

  return (
    // data-theme is rewritten by the script below before hydration, so the
    // server value is expected to differ on a dark-mode visit.
    // The font variables must sit on <html>, not <body>: the stacks in
    // globals.css are declared at :root, and would resolve to nothing if the
    // variables were defined one level lower.
    <html
      lang={htmlLang}
      dir={dir}
      data-theme="light"
      className={fontVariables(locale)}
      suppressHydrationWarning
    >
      <head>
        <script
          // Google requires the default consent state synchronously, before
          // any config or event command. Keeping every storage purpose denied
          // preserves the site's banner-free, cookieless measurement policy.
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=window.gtag||gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});",
          }}
        />
        {/* Case and topic thumbnails for video content come from YouTube's
            image host. Opening that connection alongside the document saves a
            DNS lookup and TLS handshake from the critical path. */}
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <script
          // Applies the stored colour mode before paint so the page never flashes.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sst-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        <script
          // Register after the initial load so offline support never competes
          // with the first render. updateViaCache:none ensures a newly deployed
          // worker is checked at the network instead of reused from HTTP cache.
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker'in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(function(){})},{once:true})}",
          }}
        />
      </head>
      {/* On /ar the interface is already translated, so a browser page-translate
          would re-translate correct Arabic into worse Arabic. `translate` is
          inherited, so switching it off here makes "no" the default and lets the
          English database content opt back in with translate="yes" (see
          TranslatableContent). English pages stay fully translatable. */}
      <body className="antialiased" translate={locale === "ar" ? "no" : undefined}>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
