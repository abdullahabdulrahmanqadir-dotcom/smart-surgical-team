import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "smart-surgical-team.pages.dev";
  // Falling back to https on a local dev host makes icon/OG URLs unreachable.
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const title = "Smart Surgical Team | Learning for head & neck surgery";
  const description = "A trusted learning platform for head and neck surgery, created by Smart Surgical Team in Sulaymaniah.";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", images: [{ url: "/og.png", width: 1728, height: 904, alt: "Smart Surgical Team" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme is rewritten by the script below before hydration, so the
    // server value is expected to differ on a dark-mode visit.
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          // Applies the stored colour mode before paint so the page never flashes.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sst-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
