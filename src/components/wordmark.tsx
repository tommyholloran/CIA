import { brand } from "@/config/brand";

/**
 * Text wordmark in the varsity display font, used until there's a logo file.
 *
 * Deliberately NOT styled like any school's jersey lettering: set straight
 * (no arch), solid fill, no contrasting outline. Keep it that way. See the
 * README "Brand & trademark" note.
 */

export function BrandStar({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M32 11l5.6 12.6 13.7 1.4-10.3 9.2 3 13.5L32 40.8l-12 6.9 3-13.5-10.3-9.2 13.7-1.4z" fill="currentColor" />
    </svg>
  );
}

const STAR_INLINE = "mr-[0.06em] inline-block h-[0.72em] w-[0.72em] -translate-y-[0.04em] align-baseline text-brand-primary";

/**
 * - default: inline text that wraps between words; the star is glued to the
 *   first word so it never sits alone on a line
 * - nowrap: one line (header)
 * - stacked: one word per line, a deliberate lockup (hero)
 */
export function Wordmark({ className = "", nowrap = false, stacked = false }: { className?: string; nowrap?: boolean; stacked?: boolean }) {
  const [first, ...rest] = brand.name.split(" ");
  if (stacked) {
    return (
      <span className={`block font-display uppercase ${className}`}>
        <span className="sr-only">{brand.name}</span>
        <span className="block whitespace-nowrap" aria-hidden="true">
          <BrandStar className={STAR_INLINE} />
          {first}
        </span>
        {rest.map((w) => (
          <span key={w} className="block whitespace-nowrap" aria-hidden="true">
            {w}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className={`font-display uppercase ${nowrap ? "whitespace-nowrap" : ""} ${className}`}>
      <span className="whitespace-nowrap">
        <BrandStar className={STAR_INLINE} />
        {first}
      </span>
      {rest.length ? ` ${rest.join(" ")}` : null}
    </span>
  );
}
