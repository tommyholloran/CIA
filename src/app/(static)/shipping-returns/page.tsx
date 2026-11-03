import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { SHIPPING_OPTIONS } from "@/config/shipping";
import { formatUsd } from "@/lib/money";

export const metadata: Metadata = { title: "Shipping & Returns" };

export default function ShippingReturnsPage() {
  return (
    <ProsePage title="Shipping & Returns">
      <h2>Shipping</h2>
      <p>We ship to US addresses. Every shirt is printed to order, which adds 2–5 business days before it ships.</p>
      <ul className="list-disc pl-5">
        {SHIPPING_OPTIONS.map((o) => (
          <li key={o.id}>
            {o.label}: {formatUsd(o.amount)} — {o.deliveryEstimate.minBusinessDays}–
            {o.deliveryEstimate.maxBusinessDays} business days after it ships
          </li>
        ))}
      </ul>
      <h2>Returns</h2>
      {/* TODO(owner): confirm this policy matches what you will actually honour. */}
      <p>
        Because items are made to order, we don&apos;t accept returns for change of mind or wrong size. If your item
        arrives damaged or misprinted, contact us within 30 days of delivery with a photo and we&apos;ll replace it
        free of charge.
      </p>
    </ProsePage>
  );
}
