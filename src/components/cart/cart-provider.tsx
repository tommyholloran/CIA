"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { addLine, emptyCart, itemCount, setQuantity, subtotalCents, type Cart, type CartLine } from "@/lib/cart/cart";
import type { CartIssue, ValidatedCart } from "@/lib/cart/validate";
import { cartStore } from "./cart-store";

type ValidationState = "idle" | "checking" | "ok" | "error";

interface CartContextValue {
  cart: Cart;
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQty: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  /** Messages to show in the drawer (price changes, removed items, limits). */
  notices: string[];
  dismissNotices: () => void;
  validation: ValidationState;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

const describe = (l: Pick<CartLine, "name" | "color" | "size">) =>
  [l.name, [l.color, l.size].filter(Boolean).join(" / ")].filter(Boolean).join(" — ");

function issueMessages(issues: CartIssue[], before: Cart): string[] {
  const nameOf = (id: number) => {
    const l = before.lines.find((x) => x.variantId === id);
    return l ? describe(l) : "An item";
  };
  return issues.map((i) => {
    switch (i.type) {
      case "removed":
        return i.reason === "unavailable"
          ? `${nameOf(i.variantId)} is sold out and was removed from your cart.`
          : `${nameOf(i.variantId)} is no longer available and was removed from your cart.`;
      case "quantity_reduced":
        return `${nameOf(i.variantId)}: quantity reduced to ${i.to} (maximum per item).`;
      case "too_many_lines":
        return `${i.dropped.length} item(s) were removed because your cart has too many different items.`;
    }
  });
}

/** Replace snapshots with server values; report price changes. */
function applyValidation(before: Cart, result: ValidatedCart): { cart: Cart; notices: string[] } {
  const notices = issueMessages(result.issues, before);
  const lines: CartLine[] = result.lines.map((v) => {
    const old = before.lines.find((l) => l.variantId === v.variantId);
    if (old && old.priceCents !== v.priceCents) {
      const dir = v.priceCents > old.priceCents ? "increased" : "dropped";
      notices.push(`The price of ${describe(v)} ${dir} to $${(v.priceCents / 100).toFixed(2)}.`);
    }
    return {
      variantId: v.variantId,
      quantity: v.quantity,
      productId: v.productId,
      name: v.name,
      slug: v.slug,
      color: v.color,
      size: v.size,
      image: v.image,
      priceCents: v.priceCents,
    };
  });
  return { cart: { version: 1, lines }, notices };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const [isOpen, setOpen] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationState>("idle");
  const requestId = useRef(0);

  const validate = useCallback(async () => {
    const snapshot = cartStore.getSnapshot();
    if (snapshot.lines.length === 0) {
      setValidation("ok");
      return;
    }
    const id = ++requestId.current;
    setValidation("checking");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: snapshot.lines.map(({ variantId, quantity }) => ({ variantId, quantity })) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = (await res.json()) as ValidatedCart;
      if (id !== requestId.current) return; // a newer validation superseded this one
      // Apply against the latest cart so quantity edits made meanwhile survive.
      const latest = cartStore.getSnapshot();
      const { cart: next, notices: msgs } = applyValidation(latest, result);
      cartStore.set(next);
      if (msgs.length) setNotices((n) => [...n, ...msgs]);
      setValidation("ok");
    } catch (err) {
      console.warn("[cart] validation failed", err);
      if (id === requestId.current) setValidation("error");
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: itemCount(cart),
      subtotalCents: subtotalCents(cart),
      isOpen,
      open: () => {
        setOpen(true);
        void validate();
      },
      close: () => setOpen(false),
      add: (line, quantity = 1) => {
        const result = addLine(cartStore.getSnapshot(), line, quantity);
        if (result.ok) cartStore.set(result.cart);
        else setNotices((n) => [...n, result.reason]);
        setOpen(true);
        void validate();
      },
      setQty: (variantId, quantity) => cartStore.set(setQuantity(cartStore.getSnapshot(), variantId, quantity)),
      remove: (variantId) => cartStore.set(setQuantity(cartStore.getSnapshot(), variantId, 0)),
      clear: () => cartStore.set(emptyCart()),
      notices,
      dismissNotices: () => setNotices([]),
      validation,
    }),
    [cart, isOpen, notices, validation, validate],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
