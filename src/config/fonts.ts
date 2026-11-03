/**
 * Brand fonts.
 *
 * Display: Big Shoulders (900), a tall, condensed athletic face (SIL Open Font
 * License, copy in src/assets/fonts/BigShoulders-OFL.txt). Used for the
 * wordmark and headings. A static 900 TTF is bundled for the generated
 * share image and icons, which can't use the variable web font.
 *
 * Body: Figtree, a free stand-in for Proxima Nova.
 *
 * TO SWITCH BODY TEXT TO PROXIMA NOVA (self-hosted, licensed):
 *   1. Put the licensed files in src/fonts/ (check the license allows it if the repo is public):
 *        ProximaNova-Regular.woff2, ProximaNova-Semibold.woff2, ProximaNova-Bold.woff2, ProximaNova-Extrabold.woff2
 *   2. Comment out the Figtree block and uncomment the localFont block below.
 */

import { Big_Shoulders, Figtree } from "next/font/google";

export const displayFont = Big_Shoulders({
  subsets: ["latin"],
  weight: "900",
  variable: "--font-brand-display",
  display: "swap",
});

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
