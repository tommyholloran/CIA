/**
 * Customer-facing order reference derived from the Stripe Checkout Session id.
 * Same value on the success page, in emails, and (step 5) in Printful's
 * external_id, so support can find an order from what the customer quotes.
 */
export function orderRef(sessionId: string): string {
  return sessionId.replace(/^cs_(test|live)_/, "").slice(-10).toUpperCase();
}
