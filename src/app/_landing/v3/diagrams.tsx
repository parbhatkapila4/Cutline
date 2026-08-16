"use client";

const STROKE = "rgba(244,243,243,0.55)";
const STROKE_SOFT = "rgba(244,243,243,0.26)";
const NODE = "#c7e6a0";

const CUBE_GREEN = { top: "#d9eeae", right: "#b4d97c", left: "#8ab457" };
const CUBE_PINK = { top: "#f1d1e7", right: "#e0a7ce", left: "#c481b3" };

const TUBE_STRONG = "rgba(244,243,243,0.6)";
const TUBE_MED = "rgba(244,243,243,0.32)";
const TUBE_SOFT = "rgba(244,243,243,0.15)";

const TUBE_LONGS: {
  a: [number, number];
  b: [number, number];
  edge: boolean;
}[] = [
  { a: [76, 0], b: [336, -80], edge: false },
  { a: [53.7, 79.2], b: [313.7, -0.8], edge: false },
  { a: [0, 112], b: [260, 32], edge: true },
  { a: [-53.7, 79.2], b: [206.3, -0.8], edge: false },
  { a: [-76, 0], b: [184, -80], edge: false },
  { a: [-53.7, -79.2], b: [206.3, -159.2], edge: false },
  { a: [0, -112], b: [260, -192], edge: true },
  { a: [53.7, -79.2], b: [313.7, -159.2], edge: false },
];

const TUBE_VOXELS: [number, number, number][] = [
  [-17.1, -95.1, 0],
  [16.9, -92.4, 1],
  [-0.6, -91.6, 0],
  [23.5, -74.3, 0],
  [3.2, -73.7, 0],
  [-25.6, -72.9, 0],
  [35.1, -72.9, 0],
  [-5.3, -60.5, 1],
  [43, -60.2, 0],
  [-19.1, -59.3, 0],
  [22.6, -58.6, 0],
  [-38.1, -57.4, 0],
  [-26.5, -46.9, 0],
  [43.1, -45.5, 0],
  [17.5, -44.2, 1],
  [-5.2, -43.8, 0],
  [-44.2, -41.3, 0],
  [55.7, -38.4, 0],
  [1.1, -26.9, 1],
  [15.9, -26.8, 1],
  [-17.4, -25.6, 1],
  [54.5, -24.3, 0],
  [33.4, -22.8, 1],
  [-43.3, -21, 0],
  [17.6, -13.2, 0],
  [61.5, -12.6, 0],
  [1.9, -10, 1],
  [-45.5, -9.6, 0],
  [-58.4, -8.7, 0],
  [40.1, -7.1, 0],
  [-26.2, -6.1, 0],
  [-24.2, 2.6, 0],
  [-0.6, 3.5, 0],
  [12.6, 6.6, 0],
  [32.7, 8.1, 0],
  [-59.3, 8.7, 0],
  [63.4, 9, 0],
  [-36.5, 12.6, 1],
  [43.5, 22.5, 1],
  [-7.4, 24.9, 1],
  [-39.8, 24.9, 0],
  [-62.3, 25.7, 0],
  [-21.6, 26.4, 1],
  [22.6, 26.6, 0],
  [54.9, 29.1, 1],
  [-23.9, 36.8, 0],
  [52.7, 39.1, 0],
  [-2.3, 41.8, 1],
  [-37.9, 42.2, 0],
  [38.1, 44.3, 1],
  [15.2, 46.4, 1],
  [-23.5, 57.7, 1],
  [-38.1, 58.9, 1],
  [15.8, 60.4, 0],
  [36.5, 62.1, 0],
  [1.4, 63.8, 1],
  [-21.5, 72.5, 0],
  [19.1, 72.7, 0],
  [0.5, 73.1, 1],
  [38.8, 77.2, 0],
  [-7.3, 98.2, 0],
];

const TUBE_EXHAUST: [number, number, number, number][] = [
  [286.2, -75.2, 0, 7],
  [313.3, -93.5, 0, 6.625],
  [331.1, -133, 0, 6.25],
  [373.7, -142.3, 1, 5.875],
  [386, -167.6, 0, 5.5],
  [417.8, -175.6, 0, 5.125],
  [432.4, -203.9, 1, 4.75],
  [435.1, -204.7, 1, 4.375],
  [481.7, -243.8, 1, 4],
];

function cube(
  cx: number,
  cy: number,
  pal: { top: string; right: string; left: string },
  w: number,
  q: number,
  h: number,
  delay: number,
  key: string,
) {
  const r = (v: number) => Math.round(v * 10) / 10;
  const top = `${r(cx)},${r(cy - q)}`;
  const right = `${r(cx + w)},${r(cy)}`;
  const front = `${r(cx)},${r(cy + q)}`;
  const left = `${r(cx - w)},${r(cy)}`;
  const leftB = `${r(cx - w)},${r(cy + h)}`;
  const frontB = `${r(cx)},${r(cy + q + h)}`;
  const rightB = `${r(cx + w)},${r(cy + h)}`;
  return (
    <g
      key={key}
      className="v3-node"
      style={{ ["--node-delay" as string]: `${delay}ms` }}
    >
      <polygon points={`${left} ${front} ${frontB} ${leftB}`} fill={pal.left} />
      <polygon
        points={`${front} ${right} ${rightB} ${frontB}`}
        fill={pal.right}
      />
      <polygon
        points={`${top} ${right} ${front} ${left}`}
        fill={pal.top}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.6}
      />
    </g>
  );
}

export function RenderTube({ className = "" }: { className?: string }) {
  const RINGS = 6;
  const dx = 52;
  const dy = 16;
  const RX = 76;
  const RY = 112;
  const SLABS = 5;

  return (
    <svg viewBox="0 0 720 470" className={className} fill="none" aria-hidden>
      <g transform="translate(260 255)">
        {Array.from({ length: RINGS }, (_, k) => (
          <ellipse
            key={`ring-${k}`}
            className="v3-draw"
            pathLength={1}
            cx={k * dx}
            cy={-k * dy}
            rx={RX}
            ry={RY}
            stroke={
              k === 0 ? TUBE_STRONG : k === RINGS - 1 ? TUBE_MED : TUBE_SOFT
            }
            strokeWidth={k === 0 ? 1.3 : 1}
            style={{ ["--draw-delay" as string]: `${120 + k * 70}ms` }}
          />
        ))}

        {TUBE_LONGS.map((l, i) => (
          <path
            key={`long-${i}`}
            className="v3-draw"
            pathLength={1}
            d={`M${l.a[0]} ${l.a[1]} L${l.b[0]} ${l.b[1]}`}
            stroke={l.edge ? TUBE_STRONG : TUBE_SOFT}
            strokeWidth={l.edge ? 1.2 : 1}
            style={{ ["--draw-delay" as string]: `${200 + i * 55}ms` }}
          />
        ))}

        {Array.from({ length: SLABS }, (_, j) => {
          const i = SLABS - 1 - j;
          const w = 22;
          const h = 150 - i * 7;
          return (
            <rect
              key={`slab-${i}`}
              className="v3-draw"
              pathLength={1}
              x={-dx - i * 46 - w / 2}
              y={dy + i * 14 - h / 2}
              width={w}
              height={h}
              rx={11}
              stroke={i === 0 ? TUBE_MED : TUBE_SOFT}
              strokeWidth={1}
              fill="rgba(244,243,243,0.025)"
              style={{
                ["--draw-delay" as string]: `${120 + (SLABS - i) * 60}ms`,
              }}
            />
          );
        })}

        {TUBE_EXHAUST.map(([x, y, c, s], i) =>
          cube(
            x,
            y,
            c === 1 ? CUBE_PINK : CUBE_GREEN,
            s,
            s * 0.5,
            s,
            955 + i * 55,
            `ex-${i}`,
          ),
        )}

        {}
        {TUBE_VOXELS.map(([x, y, c], i) =>
          cube(
            x,
            y,
            c === 1 ? CUBE_PINK : CUBE_GREEN,
            8,
            4,
            8,
            560 + i * 26,
            `vox-${i}`,
          ),
        )}
      </g>
    </svg>
  );
}

export function StageSlab({
  lanes = 6,
  dots = [],
  className = "",
}: {
  lanes?: number;
  dots?: [number, number][];
  className?: string;
}) {
  const laneW = 250;
  const laneH = 26;
  const gap = 12;
  const rows = Array.from({ length: lanes }, (_, i) => i);
  const totalH = lanes * (laneH + gap);

  return (
    <svg viewBox="0 0 560 330" className={className} fill="none" aria-hidden>
      <g
        transform="translate(300 96) rotate(-30) skewX(-14) scale(1.18)"
        stroke="rgba(244,243,243,0.07)"
        strokeWidth={1}
      >
        <rect x={-14} y={-14} width={laneW + 28} height={totalH + 14} rx={40} />
      </g>

      <g transform="translate(150 74) rotate(-30) skewX(-14)">
        <rect
          className="v3-draw"
          pathLength={1}
          x={-16}
          y={-16}
          width={laneW + 32}
          height={totalH + 18}
          rx={42}
          stroke={STROKE}
          strokeWidth={1}
          style={{ ["--draw-delay" as string]: "0ms" }}
        />
        <rect
          className="v3-draw"
          pathLength={1}
          x={-30}
          y={-30}
          width={laneW + 60}
          height={totalH + 46}
          rx={54}
          stroke={STROKE_SOFT}
          strokeWidth={1}
          strokeDasharray="4 5"
          style={{ ["--draw-delay" as string]: "80ms" }}
        />

        {rows.map((i) => (
          <rect
            key={i}
            className="v3-draw"
            pathLength={1}
            x={0}
            y={i * (laneH + gap)}
            width={laneW}
            height={laneH}
            rx={13}
            stroke={STROKE_SOFT}
            strokeWidth={1}
            style={{ ["--draw-delay" as string]: `${140 + i * 80}ms` }}
          />
        ))}

        {dots.map(([lane, t], i) => (
          <rect
            key={`${lane}-${t}`}
            className="v3-node"
            x={t * laneW}
            y={lane * (laneH + gap) + 7}
            width={12}
            height={12}
            rx={3}
            fill={NODE}
            style={{ ["--node-delay" as string]: `${640 + i * 70}ms` }}
          />
        ))}
      </g>
    </svg>
  );
}

export function DiagramTag({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <span
      className={`v3-tag inline-flex items-center gap-1.5 ${className}`}
      style={{ ["--tag-delay" as string]: `${delay}ms` }}
    >
      <span
        aria-hidden
        className="flex h-5 w-5 items-center justify-center rounded-[5px] border border-[#f4f3f3]/30"
      >
        <span className="block h-1.5 w-1.5 rounded-[1px] bg-[#f4f3f3]/60" />
      </span>
      <span className="rounded-[5px] border border-[#f4f3f3]/30 px-2 py-[3px] font-plex text-[10.5px] tracking-[0.03em] text-[#f4f3f3]/75">
        {children}
      </span>
    </span>
  );
}
