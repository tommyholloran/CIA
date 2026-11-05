import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalog, getProductBySlug } from "@/lib/catalog";
import { ProductDetail } from "@/components/product/product-detail";
import { brand } from "@/config/brand";
import type { Product } from "@/lib/catalog/types";
import { siteUrl } from "@/lib/site";

/** schema.org Product data so search results can show price and availability. */
function productJsonLd(p: Product) {
  const url = `${siteUrl()}/shop/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: p.name,
    url,
    ...(p.description ? { description: p.description } : {}),
    image: p.images.slice(0, 8).map((i) => i.url),
    brand: { "@type": "Brand", name: brand.name },
    productGroupID: String(p.id),
    variesBy: [...(p.colors.length ? ["https://schema.org/color"] : []), ...(p.sizes.length ? ["https://schema.org/size"] : [])],
    hasVariant: p.variants.map((v) => ({
      "@type": "Product",
      name: [p.name, v.color, v.size].filter(Boolean).join(" — "),
      ...(v.sku ? { sku: v.sku } : {}),
      ...(v.color ? { color: v.color } : {}),
      ...(v.size ? { size: v.size } : {}),
      ...(v.image ? { image: v.image } : {}),
      offers: {
        "@type": "Offer",
        url,
        price: (v.priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        availability: v.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    })),
  };
}

/**
 * The first request for a product not prerendered at build waits for the full
 * page instead of getting the generic shell (which would answer 200 before
 * notFound()/redirect could set 404/308). Also enforces at build time that this
 * route stays fully static (cached catalog data only, no cookies/headers).
 */
export const ensureStatic = "navigation";

/**
 * Prerender every product. Cache Components requires at least one param, so an
 * empty catalog (e.g. building without a Printful token) yields a placeholder
 * slug that 404s. Products added later render on first visit, then are cached.
 */
export async function generateStaticParams() {
  const products = await getCatalog();
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "placeholder-0" }];
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const description =
    product.description?.slice(0, 160) ?? `${product.name} from ${brand.name}. Shipped across the US.`;
  const image = product.images[0]?.url ?? product.thumbnail;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: { title: product.name, description, images: image ? [{ url: image }] : undefined },
  };
}

/**
 * params is awaited OUTSIDE any <Suspense> on purpose: the product lookup runs
 * before streaming starts, so unknown products return a real 404 and renamed
 * products a real 308 (inside Suspense they would be soft 200s). Catalog data
 * is cached, so this costs nothing for known products; new slugs render once
 * on first visit and are then cached (ISR).
 */
export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  if (product.slug !== slug) permanentRedirect(`/shop/${product.slug}`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">
          ← All products
        </Link>
      </nav>
      <ProductDetail product={product} />
      <script
        type="application/ld+json"
        // Escape "<" so product text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
