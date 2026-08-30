import type { MetadataRoute } from "next";

const SITE_ORIGIN = "https://ssthyroid.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/en/admin",
        "/ar/admin",
        "/en/profile",
        "/ar/profile",
        "/en/sign-in",
        "/ar/sign-in",
        "/en/sign-up",
        "/ar/sign-up",
        "/en/forget-password",
        "/ar/forget-password",
      ],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
