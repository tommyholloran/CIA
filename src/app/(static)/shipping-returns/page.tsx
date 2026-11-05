import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { PRODUCTION_DAYS, SHIPPING_OPTIONS, deliveryEstimate } from "@/config/shipping";
import { formatUsd } from "@/lib/money";

export const metadata: Metadata = { title: "Shipping & Returns" };

export default function ShippingReturnsPage() {
  return (
    <ProsePage title="Shipping & Returns">
      <h2>Shipping</h2>
      <p>
        We ship to US addresses. Orders take {PRODUCTION_DAYS.min}–{PRODUCTION_DAYS.max} business days to prepare
        before they ship. Delivery estimates below include that time.
      </p>
      <ul className="list-disc pl-5">
        {SHIPPING_OPTIONS.map((o) => (
          <li key={o.id}>
            {o.label}: {formatUsd(o.amount)} — {deliveryEstimate(o).min}–{deliveryEstimate(o).max} business days
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
