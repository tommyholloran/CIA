import Link from "next/link";
import { getFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Wordmark } from "@/components/wordmark";
import { Marquee } from "@/components/marquee";
import { CourtBackdrop } from "@/components/court-backdrop";
import { HeroPlayer } from "@/components/hero-player";

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <>
      {/* Poster (flat colours, no gradients): top-down court as the background, centered wordmark + Ivan lockup. */}
      <section className="on-dark relative isolate overflow-hidden bg-brand-accent text-white">
        {/* the court, seen from above, is the background */}
        <CourtBackdrop className="absolute inset-0 -z-10" />
        <div className="relative mx-auto flex min-h-[500px] max-w-6xl items-center justify-center px-4 py-10 md:min-h-[520px]">
          {/* Centered lockup: wordmark + button, with Ivan standing right beside them (desktop).
              On phones Ivan sits faded behind the centered text. Screams and flexes once on load. */}
          <div className="flex items-stretch md:relative">
            <div className="relative z-10 flex flex-col items-center self-center text-center md:items-start md:text-left">
              <h1>
                <Wordmark stacked className="text-[clamp(4.5rem,24vw,6.5rem)] leading-[0.95] [text-shadow:0.045em_0.045em_0_var(--color-brand-primary)]" />
              </h1>
              <Link href="/shop" className="btn-press mt-8 rounded-full bg-white px-7 py-3.5 font-bold text-brand-accent">
                Shop all tees
              </Link>
            </div>
            <HeroPlayer className="absolute bottom-0 left-1/2 -z-10 aspect-[520/941] h-[92%] -translate-x-1/2 opacity-35 md:static md:-mb-10 md:-ml-6 md:h-[490px] md:translate-x-0 md:self-end md:opacity-100" />
          </div>
        </div>
      </section>
      <Marquee />

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10" aria-labelledby="featured">
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
