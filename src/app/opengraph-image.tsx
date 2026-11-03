import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAR = "M32 11l5.6 12.6 13.7 1.4-10.3 9.2 3 13.5L32 40.8l-12 6.9 3-13.5-10.3-9.2 13.7-1.4z";

/** Default social share image for every page without its own (products use their mockup). */
export default async function OpengraphImage() {
  const display = await readFile(join(process.cwd(), "src/assets/fonts/AlfaSlabOne-Regular.ttf"));
  const c = brand.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: c.accent, padding: "0 90px", fontFamily: "Display" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="76" height="76" viewBox="0 0 64 64">
            <path d={STAR} fill={c.primary} />
          </svg>
          <div style={{ display: "flex", gap: 22, fontSize: 76, color: "#ffffff", lineHeight: 1 }}>
            {brand.name.toUpperCase().split(" ").map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 36, fontSize: 40, color: "#ffffff", opacity: 0.85 }}>{brand.tagline.toUpperCase()}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, background: c.primary }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Display", data: display, style: "normal", weight: 400 }] },
  );
}
