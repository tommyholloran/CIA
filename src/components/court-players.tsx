/**
 * Players on the hero court, drawn as sport-pictogram figures (thick rounded
 * limbs, tapered torso, separate head): the most readable way to show people
 * in action at small sizes. Standing upright on the court like game pieces,
 * each with a flat floor shadow. Generic figures (no likenesses), flat colours.
 *
 * Coordinates: a 1280 x 600 stage, scaled with "slice" like the court, so the
 * players sit in the middle between the wordmark and the hero player.
 */
type Pt = [number, number];
type Pose = { head: Pt; sh: Pt; hip: Pt; fe: Pt; fh: Pt; be: Pt; bh: Pt; fk: Pt; ff: Pt; bk: Pt; bf: Pt; ball?: Pt };

// Side view, ground at y = 0, facing +x, about 100 units tall.
const POSES: Record<"dribble" | "run" | "defend", Pose> = {
  dribble: { head: [10, -93], sh: [6, -77], hip: [0, -48], fe: [16, -60], fh: [24, -46], be: [-9, -62], bh: [-15, -50], fk: [16, -26], ff: [12, 0], bk: [-10, -25], bf: [-26, -10], ball: [27, -22] },
  run: { head: [12, -93], sh: [8, -78], hip: [0, -49], fe: [21, -66], fh: [27, -80], be: [-9, -63], bh: [-18, -73], fk: [19, -30], ff: [14, -3], bk: [-12, -28], bf: [-30, -15] },
  defend: { head: [4, -80], sh: [2, -65], hip: [0, -38], fe: [18, -56], fh: [30, -46], be: [-15, -56], bh: [-27, -46], fk: [18, -20], ff: [22, 0], bk: [-18, -20], bf: [-22, 0] },
};

const OFFENSE = "#AB0520";
const DEFENSE = "#8fb0e6";
const SHADOW = "#081a3d";

function Seg({ a, b, w, c }: { a: Pt; b: Pt; w: number; c: string }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round" />;
}

function Torso({ p, c }: { p: Pose; c: string }) {
  const [sx, sy] = p.sh;
  const [hx, hy] = p.hip;
  const len = Math.hypot(hx - sx, hy - sy);
  const nx = -(hy - sy) / len;
  const ny = (hx - sx) / len;
  const ws = 9; // half-width at shoulders
  const wh = 7; // half-width at hips
  const d = `M${sx + nx * ws} ${sy + ny * ws} L${hx + nx * wh} ${hy + ny * wh} L${hx - nx * wh} ${hy - ny * wh} L${sx - nx * ws} ${sy - ny * ws} Z`;
  return <path d={d} fill={c} stroke={c} strokeWidth={6} strokeLinejoin="round" />;
}

function Figure({ pose, color }: { pose: Pose; color: string }) {
  const p = pose;
  const A = 9; // arm width
  const L = 11; // leg width
  const feet = [p.ff[0], p.bf[0]];
  const cx = (Math.min(...feet) + Math.max(...feet)) / 2;
  const rx = (Math.max(...feet) - Math.min(...feet)) / 2 + 12;
  return (
    <>
      <ellipse cx={cx} cy={2} rx={rx} ry={6} fill={SHADOW} />
      {/* far limbs first, then torso, then near limbs and head */}
      <Seg a={p.sh} b={p.be} w={A} c={color} />
      <Seg a={p.be} b={p.bh} w={A * 0.9} c={color} />
      <Seg a={p.hip} b={p.bk} w={L} c={color} />
      <Seg a={p.bk} b={p.bf} w={L * 0.9} c={color} />
      <Torso p={p} c={color} />
      <Seg a={p.hip} b={p.fk} w={L} c={color} />
      <Seg a={p.fk} b={p.ff} w={L * 0.9} c={color} />
      <Seg a={p.sh} b={p.fe} w={A} c={color} />
      <Seg a={p.fe} b={p.fh} w={A * 0.9} c={color} />
      <circle cx={p.head[0]} cy={p.head[1]} r={9.5} fill={color} />
      {p.ball && <circle cx={p.ball[0]} cy={p.ball[1]} r={7.5} fill="#ffffff" />}
    </>
  );
}

const CAST: { x: number; y: number; pose: keyof typeof POSES; team: "o" | "d"; scale: number }[] = [
  // offense (red) pushing right: two wings filling the lanes, the handler in the middle
  { x: 465, y: 245, pose: "run", team: "o", scale: 1.3 },
  { x: 490, y: 540, pose: "run", team: "o", scale: 1.35 },
  { x: 590, y: 400, pose: "dribble", team: "o", scale: 1.5 },
  // defense (light blue) facing the ball
  { x: 740, y: 300, pose: "defend", team: "d", scale: 1.35 },
  { x: 765, y: 525, pose: "defend", team: "d", scale: 1.35 },
];

export function CourtPlayers({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1280 600" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        {CAST.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) scale(${(c.team === "d" ? -1 : 1) * c.scale} ${c.scale})`}>
            <Figure pose={POSES[c.pose]} color={c.team === "o" ? OFFENSE : DEFENSE} />
          </g>
        ))}
      </svg>
    </div>
  );
}
