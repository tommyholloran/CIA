import Link from "next/link";
import { brand } from "@/config/brand";
import { CartButton } from "@/components/cart/cart-button";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          {brand.name}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-5 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline underline-offset-4">
              {item.label}
            </Link>
          ))}
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
