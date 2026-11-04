import Image from "next/image";
import Link from "next/link";
import { getFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Wordmark } from "@/components/wordmark";

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  const heroImage = featured[0]?.images[0];

  return (
    <>
      <section className="on-dark overflow-hidden bg-brand-accent text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:pb-24 sm:pt-16 md:grid-cols-2">
          <div className="relative">
            {/* Decorative line art behind the wordmark. Faded so the letters stay readable. */}
            <Image
              src="/hero-player.png"
              alt=""
              aria-hidden="true"
              width={520}
              height={941}
              priority
              sizes="(min-width: 768px) 320px, 60vw"
              className="pointer-events-none absolute -top-10 left-[38%] h-[130%] w-auto max-w-none select-none opacity-25 sm:left-[42%]"
            />
            <h1 className="relative">
              <Wordmark stacked className="text-[clamp(4.5rem,24vw,8.5rem)] leading-[0.95]" />
            </h1>
            <Link
              href="/shop"
              className="relative mt-10 inline-block rounded-full bg-white px-7 py-3.5 font-bold text-brand-accent hover:bg-white/90"
            >
              Shop all tees
            </Link>
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
            <h2 id="featured" className="font-display text-4xl uppercase leading-none sm:text-5xl">
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
    </>
  );
}
