/** Store-facing catalog model. Safe to pass to client components (no secrets). */

export interface ProductImage {
  url: string;
  alt: string;
  /** Color this image belongs to, when it's a per-color mockup. */
  color?: string;
}

export interface Variant {
  /** Printful sync variant id — what the cart stores and checkout validates. */
  id: number;
  /** Printful catalog (blank) variant id. */
  catalogVariantId: number;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  priceCents: number;
  currency: string;
  sku: string | null;
  image: string | null;
  available: boolean;
}

export interface Product {
  /** Printful sync product id. */
  id: number;
  /** URL segment: "{name-slug}-{id}". The id suffix is authoritative. */
  slug: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  images: ProductImage[];
  colors: { name: string; hex: string | null }[];
  sizes: string[];
  variants: Variant[];
  minPriceCents: number;
  maxPriceCents: number;
  available: boolean;
}
