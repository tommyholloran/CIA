import { createHash } from "node:crypto";

/**
 * One short id per order, derived from the Stripe Checkout Session id:
 *  - shown to the customer as "#ABCD2345WXYZ"
 *  - used as Printful's `external_id` (max 32 chars, [A-Za-z0-9_-]) — the
 *    session id itself (~66 chars) does not fit
 * Deterministic, so every webhook retry computes the same key: that is what
 * makes Printful order creation idempotent without a database.
 *
 * 12 Crockford base32 chars = 60 bits. Collision odds stay negligible far past
 * any realistic order volume (birthday bound ~1 billion orders).
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function orderRef(sessionId: string): string {
  const digest = createHash("sha256").update(sessionId).digest();
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of digest) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < 12) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length === 12) break;
  }
  return out;
}

export const PRINTFUL_EXTERNAL_ID = /^[A-Za-z0-9_-]{1,32}$/;
