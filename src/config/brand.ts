/**
 * Brand configuration — the single place to change name, copy and colors.
 * Fonts live in ./fonts.ts (next/font must be called in its own module).
 *
 * PLACEHOLDER VALUES: replace before launch.
 */
export const brand = {
  name: "Brand Name",
  tagline: "Tees worth wearing.",
  description: "Small-batch graphic tees, printed on demand and shipped across the US.",
  story:
    "Placeholder brand story. Two or three sentences about why this brand exists and what makes the shirts worth buying.",
  /** Customer-facing support address (shown on Contact page, used as reply-to). */
  supportEmail: "support@example.com",
  social: {
    instagram: "",
    tiktok: "",
  },
  /** Colors become CSS variables (--color-brand-*) and Tailwind utilities (bg-brand-primary, etc.). */
  colors: {
    primary: "#111111",
    primaryForeground: "#ffffff",
    accent: "#e4572e",
    background: "#ffffff",
    foreground: "#111111",
    muted: "#f4f4f5",
    mutedForeground: "#52525b",
    border: "#e4e4e7",
  },
  /** Path under /public. Leave empty to render the brand name as text. */
  logo: "",
} as const;

export type BrandColors = typeof brand.colors;
