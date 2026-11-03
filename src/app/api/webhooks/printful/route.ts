import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/config/catalog";
import { printfulEnv } from "@/lib/env";
import { RetryablePrintfulEventError, handlePrintfulEvent, type PrintfulWebhookPayload } from "@/lib/fulfillment/printful-events";
import { errMessage, log } from "@/lib/log";
import { notifyAdmin, sendShipmentEmail } from "@/lib/notify";
import { getOrderById } from "@/lib/printful/orders";

/**
 * POST /api/webhooks/printful?secret=<PRINTFUL_WEBHOOK_SECRET>
 *
 * Printful v1 webhooks are unsigned, so: (1) a secret in the URL keeps out
 * casual callers, and (2) the payload is only a pointer — every action is
 * based on the order re-fetched from Printful's API.
 *
 * 401 bad secret · 200 handled/ignored · 500 transient failure (Printful retries).
 */
const SCOPE = "printful-webhook";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = printfulEnv().PRINTFUL_WEBHOOK_SECRET;
  } catch (err) {
    log("error", SCOPE, "webhook not configured", { error: errMessage(err) });
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const given = new URL(request.url).searchParams.get("secret") ?? "";
  if (!given || !safeEqual(given, secret)) {
    log("warn", SCOPE, "rejected: bad or missing secret");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PrintfulWebhookPayload;
  try {
    payload = (await request.json()) as PrintfulWebhookPayload;
    if (!payload || typeof payload.type !== "string") throw new Error("missing type");
  } catch (err) {
    log("warn", SCOPE, "invalid payload", { error: errMessage(err) });
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ctx = { type: payload.type, printfulOrderId: payload.data?.order?.id, retries: payload.retries };
  try {
    const outcome = await handlePrintfulEvent(payload, {
      getOrder: getOrderById,
      sendShipmentEmail,
      notifyAdmin,
      revalidateCatalog: () => revalidateTag(CATALOG_CACHE_TAG, "max"),
    });
    log("info", SCOPE, `event ${outcome.status}`, { ...ctx, ...outcome });
    return Response.json({ received: true, outcome: outcome.status });
  } catch (err) {
    log("error", SCOPE, err instanceof RetryablePrintfulEventError ? "retryable failure" : "unexpected failure", {
      ...ctx,
      error: errMessage(err),
    });
    return Response.json({ error: "Processing failed; will retry" }, { status: 500 });
  }
}
