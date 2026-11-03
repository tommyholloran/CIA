import type { CSSProperties } from "react";
import { brand } from "@/config/brand";

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** brand.colors -> { "--brand-primary": "#111", ... } for the <html> style attribute. */
export function brandCssVars(): CSSProperties {
  return Object.fromEntries(
    Object.entries(brand.colors).map(([k, v]) => [`--brand-${kebab(k)}`, v]),
  ) as CSSProperties;
}
