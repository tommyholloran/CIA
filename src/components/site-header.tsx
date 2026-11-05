import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { CartButton } from "@/components/cart/cart-button";
import { Wordmark } from "@/components/wordmark";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="on-dark sticky top-0 z-30 bg-brand-accent text-white">
      {/* Three columns: menu left, wordmark centered, cart right. Side columns are equal width so the wordmark is truly centered. */}
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-medium sm:gap-6">
          {nav.map((item) => (
            // Phones: only Shop fits beside the wordmark; About/FAQ are in the footer.
            <Link key={item.href} href={item.href} className={`underline-offset-4 hover:underline ${item.href === "/shop" ? "" : "hidden sm:inline"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="justify-self-center" aria-label={`${brand.name} home`}>
          {brand.logo ? (
            // Set brand.logo to a file in /public (SVG preferred, light-on-dark). Height fixed; width follows the file.
            <Image src={brand.logo} alt={brand.name} width={160} height={32} className="h-8 w-auto" priority />
          ) : (
            <Wordmark className="text-[20px] leading-none [text-shadow:2px_2px_0_var(--color-brand-primary)] sm:text-[28px]" />
          )}
        </Link>
        <div className="flex justify-end">
          <CartButton />
        </div>
      </div>
    </header>
  );
}
