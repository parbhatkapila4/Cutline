"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "./primitives";

const CELL_W = 12;
const CELL_H = 7;
const GAP_X = 3;
const GAP_Y = 4;
const PITCH_X = CELL_W + GAP_X;
const PITCH_Y = CELL_H + GAP_Y;
const SECOND = 30;
const SPLICE = 5;
const MAX_DPR = 2;
const LEVELS = 24;
const IDLE_ALPHA = 0.017;
const BG = "#161514";
const TONES: [[number, number, number], [number, number, number]][] = [
  [
    [226, 160, 20],
    [255, 243, 216],
  ],
  [
    [214, 210, 202],
    [255, 255, 255],
  ],
];
const FEATHER = 110;
const RESIDUE_ALPHA = 0.1;
const RESIDUE_FADE_MS = 280;
const RESIDUE_FADE = 0.05;
const STILL_SECONDS = 11;

type Pass = {
  lane0: number;
  lanes: number;
  stagger: number;
  tau: number;
  speed: number;
  x: number;
  tone: number;
};

export type MaskBlock = {
  ref: RefObject<HTMLElement | null>;
  inside: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function levelStyle(tone: number, level: number) {
  const k = level / (LEVELS - 1);
  const [base, hot] = TONES[tone];
  const mix = smooth(0.7, 1, k);
  const r = Math.round(lerp(base[0], hot[0], mix));
  const g = Math.round(lerp(base[1], hot[1], mix));
  const b = Math.round(lerp(base[2], hot[2], mix));
  const alpha = Math.min(1, Math.pow(k, 1.15));
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

const STYLES = TONES.map((_, tone) =>
  Array.from({ length: LEVELS }, (_, i) => levelStyle(tone, i)),
);
function cellGain(i: number) {
  let h = (i + 1) * 0x9e3779b1;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return 0.42 + 0.58 * ((h >>> 0) / 4294967296);
}

function spawnPass(rows: number, rnd: () => number): Pass {
  const playhead = rnd() < 0.22;
  const lanes = playhead
    ? rnd() < 0.4
      ? 2
      : 1
    : 20 + Math.floor(rnd() * 25);
  const lane0 = Math.floor(rnd() * Math.max(1, rows - lanes + 1));
  return {
    lane0,
    lanes,
    stagger: playhead ? 0 : 0.55 + rnd() * 0.3,
    tau: playhead ? 0.5 + rnd() * 0.3 : 0.45 + rnd() * 0.35,
    speed: playhead ? 24 + rnd() * 8 : 7 + rnd() * 4,
    x: -1,
    tone: playhead ? 1 : 0,
  };
}

export function HeroField({
  blocks: maskBlocks = [],
  className = "",
}: {
  blocks?: MaskBlock[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const masks = useRef(maskBlocks);
  useEffect(() => {
    masks.current = maskBlocks;
  });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d", { alpha: false });
    if (!context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;
    const host = canvas.parentElement ?? canvas;
    const rnd = mulberry32(0x5eed1);

    let W = 0;
    let H = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let colX = new Float32Array(0);
    let mask = new Float32Array(0);
    let hit = new Float32Array(0);
    let tau = new Float32Array(0);
    let tone = new Uint8Array(0);
    let base: HTMLCanvasElement | null = null;
    let plate: HTMLCanvasElement | null = null;
    let plateCtx: CanvasRenderingContext2D | null = null;
    const buckets: number[][] = Array.from(
      { length: LEVELS * TONES.length },
      () => [],
    );
    let passes: Pass[] = [];
    let t = 0;
    let last = -1;
    let nextSpawn = 0.3;
    let lastFade = 0;
    let raf = 0;
    let onScreen = true;
    let disposed = false;

    const layer = () => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
      const cx = c.getContext("2d");
      if (cx) cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return c;
    };

    function build() {
      const rect = host.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const xs: number[] = [];
      for (let c = 0, x = 0; x < W; c++) {
        xs.push(x);
        x += PITCH_X + ((c + 1) % SECOND === 0 ? SPLICE : 0);
      }
      cols = xs.length;
      colX = Float32Array.from(xs);
      rows = Math.ceil(H / PITCH_Y);
      const n = cols * rows;
      const prevHit = hit;
      const prevTau = tau;
      const prevTone = tone;
      hit = new Float32Array(n).fill(-1e9);
      tau = new Float32Array(n).fill(1);
      tone = new Uint8Array(n);
      if (prevHit.length === n) {
        hit.set(prevHit);
        tau.set(prevTau);
        tone.set(prevTone);
      }
      mask = new Float32Array(n);
      const blocks = masks.current
        .map((b) => ({
          inside: b.inside,
          box: b.ref.current?.getBoundingClientRect(),
        }))
        .filter(
          (b): b is { inside: number; box: DOMRect } =>
            !!b.box && b.box.width > 0,
        )
        .map(({ inside, box }) => ({
          inside,
          x0: box.left - rect.left,
          y0: box.top - rect.top,
          x1: box.right - rect.left,
          y1: box.bottom - rect.top,
        }));
      for (let r = 0; r < rows; r++) {
        const cy = r * PITCH_Y + CELL_H / 2;
        const v = 0.3 + 0.7 * smooth(60, 250, cy);
        for (let c = 0; c < cols; c++) {
          const cx = colX[c] + CELL_W / 2;
          let m = v;
          for (const b of blocks) {
            const dx = Math.max(b.x0 - cx, 0, cx - b.x1);
            const dy = Math.max(b.y0 - cy, 0, cy - b.y1);
            const d = Math.hypot(dx, dy);
            m *= b.inside + (1 - b.inside) * smooth(0, FEATHER, d);
          }
          mask[r * cols + c] = m;
        }
      }
      base = layer();
      const bctx = base.getContext("2d");
      if (bctx) {
        bctx.fillStyle = BG;
        bctx.fillRect(0, 0, W, H);
        for (let q = 1; q <= 4; q++) {
          bctx.fillStyle = `rgba(244,243,243,${(IDLE_ALPHA * (0.4 + 0.6 * (q / 4))).toFixed(4)})`;
          for (let r = 0; r < rows; r++) {
            const y = r * PITCH_Y;
            for (let c = 0; c < cols; c++) {
              if (Math.min(4, Math.ceil(mask[r * cols + c] * 4)) !== q) continue;
              bctx.fillRect(colX[c], y, CELL_W, CELL_H);
            }
          }
        }
      }
      plate = layer();
      plateCtx = plate.getContext("2d");
      if (plateCtx) plateCtx.drawImage(base, 0, 0, W, H);
    }

    function residue(i: number) {
      if (!plateCtx) return;
      const a = RESIDUE_ALPHA * mask[i];
      if (a < 0.008) return;
      plateCtx.fillStyle = `rgba(232,198,126,${a.toFixed(3)})`;
      plateCtx.fillRect(
        colX[i % cols],
        Math.floor(i / cols) * PITCH_Y,
        CELL_W,
        CELL_H,
      );
    }

    function step(dt: number) {
      t += dt;
      while (nextSpawn <= t) {
        passes.push(spawnPass(rows, rnd));
        nextSpawn += 0.8 + rnd() * 0.9;
      }
      for (const p of passes) {
        const prev = p.x;
        p.x += p.speed * dt;
        for (let k = 0; k < p.lanes; k++) {
          const lane = p.lane0 + k;
          if (lane >= rows) break;
          const lag = k * p.stagger;
          const from = Math.floor(prev - lag);
          const to = Math.floor(p.x - lag);
          for (let c = from + 1; c <= to; c++) {
            if (c < 0 || c >= cols) continue;
            const i = lane * cols + c;
            hit[i] = t;
            tau[i] = p.tau;
            tone[i] = p.tone;
            residue(i);
          }
        }
      }
      passes = passes.filter(
        (p) => p.x - (p.lanes - 1) * p.stagger - p.tau * p.speed * 4 < cols,
      );
      if (t - lastFade > RESIDUE_FADE_MS / 1000 && plateCtx && base) {
        lastFade = t;
        plateCtx.globalAlpha = RESIDUE_FADE;
        plateCtx.drawImage(base, 0, 0, W, H);
        plateCtx.globalAlpha = 1;
      }
    }

    function paint() {
      if (!plate) return;
      ctx.drawImage(plate, 0, 0, W, H);
      for (const b of buckets) b.length = 0;
      const n = cols * rows;
      for (let i = 0; i < n; i++) {
        const age = t - hit[i];
        if (age > 4.2 * tau[i]) continue;
        const heat = Math.exp(-age / tau[i]) * mask[i] * cellGain(i);
        if (heat < 0.03) continue;
        const level = Math.min(LEVELS - 1, Math.round(heat * (LEVELS - 1)));
        if (level > 0) buckets[tone[i] * LEVELS + level].push(i);
      }
      for (let slot = 1; slot < buckets.length; slot++) {
        const b = buckets[slot];
        if (!b.length) continue;
        ctx.fillStyle = STYLES[Math.floor(slot / LEVELS)][slot % LEVELS];
        for (const i of b) {
          ctx.fillRect(
            colX[i % cols],
            Math.floor(i / cols) * PITCH_Y,
            CELL_W,
            CELL_H,
          );
        }
      }
    }

    function frame(now: number) {
      raf = 0;
      if (disposed) return;
      const dt = last < 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      paint();
      schedule();
    }

    function schedule() {
      if (disposed || reduced || !onScreen || document.hidden || raf) return;
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = -1;
    }

    function still() {
      const fixed = 1 / 30;
      for (let i = 0; i < STILL_SECONDS * 30; i++) step(fixed);
      paint();
    }

    build();
    if (reduced) {
      still();
    } else {
      schedule();
    }

    const ro = new ResizeObserver(() => {
      build();
      if (reduced) {
        still();
      } else {
        paint();
      }
    });
    ro.observe(host);

    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
          (entries) => {
            onScreen = entries.some((e) => e.isIntersecting);
            if (onScreen) schedule();
            else pause();
          },
          { threshold: 0 },
        );
    io?.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) pause();
      else schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      pause();
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none block ${className}`}
    />
  );
}
