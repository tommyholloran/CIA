import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Terms of Service" };

// TODO(owner): placeholder text — have this reviewed before launch.
export default function TermsPage() {
  return (
    <ProsePage title="Terms of Service">
      <p>
        These placeholder terms govern purchases from {brand.name}. Replace them with reviewed terms before launch.
      </p>
      <h2>Orders</h2>
      <p>Placing an order is an offer to buy. We may cancel and refund any order, for example if an item becomes unavailable.</p>
      <h2>Pricing</h2>
      <p>Prices are in USD. Sales tax is calculated at checkout based on your shipping address.</p>
      <h2>Returns</h2>
      <p>See our Shipping &amp; Returns page.</p>
    </ProsePage>
  );
}
