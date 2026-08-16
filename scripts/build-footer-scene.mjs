import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "hero");

const W = 2400;
const H = 810;
const SUN_X = 1944;
const SUN_Y = 356;
const BASELINE = 374;
const C = {
  skyPaper: "#eff1f2",
  skyTop: "#dde5f0",
  skyMid: "#ecedea",
  skyLow: "#f8e9cf",
  skyHaze: "#fcdfae",
  sun: "#fdf5e3",
  far1: "#c0c9d8",
  far1Deep: "#aab5ca",
  far1Snow: "#f3f6fb",
  far1Shade: "#9caac1",
  far2: "#97a4bd",
  far2Deep: "#8190ac",
  far2Snow: "#e3e9f2",
  far2Shade: "#74839e",
  ridgeA: "#96a29d",
  ridgeADeep: "#808e8c",
  ridgeA2: "#6b7d70",
  ridgeA2Deep: "#5b6d62",
  ridgeA2Tree: "#4f6155",
  ridgeB: "#3c5140",
  ridgeBDeep: "#2f4436",
  ridgeBTree: "#24382c",
  meadow: "#b7ba6b",
  meadowDeep: "#94a15b",
  field1: "#c9c878",
  field2: "#a7b365",
  field3: "#8b9a55",
  hedge: "#54653d",
  road: "#eddcae",
  near: "#31422f",
  nearMid: "#26311f",
  nearDeep: "#20281c",
  fore: "#1d1c1b",

  rim: "#fbe0a8",
  rimWarm: "rgba(251,224,168,0.4)",
};
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (v) => String(Math.round(v));
const pt = (p) => `${n(p.x)},${n(p.y)}`;
const poly = (pts) => `M${pts.map(pt).join("L")}Z`;
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const P = (d, attrs = "") => (d ? `<path ${attrs} d="${d}"/>` : "");
const brush = (color, opacity, w, clip) =>
  `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${opacity}"${
    clip ? ` clip-path="url(#${clip})"` : ""
  }`;

function crest(rng, { x0, x1, base, rise, summits, saddle, envelope }) {
  const pts = [];
  const span = (x1 - x0) / summits;
  let prev = null;

  for (let i = 0; i < summits; i++) {
    const sx = x0 + span * (i + 0.5) + (rng() - 0.5) * span * 0.5;
    const env = envelope ? envelope((sx - x0) / (x1 - x0)) : 1;
    const sy = base - rise * env * (0.6 + rng() * 0.4);

    if (prev === null) {
      pts.push({ x: x0, y: sy + saddle * (0.9 + rng() * 0.8) });
    } else {
      const mx = (prev.x + sx) / 2 + (rng() - 0.5) * span * 0.22;
      const my = Math.max(prev.y, sy) + saddle * (0.45 + rng() * 0.75);
      pts.push({ x: mx, y: my });
    }
    pts.push({
      x: sx - span * (0.1 + rng() * 0.13),
      y: sy + (base - sy) * (0.15 + rng() * 0.17),
    });
    pts.push({ x: sx, y: sy });
    pts.push({
      x: sx + span * (0.08 + rng() * 0.12),
      y: sy + (base - sy) * (0.13 + rng() * 0.19),
    });
    prev = { x: sx, y: sy };
  }

  pts.push({ x: x1, y: prev.y + saddle * (0.8 + rng() * 0.8) });

  const summitIdx = [];
  pts.forEach((p, i) => {
    if (i > 0 && i < pts.length - 1 && p.y < pts[i - 1].y && p.y < pts[i + 1].y)
      summitIdx.push(i);
  });
  return { pts, summitIdx };
}

const massPath = (pts, base) =>
  poly([...pts, { x: pts[pts.length - 1].x, y: base }, { x: pts[0].x, y: base }]);

function snowCaps(rng, pts, line, depth) {
  const runs = [];
  let run = null;
  for (const p of pts) {
    if (p.y <= line) (run ??= []).push(p);
    else if (run) {
      if (run.length > 1) runs.push(run);
      run = null;
    }
  }
  if (run && run.length > 1) runs.push(run);

  return runs
    .map((r) => {
      const under = [];
      for (let i = r.length - 1; i >= 0; i--) {
        const drop = depth * (0.35 + ((line - r[i].y) / depth) * 0.45 + rng() * 0.8);
        under.push({ x: r[i].x, y: r[i].y + drop });
        if (i > 0)
          under.push({
            x: (r[i].x + r[i - 1].x) / 2,
            y: (r[i].y + r[i - 1].y) / 2 + depth * (0.1 + rng() * 0.7),
          });
      }
      return poly([...r, ...under]);
    })
    .join("");
}

function shadeFaces(pts, summitIdx, base, slope = 0.36) {
  return summitIdx
    .map((k) => {
      let a = k;
      while (a > 0 && pts[a - 1].y > pts[a].y) a--;
      return poly([
        ...pts.slice(a, k + 1),
        { x: pts[k].x + (base - pts[k].y) * slope, y: base },
        { x: pts[a].x, y: base },
      ]);
    })
    .join("");
}
function yAt(pts, x) {
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return pts[pts.length - 1].y;
}

function conifer(x, y, h, w) {
  const hw = w / 2;
  const body = poly([
    { x: x - hw, y },
    { x: x - hw * 0.55, y: y - h * 0.34 },
    { x: x - hw * 0.79, y: y - h * 0.31 },
    { x: x - hw * 0.35, y: y - h * 0.65 },
    { x: x - hw * 0.54, y: y - h * 0.61 },
    { x, y: y - h },
    { x: x + hw * 0.54, y: y - h * 0.61 },
    { x: x + hw * 0.35, y: y - h * 0.65 },
    { x: x + hw * 0.79, y: y - h * 0.31 },
    { x: x + hw * 0.55, y: y - h * 0.34 },
    { x: x + hw, y },
  ]);
  if (h < 110) return body;
  const t = h * 0.018;
  return (
    body +
    poly([
      { x: x - t, y: y + h * 0.05 },
      { x: x + t, y: y + h * 0.05 },
      { x: x + t * 0.7, y: y - h * 0.09 },
      { x: x - t * 0.7, y: y - h * 0.09 },
    ])
  );
}
function broadleaf(rng, x, y, h) {
  const r = h * 0.44;
  let d = poly([
    { x: x - h * 0.05, y },
    { x: x + h * 0.05, y },
    { x: x + h * 0.032, y: y - h * 0.52 },
    { x: x - h * 0.032, y: y - h * 0.52 },
  ]);
  for (let i = 0; i < 4; i++) {
    const ang = -Math.PI * (0.18 + 0.64 * (i / 3));
    const cx = x + Math.cos(ang) * r * 0.52;
    const cy = y - h * 0.6 + Math.sin(ang) * r * 0.26;
    const rx = r * (0.42 + rng() * 0.2);
    const ry = rx * 0.86;
    d += `M${n(cx - rx)},${n(cy)}a${n(rx)},${n(ry)} 0 1,0 ${n(rx * 2)},0a${n(rx)},${n(
      ry,
    )} 0 1,0 ${n(-rx * 2)},0Z`;
  }
  return d;
}

function forest(
  rng,
  pts,
  { x0, x1, count, hMin, hMax, sink = 0, wRatio = 0.5, phase = 0, gaps = 0.34 },
) {
  let d = "";
  const step = (x1 - x0) / count;
  for (let i = 0; i < count; i++) {
    const x = x0 + step * (i + rng());
    const density =
      0.5 +
      0.5 *
        Math.sin(x * 0.0042 + phase) *
        (0.55 + 0.45 * Math.sin(x * 0.0161 + phase * 2.3));
    if (rng() > 1 - gaps + gaps * density) continue;
    const h = (hMin + rng() * (hMax - hMin)) * (0.62 + 0.5 * density);
    const y = yAt(pts, x) + sink * (0.15 + rng() * 1.1) + h * 0.04;
    d += conifer(x, y, h, h * wRatio * (0.86 + rng() * 0.32));
  }
  return d;
}

function blade(x, y, h, lean, w) {
  const tipX = x + lean;
  const tipY = y - h;
  const c1x = x + lean * 0.12;
  const c1y = y - h * 0.5;
  const c2x = x + lean * 0.62;
  const c2y = y - h * 0.84;
  return (
    `M${n(x - w)},${n(y)}` +
    `C${n(c1x - w * 0.6)},${n(c1y)} ${n(c2x - w * 0.25)},${n(c2y)} ${n(tipX)},${n(tipY)}` +
    `C${n(c2x + w * 0.35)},${n(c2y)} ${n(c1x + w * 0.75)},${n(c1y)} ${n(x + w)},${n(y)}Z`
  );
}

function texture(rng, { x0, x1, y0, y1, count, lenMin, lenMax, tilt = 0.3 }) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const len = lenMin + rng() * (lenMax - lenMin);
    d +=
      `M${n(x0 + rng() * (x1 - x0))},${n(y0 + rng() * (y1 - y0))}` +
      `l${n(len)},${n((rng() - 0.5) * len * tilt)}`;
  }
  return d;
}

function wobble(id, { scale, freq, seed, y }) {
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="-100" y="${y}" width="${
    W + 200
  }" height="${H + 120 - y}" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="t"/>
<feDisplacementMap in="SourceGraphic" in2="t" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;
}

const SOFT_SHADE = `<filter id="soften" filterUnits="userSpaceOnUse" x="-100" y="0" width="${
  W + 200
}" height="${H}" color-interpolation-filters="sRGB">
<feGaussianBlur stdDeviation="7"/>
</filter>`;


const GRAIN_DEFS = `
<filter id="grainF" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
<pattern id="grain" width="200" height="200" patternUnits="userSpaceOnUse">
  <rect width="200" height="200" filter="url(#grainF)"/>
</pattern>`;

const rimmed = (id, dx = 4, dy = -3) =>
  `<use href="#${id}" x="${dx}" y="${dy}" color="${C.rim}"/><use href="#${id}" color="${C.fore}"/>`;

const CAMERA = `
<g fill="currentColor" stroke="currentColor" stroke-linecap="round">
  <path d="M0,-84 L-30,2 M0,-84 L32,2 M0,-84 L6,2" stroke-width="4.2" fill="none"/>
  <path d="M-16,-44 L-2,-61 M17,-44 L3,-61" stroke-width="2.6" fill="none"/>
  <rect x="-6.5" y="-95" width="13" height="12" rx="2"/>
  <rect x="-21" y="-128" width="38" height="33" rx="4"/>
  <rect x="-43" y="-125" width="24" height="28" rx="2.5"/>
  <rect x="-54" y="-119" width="13" height="16" rx="2"/>
  <rect x="-15" y="-139" width="26" height="6.5" rx="3"/>
  <path d="M-10,-133 L-10,-128 M6,-133 L6,-128" stroke-width="3.6" fill="none"/>
  <rect x="16" y="-125" width="16" height="11" rx="3"/>
  <path d="M-12,-139 L-13,-145" stroke-width="2.8" fill="none"/>
  <rect x="-28" y="-162" width="22" height="17" rx="2.5"/>
  <path d="M13,-95 L34,-81" stroke-width="3.2" fill="none"/>
</g>`;

const OPERATOR = `
<g fill="currentColor">
  <ellipse cx="1" cy="-138" rx="7.6" ry="8.6"/>
  <path d="M-2,-130 C-9,-129 -12,-124 -12,-118 L-13,-94 L-11,-70 L11,-70 L13,-94 L12,-118 C12,-124 9,-129 3,-130 Z"/>
  <path d="M-11,-72 L-1,-72 L-2,-40 L-3,-2 L-12,-2 L-13,-40 Z"/>
  <path d="M2,-72 L11,-72 L12,-40 L12,-2 L3,-2 L2,-40 Z"/>
  <path d="M-11,-122 L-31,-101 L-25,-95 L-6,-114 Z"/>
  <path d="M11,-122 L16,-98 L10,-96 L5,-119 Z"/>
</g>`;

const DIRECTOR = `
<g fill="currentColor" stroke="currentColor" stroke-linecap="round">
  <path d="M-20,2 L14,-40 M14,2 L-20,-40" stroke-width="3.6" fill="none"/>
  <rect x="-23" y="-47" width="39" height="6" rx="2"/>
  <path d="M-20,-45 L-22,-86 M13,-45 L11,-86" stroke-width="3.6" fill="none"/>
  <rect x="-24" y="-88" width="38" height="8.5" rx="3"/>
</g>
<g fill="currentColor">
  <ellipse cx="-3" cy="-101" rx="7.2" ry="8.2"/>
  <path d="M-6,-94 C-12,-93 -14,-88 -14,-83 L-13,-62 L-11,-50 L7,-50 L8,-64 L7,-84 C7,-89 4,-93 -1,-94 Z"/>
  <path d="M-11,-52 L6,-52 L4,-42 L-38,-42 L-40,-51 Z"/>
  <path d="M-40,-50 L-30,-50 L-31,-24 L-32,-2 L-41,-2 L-42,-26 Z"/>
  <path d="M-12,-84 L-33,-70 L-30,-63 L-8,-75 Z"/>
</g>`;

const BOUNCE = `
<g fill="currentColor" stroke="currentColor" stroke-linecap="round">
  <path d="M0,-92 L0,-14" stroke-width="4" fill="none"/>
  <path d="M0,-16 L-18,2 M0,-16 L18,2 M0,-16 L3,2" stroke-width="3.4" fill="none"/>
  <path d="M0,-90 L-17,-99" stroke-width="3.6" fill="none"/>
  <circle cx="0" cy="-90" r="4"/>
</g>
<g transform="rotate(-21 -25 -114)">
  <ellipse cx="-25" cy="-114" rx="26" ry="31" fill="${C.rim}"/>
  <ellipse cx="-25" cy="-114" rx="26" ry="31" fill="none" stroke="${C.fore}" stroke-width="3.6"/>
  <path d="M-43,-131 A26,31 0 0 0 -47,-105" fill="none" stroke="${C.sun}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
</g>`;

const CASES = `
<g fill="currentColor">
  <rect x="-30" y="-34" width="60" height="36" rx="3"/>
  <rect x="-23" y="-59" width="46" height="26" rx="3"/>
  <rect x="-9" y="-65" width="18" height="7" rx="3.5"/>
</g>`;

const LAMP = `
<g fill="currentColor" stroke="currentColor" stroke-linecap="round">
  <path d="M0,-104 L0,-16" stroke-width="3.6" fill="none"/>
  <path d="M0,-18 L-16,2 M0,-18 L16,2 M0,-18 L3,2" stroke-width="3.2" fill="none"/>
  <g transform="rotate(-10 0 -118)">
    <rect x="-10" y="-132" width="25" height="27" rx="2.5"/>
    <path d="M-10,-132 L-31,-140 L-31,-135 L-10,-128 Z"/>
    <path d="M-10,-105 L-31,-98 L-31,-103 L-10,-110 Z"/>
    <rect x="13" y="-126" width="7" height="15" rx="2"/>
  </g>
</g>`;

const VAN = `
<g fill="currentColor">
  <path d="M-30,0 L-30,-19 L4,-19 L11,-11 L30,-11 L30,0 Z"/>
  <circle cx="-19" cy="1" r="4.2"/>
  <circle cx="20" cy="1" r="4.2"/>
</g>`;

const CANOPY = `
<g fill="currentColor" stroke="currentColor">
  <path d="M-26,-16 L0,-28 L26,-16 Z"/>
  <path d="M-23,-16 L-23,0 M23,-16 L23,0" stroke-width="2.6" fill="none"/>
</g>`;

const DRONE = `
<g transform="rotate(-5)">
  <path d="M-6,-2 L-21,-7 M6,-2 L21,-7 M-6.5,2 L-24,9 M6.5,2 L24,9"
        fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <g fill="currentColor">
    <rect x="-9.5" y="-4.6" width="19" height="10" rx="4.2"/>
    <path d="M-9,-0.4 L-13.6,0.6 L-9,1.6 Z"/>
    <path d="M-2,5 L2.4,5 L2,7.2 L-1.6,7.2 Z"/>
    <circle cx="0.3" cy="8.4" r="2.5"/>
    <circle cx="-21" cy="-7" r="1.9"/>
    <circle cx="21" cy="-7" r="1.9"/>
    <circle cx="-24" cy="9" r="2.1"/>
    <circle cx="24" cy="9" r="2.1"/>
  </g>
  <g fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.3">
    <ellipse cx="-21" cy="-9.1" rx="12.5" ry="2.8"/>
    <ellipse cx="21" cy="-9.1" rx="12.5" ry="2.8"/>
    <ellipse cx="-24" cy="6.7" rx="14.5" ry="3.3"/>
    <ellipse cx="24" cy="6.7" rx="14.5" ry="3.3"/>
  </g>
</g>`;


function buildFar() {
  const rng = mulberry32(20260731);
  const env = (t) => Math.max(0.3, Math.pow(Math.abs(t - 0.5) * 2, 1.05));
  const r1 = crest(rng, {
    x0: -90,
    x1: W + 90,
    base: 472,
    rise: 344,
    summits: 9,
    saddle: 46,
    envelope: env,
  });
  const r2 = crest(rng, {
    x0: -90,
    x1: W + 90,
    base: 520,
    rise: 248,
    summits: 12,
    saddle: 40,
    envelope: (t) => Math.max(0.26, Math.abs(t - 0.44) * 2),
  });
  let clouds = "";
  for (const c of [
    { y: 100, w: 560, h: 30, x: 300, o: 0.66 },
    { y: 164, w: 360, h: 20, x: 1190, o: 0.46 },
    { y: 76, w: 320, h: 17, x: 1830, o: 0.4 },
    { y: 218, w: 420, h: 20, x: 1560, o: 0.28 },
    { y: 192, w: 250, h: 14, x: 760, o: 0.3 },
  ]) {
    const lumps = [];
    const count = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const bulge = Math.sin(t * Math.PI) * (0.55 + rng() * 0.45);
      lumps.push(
        `<ellipse cx="${n(c.x + (t - 0.5) * c.w)}" cy="${n(
          c.y - c.h * bulge * 0.35,
        )}" rx="${n(c.w * (0.12 + rng() * 0.09))}" ry="${n(
          c.h * (0.5 + bulge * 0.7),
        )}"/>`,
      );
    }
    clouds += `<g opacity="${c.o}">${lumps.join("")}<rect x="${n(
      c.x - c.w / 2,
    )}" y="${n(c.y - 2)}" width="${n(c.w)}" height="4" rx="2"/></g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
<defs>
  <!-- The first stop is nearly the page's own paper. The band butts straight
       up against the #f4f3f3 link grid, and starting the sky on full cool blue
       put a hard colour seam along that join. -->
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.skyPaper}"/>
    <stop offset="0.17" stop-color="${C.skyTop}"/>
    <stop offset="0.4" stop-color="${C.skyMid}"/>
    <stop offset="0.66" stop-color="${C.skyLow}"/>
    <stop offset="0.9" stop-color="${C.skyHaze}"/>
  </linearGradient>
  <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="rgba(252,213,146,0.88)"/>
    <stop offset="0.34" stop-color="rgba(250,206,138,0.32)"/>
    <stop offset="1" stop-color="rgba(250,206,138,0)"/>
  </radialGradient>
  <linearGradient id="m1g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.far1Deep}"/>
    <stop offset="1" stop-color="${C.far1}"/>
  </linearGradient>
  <linearGradient id="m2g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.far2Deep}"/>
    <stop offset="1" stop-color="${C.far2}"/>
  </linearGradient>
  <!-- Shade faces die out well above the base: a flat fill leaves a hard
       horizontal cut across the range where the wedge ends. -->
  <linearGradient id="sh1" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.far1Shade}"/>
    <stop offset="0.55" stop-color="${C.far1Shade}" stop-opacity="0.35"/>
    <stop offset="1" stop-color="${C.far1Shade}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="sh2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.far2Shade}"/>
    <stop offset="0.5" stop-color="${C.far2Shade}" stop-opacity="0.35"/>
    <stop offset="1" stop-color="${C.far2Shade}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="haze1" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgba(251,235,209,0)"/>
    <stop offset="1" stop-color="rgba(251,235,209,0.72)"/>
  </linearGradient>
  <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#5f6b79" stop-opacity="0.42"/>
    <stop offset="1" stop-color="#5f6b79" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="clipR1"><path d="${massPath(r1.pts, 540)}"/></clipPath>
  <clipPath id="clipR2"><path d="${massPath(r2.pts, 580)}"/></clipPath>
  ${wobble("wobFar", { scale: 10, freq: "0.005", seed: 3, y: 110 })}
  ${SOFT_SHADE}
  ${GRAIN_DEFS}
</defs>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<ellipse cx="${SUN_X}" cy="${SUN_Y}" rx="900" ry="480" fill="url(#sunGlow)"/>
<circle cx="${SUN_X}" cy="${SUN_Y}" r="31" fill="${C.sun}"/>

<g fill="#ffffff">${clouds}</g>

<!-- Trail fades out behind rather than running at one value to the frame edge:
     a uniform dashed line reads as a drawn rule, a fading one as air. -->
<path d="M452,226 C578,180 736,174 892,206" fill="none" stroke="url(#trail)" stroke-width="2.2" stroke-dasharray="7 15" stroke-linecap="round"/>
<g color="#5f6b79" opacity="0.66" transform="translate(392,236) scale(1.1)">${DRONE}</g>

<g filter="url(#wobFar)">
  ${P(massPath(r1.pts, 540), `fill="url(#m1g)"`)}
  <g clip-path="url(#clipR1)">
    <g filter="url(#soften)">
      ${P(shadeFaces(r1.pts, r1.summitIdx, 540), `fill="url(#sh1)"`)}
    </g>
    ${P(snowCaps(rng, r1.pts, 366, 58), `fill="${C.far1Snow}"`)}
  </g>

  ${P(massPath(r2.pts, 580), `fill="url(#m2g)"`)}
  <g clip-path="url(#clipR2)">
    <g filter="url(#soften)">
      ${P(shadeFaces(r2.pts, r2.summitIdx, 580), `fill="url(#sh2)"`)}
    </g>
    ${P(snowCaps(rng, r2.pts, 396, 36), `fill="${C.far2Snow}"`)}
  </g>
  <rect x="-90" y="430" width="${W + 180}" height="150" fill="url(#haze1)"/>
</g>

<rect width="${W}" height="${H}" fill="url(#grain)" opacity="0.05" style="mix-blend-mode:multiply"/>
</svg>
`;
}

function buildNear() {
  const rng = mulberry32(77771);
  const a = crest(rng, {
    x0: -90,
    x1: W + 90,
    base: BASELINE + 106,
    rise: 138,
    summits: 9,
    saddle: 34,
    envelope: (t) => 0.5 + 0.5 * Math.pow(Math.abs(t - 0.38) * 2, 1.2),
  });

  const a2 = crest(rng, {
    x0: -90,
    x1: W + 90,
    base: 566,
    rise: 122,
    summits: 8,
    saddle: 22,
    envelope: (t) => 0.42 + 0.58 * Math.pow(Math.abs(t - 0.56) * 2, 1.1),
  });
  const b = crest(rng, {
    x0: -90,
    x1: W + 90,
    base: 636,
    rise: 152,
    summits: 9,
    saddle: 24,
    envelope: (t) => 0.28 + 0.72 * Math.pow(1 - t, 1.3),
  });

  const meadow = [];
  for (let x = -90; x <= W + 90; x += 40) {
    const t = (x + 90) / (W + 180);
    meadow.push({
      x,
      y: 628 - 16 * Math.sin(t * 5.4 + 0.7) - 10 * Math.sin(t * 13.1) + (rng() - 0.5) * 6,
    });
  }

  const hill = [];
  for (let x = -90; x <= W + 90; x += 26) {
    const t = (x + 90) / (W + 180);
    const y =
      704 +
      82 * smooth(0.02, 0.3, t) * (1 - smooth(0.34, 0.56, t)) -
      128 * smooth(0.42, 0.76, t) + 
      24 * smooth(0.92, 1, t); 
    hill.push({ x, y: y + Math.sin(t * 14.5) * 7 + (rng() - 0.5) * 7 });
  }
  let fields = "";
  const TONES = [C.field1, C.field2, C.field3, C.meadowDeep];
  for (let i = 0; i < 26; i++) {
    const x = -80 + rng() * (W + 160);
    const y = 616 + rng() * 150;
    const w = 150 + rng() * 340;
    const h = 18 + rng() * 40;
    const skew = (rng() - 0.5) * 110;
    fields += P(
      poly([
        { x, y },
        { x: x + w, y: y - 7 + rng() * 14 },
        { x: x + w + skew, y: y + h },
        { x: x + skew * 0.4, y: y + h + 6 },
      ]),
      `fill="${TONES[i % 4]}" opacity="${n(0.24 + rng() * 0.28)}"`,
    );
  }
  const spine = [
    { x: 430, y: 750, w: 60 },
    { x: 620, y: 727, w: 49 },
    { x: 800, y: 707, w: 39 },
    { x: 970, y: 691, w: 30 },
    { x: 1130, y: 677, w: 22 },
    { x: 1280, y: 665, w: 15 },
    { x: 1410, y: 655, w: 9 },
    { x: 1520, y: 647, w: 5 },
  ];
  let road = "";
  for (let i = 0; i < spine.length - 1; i++) {
    const p = spine[i];
    const q = spine[i + 1];
    road += poly([
      { x: p.x, y: p.y - p.w / 2 },
      { x: q.x, y: q.y - q.w / 2 },
      { x: q.x, y: q.y + q.w / 2 },
      { x: p.x, y: p.y + p.w / 2 },
    ]);
  }
  let fence = "";
  {
    const posts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      posts.push({
        x: 372 + t * 1010,
        y: 742 - t * 88 - 12 * Math.sin(t * 2.4),
        h: 20 - t * 13,
      });
    }
    for (const p of posts)
      fence += poly([
        { x: p.x - p.h * 0.075, y: p.y },
        { x: p.x + p.h * 0.075, y: p.y },
        { x: p.x + p.h * 0.06, y: p.y - p.h },
        { x: p.x - p.h * 0.06, y: p.y - p.h },
      ]);
    for (const f of [0.42, 0.82])
      for (let i = 0; i < posts.length - 1; i++) {
        const p = posts[i];
        const q = posts[i + 1];
        fence += poly([
          { x: p.x, y: p.y - p.h * f },
          { x: q.x, y: q.y - q.h * f },
          { x: q.x, y: q.y - q.h * f + 1.8 },
          { x: p.x, y: p.y - p.h * f + 1.8 },
        ]);
      }
  }
  let hedges = "";
  for (let i = 0; i < 32; i++) {
    const t = rng();
    const x = -60 + t * (W * 0.76);
    const y = 638 + rng() * 132;
    hedges += broadleaf(rng, x, y, 14 + ((y - 634) / 132) * 36 + rng() * 10);
  }

  const sward = [];
  for (let x = -60; x <= W + 60; x += 30) {
    const t = (x + 60) / (W + 120);
    const edge = Math.pow(Math.min(1, Math.abs(x - W * 0.44) / (W * 0.5)), 1.8);
    sward.push({
      x,
      y: 792 - 34 * edge - 8 * Math.sin(t * 21) - 5 * Math.sin(t * 47 + 1.3),
    });
  }

  let grass = "";
  let grassRim = "";
  const BLADES = 660;
  for (let i = 0; i < BLADES; i++) {
    const t = i / BLADES;
    const x = -60 + t * (W + 120) + (rng() - 0.5) * 16;
    const edge = Math.pow(Math.min(1, Math.abs(x - W * 0.44) / (W * 0.5)), 1.75);
    const h = (30 + rng() * 78) * (0.5 + edge * 1.85);
    const y = H + 16 - rng() * 48;
    const lean = (rng() - 0.5) * h * 0.6;
    const d = blade(x, y, h, lean, 2.2 + rng() * 3.4);
    grass += d;
    if (rng() < 0.3) grassRim += d;
  }

  let stems = "";
  let heads = "";
  const FLOWERS = 34;
  for (let i = 0; i < FLOWERS; i++) {
    const pick = rng();
    const x =
      pick < 0.5
        ? -40 + rng() * 600 
        : pick < 0.88
          ? 1860 + rng() * 580 
          : 620 + rng() * 1200; /* a few strays */
    const edge = Math.pow(Math.min(1, Math.abs(x - W * 0.44) / (W * 0.5)), 1.6);
    const h = (74 + rng() * 108) * (0.5 + edge * 1.3);
    const y = H + 12 - rng() * 42;
    const lean = (rng() - 0.5) * h * 0.34;
    const tx = x + lean;
    const ty = y - h;
    stems += `M${n(x)},${n(y)}Q${n(x + lean * 0.18)},${n(y - h * 0.58)} ${n(tx)},${n(ty)}`;

    if (rng() < 0.55) {
      const rays = 5 + Math.floor(rng() * 3);
      for (let k = 0; k < rays; k++) {
        const ang = -Math.PI * (0.12 + (0.76 * k) / (rays - 1));
        const r = 13 + rng() * 13;
        const hx = tx + Math.cos(ang) * r;
        const hy = ty + Math.sin(ang) * r * 0.6;
        heads += `<circle cx="${n(hx)}" cy="${n(hy)}" r="${n(2.6 + rng() * 1.8)}"/>`;
        stems += `M${n(tx)},${n(ty)}L${n(hx)},${n(hy)}`;
      }
    } else {
      heads += `<circle cx="${n(tx)}" cy="${n(ty)}" r="${n(4.4 + rng() * 3)}"/>`;
    }
  }
  const stand = (x, s, id) =>
    `<g transform="translate(${x},${n(yAt(hill, x) + 16)})${
      s === 1 ? "" : ` scale(${s})`
    }">${rimmed(id)}</g>`;

  const unit = [
    stand(1500, 0.98, "bounce"),
    stand(1980, 0.9, "lamp"),
    stand(1672, 1.1, "camera"),
    stand(1742, 1.06, "operator"),
    stand(1884, 1, "director"),
    stand(2120, 0.86, "cases"),
  ].join("\n");
  const heroFirs =
    conifer(596, yAt(hill, 596) + 20, 372, 118) +
    conifer(676, yAt(hill, 676) + 30, 316, 104) +
    conifer(232, yAt(hill, 232) + 16, 398, 128);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
<defs>
  <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.ridgeADeep}"/>
    <stop offset="1" stop-color="${C.ridgeA}"/>
  </linearGradient>
  <linearGradient id="a2G" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.ridgeA2Deep}"/>
    <stop offset="1" stop-color="${C.ridgeA2}"/>
  </linearGradient>
  <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.ridgeBDeep}"/>
    <stop offset="1" stop-color="${C.ridgeB}"/>
  </linearGradient>
  <linearGradient id="meadowG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.meadow}"/>
    <stop offset="1" stop-color="${C.meadowDeep}"/>
  </linearGradient>
  <linearGradient id="hillG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.near}"/>
    <stop offset="0.4" stop-color="${C.nearMid}"/>
    <stop offset="1" stop-color="${C.fore}"/>
  </linearGradient>
  <linearGradient id="hazeA" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgba(249,231,201,0)"/>
    <stop offset="1" stop-color="rgba(249,231,201,0.52)"/>
  </linearGradient>
  <linearGradient id="hazeB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgba(246,226,188,0)"/>
    <stop offset="1" stop-color="rgba(246,226,188,0.3)"/>
  </linearGradient>
  <!-- The rake of low light across the meadow: strongest under the sun, gone
       by the left edge. A flat warm wash over the whole floor is what turned
       an earlier pass beige. -->
  <radialGradient id="rake" cx="${n(SUN_X / W)}" cy="0.08" r="0.6">
    <stop offset="0" stop-color="rgba(253,222,160,0.6)"/>
    <stop offset="0.48" stop-color="rgba(253,222,160,0.18)"/>
    <stop offset="1" stop-color="rgba(253,222,160,0)"/>
  </radialGradient>
  <!-- Backlight pooling along the crest the crew stand on. -->
  <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="rgba(255,233,184,0.66)"/>
    <stop offset="1" stop-color="rgba(255,233,184,0)"/>
  </radialGradient>
  <clipPath id="clipA"><path d="${massPath(a.pts, 660)}"/></clipPath>
  <clipPath id="clipA2"><path d="${massPath(a2.pts, 700)}"/></clipPath>
  <clipPath id="clipB"><path d="${massPath(b.pts, 740)}"/></clipPath>
  <!-- Fields are cut to the meadow mass, so none ride up over the ridge behind
       or spill past the near hill in front. -->
  <clipPath id="clipMeadow"><path d="${massPath(meadow, H + 40)}"/></clipPath>
  <clipPath id="clipHill"><path d="${massPath(hill, H + 40)}"/></clipPath>
  <!-- Grain is clipped to this layer's own opaque region. Left unclipped, a
       multiply-blended noise rect over the transparent upper half would
       composite against nothing and lay grey haze across the sky. -->
  <clipPath id="clipOpaque"><path d="${massPath(a.pts, H + 40)}"/></clipPath>
  ${wobble("wobA", { scale: 7, freq: "0.0075", seed: 11, y: 300 })}
  ${wobble("wobB", { scale: 8, freq: "0.0065", seed: 23, y: 420 })}
  ${wobble("wobHill", { scale: 9, freq: "0.005", seed: 19, y: 520 })}
  ${GRAIN_DEFS}

  <g id="camera">${CAMERA}</g>
  <g id="operator">${OPERATOR}</g>
  <g id="director">${DIRECTOR}</g>
  <g id="bounce">${BOUNCE}</g>
  <g id="cases">${CASES}</g>
  <g id="lamp">${LAMP}</g>
</defs>

<!-- Ridge A: the occluder that crosses the wordmark -->
<g filter="url(#wobA)">
  ${P(massPath(a.pts, 660), `fill="url(#aG)"`)}
  ${P(
    texture(rng, {
      x0: -80,
      x1: W + 80,
      y0: 380,
      y1: 620,
      count: 300,
      lenMin: 20,
      lenMax: 78,
    }),
    brush("#ffffff", 0.2, 2.6, "clipA"),
  )}
</g>
${P(
  forest(rng, a.pts, {
    x0: -70,
    x1: W + 70,
    count: 190,
    hMin: 10,
    hMax: 26,
    sink: 4,
    phase: 0.9,
    gaps: 0.45,
  }),
  `fill="${C.ridgeADeep}" opacity="0.75"`,
)}
<rect x="-90" y="470" width="${W + 180}" height="130" fill="url(#hazeA)"/>

<!-- Ridge A2: the intermediate step -->
<g filter="url(#wobA)">
  ${P(massPath(a2.pts, 700), `fill="url(#a2G)"`)}
  ${P(
    texture(rng, {
      x0: -80,
      x1: W + 80,
      y0: 440,
      y1: 690,
      count: 280,
      lenMin: 20,
      lenMax: 76,
    }),
    brush("#d8e0b4", 0.16, 2.6, "clipA2"),
  )}
</g>
${P(
  forest(rng, a2.pts, {
    x0: -70,
    x1: W + 70,
    count: 170,
    hMin: 13,
    hMax: 32,
    sink: 5,
    phase: 4.2,
    gaps: 0.44,
  }),
  `fill="${C.ridgeA2Tree}" opacity="0.9"`,
)}
<rect x="-90" y="556" width="${W + 180}" height="120" fill="url(#hazeA)"/>

<!-- Ridge B: the dark forest band, weighted left -->
<g filter="url(#wobB)">
  ${P(massPath(b.pts, 740), `fill="url(#bG)"`)}
  ${P(
    texture(rng, {
      x0: -80,
      x1: W + 80,
      y0: 470,
      y1: 700,
      count: 260,
      lenMin: 22,
      lenMax: 84,
    }),
    brush("#c8d29a", 0.2, 2.8, "clipB"),
  )}
</g>
${P(
  forest(rng, b.pts, {
    x0: -70,
    x1: W + 70,
    count: 150,
    hMin: 18,
    hMax: 46,
    sink: 7,
    phase: 2.1,
    gaps: 0.4,
  }),
  `fill="${C.ridgeBTree}"`,
)}
<rect x="-90" y="620" width="${W + 180}" height="104" fill="url(#hazeB)"/>

<!-- The light band: meadow, fields, road, hedgerows, the parked unit -->
${P(massPath(meadow, H + 40), `fill="url(#meadowG)"`)}
<g clip-path="url(#clipMeadow)">
  ${fields}
  ${P(
    texture(rng, {
      x0: -80,
      x1: W + 80,
      y0: 620,
      y1: 800,
      count: 420,
      lenMin: 16,
      lenMax: 62,
    }),
    brush(C.field3, 0.4, 2.4),
  )}
  ${P(road, `fill="${C.road}" opacity="0.92"`)}
  ${P(fence, `fill="${C.hedge}" opacity="0.72"`)}
  ${P(hedges, `fill="${C.hedge}" opacity="0.68"`)}
  <g color="${C.fore}" opacity="0.7">
    <g transform="translate(1052,687) scale(0.56)">${VAN}</g>
    <g transform="translate(1168,678) scale(0.48)">${CANOPY}</g>
  </g>
  <rect x="-90" y="600" width="${W + 180}" height="210" fill="url(#rake)"/>
</g>

<!-- Backlight pooling behind the bluff, so the crew read against light -->
<ellipse cx="1860" cy="596" rx="640" ry="152" fill="url(#pool)"/>

<!-- Near hill / the bluff -->
<g filter="url(#wobHill)">
  ${P(massPath(hill, H + 40), `fill="url(#hillG)"`)}
  ${P(
    texture(rng, {
      x0: -80,
      x1: W + 80,
      y0: 580,
      y1: 810,
      count: 300,
      lenMin: 18,
      lenMax: 70,
    }),
    brush("#8fa46f", 0.19, 2.6, "clipHill"),
  )}
</g>

${unit}

<!-- The fir stand framing the left edge, its mid-ground echo, and a smaller
     answer on the right. These are the only trees big enough to carry trunks,
     and the tallest deliberately reach up into the wordmark. -->
${P(
  forest(rng, hill, {
    x0: -80,
    x1: 740,
    count: 22,
    hMin: 120,
    hMax: 300,
    sink: 30,
    wRatio: 0.33,
    phase: 5.1,
    gaps: 0.34,
  }),
  `fill="${C.nearDeep}"`,
)}
${P(
  forest(rng, hill, {
    x0: -80,
    x1: 720,
    count: 26,
    hMin: 130,
    hMax: 360,
    sink: 20,
    wRatio: 0.33,
    phase: 1.4,
    gaps: 0.3,
  }) + heroFirs,
  `fill="${C.fore}"`,
)}
${P(
  forest(rng, hill, {
    x0: 560,
    x1: 1140,
    count: 20,
    hMin: 48,
    hMax: 128,
    sink: 22,
    wRatio: 0.38,
    phase: 3.3,
    gaps: 0.45,
  }),
  `fill="${C.nearDeep}"`,
)}
${P(
  forest(rng, hill, {
    x0: 2180,
    x1: W + 80,
    count: 10,
    hMin: 90,
    hMax: 240,
    sink: 22,
    wRatio: 0.33,
    phase: 0.4,
    gaps: 0.25,
  }),
  `fill="${C.fore}"`,
)}

<!-- Foreground. Rim copies are OFFSET before the ink is laid over them —
     drawn in register they are covered pixel for pixel and the whole warm edge
     silently does nothing, which is exactly what happened for two passes. -->
<g transform="translate(3.5,-2.5)">
  ${P(grassRim, `fill="${C.rim}" opacity="0.6"`)}
  ${P(stems, `stroke="${C.rim}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.55"`)}
  <g fill="${C.rim}" opacity="0.75">${heads}</g>
</g>
${P(massPath(sward, H + 40), `fill="${C.fore}"`)}
${P(grass, `fill="${C.fore}"`)}
${P(stems, `stroke="${C.fore}" stroke-width="2.6" fill="none" stroke-linecap="round"`)}
<g fill="${C.fore}">${heads}</g>

<rect width="${W}" height="${H}" fill="url(#grain)" opacity="0.055" clip-path="url(#clipOpaque)" style="mix-blend-mode:multiply"/>
</svg>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, svg] of [
  ["footer-far.svg", buildFar()],
  ["footer-near.svg", buildNear()],
]) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, svg);
  console.log(`  ${name}  ${(svg.length / 1024).toFixed(1)} KB`);
}
console.log("footer scene built");
