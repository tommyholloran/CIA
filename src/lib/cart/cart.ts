import { MAX_LINES_PER_ORDER, MAX_QTY_PER_LINE } from "@/config/shipping";

/**
 * Client cart model. Persisted to localStorage.
 *
 * Only `variantId` + `quantity` are ever sent to the server. The rest is a
 * display snapshot so the drawer renders instantly; it is overwritten by the
 * server's authoritative values whenever the cart is validated.
 */
export interface CartLine {
  variantId: number;
  quantity: number;
  // display snapshot
  productId: number;
  name: string;
  slug: string;
  color: string | null;
  size: string | null;
  image: string | null;
  priceCents: number;
}

export interface Cart {
  version: 1;
  lines: CartLine[];
}

export const CART_STORAGE_KEY = "cia-cart";
export const emptyCart = (): Cart => ({ version: 1, lines: [] });

const clampQty = (q: number) => Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(q)));

const isLine = (l: unknown): l is CartLine => {
  if (!l || typeof l !== "object") return false;
  const x = l as Record<string, unknown>;
  return (
    Number.isInteger(x.variantId) &&
    (x.variantId as number) > 0 &&
    Number.isInteger(x.quantity) &&
    (x.quantity as number) > 0 &&
    typeof x.name === "string" &&
    typeof x.slug === "string" &&
    Number.isInteger(x.priceCents)
  );
};

/** Parse whatever is in storage; anything malformed is dropped, never thrown. */
export function parseCart(raw: string | null): Cart {
  if (!raw) return emptyCart();
  try {
    const data = JSON.parse(raw) as Partial<Cart>;
    if (data?.version !== 1 || !Array.isArray(data.lines)) return emptyCart();
    const lines: CartLine[] = [];
    for (const l of data.lines.filter(isLine)) {
      const existing = lines.find((x) => x.variantId === l.variantId);
      if (existing) existing.quantity = clampQty(existing.quantity + l.quantity);
      else lines.push({ ...l, quantity: clampQty(l.quantity) });
    }
    return { version: 1, lines: lines.slice(0, MAX_LINES_PER_ORDER) };
  } catch {
    return emptyCart();
  }
}

export type AddResult = { cart: Cart; ok: true } | { cart: Cart; ok: false; reason: string };

export function addLine(cart: Cart, line: Omit<CartLine, "quantity">, quantity = 1): AddResult {
  const existing = cart.lines.find((l) => l.variantId === line.variantId);
  if (existing) {
    if (existing.quantity >= MAX_QTY_PER_LINE) {
      return { cart, ok: false, reason: `You can order up to ${MAX_QTY_PER_LINE} of each item.` };
    }
    return {
      ok: true,
      cart: {
        ...cart,
        lines: cart.lines.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, quantity: clampQty(l.quantity + quantity) } : l,
        ),
      },
    };
  }
  if (cart.lines.length >= MAX_LINES_PER_ORDER) {
    return { cart, ok: false, reason: `Your cart can hold up to ${MAX_LINES_PER_ORDER} different items.` };
  }
  const q = clampQty(quantity);
  if (q === 0) return { cart, ok: false, reason: "Invalid quantity." };
  return { ok: true, cart: { ...cart, lines: [...cart.lines, { ...line, quantity: q }] } };
}

export function setQuantity(cart: Cart, variantId: number, quantity: number): Cart {
  const q = clampQty(quantity);
  return {
    ...cart,
    lines:
      q === 0
        ? cart.lines.filter((l) => l.variantId !== variantId)
        : cart.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
  };
}

export const removeLine = (cart: Cart, variantId: number) => setQuantity(cart, variantId, 0);

export const itemCount = (cart: Cart) => cart.lines.reduce((n, l) => n + l.quantity, 0);
export const subtotalCents = (cart: Cart) => cart.lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
