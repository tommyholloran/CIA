import type Stripe from "stripe";

/** Minimal Stripe objects for tests. Only the fields the code reads are filled in. */

export function lineItem(variantId: number | null, quantity: number, unitCents: number, description = "Crazy Ivan Logo Tee — Black / M"): Stripe.LineItem {
  return {
    id: `li_${variantId}`,
    object: "item",
    description,
    quantity,
    amount_subtotal: unitCents * quantity,
    amount_total: unitCents * quantity,
    price: {
      unit_amount: unitCents,
      product: { id: `prod_${variantId}`, object: "product", metadata: variantId === null ? {} : { variant_id: String(variantId) } },
    },
  } as unknown as Stripe.LineItem;
}

export function shippingRate(optionId: string | undefined = "standard"): Stripe.ShippingRate {
  return { id: "shr_1", object: "shipping_rate", display_name: "Standard shipping", metadata: optionId ? { option_id: optionId } : {} } as unknown as Stripe.ShippingRate;
}

export function paidSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_a1fixture000000000000000000000000000000000000000000000000",
    object: "checkout.session",
    livemode: false,
    status: "complete",
    payment_status: "paid",
    currency: "usd",
    amount_subtotal: 8700,
    amount_total: 9849,
    total_details: { amount_discount: 0, amount_shipping: 599, amount_tax: 550 },
    metadata: { cart: "1100x2,1104x1", cart_version: "1" },
    customer_details: { email: "buyer@example.com", name: "Ivan Petrov", phone: "+15205550100" },
    collected_information: {
      shipping_details: {
        name: "Ivan Petrov",
        address: { line1: "1 Main St", line2: "Apt 2", city: "Tucson", state: "az", postal_code: "85701", country: "US" },
      },
    },
    payment_intent: "pi_123",
    shipping_cost: { shipping_rate: shippingRate() },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

export const defaultLineItems = () => [lineItem(1100, 2, 2800), lineItem(1104, 1, 3100, "Crazy Ivan Logo Tee — Black / 2XL")];
