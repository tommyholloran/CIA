import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";
import { displayFonts } from "@/lib/brand-image";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser-tab icon: "CIA" monogram. Swap for the real logo once there is one. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: brand.colors.accent, borderRadius: 12, fontFamily: "Display" }}>
        <div style={{ fontSize: 36, color: "#ffffff", lineHeight: 1 }}>CIA</div>
        <div style={{ marginTop: 3, width: 30, height: 5, background: brand.colors.primary }} />
      </div>
    ),
    { ...size, fonts: displayFonts },
  );
}
