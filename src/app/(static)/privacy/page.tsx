import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Privacy Policy" };

// TODO(owner): placeholder text — have this reviewed before launch.
export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy">
      <p>
        This placeholder describes what {brand.name} collects and why. Replace it with a reviewed policy before
        launch.
      </p>
      <h2>What we collect</h2>
      <p>
        Your name, email and shipping address when you order. Payments are processed by Stripe; we never see or
        store your card details.
      </p>
      <h2>Who we share it with</h2>
      <p>
        Stripe (payments and tax), Printful (printing and shipping your order) and Resend (order emails). We
        don&apos;t sell your data.
      </p>
      <h2>Your cart</h2>
      <p>Your cart is stored in your browser&apos;s local storage, not on our servers.</p>
      <h2>Contact</h2>
      <p>
        Requests about your data: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
      </p>
    </ProsePage>
  );
}
