import { describe, expect, it } from "vitest";
import { adminEmail, esc, orderConfirmationEmail, shipmentEmail, type OrderConfirmationInput } from "./templates";

const order: OrderConfirmationInput = {
  ref: "N3TMA3S6F3YV",
  firstName: "Ivan",
  items: [
    { description: "Crazy Ivan Logo Tee — Black / M", quantity: 2, amountCents: 5600 },
    { description: "Army Crest Tee — Navy / 2XL", quantity: 1, amountCents: 3000 },
  ],
  subtotalCents: 8600,
  shippingCents: 599,
  taxCents: 550,
  discountCents: 0,
  totalCents: 9749,
  shippingLabel: "Standard shipping",
  shipTo: "Tucson, AZ",
};

describe("esc", () => {
  it("escapes HTML", () => expect(esc(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;"));
});

describe("orderConfirmationEmail", () => {
  const e = orderConfirmationEmail(order, "https://shop.test");

  it("has subject, ref, items and totals in both HTML and text", () => {
    expect(e.subject).toBe("Order #N3TMA3S6F3YV confirmed");
    for (const body of [e.html, e.text]) {
      expect(body).toContain("N3TMA3S6F3YV");
      expect(body).toContain("Army Crest Tee — Navy / 2XL");
      expect(body).toContain("$97.49");
      expect(body).toContain("$5.99");
      expect(body).toContain("Tucson, AZ");
    }
    expect(e.html).toContain("https://shop.test/shop");
  });

  it("is deterministic (required for Resend idempotency keys)", () => {
    expect(orderConfirmationEmail(order, "https://shop.test")).toEqual(e);
  });

  it("escapes injected product and customer names", () => {
    const evil = orderConfirmationEmail(
      { ...order, firstName: "<img src=x onerror=alert(1)>", items: [{ description: "<b>Tee</b>", quantity: 1, amountCents: 100 }] },
      "https://shop.test",
    );
    expect(evil.html).not.toContain("<img src=x");
    expect(evil.html).not.toContain("<b>Tee</b>");
    expect(evil.html).toContain("&lt;b&gt;Tee&lt;/b&gt;");
  });

  it("handles missing name, ship-to and shipping label", () => {
    const e2 = orderConfirmationEmail({ ...order, firstName: null, shipTo: null, shippingLabel: null }, "https://shop.test");
    expect(e2.html).toContain("Thanks for your order!");
    expect(e2.text).not.toContain("Shipping to");
  });
});

describe("shipmentEmail", () => {
  it("includes carrier, tracking link and items", () => {
    const e = shipmentEmail(
      { ref: "ABC", firstName: "Ivan", carrier: "USPS", service: "First Class", trackingNumber: "9400 1", trackingUrl: "https://track.test/1?a=1&b=2", items: ["2 × Logo Tee — Black / M"], partial: false },
      "https://shop.test",
    );
    expect(e.subject).toBe("Your order #ABC has shipped");
    expect(e.html).toContain('href="https://track.test/1?a=1&amp;b=2"');
    expect(e.text).toContain("Track it: https://track.test/1?a=1&b=2");
    expect(e.html).toContain("USPS First Class");
  });

  it("words partial shipments differently", () => {
    const e = shipmentEmail({ ref: "ABC", firstName: null, carrier: null, service: null, trackingNumber: null, trackingUrl: null, items: [], partial: true }, "https://shop.test");
    expect(e.subject).toBe("Part of your order #ABC has shipped");
    expect(e.text).toContain("ship separately");
  });
});

describe("adminEmail", () => {
  it("puts the action first and escapes values", () => {
    const e = adminEmail("Printful rejected order #X", "X", { reason: "<bad>", action: "Do the thing", items: ["a", "b"] });
    expect(e.subject).toMatch(/^\[.+\] Printful rejected order #X$/);
    expect(e.text.indexOf("action:")).toBeLessThan(e.text.indexOf("reason:"));
    expect(e.html).toContain("&lt;bad&gt;");
    expect(e.text).toContain("metadata['order_ref']:'X'");
  });
});
