import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "hero");
const PLATES = [
  {
    name: "card-creators.jpg",
    url: "https://images.unsplash.com/photo-1642316375963-068d27828032",
  },
  {
    name: "card-marketing.jpg",
    url: "https://images.unsplash.com/photo-1591635326635-4098686c678b",
  },
  {
    name: "card-educators.jpg",
    url: "https://images.unsplash.com/photo-1509403690534-26d3b04c8a4e",
  },
];
const WIDTH = 1680;
const SATURATION = 0.34;
const LIFT = 1.75;
const BLACK = 0.12;
const WARM = [1.12, 0.99, 0.85];
const LUTS = WARM.map((gain) =>
  Uint8Array.from({ length: 256 }, (_, v) => {
    const lifted = Math.pow(v / 255, 1 / LIFT);
    const seated = Math.max(0, (lifted - BLACK) / (1 - BLACK));
    return Math.max(0, Math.min(255, Math.round(seated * 255 * gain)));
  }),
);

function grade(data) {
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = LUTS[0][Math.round(lum + (r - lum) * SATURATION)];
    data[i + 1] = LUTS[1][Math.round(lum + (g - lum) * SATURATION)];
    data[i + 2] = LUTS[2][Math.round(lum + (b - lum) * SATURATION)];
  }
  return data;
}

async function build({ name, url }) {
  const res = await fetch(`${url}?w=${WIDTH}&q=90&fm=jpg`, {
    headers: { "User-Agent": "CutlineHero/1.0" },
  });
  if (!res.ok) throw new Error(`${url} => ${res.status}`);
  const source = sharp(Buffer.from(await res.arrayBuffer()))
    .resize(WIDTH)
    .blur(0.7);
  const { data, info } = await source
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = path.join(OUT_DIR, name);
  await sharp(grade(data), {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .jpeg({ quality: 82, chromaSubsampling: "4:4:4" })
    .toFile(out);

  const mean = (await sharp(out).greyscale().stats()).channels[0].mean;
  console.log(
    `  ${name.padEnd(20)} ${info.width}x${info.height}  mean lum ${mean.toFixed(0)}  ${(
      fs.statSync(out).size / 1024
    ).toFixed(0)}KB`,
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("Grading SolutionsV3 card plates ...");
  for (const plate of PLATES) await build(plate);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
