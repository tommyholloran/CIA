import { brand } from "@/config/brand";

/**
 * Text wordmark in the athletic condensed display font, used until there's a
 * logo file.
 *
 * Deliberately NOT styled like any school's jersey lettering: set straight
 * (no arch), solid white, no contrasting outline. Keep it that way. See the
 * README "Brand & trademark" note.
 *
 * - default: one line (header)
 * - stacked: one word per line with a red underline bar (home hero)
 */
export function Wordmark({ className = "", stacked = false }: { className?: string; stacked?: boolean }) {
  if (!stacked) {
    return <span className={`whitespace-nowrap font-display uppercase tracking-wide ${className}`}>{brand.name}</span>;
  }
  return (
    <span className={`block font-display uppercase ${className}`}>
      <span className="sr-only">{brand.name}</span>
      {brand.name.split(" ").map((word, i) => (
        <span key={word} className="slam-in block whitespace-nowrap" style={{ animationDelay: `${i * 110}ms` }} aria-hidden="true">
          {word}
        </span>
      ))}
      <span className="slam-in mt-[0.18em] block h-[0.09em] w-[1.6em] bg-brand-primary" style={{ animationDelay: "380ms" }} aria-hidden="true" />
    </span>
  );
}
