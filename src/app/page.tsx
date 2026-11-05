import Image from "next/image";
import Link from "next/link";
import { getFeaturedProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { Wordmark } from "@/components/wordmark";
import { Marquee } from "@/components/marquee";
import { CourtBackdrop } from "@/components/court-backdrop";

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <>
      {/* Arena poster: spotlight glow, court floor in perspective, player standing on it, wordmark over. */}
      <section className="on-dark relative isolate overflow-hidden bg-brand-accent text-white">
        {/* shade 2 of the two blues: a soft spotlight over the court */}
        <div
          className="pointer-events-none absolute inset-0 -z-20"
          aria-hidden="true"
          style={{ background: "radial-gradient(ellipse 55% 60% at 68% 42%, #1c4282 0%, rgba(28,66,130,0.35) 40%, transparent 72%)" }}
        />
        {/* court floor, anchored to the bottom so the player stands on it */}
        <CourtBackdrop className="absolute -bottom-[38%] left-[62%] -z-10 h-[150%] w-[260%] -translate-x-1/2 md:left-[64%] md:h-[175%] md:w-[175%]" />
        {/* player: the star on desktop; behind the wordmark on phones */}
        <Image
          src="/hero-player.png"
          alt=""
          aria-hidden="true"
          width={520}
          height={941}
          priority
          sizes="(min-width: 768px) 420px, 70vw"
          className="pointer-events-none absolute bottom-0 right-[-14%] -z-10 h-[92%] w-auto max-w-none select-none opacity-35 drop-shadow-[6px_6px_0_var(--color-brand-primary)] sm:right-[-4%] md:right-[8%] md:h-[96%] md:opacity-90 lg:right-[12%]"
        />
        <div className="mx-auto flex min-h-[560px] max-w-6xl flex-col justify-center px-4 py-14 sm:min-h-[620px] md:min-h-[680px]">
          <h1>
            <Wordmark stacked className="text-[clamp(4.5rem,24vw,8.5rem)] leading-[0.95] [text-shadow:0.045em_0.045em_0_var(--color-brand-primary)]" />
          </h1>
          <p style={{ animationDelay: "480ms" }} className="slam-in mt-6 font-display text-3xl uppercase tracking-[0.12em] [text-shadow:2px_2px_0_var(--color-brand-primary)] sm:text-4xl">
            Join the army
          </p>
          <Link href="/shop" className="btn-press mt-8 self-start rounded-full bg-white px-7 py-3.5 font-bold text-brand-accent">
            Shop all tees
          </Link>
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
