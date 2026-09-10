import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://jalanpulang.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/auth/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
