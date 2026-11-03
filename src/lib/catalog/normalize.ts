import { toCents } from "@/lib/money";
import type { PfSyncProductDetail, PfSyncVariant } from "@/lib/printful/types";
import type { Product, ProductImage, Variant } from "./types";

/** Extra data from Printful's catalog (blank) endpoints, keyed by catalog variant id. */
export interface CatalogEnrichment {
  color?: string | null;
  colorHex?: string | null;
  size?: string | null;
  description?: string | null;
}

const UNAVAILABLE = new Set(["discontinued", "out_of_stock", "temporary_out_of_stock"]);

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL"];

export function sizeRank(size: string): number {
  const i = SIZE_ORDER.indexOf(size.trim().toUpperCase());
  return i === -1 ? SIZE_ORDER.length : i;
}

export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "product"
  );
}

export const productSlug = (name: string, id: number) => `${slugify(name)}-${id}`;

/** "classic-tee-123456" -> 123456. Returns null for anything without a trailing numeric id. */
export function idFromSlug(slug: string): number | null {
  const m = /(?:^|-)(\d{1,15})$/.exec(slug);
  return m ? Number(m[1]) : null;
}

function normalizeHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const h = hex.trim();
  return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : null;
}

/**
 * Fallback when a sync variant lacks size/color fields: Printful names sync
 * variants "{Product} / {Color} / {Size}" (or "{Product} - {Color} / {Size}").
 */
export function parseVariantName(name: string): { color: string | null; size: string | null } {
  const parts = name.split(" / ").map((p) => p.trim());
  if (parts.length >= 3) return { color: parts[parts.length - 2], size: parts[parts.length - 1] };
  if (parts.length === 2) {
    const dash = parts[0].lastIndexOf(" - ");
    return { color: dash === -1 ? null : parts[0].slice(dash + 3).trim() || null, size: parts[1] || null };
  }
  return { color: null, size: null };
}

/** Best mockup image for a variant: a visible "preview" file, else the blank's photo. */
function variantImage(v: PfSyncVariant): string | null {
  const preview = v.files?.find((f) => f.type === "preview" && f.visible !== false && f.preview_url);
  return preview?.preview_url ?? v.product?.image ?? null;
}

/**
 * Convert one Printful sync product into the store model, or null if nothing
 * in it can be sold (all ignored/unsynced/unpriced).
 */
export function normalizeProduct(
  detail: PfSyncProductDetail,
  enrichment: Map<number, CatalogEnrichment> = new Map(),
): Product | null {
  const sp = detail.sync_product;
  if (sp.is_ignored) return null;

  const variants: Variant[] = [];
  for (const v of detail.sync_variants) {
    if (v.is_ignored || !v.synced) continue;
    const priceCents = toCents(v.retail_price);
    if (priceCents === null || priceCents <= 0) {
      console.warn(`[catalog] skipping variant ${v.id} of "${sp.name}": no retail price`);
      continue;
    }
    if ((v.currency || "USD").toUpperCase() !== "USD") {
      console.warn(`[catalog] skipping variant ${v.id} of "${sp.name}": currency ${v.currency} (store is USD)`);
      continue;
    }
    const extra = enrichment.get(v.variant_id) ?? {};
    const parsed = parseVariantName(v.name);
    variants.push({
      id: v.id,
      catalogVariantId: v.variant_id,
      color: v.color?.trim() || extra.color?.trim() || parsed.color,
      colorHex: normalizeHex(extra.colorHex),
      size: v.size?.trim() || extra.size?.trim() || parsed.size,
      priceCents,
      currency: "usd",
      sku: v.sku ?? null,
      image: variantImage(v),
      available: !UNAVAILABLE.has(v.availability_status ?? "active"),
    });
  }
  if (variants.length === 0) return null;

  variants.sort(
    (a, b) =>
      (a.color ?? "").localeCompare(b.color ?? "") || sizeRank(a.size ?? "") - sizeRank(b.size ?? ""),
  );

  // Colors in first-seen order of the original Printful ordering (merchant's order).
  const colors: Product["colors"] = [];
  const seenColor = new Set<string>();
  for (const v of detail.sync_variants) {
    const match = variants.find((x) => x.id === v.id);
    if (match?.color && !seenColor.has(match.color)) {
      seenColor.add(match.color);
      colors.push({ name: match.color, hex: match.colorHex });
    }
  }

  const sizes = [...new Set(variants.map((v) => v.size).filter((s): s is string => Boolean(s)))].sort(
    (a, b) => sizeRank(a) - sizeRank(b),
  );

  // One image per color (first variant of each color), then the product thumbnail.
  const images: ProductImage[] = [];
  const seenUrl = new Set<string>();
  for (const c of colors.length ? colors : [{ name: "", hex: null }]) {
    const v = variants.find((x) => (c.name ? x.color === c.name : true) && x.image);
    if (v?.image && !seenUrl.has(v.image)) {
      seenUrl.add(v.image);
      images.push({ url: v.image, alt: c.name ? `${sp.name} in ${c.name}` : sp.name, color: c.name || undefined });
    }
  }
  if (sp.thumbnail_url && !seenUrl.has(sp.thumbnail_url)) {
    images.push({ url: sp.thumbnail_url, alt: sp.name });
  }

  const description =
    variants.map((v) => enrichment.get(v.catalogVariantId)?.description).find((d) => d && d.trim()) ?? null;

  const prices = variants.map((v) => v.priceCents);
  return {
    id: sp.id,
    slug: productSlug(sp.name, sp.id),
    name: sp.name,
    description: description ? description.trim() : null,
    thumbnail: sp.thumbnail_url ?? images[0]?.url ?? null,
    images,
    colors,
    sizes,
    variants,
    minPriceCents: Math.min(...prices),
    maxPriceCents: Math.max(...prices),
    available: variants.some((v) => v.available),
  };
}
