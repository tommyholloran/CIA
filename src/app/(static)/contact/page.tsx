import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <ProsePage title="Contact">
      <p>
        Questions about an order? Email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> and
        include your order number. We reply within 1–2 business days.
      </p>
    </ProsePage>
  );
}
