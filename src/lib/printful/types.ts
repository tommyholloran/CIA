/**
 * Printful API v1 response shapes — only the fields this app reads.
 *
 * Sources (developers.printful.com was unreachable when this was written):
 *  - Printful's official PHP SDK (github.com/printful/php-api-sdk, src/Structures/*)
 *  - A maintained v1 integration (@legenki/print2medusa) for fields added after
 *    that SDK's last update: sync variant `size`, `color`, `availability_status`,
 *    catalog variant `color_code`.
 * Those later fields are typed optional and the code works without them.
 */

/** Every v1 response is wrapped: { code, result, paging?, error? } */
export interface PrintfulEnvelope<T> {
  code: number;
  result: T;
  paging?: { total: number; offset: number; limit: number };
  error?: { reason?: string; message?: string };
}

/** GET /store/products — list item */
export interface PfSyncProductSummary {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url?: string | null;
  is_ignored?: boolean;
}

export interface PfFile {
  id?: number;
  /** "default" (print file) | "preview" (mockup) | "back" | "label_inside" | … */
  type: string;
  url?: string | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  visible?: boolean;
  status?: string;
}

/**
 * Availability values seen in the wild. Unknown values are treated as AVAILABLE:
 * Printful can add statuses, and hiding the catalog on a new value is worse.
 */
export type PfAvailabilityStatus =
  | "active"
  | "discontinued"
  | "out_of_stock"
  | "temporary_out_of_stock"
  | (string & {});

/** GET /store/products/{id} — sync_variants[] item */
export interface PfSyncVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  /** Printful catalog variant id (the blank: e.g. Bella+Canvas 3001, Black, M) */
  variant_id: number;
  /** Decimal string, e.g. "24.95". */
  retail_price: string | null;
  currency: string;
  is_ignored?: boolean;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  availability_status?: PfAvailabilityStatus;
  product: { variant_id: number; product_id: number; image?: string | null; name?: string | null };
  files: PfFile[];
}

/** GET /store/products/{id} */
export interface PfSyncProductDetail {
  sync_product: PfSyncProductSummary;
  sync_variants: PfSyncVariant[];
}

/** GET /products/variant/{id} — catalog (blank) variant, used for color hex + description. */
export interface PfCatalogVariantDetail {
  variant: {
    id: number;
    product_id: number;
    name?: string;
    size?: string | null;
    color?: string | null;
    color_code?: string | null;
    image?: string | null;
  };
  product: {
    id: number;
    title?: string;
    brand?: string | null;
    model?: string | null;
    description?: string | null;
  };
}
