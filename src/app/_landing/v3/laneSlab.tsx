"use client";

import { useEffect, useRef, useState } from "react";

export const CX = 300;
export const CY = 190;
const ISO_U: [number, number] = [0.866, 0.5];
const ISO_V: [number, number] = [-0.866, 0.5];

export const SLAB_U = 190;
export const SLAB_V = 88;
export const SLAB_R = 40;
export const SLAB_DEPTH = 11;

const PITCH = 32;
const RUN = SLAB_V - 24;
const SEGMENTS = 21;

export const INK = "rgba(244,243,243,0.6)";
export const INK_SOFT = "rgba(244,243,243,0.30)";
export const INK_LANE = "rgba(244,243,243,0.46)";
export const INK_FAINT = "rgba(244,243,243,0.2)";
export const TEXT = "rgba(244,243,243,0.82)";
export function P(u: number, v: number): [number, number] {
  return [CX + u * ISO_U[0] + v * ISO_V[0], CY + u * ISO_U[1] + v * ISO_V[1]];
}
const n = (x: number) => Math.round(x * 100) / 100;
export const pt = (p: [number, number]) => `${n(p[0])},${n(p[1])}`;
export const PLANE = `matrix(${ISO_U[0]} ${ISO_U[1]} ${ISO_V[0]} ${ISO_V[1]} ${CX} ${CY})`;
export function slabPath(hu: number, hv: number, r: number, dy = 0, cu0 = 0, cv0 = 0): string {
  const pts: [number, number][] = [];
  const corner = (cu: number, cv: number, a0: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      pts.push(P(cu0 + cu + r * Math.cos(a), cv0 + cv + r * Math.sin(a)));
    }
  };
  corner(hu - r, -hv + r, -Math.PI / 2);
  corner(hu - r, hv - r, 0);
  corner(-hu + r, hv - r, Math.PI / 2);
  corner(-hu + r, -hv + r, Math.PI);
  return (
    `M${pts.map(([x, y]) => `${n(x)},${n(y + dy)}`).join("L")}Z`
  );
}
function centrePath(): string {
  const u0 = -((SEGMENTS - 1) / 2) * PITCH;
  const r = PITCH / 2;
  let d = "";
  for (let i = 0; i < SEGMENTS; i++) {
    const u = u0 + i * PITCH;
    const down = i % 2 === 0;
    const vStart = down ? -RUN : RUN;
    const vEnd = down ? RUN : -RUN;
    if (i === 0) d += `M${pt(P(u, vStart - 40))}`;
    d += `L${pt(P(u, vEnd))}`;
    if (i === SEGMENTS - 1) {
      d += `L${pt(P(u, vEnd + (down ? 40 : -40)))}`;
      break;
    }
    const cu = u + r;
    const steps = 12;
    for (let k = 1; k <= steps; k++) {
      const a = Math.PI + (k / steps) * Math.PI;
      d += `L${pt(P(cu + r * Math.cos(a), vEnd + (down ? 1 : -1) * r * -Math.sin(a)))}`;
    }
  }
  return d;
}
function runPoint(seg: number, t: number): [number, number] {
  const u0 = -((SEGMENTS - 1) / 2) * PITCH;
  const u = u0 + seg * PITCH;
  const down = seg % 2 === 0;
  const v = (down ? -1 : 1) * RUN * (1 - 2 * t);
  return [u, v];
}

const CUBE = { top0: "#f4ffd9", top1: "#8ccf42", left: "#79bd44", right: "#4d8d2c" };
export function CubeDefs() {
  return (
    <>
      <linearGradient id="lane-cube-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={CUBE.top0} />
        <stop offset="1" stopColor={CUBE.top1} />
      </linearGradient>
      <linearGradient id="lane-cube-left" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#95d455" />
        <stop offset="1" stopColor={CUBE.left} />
      </linearGradient>
      <linearGradient id="lane-cube-right" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6fb23c" />
        <stop offset="1" stopColor={CUBE.right} />
      </linearGradient>
      <radialGradient id="lane-glow">
        <stop offset="0" stopColor="#b0d67e" stopOpacity={0.35} />
        <stop offset="1" stopColor="#b0d67e" stopOpacity={0} />
      </radialGradient>
    </>
  );
}

export function Cube({
  u,
  v,
  delay,
  s = 6,
  h = 9,
  dy = 0,
}: {
  u: number;
  v: number;
  delay: number;
  s?: number;
  h?: number;
  dy?: number;
}) {
  const lift = (p: [number, number]): [number, number] => [p[0], p[1] - h / 2 - dy];
  const a = lift(P(u - s, v - s));
  const b = lift(P(u + s, v - s));
  const c = lift(P(u + s, v + s));
  const d = lift(P(u - s, v + s));
  const dn = (p: [number, number]): [number, number] => [p[0], p[1] + h];
  return (
    <g className="v3-node" style={{ ["--node-delay" as string]: `${delay}ms` }}>
      <ellipse
        cx={c[0] - (c[0] - a[0]) / 2}
        cy={c[1] + h - 1}
        rx={12}
        ry={4}
        fill="url(#lane-glow)"
      />
      <polygon points={[d, c, dn(c), dn(d)].map(pt).join(" ")} fill="url(#lane-cube-left)" />
      <polygon points={[c, b, dn(b), dn(c)].map(pt).join(" ")} fill="url(#lane-cube-right)" />
      <polygon points={[a, b, c, d].map(pt).join(" ")} fill="url(#lane-cube-top)" />
      <polyline
        points={[d, a, b].map(pt).join(" ")}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={0.9}
      />
      <polyline
        points={[d, c, b].map(pt).join(" ")}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={0.8}
      />
      <line x1={c[0]} y1={c[1]} x2={c[0]} y2={c[1] + h} stroke="rgba(0,0,0,0.25)" strokeWidth={0.8} />
    </g>
  );
}


export type LaneIcon =
  | "intent"
  | "narrative"
  | "shots"
  | "script"
  | "voice"
  | "captions"
  | "motion"
  | "visuals"
  | "render"
  | "brief"
  | "workers";

function Icon({ kind }: { kind: LaneIcon }) {
  const p = { fill: "none", stroke: TEXT, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "intent":
      return (
        <g {...p}>
          <circle cx={12} cy={12} r={6.5} />
          <circle cx={12} cy={12} r={2} />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </g>
      );
    case "narrative":
      return (
        <g {...p}>
          <path d="M5 5.5h6.5a2 2 0 0 1 2 2V19a2 2 0 0 0-2-2H5zM19 5.5h-5.5" />
          <path d="M19 5.5V17h-5.5" />
        </g>
      );
    case "shots":
      return (
        <g {...p}>
          <rect x={3.5} y={6} width={17} height={12} rx={2} />
          <path d="M8 6v12M16 6v12M3.5 10h4.5M3.5 14h4.5M16 10h4.5M16 14h4.5" />
        </g>
      );
    case "script":
      return (
        <g {...p}>
          <path d="M5 6.5h14M5 10.5h14M5 14.5h9M5 18.5h6" />
        </g>
      );
    case "voice":
      return (
        <g {...p}>
          <path d="M4 12v1M8 8v8M12 5v14M16 8v8M20 11v2" />
        </g>
      );
    case "captions":
      return (
        <g {...p}>
          <rect x={3.5} y={5} width={17} height={14} rx={2.5} />
          <path d="M7 13.5h5M14 13.5h3M7 10h3" />
        </g>
      );
    case "motion":
      return (
        <g {...p}>
          <rect x={3.5} y={5} width={17} height={14} rx={2.5} />
          <path d="M8 16l6-6M10 10h4v4" />
        </g>
      );
    case "visuals":
      return (
        <g {...p}>
          <rect x={3.5} y={5} width={17} height={14} rx={2.5} />
          <path d="M6 16l4-4.5 3 3 2-2 3.5 3.5" />
          <circle cx={15.5} cy={9} r={1.4} />
        </g>
      );
    case "render":
      return (
        <g {...p}>
          <rect x={3.5} y={5} width={17} height={14} rx={2.5} />
          <path d="M10.5 9.5v5l4-2.5z" />
        </g>
      );
    case "brief":
      return (
        <g {...p}>
          <rect x={3.5} y={5} width={17} height={14} rx={2.5} />
          <rect x={6.5} y={8} width={4.5} height={4.5} rx={1} />
          <path d="M13.5 9h4M13.5 12.5h4M6.5 16h11" />
        </g>
      );
    case "workers":
      return (
        <g {...p}>
          <rect x={4} y={4.5} width={16} height={4.2} rx={1.3} />
          <rect x={4} y={10} width={16} height={4.2} rx={1.3} />
          <rect x={4} y={15.5} width={16} height={4.2} rx={1.3} />
          <path d="M7 6.6h0.01M7 12.1h0.01M7 17.6h0.01" strokeWidth={2.2} />
        </g>
      );
  }
}

export type LabelAnchor = { x: number; y: number };
const upBy = (p: [number, number], dy: number): [number, number] => [p[0], p[1] - dy];
export function Box({
  u0,
  u1,
  v0,
  v1,
  h,
  dy = 0,
  top,
  left,
  right,
  stroke,
  className,
}: {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  h: number;
  dy?: number;
  top: string;
  left: string;
  right: string;
  stroke: string;
  className?: string;
}) {
  const a = upBy(P(u0, v0), dy);
  const b = upBy(P(u1, v0), dy);
  const c = upBy(P(u1, v1), dy);
  const d = upBy(P(u0, v1), dy);
  const A = upBy(a, h);
  const B = upBy(b, h);
  const C = upBy(c, h);
  const D = upBy(d, h);
  return (
    <g className={className}>
      <polygon points={[D, C, c, d].map(pt).join(" ")} fill={left} />
      <polygon points={[C, B, b, c].map(pt).join(" ")} fill={right} />
      <polygon points={[A, B, C, D].map(pt).join(" ")} fill={top} stroke={stroke} strokeWidth={1} />
    </g>
  );
}

export function Billboard({
  u0,
  u1,
  v,
  h,
  fill,
  stroke,
  inner,
}: {
  u0: number;
  u1: number;
  v: number;
  h: number;
  fill: string;
  stroke: string;
  inner?: string;
}) {
  const a = P(u0, v);
  const b = P(u1, v);
  const pts = [a, b, upBy(b, h), upBy(a, h)];
  const inset = 2.5;
  const ia = P(u0 + inset, v);
  const ib = P(u1 - inset, v);
  const bb = P(u1, v - 3);
  return (
    <g>
      <polygon points={[b, bb, upBy(bb, h), upBy(b, h)].map(pt).join(" ")} fill="#1d1c1b" stroke={stroke} strokeWidth={1} />
      <polygon points={pts.map(pt).join(" ")} fill={fill} stroke={stroke} strokeWidth={1} />
      {inner ? (
        <polygon
          points={[upBy(ia, inset), upBy(ib, inset), upBy(ib, h - inset), upBy(ia, h - inset)].map(pt).join(" ")}
          fill={inner}
        />
      ) : null}
    </g>
  );
}

export type LaneLabel = {
  text: string;
  icon: LaneIcon;
  seg: number;
  t: number;
  side: "top" | "bottom";
  y: number;
  pill?: "left" | "right";
  caption?: string[];
  delay?: number;
};
export function Label({
  label,
  index,
  chipScale,
  anchor,
}: {
  label: LaneLabel;
  index: number;
  chipScale: number;
  anchor?: LabelAnchor;
}) {
  const [tx, ty] = anchor ? [anchor.x, anchor.y] : P(...runPoint(label.seg, label.t));
  const ICON = 26;
  const pillW = 18 + label.text.length * 6.95;
  const x = tx;
  const y = label.y;
  const delay = label.delay ?? 900 + index * 120;
  const half = (ICON / 2) * chipScale;
  const flip =
    label.pill === "left" ||
    (label.pill !== "right" && x + (ICON / 2 + 6 + pillW) * chipScale > 590);
  const pillX = flip ? x - ICON / 2 - 6 - pillW : x + ICON / 2 + 6;
  return (
    <g className="v3-tag" style={{ ["--tag-delay" as string]: `${delay}ms` }}>
      <line x1={tx} y1={ty} x2={x} y2={label.side === "top" ? y + half : y - half} stroke={INK_SOFT} strokeWidth={1} />
      <circle cx={tx} cy={ty} r={2.4} fill="#1d1c1b" stroke={INK} strokeWidth={1} />
      <g transform={`translate(${x} ${y}) scale(${chipScale}) translate(${-x} ${-y})`}>
        <rect x={x - ICON / 2} y={y - ICON / 2} width={ICON} height={ICON} rx={7} fill="#232221" stroke={INK_SOFT} strokeWidth={1} />
        <g transform={`translate(${x - 12} ${y - 12})`}>
          <Icon kind={label.icon} />
        </g>
        <rect x={pillX} y={y - 12} width={pillW} height={24} rx={7} fill="#232221" stroke={INK_SOFT} strokeWidth={1} />
        <text
          x={pillX + pillW / 2}
          y={y + 4}
          textAnchor="middle"
          className="font-plex"
          fontSize={11.5}
          letterSpacing="0.03em"
          fill={TEXT}
        >
          {label.text}
        </text>
        {chipScale < 1.25 && label.caption?.map((line, i) => {
          const lines = label.caption?.length ?? 0;
          const cy =
            label.side === "bottom"
              ? y + ICON / 2 + 14 + i * 14
              : y - ICON / 2 - 8 - (lines - 1 - i) * 14;
          return (
            <text
              key={line}
              x={flip ? pillX : x - ICON / 2}
              y={cy}
              className="font-sans"
              fontSize={11}
              fontWeight={500}
              fill="rgba(244,243,243,0.5)"
            >
              {line}
            </text>
          );
        })}
      </g>
    </g>
  );
}
export function useChipScale() {
  const ref = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600;
      const next = Math.min(1.8, Math.max(1, 560 / Math.max(w, 1)));
      setScale((prev) => (Math.abs(prev - next) < 0.02 ? prev : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

export function LaneSlab({
  labels,
  cubes,
  className = "",
  id,
}: {
  labels: LaneLabel[];
  cubes: [number, number][];
  className?: string;
  id: string;
}) {
  const top = slabPath(SLAB_U, SLAB_V, SLAB_R);
  const bottom = slabPath(SLAB_U, SLAB_V, SLAB_R, SLAB_DEPTH);
  const line = centrePath();
  const placed = cubes
    .map(([seg, t], i) => ({ p: runPoint(seg, t), i }))
    .sort((a, b) => a.p[0] + a.p[1] - (b.p[0] + b.p[1]));
  const clip = `${id}-clip`;
  const fade = `${id}-fade`;
  const { ref, scale } = useChipScale();

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
      <g mask={`url(#${id}-mask)`} stroke={INK_FAINT} strokeWidth={1} strokeDasharray="3 4" className="v3-tag" style={{ ["--tag-delay" as string]: "500ms" }}>
        <path d={line} transform={`translate(${CX} ${CY}) scale(1.6) translate(${-CX} ${-CY})`} />
      </g>
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
      {labels.length > 0 ? (
        <path
          clipPath={`url(#${clip})`}
          d={slabPath(PITCH / 2 - 3, RUN + 6, PITCH / 2 - 3, 0, runPoint(labels[labels.length - 1].seg, 0)[0], 0)}
          fill="rgba(244,243,243,0.06)"
          className="v3-tag"
          style={{ ["--tag-delay" as string]: "800ms" }}
        />
      ) : null}
      <path
        d={line}
        clipPath={`url(#${clip})`}
        stroke={INK_LANE}
        strokeWidth={1.1}
        strokeDasharray="2.5 3.2"
        className="v3-tag"
        style={{ ["--tag-delay" as string]: "350ms" }}
      />

      {placed.map(({ p, i }) => (
        <Cube key={i} u={p[0]} v={p[1]} delay={700 + i * 70} />
      ))}

      {labels.map((label, i) => (
        <Label key={label.text} label={label} index={i} chipScale={scale} />
      ))}
    </svg>
  );
}
