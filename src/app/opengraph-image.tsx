import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share image for every page without its own (products use their mockup). */
export default function OpengraphImage() {
  const c = brand.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: c.accent, padding: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 64 64">
            <path d="M32 11l5.6 12.6 13.7 1.4-10.3 9.2 3 13.5L32 40.8l-12 6.9 3-13.5-10.3-9.2 13.7-1.4z" fill={c.primary} />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#ffffff", letterSpacing: -1 }}>{brand.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, letterSpacing: -2 }}>{brand.tagline}</div>
          <div style={{ width: 160, height: 10, background: c.primary }} />
        </div>
      </div>
    ),
    size,
  );
}
