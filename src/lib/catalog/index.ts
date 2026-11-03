import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_CACHE_TAG, FEATURED_FALLBACK_COUNT, FEATURED_PRODUCT_IDS } from "@/config/catalog";
import { hasPrintfulToken } from "@/lib/env";
import { mapLimit, printfulRequest } from "@/lib/printful/client";
import type { PfCatalogVariantDetail, PfSyncProductDetail, PfSyncProductSummary } from "@/lib/printful/types";
import { idFromSlug, normalizeProduct, parseVariantName, type CatalogEnrichment } from "./normalize";
import type { Product } from "./types";

export type { Product, Variant } from "./types";

const CONCURRENCY = 4;
/** Printful allows ~120 req/min; keep enrichment well under that. */
const MAX_ENRICHMENT_CALLS = 60;

async function listSyncProducts(): Promise<PfSyncProductSummary[]> {
  const all: PfSyncProductSummary[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await printfulRequest<PfSyncProductSummary[]>("/store/products", {
      query: { offset, limit: 100 },
    });
    all.push(...page.result);
    const total = page.paging?.total ?? all.length;
    if (page.result.length === 0 || all.length >= total) break;
  }
  return all;
}

const fetchSyncProduct = async (id: number) =>
  (await printfulRequest<PfSyncProductDetail>(`/store/products/${id}`)).result;

/**
 * Color hex + blank description from Printful's catalog. One call per
 * (blank product, color) — every size of that color shares the result.
 * Best-effort: failures only lose swatch colors / description.
 */
async function fetchEnrichment(details: PfSyncProductDetail[]): Promise<Map<number, CatalogEnrichment>> {
  const groups = new Map<string, number[]>(); // key -> catalog variant ids
  for (const d of details) {
    for (const v of d.sync_variants) {
      if (v.is_ignored || !v.synced) continue;
      const color = v.color?.trim() || parseVariantName(v.name).color;
      const key = `${v.product.product_id}|${color ?? `v${v.variant_id}`}`;
      const ids = groups.get(key) ?? [];
      ids.push(v.variant_id);
      groups.set(key, ids);
    }
  }

  const entries = [...groups.values()];
  if (entries.length > MAX_ENRICHMENT_CALLS) {
    console.warn(`[catalog] ${entries.length} color groups; enriching only the first ${MAX_ENRICHMENT_CALLS}`);
  }

  const out = new Map<number, CatalogEnrichment>();
  await mapLimit(entries.slice(0, MAX_ENRICHMENT_CALLS), CONCURRENCY, async (ids) => {
    try {
      const { result } = await printfulRequest<PfCatalogVariantDetail>(`/products/variant/${ids[0]}`);
      const shared: CatalogEnrichment = {
        color: result.variant?.color ?? null,
        colorHex: result.variant?.color_code ?? null,
        description: result.product?.description ?? null,
      };
      for (const id of ids) out.set(id, id === ids[0] ? { ...shared, size: result.variant?.size } : shared);
    } catch (err) {
      console.warn(`[catalog] enrichment failed for catalog variant ${ids[0]}:`, (err as Error).message);
    }
  });
  return out;
}

/**
 * The whole catalog, cached for an hour (stale-while-revalidate) and tagged so
 * POST /api/revalidate can refresh it immediately.
 *
 * With no PRINTFUL_API_TOKEN it returns [] so the site builds without secrets.
 * A Printful error THROWS rather than caching an empty store for an hour.
 */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  if (!hasPrintfulToken()) {
    console.warn("[catalog] PRINTFUL_API_TOKEN not set — rendering an empty catalog");
    return [];
  }

  const summaries = (await listSyncProducts()).filter((p) => !p.is_ignored && p.synced > 0);
  const details = await mapLimit(summaries, CONCURRENCY, (p) => fetchSyncProduct(p.id));
  const enrichment = await fetchEnrichment(details);

  const products = details
    .map((d) => normalizeProduct(d, enrichment))
    .filter((p): p is Product => p !== null);

  console.info(`[catalog] loaded ${products.length} products from Printful`);
  return products;
}

/** Look up by slug. Matches on the trailing id so renamed products keep working. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const id = idFromSlug(slug);
  if (id === null) return null;
  return (await getCatalog()).find((p) => p.id === id) ?? null;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const catalog = await getCatalog();
  if (FEATURED_PRODUCT_IDS.length > 0) {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return FEATURED_PRODUCT_IDS.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }
  return catalog.slice(0, FEATURED_FALLBACK_COUNT);
}
