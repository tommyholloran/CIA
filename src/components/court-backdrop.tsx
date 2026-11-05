/**
 * Decorative basketball court, drawn in two shades of blue and tilted in
 * perspective like a floor, for behind the hero wordmark. Generic court
 * geometry (94 x 50 ft, scaled x10): no team, school or league marks.
 */
const FLOOR = "#12305f"; // shade 1: court surface
const MARK = "#1f4580"; // shade 2: paint, center circle and all lines

export function CourtBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none [perspective:1100px] ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 940 500"
        className="h-full w-full [transform:rotateX(52deg)_rotateZ(-24deg)] [transform-origin:50%_55%]"
        fill="none"
        stroke={MARK}
        strokeWidth="5"
      >
        {/* surface */}
        <rect x="0" y="0" width="940" height="500" rx="6" fill={FLOOR} stroke="none" />
        {/* boundary + half-court line */}
        <rect x="10" y="10" width="920" height="480" />
        <line x1="470" y1="10" x2="470" y2="490" />
        {/* center circles */}
        <circle cx="470" cy="250" r="60" fill={MARK} fillOpacity="0.45" />
        <circle cx="470" cy="250" r="20" />
        {[0, 1].map((side) => {
          // mirror the right half
          const t = side ? "translate(940 0) scale(-1 1)" : undefined;
          return (
            <g key={side} transform={t}>
              {/* paint (key) */}
              <rect x="10" y="170" width="190" height="160" fill={MARK} fillOpacity="0.55" />
              {/* free-throw circle */}
              <circle cx="200" cy="250" r="60" />
              {/* three-point line: corner straights + arc */}
              <path d="M10 30 H142 A237.5 237.5 0 0 1 142 470 H10" />
              {/* restricted area, backboard, rim */}
              <path d="M52.5 210 A40 40 0 0 1 52.5 290" />
              <line x1="40" y1="220" x2="40" y2="280" strokeWidth="6" />
              <circle cx="52.5" cy="250" r="7.5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
