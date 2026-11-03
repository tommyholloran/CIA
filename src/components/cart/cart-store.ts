"use client";

import { CART_STORAGE_KEY, emptyCart, parseCart, type Cart } from "@/lib/cart/cart";

/**
 * localStorage-backed external store for useSyncExternalStore.
 * Keeps tabs in sync via the `storage` event. All storage access is wrapped:
 * private mode / blocked storage degrades to an in-memory cart.
 */

const SERVER_SNAPSHOT: Cart = emptyCart();
let current: Cart | null = null;
const listeners = new Set<() => void>();

function readStorage(): Cart {
  try {
    return parseCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return emptyCart();
  }
}

function writeStorage(cart: Cart) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage full or blocked: cart still works for this tab.
  }
}

function emit() {
  for (const l of listeners) l();
}

function onStorage(e: StorageEvent) {
  if (e.key !== CART_STORAGE_KEY && e.key !== null) return;
  current = readStorage();
  emit();
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): Cart {
    if (current === null) current = readStorage();
    return current;
  },
  getServerSnapshot(): Cart {
    return SERVER_SNAPSHOT;
  },
  set(next: Cart) {
    current = next;
    writeStorage(next);
    emit();
  },
};
