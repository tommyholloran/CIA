import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Display font as raw bytes for next/og ImageResponse (share image, icons).
 * Read once at module load (as in the Next.js docs) so those routes stay
 * static and are generated at build time, not on every request.
 */
const data = await readFile(join(process.cwd(), "src/assets/fonts/BigShoulders-Black.ttf"));

export const displayFonts = [{ name: "Display", data, style: "normal" as const, weight: 900 as const }];
