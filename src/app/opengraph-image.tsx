import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";
import { displayFonts } from "@/lib/brand-image";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share image for every page without its own (products use their mockup). */
export default function OpengraphImage() {
  const c = brand.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: c.accent, padding: "0 96px", fontFamily: "Display" }}>
        <div style={{ display: "flex", fontSize: 170, color: "#ffffff", lineHeight: 1, textTransform: "uppercase" }}>{brand.name}</div>
        <div style={{ marginTop: 28, width: 220, height: 16, background: c.primary }} />
      </div>
    ),
    { ...size, fonts: displayFonts },
  );
}
