import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon (iOS). Swap for the real logo once there is one. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: brand.colors.accent }}>
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path d="M32 11l5.6 12.6 13.7 1.4-10.3 9.2 3 13.5L32 40.8l-12 6.9 3-13.5-10.3-9.2 13.7-1.4z" fill={brand.colors.primary} />
        </svg>
      </div>
    ),
    size,
  );
}
