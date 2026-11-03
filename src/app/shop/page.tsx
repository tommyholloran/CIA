import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Shop</h1>
      <p className="mt-2 text-muted-foreground">Product grid arrives in the catalog step.</p>
    </div>
  );
}
