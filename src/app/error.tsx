"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page fails to render (e.g. Printful unreachable on a cache miss). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        We couldn&apos;t load this page. Your cart is safe — please try again in a moment.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand-primary px-6 py-3 font-semibold text-brand-primary-foreground"
        >
          Try again
        </button>
        <Link href="/" className="rounded-full border border-border px-6 py-3 font-semibold">
          Home
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted-foreground">Error reference: {error.digest}</p>}
    </div>
  );
}
