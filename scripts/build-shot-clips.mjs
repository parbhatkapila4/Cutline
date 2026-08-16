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
const WIDTH = 1280;
const HEIGHT = 720;
const CRF = 25; 
const CLIPS = [
  {
    name: "shot-1",
    caption: "Hook — the question",
    url: "https://videos.pexels.com/video-files/4786576/4786576-hd_1920_1080_25fps.mp4",
    start: 1.6,
    crf: 26,
  },
  {
    name: "shot-2",
    caption: "Grind and ratio",
    url: "https://videos.pexels.com/video-files/8936254/8936254-uhd_3840_2160_25fps.mp4",
    start: 1.5,
  },
  {
    name: "shot-3",
    caption: "Steep time vs acidity",
    url: "https://videos.pexels.com/video-files/26885213/12025951_3840_2160_25fps.mp4",
    start: 1.5,
    crf: 30,
    denoise: true, 
  },
  {
    name: "shot-4",
    caption: "The pour",
    url: "https://videos.pexels.com/video-files/4794549/4794549-uhd_4096_2160_25fps.mp4",
    start: 1.0,
  },
  {
    name: "shot-5",
    caption: "Close — try it cold",
    url: "https://videos.pexels.com/video-files/6166869/6166869-uhd_3840_2160_25fps.mp4",
    start: 1.5,
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
    throw new Error(`${label}: ffmpeg exit ${r.status}\n${(r.stderr || "").slice(-700)}`);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const clip of CLIPS) {
  const mp4 = path.join(OUT_DIR, `${clip.name}.mp4`);
  const jpg = path.join(OUT_DIR, `${clip.name}.jpg`);
  run(
    [
      "-y",
      "-ss", String(clip.start),
      "-i", clip.url,
      "-t", String(DURATION),
      "-an",
      "-vf", filterFor(clip),
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", String(clip.crf ?? CRF),
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      mp4,
    ],
    clip.name,
  );
  run(["-y", "-i", mp4, "-frames:v", "1", "-q:v", "4", jpg], `${clip.name} poster`);

  const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
  console.log(`  ${clip.name}  ${kb(mp4)} KB mp4 + ${kb(jpg)} KB poster   ${clip.caption}`);
}

console.log("shot clips built");
