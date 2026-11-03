import type Stripe from "stripe";
import { brand } from "@/config/brand";
import {
  ALLOWED_COUNTRIES,
  COLLECT_PHONE,
  CURRENCY,
  PRODUCT_TAX_CODE,
  SHIPPING_OPTIONS,
  SHIPPING_TAX_CODE,
  deliveryEstimate,
} from "@/config/shipping";
import type { ValidatedLine } from "@/lib/cart/validate";

/**
 * How an order is linked across systems without a database:
 *
 *   session.metadata.cart            "1100x2,1104x1"  (sync variant id x qty)
 *   line_item price.product.metadata { variant_id, catalog_variant_id, product_id }
 *   shipping_rate.metadata           { option_id: "standard" | "expedited" }
 *
 * The Stripe webhook (step 5) rebuilds the Printful order from these.
 */

export const CART_METADATA_VERSION = "1";

export function encodeCartMetadata(lines: Pick<ValidatedLine, "variantId" | "quantity">[]): string {
  const value = lines.map((l) => `${l.variantId}x${l.quantity}`).join(",");
  // Stripe metadata values are limited to 500 characters.
  if (value.length > 500) throw new Error(`Cart metadata too long (${value.length} chars)`);
  return value;
}

export function decodeCartMetadata(value: string | undefined | null): { variantId: number; quantity: number }[] | null {
  if (!value) return null;
  const items: { variantId: number; quantity: number }[] = [];
  for (const part of value.split(",")) {
    const m = /^(\d{1,15})x(\d{1,3})$/.exec(part.trim());
    if (!m) return null;
    items.push({ variantId: Number(m[1]), quantity: Number(m[2]) });
  }
  return items.length ? items : null;
}

const variantLabel = (l: ValidatedLine) => [l.color, l.size].filter(Boolean).join(" / ");

export function buildCheckoutSessionParams(lines: ValidatedLine[], siteUrl: string): Stripe.Checkout.SessionCreateParams {
  if (lines.length === 0) throw new Error("Cannot create a checkout session for an empty cart");
  const cart = encodeCartMetadata(lines);

  return {
    mode: "payment",
    currency: CURRENCY,
    line_items: lines.map((l) => {
      const label = variantLabel(l);
      return {
        quantity: l.quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: l.priceCents,
          tax_behavior: "exclusive",
          product_data: {
            name: label ? `${l.name} — ${label}` : l.name,
            images: l.image ? [l.image] : undefined,
            tax_code: PRODUCT_TAX_CODE,
            metadata: {
              variant_id: String(l.variantId),
              catalog_variant_id: String(l.catalogVariantId),
              product_id: String(l.productId),
              ...(l.sku ? { sku: l.sku } : {}),
            },
          },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: [...ALLOWED_COUNTRIES] },
    shipping_options: SHIPPING_OPTIONS.map((o) => {
      const est = deliveryEstimate(o);
      return {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: o.label,
          fixed_amount: { amount: o.amount, currency: CURRENCY },
          tax_behavior: "exclusive",
          tax_code: SHIPPING_TAX_CODE,
          delivery_estimate: {
            minimum: { unit: "business_day", value: est.min },
            maximum: { unit: "business_day", value: est.max },
          },
          metadata: { option_id: o.id },
        },
      };
    }),
    automatic_tax: { enabled: true },
    phone_number_collection: { enabled: COLLECT_PHONE },
    billing_address_collection: "auto",
    metadata: { cart, cart_version: CART_METADATA_VERSION },
    payment_intent_data: {
      metadata: { cart, cart_version: CART_METADATA_VERSION },
      description: `${brand.name} order`,
    },
    success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/shop?checkout=canceled`,
  };
}
