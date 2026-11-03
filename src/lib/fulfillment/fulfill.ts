import type Stripe from "stripe";
import { SHIPPING_OPTIONS } from "@/config/shipping";
import { errMessage, log } from "@/lib/log";
import { PrintfulError } from "@/lib/printful/client";
import type { PrintfulOrder, PrintfulOrderRequest } from "@/lib/printful/orders";
import { buildPrintfulOrder } from "./build-order";

/** Data the email templates need (step 6). No full address — city/state only. */
export interface OrderEmailData {
  ref: string;
  email: string;
  firstName: string | null;
  items: { description: string; quantity: number; amountCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  shippingLabel: string | null;
  shipTo: string | null;
}

export type AdminNoticeKind = "order_build_failed" | "printful_rejected" | "draft_created";

export interface FulfillDeps {
  retrieveSession(id: string): Promise<Stripe.Checkout.Session>;
  listLineItems(id: string): Promise<Stripe.LineItem[]>;
  updatePaymentIntentMetadata(id: string, metadata: Record<string, string>): Promise<void>;
  getPrintfulOrder(externalId: string): Promise<PrintfulOrder | null>;
  createPrintfulOrder(body: PrintfulOrderRequest, confirm: boolean): Promise<PrintfulOrder>;
  /** Must be idempotent per ref (Resend idempotency key). Throws on failure. */
  sendOrderConfirmation(data: OrderEmailData): Promise<void>;
  /** Idempotent per (kind, ref). Best-effort: failures are logged, not thrown. */
  notifyAdmin(kind: AdminNoticeKind, ref: string, subject: string, details: Record<string, unknown>): Promise<void>;
  autoConfirm: boolean;
}

export type FulfillOutcome =
  | { status: "created" | "exists"; ref: string; printfulOrderId: number; draft: boolean }
  | { status: "skipped"; reason: string }
  | { status: "failed"; ref: string; reason: string };

/** Retryable failure: the webhook should answer 500 so Stripe redelivers. */
export class RetryableError extends Error {
  name = "RetryableError";
}

const SCOPE = "fulfill";

function emailData(session: Stripe.Checkout.Session, lineItems: Stripe.LineItem[], ref: string, shippingRate: Stripe.ShippingRate | null): OrderEmailData | null {
  const email = session.customer_details?.email;
  if (!email) return null;
  const ship = session.collected_information?.shipping_details;
  const name = ship?.name || session.customer_details?.name || "";
  const t = session.total_details;
  const optionId = shippingRate?.metadata?.option_id;
  return {
    ref,
    email,
    firstName: name.split(" ")[0] || null,
    items: lineItems.map((li) => ({ description: li.description ?? "Item", quantity: li.quantity ?? 1, amountCents: li.amount_subtotal })),
    subtotalCents: session.amount_subtotal ?? 0,
    shippingCents: t?.amount_shipping ?? 0,
    taxCents: t?.amount_tax ?? 0,
    discountCents: t?.amount_discount ?? 0,
    totalCents: session.amount_total ?? 0,
    shippingLabel: SHIPPING_OPTIONS.find((o) => o.id === optionId)?.label ?? shippingRate?.display_name ?? null,
    shipTo: ship?.address ? [ship.address.city, ship.address.state].filter(Boolean).join(", ") : null,
  };
}

const isPermanentPrintfulError = (err: unknown) =>
  err instanceof PrintfulError && err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 408;

/**
 * Turn a paid Checkout Session into exactly one Printful order, then email the
 * customer. Safe to run any number of times for the same session.
 *
 *  - Looks the order up by external_id first; creates only if missing.
 *  - Create is never blindly retried. On a 4xx it re-checks (a concurrent
 *    delivery may have won the race); on 5xx/timeout it re-checks, and throws
 *    RetryableError if the order still isn't there.
 *  - Test-mode payments ALWAYS create drafts, whatever PRINTFUL_AUTO_CONFIRM says.
 */
export async function fulfillCheckoutSession(sessionId: string, deps: FulfillDeps): Promise<FulfillOutcome> {
  let session: Stripe.Checkout.Session;
  let lineItems: Stripe.LineItem[];
  try {
    session = await deps.retrieveSession(sessionId);
    lineItems = await deps.listLineItems(sessionId);
  } catch (err) {
    throw new RetryableError(`could not load session from Stripe: ${errMessage(err)}`);
  }

  if (session.payment_status !== "paid") {
    log("info", SCOPE, "session not paid yet; waiting for async payment", { sessionId, payment_status: session.payment_status });
    return { status: "skipped", reason: `payment_status=${session.payment_status}` };
  }

  const rate = session.shipping_cost?.shipping_rate;
  const shippingRate = rate && typeof rate === "object" ? rate : null;
  const built = buildPrintfulOrder(session, lineItems, shippingRate);
  const email = emailData(session, lineItems, built.ref, shippingRate);

  if (!built.ok) {
    log("error", SCOPE, "cannot build Printful order", { ref: built.ref, sessionId, reason: built.reason });
    await deps.notifyAdmin("order_build_failed", built.ref, `Order #${built.ref} paid but NOT sent to Printful`, {
      reason: built.reason,
      stripeSession: sessionId,
      action: "Fix the issue and create the Printful order manually, or refund the customer in Stripe.",
    });
    if (email) await deps.sendOrderConfirmation(email); // they paid; confirm receipt
    return { status: "failed", ref: built.ref, reason: built.reason };
  }

  const { ref } = built;
  const confirm = deps.autoConfirm && session.livemode;

  let order: PrintfulOrder | null;
  let status: "created" | "exists" = "exists";
  try {
    order = await deps.getPrintfulOrder(ref);
  } catch (err) {
    throw new RetryableError(`Printful lookup failed for ${ref}: ${errMessage(err)}`);
  }

  if (!order) {
    if (deps.autoConfirm && !session.livemode) {
      log("warn", SCOPE, "test-mode payment: creating Printful order as DRAFT despite PRINTFUL_AUTO_CONFIRM=true", { ref });
    }
    try {
      order = await deps.createPrintfulOrder(built.order, confirm);
      status = "created";
      log("info", SCOPE, "Printful order created", { ref, printfulOrderId: order.id, printfulStatus: order.status, draft: !confirm });
    } catch (createErr) {
      // Did it land anyway (timeout) or did a concurrent delivery create it?
      let recheck: PrintfulOrder | null = null;
      try {
        recheck = await deps.getPrintfulOrder(ref);
      } catch (lookupErr) {
        throw new RetryableError(`create outcome unknown for ${ref}: ${errMessage(createErr)}; lookup failed: ${errMessage(lookupErr)}`);
      }
      if (recheck) {
        log("info", SCOPE, "Printful order already exists after failed create (race or timeout)", { ref, printfulOrderId: recheck.id });
        order = recheck;
      } else if (isPermanentPrintfulError(createErr)) {
        const reason = errMessage(createErr);
        log("error", SCOPE, "Printful rejected order", { ref, sessionId, reason });
        await deps.notifyAdmin("printful_rejected", ref, `Printful rejected order #${ref}`, {
          reason,
          stripeSession: sessionId,
          shipping: built.order.shipping,
          action: "Check the error, then create the order manually in Printful or refund in Stripe.",
        });
        if (email) await deps.sendOrderConfirmation(email);
        return { status: "failed", ref, reason };
      } else {
        throw new RetryableError(`Printful create failed for ${ref}: ${errMessage(createErr)}`);
      }
    }
  } else {
    log("info", SCOPE, "Printful order already exists; not creating again", { ref, printfulOrderId: order.id });
  }

  const draft = order.status === "draft";

  // Link the Stripe payment to the Printful order (best-effort; visible in Stripe Dashboard).
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (pi) {
    try {
      await deps.updatePaymentIntentMetadata(pi, { order_ref: ref, printful_order_id: String(order.id) });
    } catch (err) {
      log("warn", SCOPE, "could not write Printful id to PaymentIntent metadata", { ref, error: errMessage(err) });
    }
  }

  if (status === "created" && draft) {
    await deps.notifyAdmin("draft_created", ref, `New DRAFT order #${ref} — confirm it in Printful`, {
      printfulOrderId: order.id,
      shipping: built.order.shipping,
      items: built.order.items.map((i) => `${i.quantity} × ${i.name ?? i.sync_variant_id}`),
      action: "Review and confirm at https://www.printful.com/dashboard/default/orders — nothing ships until you do.",
    });
  }

  if (email) {
    try {
      await deps.sendOrderConfirmation(email);
    } catch (err) {
      // Order exists; a retry will find it and only resend the (idempotent) email.
      throw new RetryableError(`confirmation email failed for ${ref}: ${errMessage(err)}`);
    }
  } else {
    log("warn", SCOPE, "no customer email on session; confirmation not sent", { ref });
  }

  return { status, ref, printfulOrderId: order.id, draft };
}
