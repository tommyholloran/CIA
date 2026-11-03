import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";
import { displayFonts } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon (iOS): "CIA" monogram. Swap for the real logo once there is one. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: brand.colors.accent, fontFamily: "Display" }}>
        <div style={{ fontSize: 96, color: "#ffffff", lineHeight: 1 }}>CIA</div>
        <div style={{ marginTop: 8, width: 82, height: 12, background: brand.colors.primary }} />
      </div>
    ),
    { ...size, fonts: displayFonts },
  );
}
