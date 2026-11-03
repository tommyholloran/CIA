/**
 * Brand configuration — the single place to change name, copy and colors.
 * Fonts live in ./fonts.ts (next/font must be called in its own module).
 *
 * Copy (tagline/description/story/supportEmail) is still PLACEHOLDER — replace before launch.
 */
export const brand = {
  name: "Crazy Ivan Army",
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
    // Arizona Red (Pantone 200 C) — CTAs, sale/accent. White text on it: 7.57:1.
    primary: "#AB0520",
    primaryForeground: "#ffffff",
    // Arizona Blue (Pantone 281 C) — headings, header/footer, focus rings.
    // Never put red text on navy: 2.04:1, fails WCAG.
    accent: "#0C234B",
    background: "#ffffff",
    foreground: "#0C234B",
    muted: "#F3F5F9", // light navy tint
    mutedForeground: "#4B5568", // 7.5:1 on white, 6.9:1 on muted
    border: "#DDE2EA",
  },
  /** Path under /public. Leave empty to render the brand name as text. */
  logo: "",
} as const;

export type BrandColors = typeof brand.colors;
