import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Newsreader, Inter, Noto_Kufi_Arabic, Noto_Naskh_Arabic } from "next/font/google";
import { LOCALES, LOCALE_META, isLocale, type Locale } from "../lib/i18n";
import { getDictionary } from "../lib/dictionaries";
import "../globals.css";

// Type locked 2026-07-26 — see design-system/smart-surgical-team/MASTER.md.
// Latin faces carry headings/body in English; the Noto pair covers Arabic and
// Sorani Kurdish. All four are self-hosted at build time by next/font.
const newsreader = Newsreader({
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

const notoKufi = Noto_Kufi_Arabic({
  variable: "--font-display-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-body-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const FONT_VARIABLES = [
  newsreader.variable,
  inter.variable,
  notoKufi.variable,
  notoNaskh.variable,
].join(" ");

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

  const title = `${dict.brand.name} | ${dict.brand.tagline}`;
  const description =
    "A trusted learning platform for head and neck surgery, created by Smart Surgical Team in Sulaymaniah.";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title,
    description,
    alternates: {
      canonical: `/${active}`,
      // Lets search engines serve the right language and stops the three
      // locales competing with each other as duplicate content.
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `/${l}`])),
    },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: LOCALE_META[active].htmlLang,
      images: [{ url: "/og.png", width: 1728, height: 904, alt: dict.brand.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
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
      className={FONT_VARIABLES}
      suppressHydrationWarning
    >
      <head>
        <script
          // Applies the stored colour mode before paint so the page never flashes.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sst-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
