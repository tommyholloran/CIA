import { Inter } from "next/font/google";

/** Change the imported font here; it is applied site-wide via the --font-brand-sans variable. */
export const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-brand-sans",
  display: "swap",
});

/** Optional display font for headings. Defaults to the same as body text. */
export const displayFont = sansFont;
