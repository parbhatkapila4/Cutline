"use client";
import { useEffect, useRef, useState } from "react";
import {
  Billboard,
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

const PERIOD_MS = 4800;
const ENG_U0 = -46;
const ENG_U1 = 46;
const ENG_V = 52;
const ENG_H = 36;
const PITCH = 22;
const QUEUE_U = [-152, -130, -108, -86];
const INCOMING_U = QUEUE_U[0] - PITCH;
const TILE_U0 = 80;
const TILE_U1 = 168;
const TILE_V = 34;
const TILE_H = 6;
const FORMATS: { label: string; w: number; h: number; u: number; chosen?: boolean }[] = [
  { label: "16:9", w: 40, h: 25, u: 64 },
  { label: "9:16", w: 18, h: 36, u: 100, chosen: true },
  { label: "1:1", w: 26, h: 27, u: 129 },
  { label: "4:5", w: 21, h: 28, u: 160 },
];
const FORMAT_V = 64;

type Pt = [number, number];
const up = (p: Pt, dy: number): Pt => [p[0], p[1] - dy];

function Shadow({
  u0,
  u1,
  v0,
  v1,
  du,
  dv,
  opacity = 0.38,
}: {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  du: number;
  dv: number;
  opacity?: number;
}) {
  const pts = [P(u0 + du, v0 + dv), P(u1 + du, v0 + dv), P(u1 + du, v1 + dv), P(u0 + du, v1 + dv)];
  return <polygon points={pts.map(pt).join(" ")} fill={`rgba(0,0,0,${opacity})`} />;
}

function usePercent(
  svgRef: React.RefObject<SVGSVGElement | null>,
  barRef: React.RefObject<SVGRectElement | null>,
) {
  const [pct, setPct] = useState(62);
  useEffect(() => {
    const node = svgRef.current;
    if (!node || typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;
    let timer: number | null = null;
    const tick = () => {
      const anim = barRef.current?.getAnimations?.()[0];
      const t = anim?.currentTime;
      if (typeof t !== "number") return;
      const phase = (t % PERIOD_MS) / PERIOD_MS;
      const p = Math.min(1, phase / 0.88);
      setPct(Math.round(3 + 97 * p));
    };
    const observer = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      if (on && timer === null) {
        timer = window.setInterval(tick, 120);
      } else if (!on && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearInterval(timer);
    };
  }, [svgRef, barRef]);
  return pct;
}

export function RenderSlab({ className = "", id = "render" }: { className?: string; id?: string }) {
  const top = slabPath(SLAB_U, SLAB_V, SLAB_R);
  const bottom = slabPath(SLAB_U, SLAB_V, SLAB_R, SLAB_DEPTH);
  const clip = `${id}-clip`;
  const fade = `${id}-fade`;
  const { ref, scale } = useChipScale();
  const barRef = useRef<SVGRectElement | null>(null);
  const pct = usePercent(ref, barRef);
  const laneFar = `M${pt(P(-420, 0))}L${pt(P(420, 0))}`;
  const laneIn = `M${pt(P(-420, 0))}L${pt(P(ENG_U0, 0))}`;
  const laneOut = `M${pt(P(TILE_U1, 0))}L${pt(P(420, 0))}`;
  const speedAnchor = P((QUEUE_U[1] + QUEUE_U[2]) / 2, 17);
  const outputAnchor = up(P(TILE_U1 - 9, -TILE_V + 8), TILE_H);
  const scaleAnchor = up(P(-14, ENG_V - 2), ENG_H);

  const labels: LaneLabel[] = [
    {
      text: "Speed",
      icon: "motion",
      seg: 0,
      t: 0,
      side: "top",
      y: 40,
      caption: ["Queued with an ETA:", "~2 min per job by default"],
    },
    {
      text: "Output",
      icon: "render",
      seg: 0,
      t: 0,
      side: "top",
      y: 104,
      caption: ["1080p H.264 MP4,", "burned captions, no watermark"],
    },
    {
      text: "Scale",
      icon: "workers",
      seg: 0,
      t: 0,
      side: "bottom",
      y: 330,
      caption: ["Queue-backed workers;", "batch renders over the API"],
    },
  ];
  const anchors = [
    { x: speedAnchor[0], y: speedAnchor[1] },
    { x: outputAnchor[0], y: outputAnchor[1] },
    { x: scaleAnchor[0], y: scaleAnchor[1] },
  ];
  const tileTop = [
    up(P(TILE_U0, -TILE_V), TILE_H),
    up(P(TILE_U1, -TILE_V), TILE_H),
    up(P(TILE_U1, TILE_V), TILE_H),
    up(P(TILE_U0, TILE_V), TILE_H),
  ];
  const tileCentre = up(P((TILE_U0 + TILE_U1) / 2, 0), TILE_H);
  const chosen = FORMATS.find((f) => f.chosen) ?? FORMATS[1];
  const chosenBase = P(chosen.u, FORMAT_V);

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
        <linearGradient id={`${id}-eng-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c5b5a" />
          <stop offset="1" stopColor="#3a3938" />
        </linearGradient>
        <linearGradient id={`${id}-eng-left`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4e4d4c" />
          <stop offset="1" stopColor="#302f2e" />
        </linearGradient>
        <linearGradient id={`${id}-eng-right`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#343332" />
          <stop offset="1" stopColor="#1e1d1c" />
        </linearGradient>
        <linearGradient id={`${id}-tile-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6a6968" />
          <stop offset="1" stopColor="#434241" />
        </linearGradient>
        <linearGradient id={`${id}-flash`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor="#b0d67e" stopOpacity={0.3} />
          <stop offset="1" stopColor="#b0d67e" stopOpacity={0} />
        </radialGradient>
        <clipPath id={clip}>
          <path d={top} />
        </clipPath>
        <clipPath id={`${id}-tile-clip`}>
          <polygon points={tileTop.map(pt).join(" ")} />
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
        d={laneFar}
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
        <path d={laneIn} stroke={INK_LANE} strokeWidth={1.1} strokeDasharray="2.5 3.2" className="v3-march" />
        <path d={laneOut} stroke={INK_LANE} strokeWidth={1.1} strokeDasharray="2.5 3.2" className="v3-march" />
        <Shadow u0={ENG_U0} u1={ENG_U1} v0={-ENG_V} v1={ENG_V} du={16} dv={9} />
        <Shadow u0={TILE_U0} u1={TILE_U1} v0={-TILE_V} v1={TILE_V} du={7} dv={4} opacity={0.34} />
        <ellipse cx={chosenBase[0]} cy={chosenBase[1] + 2} rx={22} ry={8} fill={`url(#${id}-halo)`} className="v3-chosen" />
        <g transform={PLANE} className="font-plex" fontSize={9.5}>
          {FORMATS.map((f) => (
            <text
              key={f.label}
              x={f.u}
              y={FORMAT_V + 11}
              textAnchor="middle"
              fill={f.chosen ? "rgba(244,243,243,0.85)" : "rgba(244,243,243,0.5)"}
            >
              {f.label}
            </text>
          ))}
        </g>
      </g>
      <g className="v3-queue">
        <g className="v3-cube-in">
          <Shadow u0={INCOMING_U - 6} u1={INCOMING_U + 6} v0={-6} v1={6} du={3} dv={2} opacity={0.3} />
          <Cube u={INCOMING_U} v={0} delay={0} />
        </g>
        {QUEUE_U.map((u, i) => (
          <g key={u} className={i === QUEUE_U.length - 1 ? "v3-cube-out" : undefined}>
            <Shadow u0={u - 6} u1={u + 6} v0={-6} v1={6} du={3} dv={2} opacity={0.3} />
            <Cube u={u} v={0} delay={700 + i * 80} />
          </g>
        ))}
      </g>
      <g className="v3-node" style={{ ["--node-delay" as string]: "1000ms" }}>
        <Box
          u0={ENG_U0}
          u1={ENG_U1}
          v0={-ENG_V}
          v1={ENG_V}
          h={ENG_H}
          top={`url(#${id}-eng-top)`}
          left={`url(#${id}-eng-left)`}
          right={`url(#${id}-eng-right)`}
          stroke="rgba(244,243,243,0.5)"
        />
        <polyline
          points={[up(P(ENG_U0, ENG_V), ENG_H), up(P(ENG_U0, -ENG_V), ENG_H), up(P(ENG_U1, -ENG_V), ENG_H)].map(pt).join(" ")}
          stroke="rgba(255,255,255,0.32)"
          strokeWidth={1}
        />
        <g transform={`translate(0 ${-ENG_H})`}>
          <g transform={PLANE}>
            <text x={ENG_U0 + 10} y={-ENG_V + 21} fontSize={10.5} fill={TEXT} className="font-plex" letterSpacing="0.08em">
              RENDER
            </text>
            <text x={ENG_U0 + 10} y={-ENG_V + 34} fontSize={8.5} fill="rgba(244,243,243,0.6)" className="font-plex">
              single pass
            </text>
            <text x={ENG_U0 + 10} y={ENG_V - 28} fontSize={9} fill="rgba(244,243,243,0.7)" className="font-plex">
              {pct}%
            </text>
            <rect x={ENG_U0 + 10} y={ENG_V - 22} width={ENG_U1 - ENG_U0 - 20} height={5} rx={2.5} fill="rgba(244,243,243,0.12)" />
            <rect
              ref={barRef}
              x={ENG_U0 + 10}
              y={ENG_V - 22}
              width={ENG_U1 - ENG_U0 - 20}
              height={5}
              rx={2.5}
              fill="#9fd854"
              className="v3-bar"
            />
          </g>
        </g>
        <g transform={`translate(0 ${-ENG_H})`}>
          <g transform={PLANE}>
            <ellipse
              cx={ENG_U0 + 10 + (ENG_U1 - ENG_U0 - 20) / 2}
              cy={ENG_V - 20}
              rx={(ENG_U1 - ENG_U0 - 20) / 2 + 6}
              ry={11}
              fill={`url(#${id}-halo)`}
              opacity={0.9}
              className="v3-bar"
            />
          </g>
        </g>
      </g>
      <g className="v3-node" style={{ ["--node-delay" as string]: "1250ms" }}>
        <g className="v3-tile">
          <Box
            u0={TILE_U0}
            u1={TILE_U1}
            v0={-TILE_V}
            v1={TILE_V}
            h={TILE_H}
            top={`url(#${id}-tile-top)`}
            left="#2a2928"
            right="#201f1e"
            stroke="rgba(244,243,243,0.55)"
          />
          <g transform={`translate(0 ${-TILE_H})`}>
            <g transform={PLANE}>
              <polygon points={`${TILE_U0 + 10},${-TILE_V + 13} ${TILE_U0 + 10},${-TILE_V + 27} ${TILE_U0 + 21},${-TILE_V + 20}`} fill="#9fd854" />
              <text x={TILE_U0 + 27} y={-TILE_V + 24} fontSize={12} fontWeight={500} fill={TEXT} className="font-sans">
                MP4
              </text>
              <text x={TILE_U0 + 10} y={-TILE_V + 42} fontSize={8.5} fill="rgba(244,243,243,0.72)" className="font-plex">
                H.264 · 1080p
              </text>
              <text x={TILE_U0 + 10} y={-TILE_V + 54} fontSize={8} fill="rgba(244,243,243,0.55)" className="font-plex">
                burned captions
              </text>
            </g>
          </g>
          <g clipPath={`url(#${id}-tile-clip)`}>
            <rect
              x={tileCentre[0] - 26}
              y={tileCentre[1] - 60}
              width={52}
              height={120}
              fill={`url(#${id}-flash)`}
              className="v3-sweep"
            />
          </g>
          <polygon
            points={tileTop.map(pt).join(" ")}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.4}
            className="v3-rim"
          />
        </g>
      </g>
      <g className="v3-node" style={{ ["--node-delay" as string]: "1450ms" }}>
        {FORMATS.map((f) => (
          <g key={f.label} className={f.chosen ? "v3-chosen" : undefined}>
            <Billboard
              u0={f.u - f.w / 2}
              u1={f.u + f.w / 2}
              v={FORMAT_V}
              h={f.h}
              fill="#2e2d2c"
              stroke={f.chosen ? "rgba(244,243,243,0.75)" : "rgba(244,243,243,0.45)"}
              inner={f.chosen ? "#9fd854" : "#4b4a49"}
            />
          </g>
        ))}
      </g>

      {labels.map((label, i) => (
        <Label key={label.text} label={label} index={i} chipScale={scale} anchor={anchors[i]} />
      ))}
    </svg>
  );
}
