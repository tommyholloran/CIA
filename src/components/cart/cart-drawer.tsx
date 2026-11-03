"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { MAX_QTY_PER_LINE } from "@/config/shipping";
import { formatUsd } from "@/lib/money";
import { useCart } from "./cart-provider";

export function CartDrawer() {
  const { cart, count, subtotalCents, isOpen, close, setQty, remove, notices, dismissNotices, validation, checkout, checkingOut } =
    useCart();
  const ref = useRef<HTMLDialogElement>(null);

  // Native modal <dialog>: focus trap, Esc, inert background, focus return.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  const empty = cart.lines.length === 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      onClose={() => {
        close();
        dismissNotices();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(); // backdrop click
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md bg-background p-0 text-foreground shadow-2xl transition-transform duration-300 ease-out backdrop:bg-black/50 starting:open:translate-x-full"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="cart-title" className="text-lg font-bold">
            Your cart {count > 0 && <span className="font-normal text-muted-foreground">({count})</span>}
          </h2>
          <button type="button" onClick={close} className="-m-2 p-2" aria-label="Close cart">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div aria-live="polite">
          {notices.length > 0 && (
            <ul className="space-y-1 border-b border-border bg-muted px-5 py-3 text-sm">
              {notices.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          {validation === "error" && (
            <p className="border-b border-border bg-muted px-5 py-3 text-sm">
              We couldn&apos;t confirm current prices. Prices are re-checked at checkout.
            </p>
          )}
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link href="/shop" onClick={close} className="rounded-full bg-brand-primary px-6 py-3 font-semibold text-brand-primary-foreground">
              Shop all tees
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
            {cart.lines.map((l) => {
              const label = [l.color, l.size].filter(Boolean).join(" / ");
              return (
                <li key={l.variantId} className="flex gap-4 py-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {l.image && <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <Link href={`/shop/${l.slug}`} onClick={close} className="font-semibold hover:underline">
                        {l.name}
                      </Link>
                      <span className="shrink-0 font-semibold">{formatUsd(l.priceCents * l.quantity)}</span>
                    </div>
                    {label && <p className="text-sm text-muted-foreground">{label}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-border" role="group" aria-label={`Quantity for ${l.name} ${label}`}>
                        <button
                          type="button"
                          onClick={() => setQty(l.variantId, l.quantity - 1)}
                          className="h-9 w-9 rounded-full text-lg"
                          aria-label={l.quantity === 1 ? `Remove ${l.name} ${label}` : "Decrease quantity"}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(l.variantId, l.quantity + 1)}
                          disabled={l.quantity >= MAX_QTY_PER_LINE}
                          className="h-9 w-9 rounded-full text-lg disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button type="button" onClick={() => remove(l.variantId)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                        Remove<span className="sr-only"> {l.name} {label}</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!empty && (
          <footer className="border-t border-border px-5 py-5">
            <div className="flex justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span>{formatUsd(subtotalCents)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Shipping and taxes calculated at checkout.</p>
            <button
              type="button"
              onClick={() => void checkout()}
              disabled={checkingOut || validation === "checking"}
              aria-busy={checkingOut}
              className="mt-4 w-full rounded-full bg-brand-primary px-6 py-4 font-semibold text-brand-primary-foreground disabled:opacity-60"
            >
              {checkingOut ? "Redirecting to secure checkout…" : validation === "checking" ? "Checking prices…" : "Checkout"}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Secure payment by Stripe. US shipping only.</p>
          </footer>
        )}
      </div>
    </dialog>
  );
}
