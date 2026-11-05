import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "FAQ" };

const faqs = [
  {
    q: "How long until my order ships?",
    a: "Most orders ship within 2–5 business days; delivery time after that depends on the shipping option you choose.",
  },
  { q: "Do you ship outside the US?", a: "Not yet — we currently ship to US addresses only." },
  { q: "How do sizes run?", a: "Each product page lists the fit. If you are between sizes, we recommend sizing up." },
  {
    q: "Can I change or cancel my order?",
    a: "Contact us as soon as possible. Once an order enters production we can no longer change it.",
  },
];

export default function FaqPage() {
  return (
    <ProsePage title="Frequently asked questions">
      {faqs.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}
      <p>
        Still stuck? <Link href="/contact">Get in touch</Link>.
      </p>
    </ProsePage>
  );
}
