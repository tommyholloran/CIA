/**
 * Brand font: Proxima Nova (commercial — requires a web license).
 *
 * Until licensed WOFF2 files are added, Figtree (free, Google Fonts) stands in:
 * it's the closest free match to Proxima Nova's proportions.
 *
 * TO SWITCH TO PROXIMA NOVA (self-hosted, recommended):
 *   1. Put the licensed files in src/fonts/:
 *        ProximaNova-Regular.woff2, ProximaNova-Semibold.woff2, ProximaNova-Bold.woff2, ProximaNova-Extrabold.woff2
 *   2. Comment out the Figtree block and uncomment the localFont block below.
 *   Nothing else changes — every component uses the --font-brand-sans variable.
 */

import { Figtree } from "next/font/google";

export const sansFont = Figtree({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-brand-sans",
  display: "swap",
});

// import localFont from "next/font/local";
//
// export const sansFont = localFont({
//   src: [
//     { path: "../fonts/ProximaNova-Regular.woff2", weight: "400", style: "normal" },
//     { path: "../fonts/ProximaNova-Semibold.woff2", weight: "600", style: "normal" },
//     { path: "../fonts/ProximaNova-Bold.woff2", weight: "700", style: "normal" },
//     { path: "../fonts/ProximaNova-Extrabold.woff2", weight: "800", style: "normal" },
//   ],
//   variable: "--font-brand-sans",
//   display: "swap",
//   fallback: ["ui-sans-serif", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
// });

/** Headings use the same family; differentiate with weight (700/800), not a second font. */
export const displayFont = sansFont;
