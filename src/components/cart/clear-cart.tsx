"use client";

import { useEffect, useRef } from "react";
import { useCart } from "./cart-provider";

/** Rendered only for a completed Stripe session. Clears the cart once. */
export function ClearCartOnMount() {
  const { clear } = useCart();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    clear();
  }, [clear]);
  return null;
}
