import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "hero");
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const SOURCE =
  "https://videos.pexels.com/video-files/8089223/8089223-uhd_4096_2160_25fps.mp4";

const WINDOW_START = 2.5;
const DURATION = 6.0;
const SRC_FPS = 25;
const FRAMES = Math.round(DURATION * SRC_FPS);
const WIDTH = 1920;
const CRF = 22;
const GRAIN = 3;
const CROP_W = 4096;
const CROP_H = 1755;
const FILTER = `
[0:v]crop=${CROP_W}:${CROP_H}:0:0,
     eq=saturation=0.80:contrast=1.03,
     colorbalance=rs=0.02:rm=0.02:bs=-0.03:bm=-0.02,
     scale=${WIDTH}:-2:flags=lanczos,split=2[fwd][rv];
[rv]reverse,trim=start_frame=1:end_frame=${FRAMES - 1},setpts=PTS-STARTPTS[rev];
[fwd][rev]concat=n=2:v=1:a=0,
     noise=alls=${GRAIN}:allf=t+u,
     format=yuv420p[v]`.replace(/\s*\n\s*/g, "");

function run(args, label) {
  const res = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
  if (res.status !== 0) {
    console.error(`${label} failed:\n${res.stderr?.toString().slice(-1500)}`);
    process.exit(1);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const tmp = path.join(OUT_DIR, ".cta-source.mp4");
  const mp4 = path.join(OUT_DIR, "cta-loop.mp4");
  const poster = path.join(OUT_DIR, "cta-loop.jpg");

  console.log("Fetching source clip ...");
  const res = await fetch(SOURCE, {
    headers: { "User-Agent": "CutlineHero/1.0" },
  });
  if (!res.ok) throw new Error(`${SOURCE} => ${res.status}`);
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));

  console.log("Encoding seamless graded loop ...");
  run(
    [
      "-v",
      "error",
      "-y",
      "-ss",
      String(WINDOW_START),
      "-t",
      String(DURATION),
      "-i",
      tmp,
      "-filter_complex",
      FILTER,
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-crf",
      String(CRF),
      "-preset",
      "slow",
      "-x264-params",
      "aq-mode=3:deblock=-1,-1",
      "-movflags",
      "+faststart",
      mp4,
    ],
    "encode",
  );
  console.log("Extracting poster ...");
  run(
    ["-v", "error", "-y", "-i", mp4, "-frames:v", "1", "-q:v", "2", poster],
    "poster",
  );

  fs.unlinkSync(tmp);
  const kb = (p) => `${(fs.statSync(p).size / 1024).toFixed(0)}KB`;
  console.log(`  cta-loop.mp4  ${kb(mp4)}`);
  console.log(`  cta-loop.jpg  ${kb(poster)}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
