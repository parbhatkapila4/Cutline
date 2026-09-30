"use client";

import {
  Box,
  Cube,
  CubeDefs,
  INK,
  INK_FAINT,
  INK_LANE,
  INK_SOFT,
  Label,
  P,
  PLANE,
  SLAB_DEPTH,
  SLAB_R,
  SLAB_U,
  SLAB_V,
  TEXT,
  pt,
  slabPath,
  useChipScale,
  type LaneLabel,
} from "./laneSlab";

const T0 = -166;
const T1 = 166;
const SECONDS = 60;
const uAt = (s: number) => T0 + (s / SECONDS) * (T1 - T0);

const SHOTS = [
  { n: "01", start: 0, dur: 14 },
  { n: "02", start: 14, dur: 16 },
  { n: "03", start: 30, dur: 15 },
  { n: "04", start: 45, dur: 15 },
];
const tc = (s: number) => `0:${String(s).padStart(2, "0")}`;

const BLOCK_V = 32;
const BLOCK_H = 13;
const GAP = 3;
const CARD_LIFT = 44;
const CARD_U = 24;
const CARD_V = 14;
const CARD_VOFF = -14;
const CARD_UOFF = 8;
const BEAT_V0 = 44;
const RULER_V = -64;

type Pt = [number, number];
const up = (p: Pt, dy: number): Pt => [p[0], p[1] - dy];

export function StorySlab({ className = "", id = "story" }: { className?: string; id?: string }) {
  const top = slabPath(SLAB_U, SLAB_V, SLAB_R);
  const bottom = slabPath(SLAB_U, SLAB_V, SLAB_R, SLAB_DEPTH);
  const clip = `${id}-clip`;
  const fade = `${id}-fade`;
  const { ref, scale } = useChipScale();
  const timeline = `M${pt(P(-420, 0))}L${pt(P(420, 0))}`;
  const blocks = SHOTS.map((s, i) => {
    const u0 = uAt(s.start) + (i === 0 ? 0 : GAP / 2);
    const u1 = uAt(s.start + s.dur) - (i === SHOTS.length - 1 ? 0 : GAP / 2);
    return { ...s, u0, u1, uc: (u0 + u1) / 2 };
  });
  const shotsAnchor = up(P(blocks[1].u0 + 7, BLOCK_V - 3), BLOCK_H);
  const briefAnchor = up(P(blocks[3].uc + CARD_UOFF + 12, CARD_VOFF - 5), BLOCK_H + CARD_LIFT);
  const scriptAnchor = P(uAt(0) + 3, BEAT_V0 + 1);
  const labels: LaneLabel[] = [
    {
      text: "Script",
      icon: "script",
      seg: 0,
      t: 0,
      side: "top",
      y: 40,
      caption: ["Narration written per beat,", "then mapped shot by shot"],
    },
    {
      text: "Brief",
      icon: "brief",
      seg: 0,
      t: 0,
      side: "top",
      y: 104,
      caption: ["Every shot leaves", "with its own brief"],
    },
    {
      text: "Shots",
      icon: "shots",
      seg: 0,
      t: 0,
      side: "bottom",
      y: 306,
      caption: ["A timed shot list:", "four shots across one minute"],
    },
  ];
  const anchors = [
    { x: scriptAnchor[0], y: scriptAnchor[1] },
    { x: briefAnchor[0], y: briefAnchor[1] },
    { x: shotsAnchor[0], y: shotsAnchor[1] },
  ];

  return (
    <svg
      ref={ref}
      viewBox="0 -24 600 424"
      className={`overflow-visible ${className}`}
      fill="none"
      aria-hidden
    >
      <defs>
        <CubeDefs />
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#403f3e" />
          <stop offset="1" stopColor="#313030" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={top} />
        </clipPath>
        <radialGradient id={fade} cx="0.5" cy="0.5" r="0.78">
          <stop offset="0.3" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect x="0" y="-24" width="600" height="424" fill={`url(#${fade})`} />
        </mask>
      </defs>

      <path
        d={timeline}
        mask={`url(#${id}-mask)`}
        stroke={INK_FAINT}
        strokeWidth={1}
        strokeDasharray="3 4"
        className="v3-tag"
        style={{ ["--tag-delay" as string]: "500ms" }}
      />
      <path d={bottom} fill="#1a1918" stroke={INK_SOFT} strokeWidth={1} />
      <path
        d={top}
        fill={`url(#${id}-top)`}
        stroke={INK}
        strokeWidth={1}
        className="v3-draw"
        pathLength={1}
        style={{ ["--draw-delay" as string]: "0ms" }}
      />


      <g clipPath={`url(#${clip})`} className="v3-tag" style={{ ["--tag-delay" as string]: "350ms" }}>
        <path d={timeline} stroke={INK_LANE} strokeWidth={1.1} strokeDasharray="2.5 3.2" />
        <g transform={PLANE} stroke={INK_SOFT} strokeWidth={1} vectorEffect="non-scaling-stroke">
          <line x1={T0} y1={RULER_V} x2={T1} y2={RULER_V} />
          {Array.from({ length: 13 }, (_, i) => {
            const u = uAt(i * 5);
            const major = i % 3 === 0;
            return <line key={i} x1={u} y1={RULER_V} x2={u} y2={RULER_V - (major ? 7 : 3.5)} />;
          })}
        </g>
      </g>
      <g clipPath={`url(#${clip})`} className="v3-tag" style={{ ["--tag-delay" as string]: "600ms" }}>
        <g transform={PLANE}>
          <line x1={T0} y1={BEAT_V0 - 4} x2={T1} y2={BEAT_V0 - 4} stroke={INK_FAINT} strokeWidth={1} />
          {blocks.flatMap((b) => {
            const span = b.u1 - b.u0 - 6;
            return [0, 1, 2].map((k) => {
              const len = span * (k === 0 ? 0.92 : k === 1 ? 0.7 : 0.48);
              return (
                <rect
                  key={`${b.n}-${k}`}
                  x={b.u0 + 3}
                  y={BEAT_V0 + k * 5.5}
                  width={len}
                  height={2.2}
                  rx={1.1}
                  fill={k === 0 ? INK_SOFT : INK_FAINT}
                />
              );
            });
          })}
        </g>
      </g>


      {blocks.map((b, i) => (
        <g key={b.n} className="v3-node" style={{ ["--node-delay" as string]: `${700 + i * 110}ms` }}>
          <Box
            u0={b.u0}
            u1={b.u1}
            v0={-BLOCK_V}
            v1={BLOCK_V}
            h={BLOCK_H}
            top="#474645"
            left="#2c2b2a"
            right="#232221"
            stroke="rgba(244,243,243,0.42)"
          />
          <g transform={`translate(0 ${-BLOCK_H})`}>
            <g transform={PLANE} fill={TEXT}>
              <text x={b.u0 + 6} y={14} fontSize={15} fontWeight={500} className="font-sans">
                {b.n}
              </text>
              <text x={b.u0 + 6} y={26} fontSize={9} fill="rgba(244,243,243,0.72)" className="font-plex">
                {tc(b.start)} – {b.start + b.dur === 60 ? "1:00" : tc(b.start + b.dur)}
              </text>
            </g>
          </g>
        </g>
      ))}
      {blocks.map((b, i) => {
        const lift = BLOCK_H + CARD_LIFT;
        const v = CARD_VOFF;
        const uc = b.uc + CARD_UOFF;
        const centreTop = up(P(uc, v), BLOCK_H);
        const centreCard = up(P(uc, v), lift);
        return (
          <g key={`card-${b.n}`} className="v3-node" style={{ ["--node-delay" as string]: `${1100 + i * 110}ms` }}>
            <ellipse cx={centreTop[0] + 3} cy={centreTop[1] + 2} rx={20} ry={7} fill="rgba(0,0,0,0.22)" />
            <line
              x1={centreTop[0]}
              y1={centreTop[1]}
              x2={centreCard[0]}
              y2={centreCard[1]}
              stroke={INK_SOFT}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <Box
              u0={uc - CARD_U}
              u1={uc + CARD_U}
              v0={v - CARD_V}
              v1={v + CARD_V}
              h={3}
              dy={lift - 3}
              top="#333231"
              left="#211f1e"
              right="#1b1a19"
              stroke="rgba(244,243,243,0.4)"
            />
            <Cube u={uc - 12} v={v} delay={0} s={4} h={6} dy={lift + 3} />
            <g transform={`translate(0 ${-lift})`}>
              <g transform={PLANE}>
                <rect x={uc - 2} y={v - 6} width={20} height={2.6} rx={1.3} fill="rgba(244,243,243,0.55)" />
                <rect x={uc - 2} y={v + 1} width={13} height={2.6} rx={1.3} fill="rgba(244,243,243,0.3)" />
              </g>
            </g>
          </g>
        );
      })}

      {labels.map((label, i) => (
        <Label key={label.text} label={label} index={i} chipScale={scale} anchor={anchors[i]} />
      ))}
    </svg>
  );
}
