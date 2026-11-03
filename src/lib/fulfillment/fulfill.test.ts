import { describe, expect, it, vi } from "vitest";
import { PrintfulError } from "@/lib/printful/client";
import type { PrintfulOrder } from "@/lib/printful/orders";
import { orderRef } from "@/lib/checkout/order-ref";
import { RetryableError, fulfillCheckoutSession, type FulfillDeps } from "./fulfill";
import { defaultLineItems, paidSession } from "./fixtures";
import type Stripe from "stripe";

/** In-memory Printful with a unique external_id constraint, like the real one. */
function fakePrintful() {
  const orders = new Map<string, PrintfulOrder>();
  let nextId = 1000;
  return {
    orders,
    get: vi.fn(async (ext: string) => orders.get(ext) ?? null),
    create: vi.fn(async (body: { external_id: string }, confirm: boolean) => {
      if (orders.has(body.external_id)) throw new PrintfulError("Order with this external ID already exists", 400, "/orders");
      const o = { id: nextId++, external_id: body.external_id, status: confirm ? "pending" : "draft" };
      orders.set(body.external_id, o);
      return o;
    }),
  };
}

function makeDeps(over: Partial<FulfillDeps> = {}, session: Stripe.Checkout.Session = paidSession()) {
  const pf = fakePrintful();
  const deps: FulfillDeps = {
    retrieveSession: vi.fn(async () => session),
    listLineItems: vi.fn(async () => defaultLineItems()),
    updatePaymentIntentMetadata: vi.fn(async () => {}),
    getPrintfulOrder: pf.get,
    createPrintfulOrder: pf.create,
    sendOrderConfirmation: vi.fn(async () => {}),
    notifyAdmin: vi.fn(async () => {}),
    autoConfirm: false,
    ...over,
  };
  return { deps, pf };
}

const ref = orderRef(paidSession().id);

describe("fulfillCheckoutSession", () => {
  it("creates one draft order, links it in Stripe, notifies admin, emails customer", async () => {
    const { deps, pf } = makeDeps();
    const out = await fulfillCheckoutSession("cs_x", deps);
    expect(out).toEqual({ status: "created", ref, printfulOrderId: 1000, draft: true });
    expect(pf.create).toHaveBeenCalledTimes(1);
    expect(pf.create.mock.calls[0][1]).toBe(false); // confirm=false → draft
    expect(deps.updatePaymentIntentMetadata).toHaveBeenCalledWith("pi_123", { order_ref: ref, printful_order_id: "1000" });
    expect(deps.notifyAdmin).toHaveBeenCalledWith("draft_created", ref, expect.stringContaining("DRAFT"), expect.anything());
    expect(deps.sendOrderConfirmation).toHaveBeenCalledWith(expect.objectContaining({ ref, email: "buyer@example.com", totalCents: 9849, shipTo: "Tucson, az" }));
  });

  it("is idempotent: a redelivery finds the order and does not create another", async () => {
    const { deps, pf } = makeDeps();
    await fulfillCheckoutSession("cs_x", deps);
    const second = await fulfillCheckoutSession("cs_x", deps);
    expect(second.status).toBe("exists");
    expect(pf.create).toHaveBeenCalledTimes(1);
    expect(pf.orders.size).toBe(1);
    // Both re-sent on redelivery (order still a draft); Resend dedupes by idempotency key.
    expect(deps.notifyAdmin).toHaveBeenCalledTimes(2);
    expect(deps.sendOrderConfirmation).toHaveBeenCalledTimes(2);
  });

  it("survives concurrent deliveries without a duplicate order", async () => {
    const { deps, pf } = makeDeps();
    // Both lookups miss before either create lands.
    pf.get.mockImplementationOnce(async () => null).mockImplementationOnce(async () => null);
    const results = await Promise.all([fulfillCheckoutSession("cs_x", deps), fulfillCheckoutSession("cs_x", deps)]);
    expect(pf.orders.size).toBe(1);
    expect(results.map((r) => r.status).sort()).toEqual(["created", "exists"]);
  });

  it("confirms (auto-submits) only for live payments", async () => {
    const live = makeDeps({ autoConfirm: true }, paidSession({ livemode: true }));
    expect(await fulfillCheckoutSession("cs_x", live.deps)).toMatchObject({ status: "created", draft: false });
    expect(live.pf.create.mock.calls[0][1]).toBe(true);
    expect(live.deps.notifyAdmin).not.toHaveBeenCalled();

    const test = makeDeps({ autoConfirm: true }, paidSession({ livemode: false }));
    expect(await fulfillCheckoutSession("cs_x", test.deps)).toMatchObject({ draft: true });
    expect(test.pf.create.mock.calls[0][1]).toBe(false);
  });

  it("skips unpaid (async) sessions without touching Printful", async () => {
    const { deps, pf } = makeDeps({}, paidSession({ payment_status: "unpaid" }));
    expect(await fulfillCheckoutSession("cs_x", deps)).toEqual({ status: "skipped", reason: "payment_status=unpaid" });
    expect(pf.get).not.toHaveBeenCalled();
    expect(deps.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("recovers when a create times out but actually landed", async () => {
    const { deps, pf } = makeDeps();
    pf.create.mockImplementationOnce(async (body, confirm) => {
      pf.orders.set(body.external_id, { id: 77, external_id: body.external_id, status: confirm ? "pending" : "draft" });
      throw new PrintfulError("The operation was aborted due to timeout", 0, "/orders");
    });
    expect(await fulfillCheckoutSession("cs_x", deps)).toMatchObject({ status: "exists", printfulOrderId: 77 });
    expect(pf.orders.size).toBe(1);
  });

  it("asks Stripe to retry when a create fails transiently and no order exists", async () => {
    const { deps, pf } = makeDeps();
    pf.create.mockRejectedValueOnce(new PrintfulError("Bad gateway", 502, "/orders"));
    await expect(fulfillCheckoutSession("cs_x", deps)).rejects.toBeInstanceOf(RetryableError);
    expect(deps.sendOrderConfirmation).not.toHaveBeenCalled();
    // ...and the retry succeeds
    expect(await fulfillCheckoutSession("cs_x", deps)).toMatchObject({ status: "created" });
  });

  it("alerts admin (no retry) when Printful permanently rejects the order", async () => {
    const { deps, pf } = makeDeps();
    pf.create.mockRejectedValueOnce(new PrintfulError("Invalid shipping method EXPRESS", 400, "/orders"));
    const out = await fulfillCheckoutSession("cs_x", deps);
    expect(out).toMatchObject({ status: "failed", reason: expect.stringContaining("EXPRESS") });
    expect(deps.notifyAdmin).toHaveBeenCalledWith("printful_rejected", ref, expect.any(String), expect.objectContaining({ shipping: "STANDARD" }));
    expect(deps.sendOrderConfirmation).toHaveBeenCalledTimes(1); // customer still gets a receipt
  });

  it("alerts admin when the session can't be mapped to an order", async () => {
    const { deps, pf } = makeDeps({}, paidSession({ metadata: {} }));
    expect(await fulfillCheckoutSession("cs_x", deps)).toMatchObject({ status: "failed" });
    expect(pf.create).not.toHaveBeenCalled();
    expect(deps.notifyAdmin).toHaveBeenCalledWith("order_build_failed", ref, expect.any(String), expect.anything());
  });

  it("retries when Stripe or Printful lookups fail", async () => {
    const a = makeDeps({ retrieveSession: vi.fn(async () => { throw new Error("stripe down"); }) });
    await expect(fulfillCheckoutSession("cs_x", a.deps)).rejects.toBeInstanceOf(RetryableError);
    const b = makeDeps({ getPrintfulOrder: vi.fn(async () => { throw new PrintfulError("down", 503, "/orders/@x"); }) });
    await expect(fulfillCheckoutSession("cs_x", b.deps)).rejects.toBeInstanceOf(RetryableError);
  });

  it("retries if the confirmation email fails, without re-creating the order", async () => {
    const { deps, pf } = makeDeps();
    (deps.sendOrderConfirmation as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("resend 500"));
    await expect(fulfillCheckoutSession("cs_x", deps)).rejects.toBeInstanceOf(RetryableError);
    expect(await fulfillCheckoutSession("cs_x", deps)).toMatchObject({ status: "exists" });
    expect(pf.create).toHaveBeenCalledTimes(1);
  });

  it("retries until the draft notice is delivered", async () => {
    const { deps, pf } = makeDeps();
    (deps.notifyAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("resend 500"));
    await expect(fulfillCheckoutSession("cs_x", deps)).rejects.toBeInstanceOf(RetryableError);
    expect(await fulfillCheckoutSession("cs_x", deps)).toMatchObject({ status: "exists", draft: true });
    expect(deps.notifyAdmin).toHaveBeenLastCalledWith("draft_created", ref, expect.any(String), expect.anything());
    expect(pf.create).toHaveBeenCalledTimes(1);
  });

  it("does not re-send the draft notice once the order is confirmed in Printful", async () => {
    const { deps, pf } = makeDeps();
    await fulfillCheckoutSession("cs_x", deps);
    pf.orders.get(ref)!.status = "pending"; // owner confirmed it
    await fulfillCheckoutSession("cs_x", deps);
    expect(deps.notifyAdmin).toHaveBeenCalledTimes(1);
  });

  it("retries if a failure alert can't be sent", async () => {
    const { deps } = makeDeps({ notifyAdmin: vi.fn(async () => { throw new Error("down"); }) }, paidSession({ metadata: {} }));
    await expect(fulfillCheckoutSession("cs_x", deps)).rejects.toBeInstanceOf(RetryableError);
  });

  it("does not fail fulfilment if writing Stripe metadata fails", async () => {
    const { deps } = makeDeps({ updatePaymentIntentMetadata: vi.fn(async () => { throw new Error("nope"); }) });
    expect(await fulfillCheckoutSession("cs_x", deps)).toMatchObject({ status: "created" });
  });
});
