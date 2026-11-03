import Link from "next/link";
import { brand } from "@/config/brand";
import { getFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  return (
    <>
      <section className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">{brand.tagline}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{brand.description}</p>
          <Link
            href="/shop"
            className="mt-8 inline-block rounded-full bg-brand-primary px-6 py-3 font-medium text-brand-primary-foreground"
          >
            Shop all tees
          </Link>
        </div>
      </section>
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured">
          <div className="flex items-baseline justify-between">
            <h2 id="featured" className="font-display text-2xl font-bold">
              Featured
            </h2>
            <Link href="/shop" className="text-sm underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="mt-8">
            <ProductGrid products={featured} />
          </div>
        </section>
      )}
      <section className="mx-auto max-w-2xl px-4 py-16 text-center" aria-labelledby="story">
        <h2 id="story" className="font-display text-2xl font-bold">
          Our story
        </h2>
        <p className="mt-4 text-muted-foreground">{brand.story}</p>
      </section>
    </>
  );
}
