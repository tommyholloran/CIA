import { describe, expect, it } from "vitest";
import { orderRef } from "@/lib/checkout/order-ref";
import { buildPrintfulOrder } from "./build-order";
import { defaultLineItems, lineItem, paidSession, shippingRate } from "./fixtures";

describe("buildPrintfulOrder", () => {
  it("maps a paid session to a Printful order", () => {
    const s = paidSession();
    const r = buildPrintfulOrder(s, defaultLineItems(), shippingRate("expedited"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ref).toBe(orderRef(s.id));
    expect(r.order).toEqual({
      external_id: r.ref,
      shipping: "EXPRESS",
      recipient: {
        name: "Ivan Petrov", address1: "1 Main St", address2: "Apt 2", city: "Tucson", state_code: "AZ",
        country_code: "US", zip: "85701", phone: "+15205550100", email: "buyer@example.com",
      },
      items: [
        { sync_variant_id: 1100, quantity: 2, retail_price: "28.00", name: "Crazy Ivan Logo Tee — Black / M" },
        { sync_variant_id: 1104, quantity: 1, retail_price: "31.00", name: "Crazy Ivan Logo Tee — Black / 2XL" },
      ],
      retail_costs: { currency: "USD", discount: "0.00", shipping: "5.99", tax: "5.50" },
    });
    expect(r.order.external_id.length).toBeLessThanOrEqual(32);
  });

  it("omits optional recipient fields when absent", () => {
    const s = paidSession({
      customer_details: { email: null, name: "X", phone: null } as never,
      collected_information: { shipping_details: { name: "X", address: { line1: "1 A", line2: null, city: "B", state: "TX", postal_code: "1", country: "US" } } } as never,
    });
    const r = buildPrintfulOrder(s, defaultLineItems(), shippingRate());
    expect(r.ok && r.order.recipient).toEqual({ name: "X", address1: "1 A", city: "B", state_code: "TX", country_code: "US", zip: "1" });
  });

  it.each([
    ["unknown shipping option", () => buildPrintfulOrder(paidSession(), defaultLineItems(), shippingRate("teleport")), /shipping option/],
    ["no shipping rate", () => buildPrintfulOrder(paidSession(), defaultLineItems(), null), /shipping option/],
    ["no address", () => buildPrintfulOrder(paidSession({ collected_information: null }), defaultLineItems(), shippingRate()), /no shipping address/],
    ["non-US", () => buildPrintfulOrder(paidSession({ collected_information: { shipping_details: { name: "A", address: { line1: "1", city: "T", state: "ON", postal_code: "1", country: "CA" } } } as never }), defaultLineItems(), shippingRate()), /country CA/],
    ["missing variant metadata", () => buildPrintfulOrder(paidSession(), [lineItem(null, 1, 2800)], shippingRate()), /variant_id/],
    ["line items differ from cart", () => buildPrintfulOrder(paidSession(), [lineItem(1100, 3, 2800), lineItem(1104, 1, 3100)], shippingRate()), /don't match/],
    ["cart metadata missing", () => buildPrintfulOrder(paidSession({ metadata: {} }), defaultLineItems(), shippingRate()), /metadata.cart/],
    ["no line items", () => buildPrintfulOrder(paidSession(), [], shippingRate()), /no line items/],
  ])("rejects: %s", (_name, run, reason) => {
    const r = run();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(reason);
  });
});
