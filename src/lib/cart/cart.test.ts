import { describe, expect, it } from "vitest";
import { MAX_LINES_PER_ORDER, MAX_QTY_PER_LINE } from "@/config/shipping";
import { addLine, emptyCart, itemCount, parseCart, setQuantity, subtotalCents, type CartLine } from "./cart";

const snap = (variantId: number, priceCents = 2800): Omit<CartLine, "quantity"> => ({
  variantId,
  productId: 1,
  name: "Tee",
  slug: "tee-1",
  color: "Black",
  size: "M",
  image: null,
  priceCents,
});

describe("addLine", () => {
  it("adds a new line and merges repeats", () => {
    let r = addLine(emptyCart(), snap(1));
    r = addLine(r.cart, snap(1), 2);
    expect(r.ok).toBe(true);
    expect(r.cart.lines).toHaveLength(1);
    expect(r.cart.lines[0].quantity).toBe(3);
  });

  it("caps quantity per line", () => {
    const r = addLine(emptyCart(), snap(1), MAX_QTY_PER_LINE + 5);
    expect(r.cart.lines[0].quantity).toBe(MAX_QTY_PER_LINE);
    const again = addLine(r.cart, snap(1));
    expect(again.ok).toBe(false);
  });

  it("refuses more than the max number of lines", () => {
    let cart = emptyCart();
    for (let i = 1; i <= MAX_LINES_PER_ORDER; i++) cart = addLine(cart, snap(i)).cart;
    const r = addLine(cart, snap(9999));
    expect(r.ok).toBe(false);
    expect(r.cart.lines).toHaveLength(MAX_LINES_PER_ORDER);
  });
});

describe("setQuantity", () => {
  it("updates, clamps, and removes at zero", () => {
    let cart = addLine(emptyCart(), snap(1)).cart;
    cart = setQuantity(cart, 1, 4);
    expect(cart.lines[0].quantity).toBe(4);
    cart = setQuantity(cart, 1, 999);
    expect(cart.lines[0].quantity).toBe(MAX_QTY_PER_LINE);
    cart = setQuantity(cart, 1, 0);
    expect(cart.lines).toHaveLength(0);
  });
});

describe("totals", () => {
  it("counts items and subtotal", () => {
    let cart = addLine(emptyCart(), snap(1, 2800), 2).cart;
    cart = addLine(cart, snap(2, 3100)).cart;
    expect(itemCount(cart)).toBe(3);
    expect(subtotalCents(cart)).toBe(8700);
  });
});

describe("parseCart", () => {
  it("returns empty for missing, corrupt or wrong-version data", () => {
    expect(parseCart(null).lines).toEqual([]);
    expect(parseCart("{not json").lines).toEqual([]);
    expect(parseCart(JSON.stringify({ version: 2, lines: [] })).lines).toEqual([]);
  });

  it("drops malformed lines, merges duplicates, clamps quantities", () => {
    const raw = JSON.stringify({
      version: 1,
      lines: [
        { ...snap(1), quantity: 2 },
        { ...snap(1), quantity: 3 },
        { ...snap(2), quantity: -1 },
        { ...snap(3), quantity: 1.5 },
        { variantId: "4", quantity: 1 },
        { ...snap(5), quantity: 500 },
      ],
    });
    const cart = parseCart(raw);
    expect(cart.lines.map((l) => [l.variantId, l.quantity])).toEqual([
      [1, 5],
      [5, MAX_QTY_PER_LINE],
    ]);
  });
});
