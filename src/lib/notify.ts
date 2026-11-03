import "server-only";
import { resendEnv } from "@/lib/env";
import type { AdminNoticeKind, OrderEmailData } from "@/lib/fulfillment/fulfill";
import { log } from "@/lib/log";
import { siteUrl } from "@/lib/site";
import { sendEmail } from "@/lib/email/send";
import { adminEmail, orderConfirmationEmail, shipmentEmail, type ShipmentInput } from "@/lib/email/templates";

/**
 * Email notifications via Resend. Idempotency keys make webhook retries safe:
 *   order-confirmation/{ref}
 *   shipment/{ref}/{shipmentId}
 *   admin/{kind}/{ref}
 */

/** Throws on failure — the Stripe webhook retries until the customer is emailed. */
export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  await sendEmail({
    to: data.email,
    email: orderConfirmationEmail(data, siteUrl()),
    idempotencyKey: `order-confirmation/${data.ref}`,
    tag: "order_confirmation",
  });
}

/** Throws on failure — the Printful webhook retries. */
export async function sendShipmentEmail(to: string, data: ShipmentInput, shipmentId: string): Promise<void> {
  await sendEmail({
    to,
    email: shipmentEmail(data, siteUrl()),
    idempotencyKey: `shipment/${data.ref}/${shipmentId}`,
    tag: "shipment",
  });
}

export type AdminKind = AdminNoticeKind | "printful_order_failed" | "printful_order_canceled" | "printful_order_on_hold";

/**
 * Alert the store owner. Logged at error level first so the alert survives in
 * Vercel logs even if email delivery fails. Throws on email failure; callers
 * that must not fail (fulfilment) wrap it.
 */
export async function notifyAdmin(kind: AdminKind, ref: string, subject: string, details: Record<string, unknown>): Promise<void> {
  log(kind === "draft_created" ? "info" : "error", "notify", `ADMIN: ${subject}`, { kind, ref, ...details });
  const { ADMIN_ALERT_EMAIL } = resendEnv();
  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    email: adminEmail(subject, ref, details),
    idempotencyKey: `admin/${kind}/${ref}`,
    tag: `admin_${kind}`,
  });
}
