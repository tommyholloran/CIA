import { describe, expect, it, vi } from "vitest";
import type { PrintfulOrder } from "@/lib/printful/orders";
import { handlePrintfulEvent, shipmentEmailData, RetryablePrintfulEventError, type PrintfulEventDeps } from "./printful-events";

const order = (over: Partial<PrintfulOrder> = {}): PrintfulOrder => ({
  id: 5000,
  external_id: "N3TMA3S6F3YV",
  status: "fulfilled",
  recipient: { name: "Ivan Petrov", email: "buyer@example.com" },
  items: [
    { id: 1, name: "Crazy Ivan Logo Tee — Black / M", quantity: 2 },
    { id: 2, name: "Army Crest Tee — Navy / 2XL", quantity: 1 },
  ],
  shipments: [
    { id: 77, carrier: "USPS", service: "Ground Advantage", tracking_number: "9400", tracking_url: "https://tools.usps.com/t?n=9400", items: [{ item_id: 1, quantity: 2 }, { item_id: 2, quantity: 1 }] },
  ],
  ...over,
});

function deps(o: PrintfulOrder | null = order(), over: Partial<PrintfulEventDeps> = {}) {
  return {
    getOrder: vi.fn(async () => o),
    sendShipmentEmail: vi.fn(async () => {}),
    notifyAdmin: vi.fn(async () => {}),
    revalidateCatalog: vi.fn(),
    ...over,
  } satisfies PrintfulEventDeps;
}

const shipped = (orderId = 5000, shipmentId = 77) => ({ type: "package_shipped", data: { order: { id: orderId }, shipment: { id: shipmentId } } });

describe("package_shipped", () => {
  it("emails the customer using the order as fetched from Printful, not the payload", async () => {
    const d = deps();
    expect(await handlePrintfulEvent(shipped(), d)).toEqual({ status: "emailed" });
    expect(d.getOrder).toHaveBeenCalledWith(5000);
    expect(d.sendShipmentEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      expect.objectContaining({ ref: "N3TMA3S6F3YV", firstName: "Ivan", trackingNumber: "9400", items: ["2 × Crazy Ivan Logo Tee — Black / M", "1 × Army Crest Tee — Navy / 2XL"], partial: false }),
      "77",
    );
  });

  it("ignores a shipment id that isn't on the real order (forged payload)", async () => {
    const d = deps();
    expect(await handlePrintfulEvent(shipped(5000, 999), d)).toMatchObject({ status: "ignored" });
    expect(d.sendShipmentEmail).not.toHaveBeenCalled();
  });

  it("ignores an order the API doesn't know", async () => {
    const d = deps(null);
    expect(await handlePrintfulEvent(shipped(), d)).toMatchObject({ status: "ignored", reason: "order not found" });
    expect(d.sendShipmentEmail).not.toHaveBeenCalled();
  });

  it("ignores orders with no recipient email", async () => {
    const d = deps(order({ recipient: { name: "X", email: null } }));
    expect(await handlePrintfulEvent(shipped(), d)).toMatchObject({ status: "ignored", reason: "no recipient email" });
  });

  it("asks for a retry when Printful or email is unavailable", async () => {
    await expect(handlePrintfulEvent(shipped(), deps(order(), { getOrder: vi.fn(async () => { throw new Error("503"); }) }))).rejects.toBeInstanceOf(RetryablePrintfulEventError);
    await expect(handlePrintfulEvent(shipped(), deps(order(), { sendShipmentEmail: vi.fn(async () => { throw new Error("resend down"); }) }))).rejects.toBeInstanceOf(RetryablePrintfulEventError);
  });
});

describe("shipmentEmailData", () => {
  it("flags partial shipments and drops non-http tracking URLs", () => {
    const o = order({ status: "partial" });
    const s = { ...o.shipments![0], items: [{ item_id: 1, quantity: 2 }], tracking_url: "javascript:alert(1)" };
    const data = shipmentEmailData(o, s);
    expect(data.partial).toBe(true);
    expect(data.items).toEqual(["2 × Crazy Ivan Logo Tee — Black / M"]);
    expect(data.trackingUrl).toBeNull();
  });

  it("uses a PF-prefixed ref for orders created by hand in Printful", () => {
    expect(shipmentEmailData(order({ external_id: null }), order().shipments![0]).ref).toBe("PF5000");
  });
});

describe("admin alerts", () => {
  it.each([
    ["order_failed", "printful_order_failed", /FAILED/],
    ["order_canceled", "printful_order_canceled", /CANCELED/],
    ["order_put_hold", "printful_order_on_hold", /ON HOLD/],
    ["package_returned", "printful_package_returned", /RETURNED/],
  ])("%s alerts the admin with the reason", async (type, kind, subject) => {
    const d = deps(order({ status: "failed" }));
    const out = await handlePrintfulEvent({ type, data: { order: { id: 5000 }, reason: "Address invalid" } }, d);
    expect(out).toEqual({ status: "alerted" });
    expect(d.notifyAdmin).toHaveBeenCalledWith(kind, "N3TMA3S6F3YV", expect.stringMatching(subject), expect.objectContaining({ reason: "Address invalid", printfulOrderId: 5000 }));
  });

  it("retries if the alert can't be sent", async () => {
    const d = deps(order(), { notifyAdmin: vi.fn(async () => { throw new Error("resend down"); }) });
    await expect(handlePrintfulEvent({ type: "order_failed", data: { order: { id: 5000 } } }, d)).rejects.toBeInstanceOf(RetryablePrintfulEventError);
  });
});

describe("other events", () => {
  it("revalidates the catalog on product/stock events without fetching orders", async () => {
    for (const type of ["product_synced", "stock_updated"]) {
      const d = deps();
      expect(await handlePrintfulEvent({ type }, d)).toEqual({ status: "revalidated" });
      expect(d.revalidateCatalog).toHaveBeenCalledTimes(1);
      expect(d.getOrder).not.toHaveBeenCalled();
    }
  });

  it("ignores unknown types and payloads without an order id", async () => {
    expect(await handlePrintfulEvent({ type: "something_new" }, deps())).toMatchObject({ status: "ignored" });
    expect(await handlePrintfulEvent({ type: "order_failed", data: {} }, deps())).toMatchObject({ status: "ignored" });
  });
});
