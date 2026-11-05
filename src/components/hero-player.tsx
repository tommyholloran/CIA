import Image from "next/image";

/**
 * Hero player art with an entrance: when the page loads he screams and flexes
 * once (surge + shake, red shadow kicks out, shout lines burst from his mouth),
 * then settles to the still. CSS only; static for reduced-motion visitors.
 *
 * The drawing is a single still, so the mouth and arms don't actually move;
 * that would need extra drawn frames.
 *
 * Burst geometry is in the artwork's own pixel space (520 x 941); mouth ~(255, 195).
 */
const MOUTH = { x: 255, y: 195 };
// Angles in degrees (0 = right, -90 = up): out to the sides and up the diagonals,
// never straight up (that would draw over his head).
const RAYS = [-172, -155, -138, -42, -25, -8, 172, 8];

function rays() {
  return RAYS.map((deg, i) => {
    const r = (deg * Math.PI) / 180;
    // start outside the head: further out on the upper diagonals
    const inner = Math.abs(deg + 90) < 60 ? 150 : 108;
    const outer = inner + (i % 2 ? 48 : 70);
    return {
      x1: MOUTH.x + Math.cos(r) * inner,
      y1: MOUTH.y + Math.sin(r) * inner,
      x2: MOUTH.x + Math.cos(r) * outer,
      y2: MOUTH.y + Math.sin(r) * outer,
      red: i % 2 === 0,
    };
  });
}

export function HeroPlayer({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="player-hype relative h-full w-full">
        <Image
          src="/hero-player.png"
          alt=""
          width={520}
          height={941}
          priority
          sizes="(min-width: 768px) 420px, 70vw"
          className="player-shadow h-full w-full"
        />
        <svg viewBox="0 0 520 941" className="absolute inset-0 h-full w-full overflow-visible" fill="none" strokeLinecap="round">
          <g className="player-shout" style={{ transformOrigin: `${MOUTH.x}px ${MOUTH.y}px` }}>
            {rays().map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.red ? "var(--color-brand-primary)" : "#ffffff"} strokeWidth={l.red ? 9 : 7} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
