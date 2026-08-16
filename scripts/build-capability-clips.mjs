import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "hero");
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

const DWELL = 3.4;
const RATE = 0.7;
const DURATION = +(DWELL * RATE).toFixed(2);
const WIDTH = 608;
const HEIGHT = 1080;
const CRF = 25;
const CLIPS = [
  {
    name: "cap-1",
    caption: "Stock — the before",
    url: "https://videos.pexels.com/video-files/5716228/5716228-hd_1080_1920_30fps.mp4",
    start: 1.5,
  },
  {
    name: "cap-2",
    caption: "Uploaded — the product",
    url: "https://videos.pexels.com/video-files/6963412/6963412-hd_1080_1920_30fps.mp4",
    start: 2.0,
  },
  {
    name: "cap-3",
    caption: "Uploaded — the walkthrough",
    url: "https://videos.pexels.com/video-files/9130469/9130469-hd_1080_1920_30fps.mp4",
    start: 2.0,
  },
  {
    name: "cap-4",
    caption: "Stock — the team",
    url: "https://videos.pexels.com/video-files/12894352/12894352-hd_1080_1920_24fps.mp4",
    start: 1.5,
  },
  {
    name: "cap-5",
    caption: "Generated — the close",
    url: "https://videos.pexels.com/video-files/8814493/8814493-hd_1080_1920_25fps.mp4",
    start: 2.0,
  },
];

const filterFor = (clip) =>
  [
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos`,
    `crop=${WIDTH}:${HEIGHT}`,
    clip.denoise ? "hqdn3d=2:1.5:6:6" : null,
    "eq=saturation=0.88:contrast=1.02",
    "colorbalance=rs=0.02:rm=0.015:bs=-0.025:bm=-0.015",
    "format=yuv420p",
  ]
    .filter(Boolean)
    .join(",");

function run(args, label) {
  const r = spawnSync(FFMPEG, args, { encoding: "utf8", timeout: 300000 });
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(
      `${label}: ffmpeg exit ${r.status}\n${(r.stderr || "").slice(-700)}`,
    );
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const clip of CLIPS) {
  const mp4 = path.join(OUT_DIR, `${clip.name}.mp4`);
  const jpg = path.join(OUT_DIR, `${clip.name}.jpg`);
  run(
    [
      "-y",
      "-ss",
      String(clip.start),
      "-i",
      clip.url,
      "-t",
      String(DURATION),
      "-an",
      "-vf",
      filterFor(clip),
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(clip.crf ?? CRF),
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4,
    ],
    clip.name,
  );
  run(
    ["-y", "-i", mp4, "-frames:v", "1", "-q:v", "4", jpg],
    `${clip.name} poster`,
  );

  const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
  console.log(
    `  ${clip.name}  ${kb(mp4)} KB mp4 + ${kb(jpg)} KB poster   ${clip.caption}`,
  );
}

console.log("capability clips built");
