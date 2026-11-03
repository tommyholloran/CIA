import { describe, expect, it } from "vitest";
import { MAX_LINES_PER_ORDER, MAX_QTY_PER_LINE } from "@/config/shipping";
import type { Product, Variant } from "@/lib/catalog/types";
import { cartRequestSchema, validateCart } from "./validate";

function variant(id: number, priceCents: number, available = true): Variant {
  return { id, catalogVariantId: 4000 + id, color: "Black", colorHex: null, size: "M", priceCents, currency: "usd", sku: `S${id}`, image: `img-${id}`, available };
}

function product(id: number, variants: Variant[]): Product {
  return {
    id, slug: `tee-${id}`, name: `Tee ${id}`, description: null, thumbnail: null, images: [], colors: [], sizes: [],
    variants, minPriceCents: 0, maxPriceCents: 0, available: true,
  };
}

const catalog = [product(1, [variant(11, 2800), variant(12, 3100), variant(13, 2800, false)])];

describe("validateCart", () => {
  it("prices lines from the catalog, ignoring anything else the client sends", () => {
    const tampered = [{ variantId: 11, quantity: 2, priceCents: 1 }] as unknown as { variantId: number; quantity: number }[];
    const r = validateCart(tampered, catalog);
    expect(r.lines[0]).toMatchObject({ variantId: 11, priceCents: 2800, quantity: 2, lineTotalCents: 5600, name: "Tee 1" });
    expect(r.subtotalCents).toBe(5600);
    expect(r.issues).toEqual([]);
  });

  it("removes unknown and sold-out variants with a reason", () => {
    const r = validateCart([{ variantId: 999, quantity: 1 }, { variantId: 13, quantity: 1 }, { variantId: 12, quantity: 1 }], catalog);
    expect(r.lines.map((l) => l.variantId)).toEqual([12]);
    expect(r.issues).toEqual([
      { type: "removed", variantId: 999, reason: "not_found" },
      { type: "removed", variantId: 13, reason: "unavailable" },
    ]);
  });

  it("merges duplicates and caps quantity", () => {
    const r = validateCart([{ variantId: 11, quantity: MAX_QTY_PER_LINE }, { variantId: 11, quantity: 3 }], catalog);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(MAX_QTY_PER_LINE);
    expect(r.issues).toContainEqual({ type: "quantity_reduced", variantId: 11, from: MAX_QTY_PER_LINE + 3, to: MAX_QTY_PER_LINE });
  });

  it("drops lines beyond the per-order limit", () => {
    const many = Array.from({ length: MAX_LINES_PER_ORDER + 2 }, (_, i) => variant(100 + i, 1000));
    const r = validateCart(many.map((v) => ({ variantId: v.id, quantity: 1 })), [product(2, many)]);
    expect(r.lines).toHaveLength(MAX_LINES_PER_ORDER);
    expect(r.issues).toContainEqual({ type: "too_many_lines", dropped: [100 + MAX_LINES_PER_ORDER, 101 + MAX_LINES_PER_ORDER] });
  });
});

describe("cartRequestSchema", () => {
  it.each([
    [{ items: [] }],
    [{ items: [{ variantId: 1, quantity: 0 }] }],
    [{ items: [{ variantId: -1, quantity: 1 }] }],
    [{ items: [{ variantId: 1.5, quantity: 1 }] }],
    [{ items: [{ variantId: "1", quantity: 1 }] }],
    [{}],
  ])("rejects %j", (body) => expect(cartRequestSchema.safeParse(body).success).toBe(false));

  it("accepts a valid cart", () => {
    expect(cartRequestSchema.safeParse({ items: [{ variantId: 1, quantity: 2 }] }).success).toBe(true);
  });
});
