import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Preview deployments are kept out of search engines entirely; production
 * allows everything except API routes and order pages.
 */
export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.VERCEL_ENV === "preview";
  return isPreview
    ? { rules: { userAgent: "*", disallow: "/" } }
    : {
        rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/order/"] },
        sitemap: `${siteUrl()}/sitemap.xml`,
      };
}
