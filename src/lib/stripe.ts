import "server-only";
import Stripe from "stripe";
import { stripeSecretKey } from "@/lib/env";

let client: Stripe | null = null;

/** Local testing only (e.g. stripe-mock): STRIPE_API_BASE_URL=http://localhost:12111 */
function hostOverride(): Partial<Stripe.StripeConfig> {
  const raw = process.env.STRIPE_API_BASE_URL?.trim();
  if (!raw) return {};
  const u = new URL(raw);
  return { host: u.hostname, port: Number(u.port || (u.protocol === "https:" ? 443 : 80)), protocol: u.protocol.replace(":", "") as "http" | "https" };
}

/** Lazily constructed so pages that never touch Stripe don't need the key. */
export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey(), {
      // API version is pinned by the installed SDK (stripe@23 → 2026-10-28.endive).
      maxNetworkRetries: 2,
      timeout: 20_000,
      appInfo: { name: "cia-store" },
      ...hostOverride(),
    });
  }
  return client;
}

/** Stripe Checkout Session ids: cs_test_… / cs_live_… */
export const isCheckoutSessionId = (id: unknown): id is string =>
  typeof id === "string" && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id);
