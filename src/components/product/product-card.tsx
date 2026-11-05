import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatUsd } from "@/lib/money";

export function priceLabel(p: Pick<Product, "minPriceCents" | "maxPriceCents">) {
  return p.minPriceCents === p.maxPriceCents ? formatUsd(p.minPriceCents) : `From ${formatUsd(p.minPriceCents)}`;
}

export function ProductCard({ product, priority = false, headingLevel = 3 }: { product: Product; priority?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const image = product.images[0]?.url ?? product.thumbnail;
  // Second image (usually another colour) is revealed on hover, on devices that hover.
  const alt = product.images[1]?.url;
  const dots = product.colors.slice(0, 5);
  return (
    <Link href={`/shop/${product.slug}`} className="group block" prefetch>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.images[0]?.alt ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : null}
        {alt ? (
          <Image
            src={alt}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : null}
        {!product.available && (
          <span className="absolute left-2 top-2 rounded bg-foreground px-2 py-1 text-xs font-semibold text-background">
            Sold out
          </span>
        )}
      </div>
      <Heading className="mt-3 text-sm font-semibold underline-offset-4 group-hover:underline">{product.name}</Heading>
      <p className="mt-1 text-sm text-muted-foreground">{priceLabel(product)}</p>
      {product.colors.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="sr-only">{product.colors.length} colors</span>
          {dots.map((c) => (
            <span
              key={c.name}
              aria-hidden="true"
              title={c.name}
              className="h-3.5 w-3.5 rounded-full border border-border"
              style={{ backgroundColor: c.hex ?? "transparent" }}
            />
          ))}
          {product.colors.length > dots.length && (
            <span aria-hidden="true" className="text-xs text-muted-foreground">
              +{product.colors.length - dots.length}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

/** headingLevel: 2 when the grid sits directly under the page h1 (Shop), 3 under a section h2 (Home). */
export function ProductGrid({ products, priorityCount = 0, headingLevel = 3 }: { products: Product[]; priorityCount?: number; headingLevel?: 2 | 3 }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

export function EmptyCatalog() {
  return (
    <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      No products yet — check back soon.
    </p>
  );
}
