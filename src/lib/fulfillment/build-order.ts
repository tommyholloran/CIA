import type Stripe from "stripe";
import { ALLOWED_COUNTRIES, SHIPPING_OPTIONS } from "@/config/shipping";
import { decodeCartMetadata } from "@/lib/checkout/session";
import { orderRef, PRINTFUL_EXTERNAL_ID } from "@/lib/checkout/order-ref";
import type { PrintfulOrderRequest } from "@/lib/printful/orders";

/**
 * Map a paid Stripe Checkout Session to a Printful order. Pure — no I/O.
 *
 * Items come from Stripe's line items (what the customer actually paid for),
 * each carrying `variant_id` in its product metadata, and are cross-checked
 * against `metadata.cart` written at session creation.
 */

export type BuildResult =
  | { ok: true; order: PrintfulOrderRequest; ref: string; shippingOptionId: string }
  | { ok: false; ref: string; reason: string };

const dollars = (cents: number | null | undefined) => ((cents ?? 0) / 100).toFixed(2);

function productMetadata(li: Stripe.LineItem): Record<string, string> {
  const product = li.price?.product;
  return product && typeof product === "object" && !("deleted" in product && product.deleted)
    ? ((product as Stripe.Product).metadata ?? {})
    : {};
}

export function buildPrintfulOrder(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
  shippingRate: Stripe.ShippingRate | null,
): BuildResult {
  const ref = orderRef(session.id);
  const fail = (reason: string): BuildResult => ({ ok: false, ref, reason });

  if (!PRINTFUL_EXTERNAL_ID.test(ref)) return fail(`order ref "${ref}" is not a valid Printful external_id`);

  // Shipping method the customer paid for
  const optionId = shippingRate?.metadata?.option_id;
  const option = SHIPPING_OPTIONS.find((o) => o.id === optionId);
  if (!option) return fail(`unknown shipping option "${optionId ?? "(none)"}" on session`);

  // Recipient
  const ship = session.collected_information?.shipping_details;
  const addr = ship?.address;
  if (!ship || !addr) return fail("session has no shipping address");
  const country = (addr.country ?? "").toUpperCase();
  if (!(ALLOWED_COUNTRIES as readonly string[]).includes(country)) return fail(`shipping country ${country} not allowed`);
  if (!addr.line1 || !addr.city || !addr.postal_code || !addr.state) {
    return fail("shipping address is incomplete (line1/city/state/postal_code)");
  }
  const email = session.customer_details?.email ?? undefined;
  const phone = session.customer_details?.phone ?? undefined;

  // Items
  const items: PrintfulOrderRequest["items"] = [];
  for (const li of lineItems) {
    const variantId = Number(productMetadata(li).variant_id);
    if (!Number.isInteger(variantId) || variantId <= 0) return fail(`line item ${li.id} has no variant_id metadata`);
    if (!li.quantity || li.quantity <= 0) return fail(`line item ${li.id} has no quantity`);
    const unit = li.price?.unit_amount;
    if (unit == null) return fail(`line item ${li.id} has no unit amount`);
    items.push({
      sync_variant_id: variantId,
      quantity: li.quantity,
      retail_price: dollars(unit),
      name: li.description ?? undefined,
    });
  }
  if (items.length === 0) return fail("session has no line items");

  // Cross-check against the cart recorded at session creation
  const recorded = decodeCartMetadata(session.metadata?.cart);
  if (!recorded) return fail("session metadata.cart missing or malformed");
  const key = (xs: { id: number; q: number }[]) =>
    xs.map((x) => `${x.id}x${x.q}`).sort().join(",");
  const paid = key(items.map((i) => ({ id: i.sync_variant_id, q: i.quantity })));
  const cart = key(recorded.map((r) => ({ id: r.variantId, q: r.quantity })));
  if (paid !== cart) return fail(`line items (${paid}) don't match metadata.cart (${cart})`);

  const totals = session.total_details;
  return {
    ok: true,
    ref,
    shippingOptionId: option.id,
    order: {
      external_id: ref,
      shipping: option.printfulShipping,
      recipient: {
        name: ship.name || session.customer_details?.name || "Customer",
        address1: addr.line1,
        ...(addr.line2 ? { address2: addr.line2 } : {}),
        city: addr.city,
        state_code: addr.state.toUpperCase(),
        country_code: country,
        zip: addr.postal_code,
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      },
      items,
      retail_costs: {
        currency: (session.currency ?? "usd").toUpperCase(),
        discount: dollars(totals?.amount_discount),
        shipping: dollars(totals?.amount_shipping),
        tax: dollars(totals?.amount_tax),
      },
    },
  };
}
