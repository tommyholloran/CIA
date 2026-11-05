/**
 * A fast break seen from directly above, drawn in court units (feet x10) so it
 * sits on the court in CourtBackdrop and rotates with it. Generic figures (no
 * likenesses), flat colours: offense red, defense light blue, ball white.
 *
 * Motion is shown the way play diagrams show it: dashed paths for runs, a
 * dotted line for the pass, arrowheads at the end. Attack is toward +x
 * (the right-hand basket in court coordinates).
 */
const OFFENSE = "#AB0520";
const DEFENSE = "#6f95cf";
const HAIR = "#0C234B";
const TRAIL = "#9fb9e3";

type Figure = { x: number; y: number; facing: number; team: "o" | "d"; stride?: 1 | -1; ball?: boolean };

/** Top-down player: shoulders, swinging arms, head; optional ball at the hand. */
function Player({ x, y, facing, team, stride = 1, ball }: Figure) {
  const body = team === "o" ? OFFENSE : DEFENSE;
  // facing: degrees, 0 = toward +x
  return (
    <g transform={`translate(${x} ${y}) rotate(${facing}) scale(1.6)`} stroke="none">
      {/* arms attached at the shoulder ends: runners pump (one forward, one back),
          defenders hold both hands up toward the ball */}
      {team === "o" ? (
        <>
          <rect x={stride > 0 ? -1 : -9} y={-19} width={10} height={6} rx={3} fill={body} />
          <rect x={stride > 0 ? -9 : -1} y={13} width={10} height={6} rx={3} fill={body} />
        </>
      ) : (
        <>
          <rect x={0} y={-18} width={11} height={6} rx={3} fill={body} />
          <rect x={0} y={12} width={11} height={6} rx={3} fill={body} />
        </>
      )}
      {/* shoulders: a rounded bar, wide side-to-side */}
      <rect x={-6} y={-16} width={12} height={32} rx={6} fill={body} />
      {/* head */}
      <circle cx={1.5} cy={0} r={6} fill={HAIR} />
      {ball && (
        <g transform="translate(15 18)">
          <circle r={5.5} fill="#ffffff" />
          <path d="M-5.5 0 H5.5 M0 -5.5 V5.5" stroke={HAIR} strokeWidth={1} fill="none" />
        </g>
      )}
    </g>
  );
}

const PLAYERS: Figure[] = [
  // offense: ball handler crossing half court, wings filling the lanes
  { x: 425, y: 255, facing: 4, team: "o", ball: true },
  { x: 392, y: 150, facing: 10, team: "o", stride: -1 },
  { x: 386, y: 340, facing: -8, team: "o" },
  // defense: back-pedalling toward their basket, facing the ball
  { x: 520, y: 205, facing: 192, team: "d" },
  { x: 528, y: 318, facing: 172, team: "d", stride: -1 },
];

export function AerialPlay({ className = "" }: { className?: string }) {
  return (
    <g className={className}>
      <defs>
        <marker id="play-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={TRAIL} stroke="none" />
        </marker>
      </defs>
      <g stroke={TRAIL} strokeWidth="3" fill="none" strokeLinecap="round">
        {/* runs: where they came from (faint) and where they're going (arrow) */}
        <path d="M300 140 C 330 143, 350 146, 368 148" strokeDasharray="10 9" opacity="0.5" />
        <path d="M418 152 C 450 154, 480 148, 512 140" strokeDasharray="10 9" markerEnd="url(#play-arrow)" />
        <path d="M294 348 C 322 345, 342 343, 360 342" strokeDasharray="10 9" opacity="0.5" />
        <path d="M412 338 C 442 336, 472 342, 502 350" strokeDasharray="10 9" markerEnd="url(#play-arrow)" />
        <path d="M330 262 C 360 259, 380 257, 398 256" strokeDasharray="10 9" opacity="0.5" />
        {/* the pass: handler to the right wing, leading him */}
        <path d="M452 272 L 486 334" strokeDasharray="2 9" strokeWidth="4" markerEnd="url(#play-arrow)" />
      </g>
      {PLAYERS.map((p, i) => (
        <Player key={i} {...p} />
      ))}
    </g>
  );
}
