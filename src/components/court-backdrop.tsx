/**
 * Hero background: a basketball court outline seen from above, turned ~20°,
 * blue lines only (no fills, no white, no gradients). Simple markings, as in
 * the owner's reference: boundary, half-court line, center circle, and at each
 * end the key, free-throw circle (dashed inside the key), three-point arc,
 * backboard and rim. Generic court geometry: no team, school or league marks.
 */
const LINE = "#2a5596"; // main lines
const DASH = "#1f4580"; // dashed half of the free-throw circles (second blue)

function End() {
  return (
    <>
      {/* key */}
      <rect x="0" y="170" width="190" height="160" />
      {/* free-throw circle: solid outside the key, dashed inside */}
      <path d="M190 190 A60 60 0 0 1 190 310" />
      <path d="M190 190 A60 60 0 0 0 190 310" stroke={DASH} strokeDasharray="12 10" />
      {/* three-point arc from the baseline corners */}
      <path d="M0 30 A250 220 0 0 1 0 470" />
      {/* backboard + rim */}
      <line x1="40" y1="225" x2="40" y2="275" />
      <circle cx="52" cy="250" r="9" />
    </>
  );
}

export function CourtBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg viewBox="-80 -180 1100 860" preserveAspectRatio="xMidYMid slice" className="h-full w-full" fill="none" stroke={LINE} strokeWidth="4" strokeLinecap="round">
        <g transform="rotate(-20 470 250)">
          <rect x="0" y="0" width="940" height="500" />
          <line x1="470" y1="0" x2="470" y2="500" />
          <circle cx="470" cy="250" r="60" />
          <End />
          <g transform="translate(940 0) scale(-1 1)">
            <End />
          </g>
        </g>
      </svg>
    </div>
  );
}
