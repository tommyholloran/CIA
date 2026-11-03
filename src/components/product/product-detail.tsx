"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Product, Variant } from "@/lib/catalog/types";
import { formatUsd } from "@/lib/money";
import { useCart } from "@/components/cart/cart-provider";

function findVariant(p: Product, color: string | null, size: string | null): Variant | undefined {
  return p.variants.find((v) => (p.colors.length ? v.color === color : true) && (p.sizes.length ? v.size === size : true));
}

export function ProductDetail({ product }: { product: Product }) {
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [color, setColor] = useState<string | null>(firstAvailable.color);
  // Don't preselect a size: picking the wrong one by default causes returns.
  const [size, setSize] = useState<string | null>(product.sizes.length ? null : firstAvailable.size);
  const [imageIndex, setImageIndex] = useState(0);
  const { add } = useCart();

  const variant = findVariant(product, color, size);
  const needsSize = product.sizes.length > 0 && !size;

  // Show images for the selected color first.
  const images = useMemo(() => {
    const forColor = product.images.filter((i) => i.color === color);
    const rest = product.images.filter((i) => i.color !== color);
    return [...forColor, ...rest];
  }, [product.images, color]);
  const mainImage = images[Math.min(imageIndex, images.length - 1)];

  const sizeAvailable = (s: string) => findVariant(product, color, s)?.available ?? false;
  const priceCents = variant?.priceCents ?? product.minPriceCents;

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {mainImage && (
            <Image
              key={mainImage.url}
              src={mainImage.url}
              alt={mainImage.alt}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {images.length > 1 && (
          <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Product images">
            {images.map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}: ${img.alt}`}
                  aria-current={i === imageIndex}
                  className={`relative block aspect-square w-full overflow-hidden rounded-md bg-muted ring-offset-2 ${
                    i === imageIndex ? "ring-2 ring-foreground" : ""
                  }`}
                >
                  <Image src={img.url} alt="" fill sizes="20vw" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{product.name}</h1>
        <p className="mt-2 text-xl" aria-live="polite">
          {formatUsd(priceCents)}
        </p>

        {product.colors.length > 0 && (
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold">
              Color: <span className="font-normal">{color}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <label key={c.name} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c.name}
                    checked={color === c.name}
                    onChange={() => {
                      setColor(c.name);
                      setImageIndex(0);
                    }}
                    className="peer sr-only"
                  />
                  {c.hex ? (
                    <span
                      title={c.name}
                      className="block h-9 w-9 rounded-full border border-border ring-offset-2 peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4"
                      style={{ backgroundColor: c.hex }}
                    >
                      <span className="sr-only">{c.name}</span>
                    </span>
                  ) : (
                    <span className="block rounded-full border border-border px-4 py-2 text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                      {c.name}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {product.sizes.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Size</legend>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {product.sizes.map((s) => {
                const ok = sizeAvailable(s);
                return (
                  <label key={s} className={ok ? "cursor-pointer" : "cursor-not-allowed"}>
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      disabled={!ok}
                      onChange={() => setSize(s)}
                      className="peer sr-only"
                    />
                    <span className="block rounded-md border border-border py-2 text-center text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-disabled:text-muted-foreground peer-disabled:line-through peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                      {s}
                      {!ok && <span className="sr-only"> (sold out)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <button
          type="button"
          disabled={!variant || !variant.available}
          onClick={() => {
            if (!variant) return;
            add({
              variantId: variant.id,
              productId: product.id,
              name: product.name,
              slug: product.slug,
              color: variant.color,
              size: variant.size,
              image: variant.image ?? product.images[0]?.url ?? null,
              priceCents: variant.priceCents,
            });
          }}
          className="mt-8 w-full rounded-full bg-brand-primary px-6 py-4 font-semibold text-brand-primary-foreground disabled:opacity-50"
        >
          {needsSize ? "Select a size" : variant && !variant.available ? "Sold out" : "Add to cart"}
        </button>

        {product.description && (
          <div className="mt-10 border-t border-border pt-6">
            <h2 className="text-sm font-semibold">Details</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
