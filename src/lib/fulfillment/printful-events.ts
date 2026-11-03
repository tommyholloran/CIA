import { errMessage, log } from "@/lib/log";
import type { PrintfulOrder, PrintfulShipment } from "@/lib/printful/orders";
import type { ShipmentInput } from "@/lib/email/templates";

/**
 * Printful v1 webhook handling. Printful v1 webhooks are NOT signed, so the
 * payload is never trusted: it only tells us WHICH order to look at. Every
 * action is based on the order as re-fetched from Printful's API.
 */

export interface PrintfulWebhookPayload {
  type: string;
  created?: number;
  retries?: number;
  store?: number;
  data?: {
    order?: { id?: number; external_id?: string | null };
    shipment?: { id?: number };
    reason?: string;
  };
}

export type AdminKind = "printful_order_failed" | "printful_order_canceled" | "printful_order_on_hold" | "printful_package_returned";

export interface PrintfulEventDeps {
  getOrder(id: number): Promise<PrintfulOrder | null>;
  sendShipmentEmail(to: string, data: ShipmentInput, shipmentId: string): Promise<void>;
  notifyAdmin(kind: AdminKind, ref: string, subject: string, details: Record<string, unknown>): Promise<void>;
  revalidateCatalog(): void;
}

export const ORDER_EVENTS = ["package_shipped", "order_failed", "order_canceled", "order_put_hold", "package_returned"] as const;
export const CATALOG_EVENTS = ["product_synced", "product_updated", "product_deleted", "stock_updated"] as const;
/** What scripts/register-printful-webhook.mjs subscribes to. */
export const SUBSCRIBED_EVENTS = [...ORDER_EVENTS, "product_synced", "stock_updated"] as const;

export type EventOutcome =
  | { status: "emailed" | "alerted" | "revalidated" }
  | { status: "ignored"; reason: string };

export class RetryablePrintfulEventError extends Error {
  name = "RetryablePrintfulEventError";
}

const SCOPE = "printful-webhook";
const DASHBOARD = "https://www.printful.com/dashboard/default/orders";

/** "N3TMA3S6F3YV" for our orders; the Printful id for orders created by hand in Printful. */
const refOf = (o: PrintfulOrder) => o.external_id || `PF${o.id}`;

export function shipmentEmailData(order: PrintfulOrder, shipment: PrintfulShipment): ShipmentInput {
  const byId = new Map((order.items ?? []).map((i) => [i.id, i]));
  const items = shipment.items.map((si) => {
    const name = byId.get(si.item_id)?.name ?? "Item";
    return `${si.quantity} × ${name}`;
  });
  return {
    ref: refOf(order),
    firstName: order.recipient?.name?.trim().split(/\s+/)[0] || null,
    carrier: shipment.carrier,
    service: shipment.service,
    trackingNumber: shipment.tracking_number,
    trackingUrl: shipment.tracking_url && /^https?:\/\//i.test(shipment.tracking_url) ? shipment.tracking_url : null,
    items,
    // Printful marks an order "partial" while some items are still unshipped.
    partial: order.status === "partial",
  };
}

export async function handlePrintfulEvent(payload: PrintfulWebhookPayload, deps: PrintfulEventDeps): Promise<EventOutcome> {
  const type = payload.type;

  if ((CATALOG_EVENTS as readonly string[]).includes(type)) {
    deps.revalidateCatalog();
    log("info", SCOPE, "catalog revalidated", { type });
    return { status: "revalidated" };
  }
  if (!(ORDER_EVENTS as readonly string[]).includes(type)) return { status: "ignored", reason: `event type ${type}` };

  const orderId = Number(payload.data?.order?.id);
  if (!Number.isInteger(orderId) || orderId <= 0) return { status: "ignored", reason: "payload has no order id" };

  let order: PrintfulOrder | null;
  try {
    order = await deps.getOrder(orderId);
  } catch (err) {
    throw new RetryablePrintfulEventError(`could not fetch Printful order ${orderId}: ${errMessage(err)}`);
  }
  if (!order) {
    log("warn", SCOPE, "order in webhook not found via API; ignoring (forged or other store?)", { type, orderId });
    return { status: "ignored", reason: "order not found" };
  }
  const ref = refOf(order);
  const base = { printfulOrderId: order.id, printfulStatus: order.status, dashboard: `${DASHBOARD}?search=${encodeURIComponent(ref)}` };

  switch (type) {
    case "package_shipped": {
      const shipmentId = Number(payload.data?.shipment?.id);
      const shipment = (order.shipments ?? []).find((s) => s.id === shipmentId);
      if (!shipment) {
        log("warn", SCOPE, "shipment not on the order per API; ignoring", { ref, shipmentId });
        return { status: "ignored", reason: "shipment not found on order" };
      }
      const to = order.recipient?.email;
      if (!to) {
        log("warn", SCOPE, "shipped order has no recipient email; customer not notified", { ref });
        return { status: "ignored", reason: "no recipient email" };
      }
      try {
        await deps.sendShipmentEmail(to, shipmentEmailData(order, shipment), String(shipment.id));
      } catch (err) {
        throw new RetryablePrintfulEventError(`shipment email failed for ${ref}: ${errMessage(err)}`);
      }
      log("info", SCOPE, "shipment email sent", { ref, shipmentId, carrier: shipment.carrier, partial: order.status === "partial" });
      return { status: "emailed" };
    }

    case "order_failed":
      await alert(deps, "printful_order_failed", ref, `Printful order #${ref} FAILED`, {
        ...base,
        reason: payload.data?.reason ?? "(no reason given)",
        action: "Open the order in Printful, fix the problem (often the address or a print file) and resubmit, or refund the customer in Stripe.",
      });
      return { status: "alerted" };

    case "order_canceled":
      await alert(deps, "printful_order_canceled", ref, `Printful order #${ref} was CANCELED`, {
        ...base,
        reason: payload.data?.reason ?? "(no reason given)",
        action: "If you didn't cancel it, contact Printful. Refund the customer in Stripe if they won't receive the order.",
      });
      return { status: "alerted" };

    case "order_put_hold":
      await alert(deps, "printful_order_on_hold", ref, `Printful order #${ref} is ON HOLD`, {
        ...base,
        reason: payload.data?.reason ?? "(no reason given)",
        action: "Nothing ships until the hold is resolved. Check the order in Printful.",
      });
      return { status: "alerted" };

    case "package_returned":
      await alert(deps, "printful_package_returned", ref, `Package for order #${ref} was RETURNED`, {
        ...base,
        reason: payload.data?.reason ?? "(no reason given)",
        action: "Usually a bad address. Contact the customer, then reship or refund.",
      });
      return { status: "alerted" };
  }
  return { status: "ignored", reason: `unhandled ${type}` };
}

async function alert(deps: PrintfulEventDeps, kind: AdminKind, ref: string, subject: string, details: Record<string, unknown>) {
  try {
    await deps.notifyAdmin(kind, ref, subject, details);
  } catch (err) {
    throw new RetryablePrintfulEventError(`admin alert failed for ${ref}: ${errMessage(err)}`);
  }
}
