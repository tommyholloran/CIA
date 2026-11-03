/**
 * Catalog presentation settings.
 *
 * Featured products on the home page, by Printful sync product id (the number
 * at the end of each product URL, e.g. /shop/classic-tee-123456789).
 * Leave empty to feature the first FEATURED_FALLBACK_COUNT products.
 */
export const FEATURED_PRODUCT_IDS: number[] = [];
export const FEATURED_FALLBACK_COUNT = 4;

/** Cache tag for every Printful catalog read. POST /api/revalidate invalidates it. */
export const CATALOG_CACHE_TAG = "catalog";
