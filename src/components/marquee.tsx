/**
 * Scrolling ticker band (red, white display type). Decorative: hidden from
 * screen readers, since it only repeats the brand and slogan. Pauses on hover;
 * static for visitors who prefer reduced motion (see globals.css).
 *
 * Keep every phrase TRUE (no "free shipping" etc. unless it is).
 */
const DEFAULT_ITEMS = ["Join the army", "Crazy Ivan Army", "Ships across the US"];

export function Marquee({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  // Repeat enough to overfill wide screens, then duplicate for a seamless loop.
  const run = [...items, ...items, ...items];
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {run.map((text, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span className="px-5">{text}</span>
          <span className="text-white/60">✕</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee overflow-hidden bg-brand-primary py-2.5 font-display text-xl uppercase tracking-[0.12em] text-white sm:text-2xl" aria-hidden="true">
      <div className="marquee-track flex w-max">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
