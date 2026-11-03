import Stripe from "stripe";
import { getCatalog } from "@/lib/catalog";
import { cartRequestSchema, validateCart } from "@/lib/cart/validate";
import { buildCheckoutSessionParams } from "@/lib/checkout/session";
import { siteUrl } from "@/lib/site";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/checkout  { items: [{ variantId, quantity }] }
 *
 * 200 { url }                    → redirect the browser to Stripe Checkout
 * 409 { cart }                   → cart changed (item removed / qty capped): update and confirm
 * 400 / 503 / 502 { error }
 *
 * Prices come only from the server-side catalog; the client sends ids + quantities.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = cartRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid cart" }, { status: 400 });

  let catalog;
  try {
    catalog = await getCatalog();
  } catch (err) {
    console.error("[checkout] catalog unavailable:", err);
    return Response.json({ error: "Our store is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }

  const cart = validateCart(parsed.data.items, catalog);
  if (cart.issues.length > 0 || cart.lines.length === 0) {
    // Don't silently charge for something different from what the customer saw.
    return Response.json({ error: "Your cart changed", cart }, { status: 409 });
  }

  try {
    const session = await stripe().checkout.sessions.create(buildCheckoutSessionParams(cart.lines, siteUrl()));
    if (!session.url) throw new Error("Stripe returned a session without a URL");
    console.info(`[checkout] session ${session.id} created: ${cart.lines.length} lines, subtotal ${cart.subtotalCents}`);
    return Response.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error(`[checkout] Stripe ${err.type} (${err.code ?? "no code"}): ${err.message}`, { requestId: err.requestId });
    } else {
      console.error("[checkout] failed to create session:", err);
    }
    return Response.json({ error: "We couldn't start checkout. Please try again." }, { status: 502 });
  }
}
