import Image from "next/image";
import Link from "next/link";
import { getFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Wordmark } from "@/components/wordmark";
import { Marquee } from "@/components/marquee";
import { CourtBackdrop } from "@/components/court-backdrop";

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  const heroImage = featured[0]?.images[0];

  return (
    <>
      <section className="on-dark relative isolate overflow-hidden bg-brand-accent text-white">
        {/* Angled court floor behind the wordmark and player (lowest layer). */}
        <CourtBackdrop className="absolute -left-[45%] top-[2%] -z-10 h-[105%] w-[190%] sm:-left-[20%] sm:w-[120%] md:-left-[12%] md:top-[6%] md:h-[95%] md:w-[85%]" />
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
              className="pointer-events-none absolute -top-10 left-[38%] h-[130%] w-auto max-w-none select-none opacity-30 drop-shadow-[7px_7px_0_var(--color-brand-primary)] sm:left-[42%]"
            />
            <h1 className="relative">
              <Wordmark stacked className="text-[clamp(4.5rem,24vw,8.5rem)] leading-[0.95] [text-shadow:0.045em_0.045em_0_var(--color-brand-primary)]" />
            </h1>
            <p style={{ animationDelay: "480ms" }} className="slam-in relative mt-6 font-display text-3xl uppercase tracking-[0.12em] [text-shadow:2px_2px_0_var(--color-brand-primary)] sm:text-4xl">
              Join the army
            </p>
            <Link
              href="/shop"
              className="btn-press relative mt-8 inline-block rounded-full bg-white px-7 py-3.5 font-bold text-brand-accent"
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
      </section>
      <Marquee />

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
