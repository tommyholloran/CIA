import "server-only";
import type { AdminNoticeKind, OrderEmailData } from "@/lib/fulfillment/fulfill";
import { log } from "@/lib/log";

/**
 * Email notifications. STEP 5 PLACEHOLDER: logs only.
 * Step 6 replaces these bodies with Resend sends, using idempotency keys
 * `order-confirmation/{ref}` and `admin/{kind}/{ref}` so webhook retries
 * never send duplicates.
 */

export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  log("info", "notify", "order confirmation (not sent: email arrives in step 6)", {
    ref: data.ref,
    items: data.items.length,
    totalCents: data.totalCents,
  });
}

export async function notifyAdmin(
  kind: AdminNoticeKind,
  ref: string,
  subject: string,
  details: Record<string, unknown>,
): Promise<void> {
  log(kind === "draft_created" ? "info" : "error", "notify", `ADMIN: ${subject}`, { kind, ref, ...details });
}
