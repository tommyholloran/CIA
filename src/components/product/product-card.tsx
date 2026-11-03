import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatUsd } from "@/lib/money";

export function priceLabel(p: Pick<Product, "minPriceCents" | "maxPriceCents">) {
  return p.minPriceCents === p.maxPriceCents ? formatUsd(p.minPriceCents) : `From ${formatUsd(p.minPriceCents)}`;
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0]?.url ?? product.thumbnail;
  return (
    <Link href={`/shop/${product.slug}`} className="group block" prefetch>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.images[0]?.alt ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : null}
        {!product.available && (
          <span className="absolute left-2 top-2 rounded bg-foreground px-2 py-1 text-xs font-semibold text-background">
            Sold out
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold group-hover:underline underline-offset-4">{product.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{priceLabel(product)}</p>
      {product.colors.length > 1 && (
        <p className="mt-1 text-xs text-muted-foreground">{product.colors.length} colors</p>
      )}
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
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
