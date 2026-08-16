import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "hero", "canvas-plate.jpg");
const W = 2200;
const H = 1000;
const STROKES = 30000;
const SKY_HIGH = ["#e6ecf3", "#dde5ef", "#f2eee2", "#e8e2d4", "#d4dde9", "#f6f2e7"];
const SKY_MID = ["#f1ebdc", "#e8e2d1", "#dbe3eb", "#f5f0e3", "#e4dbc7", "#edefef"];
const CLOUD_LIT = ["#fdfaf2", "#faf6ea", "#f6f1e3", "#fffdf8", "#f3ecdd", "#fbf8ee"];
const CLOUD_SHADE = ["#dbd7cf", "#d1d3d9", "#dfd8ca", "#ced3db", "#e3ddd0"];
const HILL = ["#a4b19c", "#99a995", "#b1b99f", "#92a38f", "#b9bda3", "#8b9e8d"];
const MEADOW_LIT = ["#cfcf80", "#dad58c", "#c3c776", "#e2da96", "#c9cb7b", "#d6d287"];
const MEADOW_MID = ["#a3b166", "#98a85d", "#aeb970", "#8f9f55", "#b8c07a", "#9dae63"];
const MEADOW_DEEP = ["#7d8b52", "#71804a", "#8a9760", "#697845", "#93a06a"];
const TREE = [
  "#66784f",
  "#5c6e46",
  "#71835a",
  "#526440",
  "#7c8d61",
  "#6b7d54",
  "#87976a",
  "#5f7149",
];
const ACCENT = ["#c98b5e", "#d3a05f", "#b8724f", "#e0bb72"];

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(30260731);
const CLOUDS = [
  { x: 380, y: 118, rx: 460, ry: 112 },
  { x: 1080, y: 74, rx: 400, ry: 88 },
  { x: 1760, y: 138, rx: 470, ry: 110 },
  { x: 760, y: 236, rx: 340, ry: 72 },
  { x: 1520, y: 286, rx: 300, ry: 68 },
  { x: 150, y: 292, rx: 290, ry: 66 },
];
const TREES = [];
{
  const r = mulberry32(4242);
  for (const side of [
    { cx: 110, dir: 1 },
    { cx: 2090, dir: -1 },
  ]) {
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      TREES.push({
        x: side.cx + side.dir * r() * 230 - side.dir * 60,
        y: 288 + t * 500 + (r() - 0.5) * 96,
        rx: 80 + r() * 115,
        ry: 74 + r() * 120,
      });
    }
  }
  for (let i = 0; i < 7; i++)
    TREES.push({
      x: 320 + r() * 1560,
      y: 452 + r() * 34,
      rx: 55 + r() * 95,
      ry: 30 + r() * 30,
    });
}
const n = (v) => String(Math.round(v));
const pickOne = (arr) => arr[(rng() * arr.length) | 0];
const inside = (p, m) => ((p.x - m.x) / m.rx) ** 2 + ((p.y - m.y) / m.ry) ** 2;
function sample(x, y) {
  const p = { x, y };
  const t = y / H;

  for (const m of TREES)
    if (inside(p, m) < 1 + rng() * 1.05)
      return { c: TREE, ang: 74, jit: 42, len: 0.9 };

  for (const c of CLOUDS)
    if (inside(p, c) < 1 + rng() * 0.55)
      return {
        c: y > c.y + c.ry * 0.2 && rng() < 0.58 ? CLOUD_SHADE : CLOUD_LIT,
        ang: 6,
        jit: 22,
        len: 1.25,
      };

  if (t < 0.31) return { c: SKY_HIGH, ang: 4, jit: 16, len: 1.2 };
  if (t < 0.46) return { c: SKY_MID, ang: 3, jit: 14, len: 1.25 };
  if (t < 0.55) return { c: HILL, ang: 2, jit: 18, len: 0.95 };
  if (t < 0.68) return { c: MEADOW_MID, ang: 4, jit: 22, len: 1 };
  if (t < 0.84)
    return {
      c: rng() < 0.5 ? MEADOW_LIT : MEADOW_MID,
      ang: 5,
      jit: 26,
      len: 1.15,
    };
  return {
    c: rng() < 0.45 ? MEADOW_DEEP : MEADOW_MID,
    ang: 6,
    jit: 30,
    len: 1.35,
  };
}
const WIDTHS = [19, 14, 10, 7, 5];
const buckets = new Map();

for (let i = 0; i < STROKES; i++) {
  const x = -60 + rng() * (W + 120);
  const y = -40 + rng() * (H + 80);
  const s = sample(x, y);
  const wi = Math.min(
    WIDTHS.length - 1,
    ((rng() * 0.55 + (i / STROKES) * 0.45) * WIDTHS.length) | 0,
  );
  const w = WIDTHS[wi];

  const colour =
    s.c === MEADOW_MID || s.c === MEADOW_LIT
      ? rng() < 0.015
        ? pickOne(ACCENT)
        : pickOne(s.c)
      : pickOne(s.c);

  const ang = ((s.ang + (rng() - 0.5) * s.jit * 2) * Math.PI) / 180;
  const len = (19 + rng() * 38) * s.len;
  const dx = Math.cos(ang) * len;
  const dy = Math.sin(ang) * len;
  const seg =
    rng() < 0.42
      ? `M${n(x)},${n(y)}q${n(dx * 0.5 + dy * 0.22)},${n(dy * 0.5 - dx * 0.16)} ${n(dx)},${n(dy)}`
      : `M${n(x)},${n(y)}l${n(dx)},${n(dy)}`;

  const key = `${colour}|${w}`;
  const b = buckets.get(key);
  if (b) b.push(seg);
  else buckets.set(key, [seg]);
}
const groups = [...buckets.entries()]
  .sort((a, b) => Number(b[0].split("|")[1]) - Number(a[0].split("|")[1]))
  .map(([key, segs]) => {
    const [colour, w] = key.split("|");
    return `<path stroke="${colour}" stroke-width="${w}" d="${segs.join("")}"/>`;
  })
  .join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e4ebf3"/>
    <stop offset="0.28" stop-color="#edece4"/>
    <stop offset="0.48" stop-color="#ebe7d8"/>
    <stop offset="0.58" stop-color="#a6b198"/>
    <stop offset="0.76" stop-color="#acb46c"/>
    <stop offset="1" stop-color="#8b9758"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#ground)"/>
<g fill="none" stroke-linecap="round" opacity="0.96">${groups}</g>
</svg>`;

console.log(
  `  ${STROKES} strokes in ${buckets.size} buckets, ${(svg.length / 1024 / 1024).toFixed(2)} MB of SVG`,
);

const info = await sharp(Buffer.from(svg))
  .blur(0.7)
  .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: "4:4:4" })
  .toFile(OUT);

console.log(
  `  canvas-plate.jpg  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`,
);
