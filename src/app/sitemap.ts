import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

const STATIC_PATHS = ["", "/shop", "/about", "/faq", "/shipping-returns", "/contact", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  let products: Awaited<ReturnType<typeof getCatalog>> = [];
  try {
    products = await getCatalog();
  } catch (err) {
    // Never fail the sitemap because Printful is down; list static pages only.
    console.error("[sitemap] catalog unavailable:", err);
  }
  return [
    ...STATIC_PATHS.map((p) => ({
      url: `${base}${p}`,
      changeFrequency: (p === "" || p === "/shop" ? "daily" : "monthly") as "daily" | "monthly",
      priority: p === "" ? 1 : p === "/shop" ? 0.9 : 0.3,
    })),
    ...products.map((p) => ({
      url: `${base}/shop/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.slice(0, 1).map((i) => i.url),
    })),
  ];
}
