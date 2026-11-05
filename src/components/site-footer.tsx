import Link from "next/link";
import { brand } from "@/config/brand";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/shipping-returns", label: "Shipping & Returns" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-brand-accent text-white">
      <div className="h-1.5 bg-brand-primary" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <nav aria-label="Footer" className="text-sm">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/80 underline-offset-4 hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-8 text-sm text-white/70">© {brand.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
