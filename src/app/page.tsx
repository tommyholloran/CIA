import Link from "next/link";
import { brand } from "@/config/brand";

export default function HomePage() {
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
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured">
        <h2 id="featured" className="font-display text-2xl font-bold">
          Featured
        </h2>
        <p className="mt-2 text-muted-foreground">Featured products load from Printful in the catalog step.</p>
      </section>
      <section className="mx-auto max-w-2xl px-4 pb-20 text-center" aria-labelledby="story">
        <h2 id="story" className="font-display text-2xl font-bold">
          Our story
        </h2>
        <p className="mt-4 text-muted-foreground">{brand.story}</p>
      </section>
    </>
  );
}
