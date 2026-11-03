import { describe, expect, it } from "vitest";
import { MAX_LINES_PER_ORDER, MAX_QTY_PER_LINE, PRODUCTION_DAYS, SHIPPING_OPTIONS } from "@/config/shipping";
import type { ValidatedLine } from "@/lib/cart/validate";
import { buildCheckoutSessionParams, decodeCartMetadata, encodeCartMetadata } from "./session";
import { orderRef } from "./order-ref";

const line = (variantId: number, quantity: number, priceCents = 2800, extra: Partial<ValidatedLine> = {}): ValidatedLine => ({
  variantId, catalogVariantId: 4000 + variantId, productId: 11, name: "Crazy Ivan Logo Tee", slug: "crazy-ivan-logo-tee-11",
  color: "Black", size: "M", image: "https://files.cdn.printful.com/m.png", sku: `SKU-${variantId}`,
  priceCents, quantity, lineTotalCents: priceCents * quantity, ...extra,
});

describe("cart metadata", () => {
  it("round-trips", () => {
    const lines = [line(1100, 2), line(1104, 1)];
    const encoded = encodeCartMetadata(lines);
    expect(encoded).toBe("1100x2,1104x1");
    expect(decodeCartMetadata(encoded)).toEqual([{ variantId: 1100, quantity: 2 }, { variantId: 1104, quantity: 1 }]);
  });

  it("fits Stripe's 500-char limit at max cart size with 10-digit ids", () => {
    const lines = Array.from({ length: MAX_LINES_PER_ORDER }, (_, i) => line(5_000_000_000 + i, MAX_QTY_PER_LINE));
    expect(encodeCartMetadata(lines).length).toBeLessThanOrEqual(500);
  });

  it.each([[""], [null], ["1100x2,oops"], ["x2"], ["1100x"], ["1100*2"]])("rejects %j", (v) =>
    expect(decodeCartMetadata(v)).toBeNull(),
  );
});

describe("buildCheckoutSessionParams", () => {
  const params = buildCheckoutSessionParams([line(1100, 2), line(1104, 1, 3100, { size: "2XL" })], "https://shop.test");

  it("charges server prices in cents, tax-exclusive, with a tax code", () => {
    const items = params.line_items!;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ quantity: 2, price_data: { currency: "usd", unit_amount: 2800, tax_behavior: "exclusive" } });
    expect(items[1].price_data!.unit_amount).toBe(3100);
    expect(items[1].price_data!.product_data!.name).toBe("Crazy Ivan Logo Tee — Black / 2XL");
    expect(items[0].price_data!.product_data!.tax_code).toMatch(/^txcd_\d{8}$/);
  });

  it("puts variant ids in product metadata and the cart in session + payment intent metadata", () => {
    expect(params.line_items![0].price_data!.product_data!.metadata).toEqual({
      variant_id: "1100", catalog_variant_id: "5100", product_id: "11", sku: "SKU-1100",
    });
    expect(params.metadata).toEqual({ cart: "1100x2,1104x1", cart_version: "1" });
    expect(params.payment_intent_data!.metadata).toEqual(params.metadata);
  });

  it("collects a US shipping address and offers each configured flat rate", () => {
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ["US"] });
    expect(params.shipping_options).toHaveLength(SHIPPING_OPTIONS.length);
    const std = params.shipping_options![0].shipping_rate_data!;
    expect(std).toMatchObject({
      type: "fixed_amount",
      fixed_amount: { amount: SHIPPING_OPTIONS[0].amount, currency: "usd" },
      tax_code: "txcd_92010001",
      tax_behavior: "exclusive",
      metadata: { option_id: "standard" },
    });
    // estimate includes print time
    expect(std.delivery_estimate!.minimum!.value).toBe(PRODUCTION_DAYS.min + SHIPPING_OPTIONS[0].transitBusinessDays.min);
  });

  it("enables Stripe Tax and builds redirect URLs", () => {
    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(params.mode).toBe("payment");
    expect(params.success_url).toBe("https://shop.test/order/success?session_id={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toBe("https://shop.test/shop?checkout=canceled");
  });

  it("refuses an empty cart", () => {
    expect(() => buildCheckoutSessionParams([], "https://shop.test")).toThrow();
  });
});

describe("orderRef", () => {
  it("is short, uppercase and stable", () => {
    expect(orderRef("cs_test_a1B2c3D4e5F6g7H8i9J0")).toBe("F6G7H8I9J0");
    expect(orderRef("cs_live_a1B2c3D4e5F6g7H8i9J0")).toBe("F6G7H8I9J0");
  });
});
