import Stripe from "stripe";
import { printfulEnv, stripeEnv } from "@/lib/env";
import { RetryableError, fulfillCheckoutSession, type FulfillDeps } from "@/lib/fulfillment/fulfill";
import { errMessage, log } from "@/lib/log";
import { notifyAdmin, sendOrderConfirmation } from "@/lib/notify";
import { createOrder, getOrderByExternalId } from "@/lib/printful/orders";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Subscribed events:
 *   checkout.session.completed               → fulfil if payment_status=paid
 *   checkout.session.async_payment_succeeded → fulfil (delayed payment methods)
 *   checkout.session.async_payment_failed    → log only
 *
 * Responses: 400 bad signature · 200 handled/ignored/permanently failed (admin
 * alerted) · 500 retryable — Stripe redelivers with backoff for up to 3 days,
 * and fulfilment is idempotent, so retries are safe.
 */

const SCOPE = "stripe-webhook";
const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

function deps(): FulfillDeps {
  const s = stripe();
  return {
    retrieveSession: (id) => s.checkout.sessions.retrieve(id, { expand: ["shipping_cost.shipping_rate", "payment_intent"] }),
    listLineItems: async (id) => {
      // Not the expanded `line_items` on the session — that is capped at 10 entries.
      const items: Stripe.LineItem[] = [];
      for await (const li of s.checkout.sessions.listLineItems(id, { limit: 100, expand: ["data.price.product"] })) items.push(li);
      return items;
    },
    updatePaymentIntentMetadata: async (id, metadata) => {
      await s.paymentIntents.update(id, { metadata });
    },
    getPrintfulOrder: getOrderByExternalId,
    createPrintfulOrder: createOrder,
    sendOrderConfirmation,
    notifyAdmin: async (...args) => {
      try {
        await notifyAdmin(...args);
      } catch (err) {
        log("error", SCOPE, "admin notification failed", { kind: args[0], ref: args[1], error: errMessage(err) });
      }
    },
    autoConfirm: printfulEnv().PRINTFUL_AUTO_CONFIRM,
  };
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = stripeEnv().STRIPE_WEBHOOK_SECRET;
  } catch (err) {
    log("error", SCOPE, "webhook not configured", { error: errMessage(err) });
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Signature is computed over the exact raw bytes: read text, never JSON-parse first.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    log("warn", SCOPE, "signature verification failed", { error: errMessage(err) });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const ctx = { eventId: event.id, type: event.type, livemode: event.livemode };

  if (event.type === "checkout.session.async_payment_failed") {
    log("warn", SCOPE, "async payment failed; no order created", { ...ctx, sessionId: (event.data.object as Stripe.Checkout.Session).id });
    return Response.json({ received: true });
  }
  if (!HANDLED.has(event.type)) {
    log("info", SCOPE, "ignored event type", ctx);
    return Response.json({ received: true, ignored: true });
  }

  const sessionId = (event.data.object as Stripe.Checkout.Session).id;
  const keyIsLive = stripeEnv().STRIPE_SECRET_KEY.startsWith("sk_live_");
  if (event.livemode !== keyIsLive) {
    // e.g. a test-mode endpoint pointed at the production deploy. Never fulfil across modes.
    log("error", SCOPE, "event mode doesn't match STRIPE_SECRET_KEY mode; ignoring", { ...ctx, sessionId, keyIsLive });
    return Response.json({ received: true, ignored: true });
  }

  try {
    const outcome = await fulfillCheckoutSession(sessionId, deps());
    log(outcome.status === "failed" ? "error" : "info", SCOPE, `fulfilment ${outcome.status}`, { ...ctx, sessionId, ...outcome });
    return Response.json({ received: true, outcome: outcome.status });
  } catch (err) {
    const retryable = err instanceof RetryableError;
    log("error", SCOPE, retryable ? "retryable failure; Stripe will redeliver" : "unexpected failure; Stripe will redeliver", {
      ...ctx,
      sessionId,
      error: errMessage(err),
    });
    return Response.json({ error: "Processing failed; will retry" }, { status: 500 });
  }
}
