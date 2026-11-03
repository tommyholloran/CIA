import { z } from "zod";
import { MAX_LINES_PER_ORDER, MAX_QTY_PER_LINE } from "@/config/shipping";
import type { Product, Variant } from "@/lib/catalog/types";

/**
 * Server-side cart validation. The ONLY input trusted from the client is
 * variant id + quantity; every price, name and availability comes from the
 * catalog. Used by POST /api/cart (drawer) and POST /api/checkout (step 4),
 * so what the drawer shows is what checkout charges.
 */

export const cartRequestSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(MAX_LINES_PER_ORDER * 2), // tolerate duplicates; merged below
});
export type CartRequest = z.infer<typeof cartRequestSchema>;

export interface ValidatedLine {
  variantId: number;
  catalogVariantId: number;
  productId: number;
  name: string;
  slug: string;
  color: string | null;
  size: string | null;
  image: string | null;
  sku: string | null;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export type CartIssue =
  | { type: "removed"; variantId: number; reason: "not_found" | "unavailable" }
  | { type: "quantity_reduced"; variantId: number; from: number; to: number }
  | { type: "too_many_lines"; dropped: number[] };

export interface ValidatedCart {
  lines: ValidatedLine[];
  subtotalCents: number;
  issues: CartIssue[];
}

export function validateCart(items: CartRequest["items"], catalog: Product[]): ValidatedCart {
  const index = new Map<number, { product: Product; variant: Variant }>();
  for (const product of catalog) for (const variant of product.variants) index.set(variant.id, { product, variant });

  // Merge duplicate variant ids, preserving first-seen order.
  const merged = new Map<number, number>();
  for (const { variantId, quantity } of items) merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);

  const lines: ValidatedLine[] = [];
  const issues: CartIssue[] = [];
  const dropped: number[] = [];

  for (const [variantId, requested] of merged) {
    const hit = index.get(variantId);
    if (!hit) {
      issues.push({ type: "removed", variantId, reason: "not_found" });
      continue;
    }
    if (!hit.variant.available) {
      issues.push({ type: "removed", variantId, reason: "unavailable" });
      continue;
    }
    if (lines.length >= MAX_LINES_PER_ORDER) {
      dropped.push(variantId);
      continue;
    }
    const quantity = Math.min(requested, MAX_QTY_PER_LINE);
    if (quantity !== requested) issues.push({ type: "quantity_reduced", variantId, from: requested, to: quantity });

    const { product, variant } = hit;
    lines.push({
      variantId,
      catalogVariantId: variant.catalogVariantId,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      color: variant.color,
      size: variant.size,
      image: variant.image ?? product.images[0]?.url ?? null,
      sku: variant.sku,
      priceCents: variant.priceCents,
      quantity,
      lineTotalCents: variant.priceCents * quantity,
    });
  }
  if (dropped.length) issues.push({ type: "too_many_lines", dropped });

  return { lines, subtotalCents: lines.reduce((n, l) => n + l.lineTotalCents, 0), issues };
}
