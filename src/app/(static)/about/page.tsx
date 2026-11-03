import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage title={`About ${brand.name}`}>
      <p>{brand.story}</p>
      <p>
        Every shirt is printed to order by our fulfilment partner, so nothing sits in a warehouse and nothing is
        wasted.
      </p>
    </ProsePage>
  );
}
