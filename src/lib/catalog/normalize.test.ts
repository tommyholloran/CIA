import { describe, expect, it } from "vitest";
import type { PfSyncProductDetail, PfSyncVariant } from "@/lib/printful/types";
import { idFromSlug, normalizeProduct, parseVariantName, productSlug, sizeRank } from "./normalize";

function variant(overrides: Partial<PfSyncVariant> & { id: number }): PfSyncVariant {
  return {
    external_id: `ext-${overrides.id}`,
    sync_product_id: 1001,
    name: "Logo Tee / Black / M",
    synced: true,
    variant_id: 4000 + overrides.id,
    retail_price: "29.00",
    currency: "USD",
    product: { variant_id: 4000 + overrides.id, product_id: 71, image: `https://files.cdn.printful.com/blank-${overrides.id}.jpg` },
    files: [
      { type: "default", url: "https://example.com/print.png" },
      { type: "preview", preview_url: `https://files.cdn.printful.com/mock-${overrides.id}.png`, visible: true },
    ],
    ...overrides,
  };
}

function detail(variants: PfSyncVariant[], extra: Partial<PfSyncProductDetail["sync_product"]> = {}): PfSyncProductDetail {
  return {
    sync_product: {
      id: 1001,
      external_id: "sp-1001",
      name: "Logo Tee",
      variants: variants.length,
      synced: variants.length,
      thumbnail_url: "https://files.cdn.printful.com/thumb.png",
      ...extra,
    },
    sync_variants: variants,
  };
}

describe("slugs", () => {
  it("round-trips id through slug", () => {
    const slug = productSlug("Crazy Ivan — Logo Tee!", 123456789);
    expect(slug).toBe("crazy-ivan-logo-tee-123456789");
    expect(idFromSlug(slug)).toBe(123456789);
  });
  it("rejects slugs without a trailing id", () => {
    expect(idFromSlug("logo-tee")).toBeNull();
    expect(idFromSlug("")).toBeNull();
  });
  it("resolves a renamed product by id", () => {
    expect(idFromSlug("old-name-42")).toBe(42);
  });
});

describe("parseVariantName", () => {
  it("parses Product / Color / Size", () => {
    expect(parseVariantName("Logo Tee / Heather Grey / 2XL")).toEqual({ color: "Heather Grey", size: "2XL" });
  });
  it("parses Product - Color / Size", () => {
    expect(parseVariantName("Logo Tee - Navy / S")).toEqual({ color: "Navy", size: "S" });
  });
  it("returns nulls when unparseable", () => {
    expect(parseVariantName("Logo Tee")).toEqual({ color: null, size: null });
  });
});

describe("sizeRank", () => {
  it("orders apparel sizes", () => {
    expect(["XL", "S", "2XL", "M", "XS"].sort((a, b) => sizeRank(a) - sizeRank(b))).toEqual([
      "XS", "S", "M", "XL", "2XL",
    ]);
  });
});

describe("normalizeProduct", () => {
  it("builds variants, colors, sizes and prices in cents", () => {
    const p = normalizeProduct(
      detail([
        variant({ id: 1, color: "Black", size: "L", retail_price: "29.00" }),
        variant({ id: 2, color: "Black", size: "S", retail_price: "29.00" }),
        variant({ id: 3, color: "White", size: "M", retail_price: "29.00" }),
        variant({ id: 4, color: "Black", size: "2XL", retail_price: "31.50" }),
      ]),
    )!;
    expect(p.slug).toBe("logo-tee-1001");
    expect(p.colors.map((c) => c.name)).toEqual(["Black", "White"]);
    expect(p.sizes).toEqual(["S", "M", "L", "2XL"]);
    expect(p.minPriceCents).toBe(2900);
    expect(p.maxPriceCents).toBe(3150);
    expect(p.variants.find((v) => v.id === 4)!.priceCents).toBe(3150);
    // One mockup per color, merchant's color order first.
    expect(p.images[0]).toMatchObject({ color: "Black", alt: "Logo Tee in Black" });
    expect(p.images[0].url).toMatch(/^https:\/\/files\.cdn\.printful\.com\/mock-\d\.png$/);
    expect(p.images.some((i) => i.color === "White")).toBe(true);
  });

  it("falls back to parsing the variant name when size/color fields are missing", () => {
    const p = normalizeProduct(detail([variant({ id: 1, name: "Logo Tee / Navy / XL" })]))!;
    expect(p.variants[0]).toMatchObject({ color: "Navy", size: "XL" });
  });

  it("uses catalog enrichment for color hex and description", () => {
    const p = normalizeProduct(
      detail([variant({ id: 1, color: "Black", size: "M" })]),
      new Map([[4001, { colorHex: "#0B0B0B", description: "100% cotton." }]]),
    )!;
    expect(p.colors[0].hex).toBe("#0b0b0b");
    expect(p.description).toBe("100% cotton.");
  });

  it("drops ignored, unsynced, unpriced and non-USD variants", () => {
    const p = normalizeProduct(
      detail([
        variant({ id: 1, color: "Black", size: "M" }),
        variant({ id: 2, color: "Black", size: "L", is_ignored: true }),
        variant({ id: 3, color: "Black", size: "XL", synced: false }),
        variant({ id: 4, color: "Black", size: "S", retail_price: null }),
        variant({ id: 5, color: "Black", size: "XS", currency: "EUR" }),
        variant({ id: 6, color: "Black", size: "2XL", retail_price: "abc" }),
      ]),
    )!;
    expect(p.variants.map((v) => v.id)).toEqual([1]);
  });

  it("returns null when nothing is sellable or the product is ignored", () => {
    expect(normalizeProduct(detail([variant({ id: 1, synced: false })]))).toBeNull();
    expect(normalizeProduct(detail([variant({ id: 1 })], { is_ignored: true }))).toBeNull();
  });

  it("marks out-of-stock variants unavailable but treats unknown statuses as available", () => {
    const p = normalizeProduct(
      detail([
        variant({ id: 1, color: "Black", size: "M", availability_status: "out_of_stock" }),
        variant({ id: 2, color: "Black", size: "L", availability_status: "some_new_status" }),
      ]),
    )!;
    expect(p.variants.find((v) => v.id === 1)!.available).toBe(false);
    expect(p.variants.find((v) => v.id === 2)!.available).toBe(true);
    expect(p.available).toBe(true);
  });

  it("flags a fully sold-out product", () => {
    const p = normalizeProduct(detail([variant({ id: 1, availability_status: "discontinued" })]))!;
    expect(p.available).toBe(false);
  });
});
