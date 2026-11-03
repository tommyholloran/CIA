import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { CartButton } from "@/components/cart/cart-button";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

/** Placeholder brand mark (also the favicon) until a logo is set in brand.logo. */
export function BrandStar({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M32 11l5.6 12.6 13.7 1.4-10.3 9.2 3 13.5L32 40.8l-12 6.9 3-13.5-10.3-9.2 13.7-1.4z" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="on-dark sticky top-0 z-30 bg-brand-accent text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
          {brand.logo ? (
            // Set brand.logo to a file in /public (SVG preferred, light-on-dark). Height fixed; width follows the file.
            <Image src={brand.logo} alt={brand.name} width={160} height={32} className="h-8 w-auto" priority />
          ) : (
            <>
              <BrandStar className="h-5 w-5 text-brand-primary" />
              {brand.name}
            </>
          )}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-medium sm:gap-6">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
