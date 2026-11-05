import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage title={`About ${brand.name}`}>
      <p>{brand.story}</p>
    </ProsePage>
  );
}
