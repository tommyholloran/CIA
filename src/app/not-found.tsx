import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">Page not found</h1>
      <p className="mt-3 text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
      <Link href="/shop" className="mt-6 inline-block underline">
        Browse the shop
      </Link>
    </div>
  );
}
