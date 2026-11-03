import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { EmptyCatalog, ProductGrid } from "@/components/product/product-card";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every tee in the collection.",
};

export default async function ShopPage() {
  const products = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-2xl uppercase leading-tight sm:text-3xl">Shop</h1>
      <div className="mt-8">
        {products.length ? <ProductGrid products={products} priorityCount={4} headingLevel={2} /> : <EmptyCatalog />}
      </div>
    </div>
  );
}
