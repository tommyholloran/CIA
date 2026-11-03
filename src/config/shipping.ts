/**
 * Checkout shipping configuration. All amounts in cents (USD).
 *
 * `printfulShipping` is the Printful shipping method used to fulfil the order.
 * Printful bills you its own rate for that method — the flat rate charged here
 * is what the customer pays. Check margins on multi-item orders.
 */
export const CURRENCY = "usd";

export const ALLOWED_COUNTRIES = ["US"] as const;

export const SHIPPING_OPTIONS = [
  {
    id: "standard",
    label: "Standard shipping",
    amount: 599,
    printfulShipping: "STANDARD",
    deliveryEstimate: { minBusinessDays: 5, maxBusinessDays: 10 },
  },
  {
    id: "expedited",
    label: "Expedited shipping",
    amount: 1499,
    printfulShipping: "EXPRESS",
    deliveryEstimate: { minBusinessDays: 2, maxBusinessDays: 5 },
  },
] as const;

export type ShippingOptionId = (typeof SHIPPING_OPTIONS)[number]["id"];

/** Hard limits enforced server-side at checkout. */
export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES_PER_ORDER = 25;
