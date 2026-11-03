import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { getFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { BrandStar } from "@/components/site-header";

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  const heroImage = featured[0]?.images[0];

  return (
    <>
      <section className="on-dark bg-brand-accent text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:pb-24 sm:pt-16 md:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">{brand.tagline}</h1>
            <p className="mt-5 max-w-md text-lg text-white/80">{brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link href="/shop" className="rounded-full bg-white px-7 py-3.5 font-bold text-brand-accent hover:bg-white/90">
                Shop all tees
              </Link>
              <Link href="/about" className="font-semibold underline-offset-4 hover:underline">
                Our story →
              </Link>
            </div>
          </div>
          {heroImage && (
            <Link
              href={`/shop/${featured[0].slug}`}
              className="relative hidden aspect-square overflow-hidden rounded-2xl bg-white/10 md:block"
              aria-label={`Shop ${featured[0].name}`}
            >
              <Image src={heroImage.url} alt={heroImage.alt} fill priority sizes="(min-width: 1152px) 560px, 50vw" className="object-cover" />
            </Link>
          )}
        </div>
        <div className="h-1.5 bg-brand-primary" aria-hidden="true" />
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured">
          <div className="flex items-baseline justify-between">
            <h2 id="featured" className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Featured
            </h2>
            <Link href="/shop" className="text-sm font-semibold underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="mt-8">
            <ProductGrid products={featured} priorityCount={featured.length} />
          </div>
        </section>
      )}

      <section className="bg-muted" aria-labelledby="story">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <BrandStar className="mx-auto h-6 w-6 text-brand-primary" />
          <h2 id="story" className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Our story
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{brand.story}</p>
          <ul className="mt-10 grid gap-6 text-sm sm:grid-cols-3">
            <li>
              <p className="font-bold">Printed to order</p>
              <p className="mt-1 text-muted-foreground">No warehouse, no waste.</p>
            </li>
            <li>
              <p className="font-bold">Ships across the US</p>
              <p className="mt-1 text-muted-foreground">Tracking emailed when it ships.</p>
            </li>
            <li>
              <p className="font-bold">Secure checkout</p>
              <p className="mt-1 text-muted-foreground">Payments by Stripe.</p>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
