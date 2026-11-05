/**
 * Decorative court markings for the hero: lines only, a half court seen from
 * half court looking toward the basket, laid flat in perspective so it reads
 * as the floor of an arena. Lines fade into the dark with distance.
 *
 * Two blues: the near lines (three-point arc, key, half-court line) are the
 * brighter shade; the far details (circles, rim, restricted area) the deeper.
 * Generic court geometry (feet x10): no team, school or league marks.
 */
const NEAR = "#3566ad"; // shade 1
const FAR = "#21477f"; // shade 2

export function CourtBackdrop({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none select-none [perspective:900px] ${className}`}
      aria-hidden="true"
      // Fade the far end (top) into the navy so the floor recedes.
      style={{ maskImage: "linear-gradient(to top, #000 45%, transparent 96%)", WebkitMaskImage: "linear-gradient(to top, #000 45%, transparent 96%)" }}
    >
      <svg
        viewBox="0 0 500 500"
        className="h-full w-full [transform:rotateX(62deg)_rotateZ(-12deg)] [transform-origin:50%_100%]"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g stroke={FAR} strokeWidth="3">
          {/* free-throw circle, restricted area, backboard, rim */}
          <circle cx="250" cy="200" r="60" />
          <path d="M210 52.5 A40 40 0 0 0 290 52.5" />
          <line x1="222" y1="40" x2="278" y2="40" strokeWidth="4" />
          <circle cx="250" cy="52.5" r="7.5" />
          {/* lane hash marks */}
          {[70, 80, 110, 140].map((y) => (
            <g key={y}>
              <line x1="162" y1={y} x2="170" y2={y} />
              <line x1="330" y1={y} x2="338" y2={y} />
            </g>
          ))}
        </g>
        <g stroke={NEAR} strokeWidth="4">
          {/* sidelines, baseline, half-court line */}
          <rect x="10" y="10" width="480" height="470" />
          {/* key */}
          <rect x="170" y="10" width="160" height="190" />
          {/* three-point line: corner straights + arc around the rim */}
          <path d="M30 10 V142 A237.5 237.5 0 0 0 470 142 V10" />
          {/* center circle at half court (half visible) */}
          <path d="M190 480 A60 60 0 0 1 310 480" />
        </g>
      </svg>
    </div>
  );
}
