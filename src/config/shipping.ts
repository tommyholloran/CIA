/**
 * Checkout shipping & tax configuration. All amounts in cents (USD).
 *
 * `printfulShipping` is the Printful shipping method used to fulfil the order.
 * Printful bills YOU its own rate for that method — `amount` is what the
 * customer pays. Check margins on multi-item orders.
 *
 * Delivery estimates shown at Stripe Checkout = production + transit.
 * PLACEHOLDER NUMBERS: confirm against Printful's current fulfilment and
 * shipping times for your products before launch.
 */
export const CURRENCY = "usd";

export const ALLOWED_COUNTRIES = ["US"] as const;

/** Business days Printful takes to print before the package ships. */
export const PRODUCTION_DAYS = { min: 2, max: 5 } as const;

export const SHIPPING_OPTIONS = [
  {
    id: "standard",
    label: "Standard shipping",
    amount: 599,
    printfulShipping: "STANDARD",
    transitBusinessDays: { min: 3, max: 7 },
  },
  {
    id: "expedited",
    label: "Expedited shipping",
    amount: 1499,
    printfulShipping: "EXPRESS",
    transitBusinessDays: { min: 1, max: 3 },
  },
] as const;

export type ShippingOption = (typeof SHIPPING_OPTIONS)[number];
export type ShippingOptionId = ShippingOption["id"];

export const deliveryEstimate = (o: ShippingOption) => ({
  min: PRODUCTION_DAYS.min + o.transitBusinessDays.min,
  max: PRODUCTION_DAYS.max + o.transitBusinessDays.max,
});

/** Hard limits enforced in the browser and again server-side at checkout. */
export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES_PER_ORDER = 25;

/**
 * Stripe Tax product tax code for the shirts. "txcd_30011000" is Stripe's
 * general clothing code. VERIFY in Stripe Dashboard → Tax → Product tax codes;
 * some states tax clothing differently and a more specific code may apply.
 * Shipping uses Stripe's shipping code (documented in the Stripe SDK).
 */
export const PRODUCT_TAX_CODE = "txcd_30011000";
export const SHIPPING_TAX_CODE = "txcd_92010001";

/** Ask for a phone number at checkout (carriers use it for delivery issues). */
export const COLLECT_PHONE = true;
