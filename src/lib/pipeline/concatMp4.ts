import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";



export const CROSSFADE_DURATION_SECONDS = 1;

function getFfmpegPath(): string {
  const envPath = process.env.FFMPEG_PATH;
  if (typeof envPath === "string" && envPath.trim() !== "") {
    return envPath.trim();
  }
  const isWindows = process.platform === "win32";
  return isWindows ? "ffmpeg.exe" : "ffmpeg";
}

function getFfprobePath(): string {
  const envPath = process.env.FFMPEG_PATH;
  if (typeof envPath === "string" && envPath.trim() !== "") {
    const dir = path.dirname(envPath.trim());
    const isWindows = process.platform === "win32";
    return path.join(dir, isWindows ? "ffprobe.exe" : "ffprobe");
  }
  const isWindows = process.platform === "win32";
  return isWindows ? "ffprobe.exe" : "ffprobe";
}


export function getDuration(filePath: string): number {
  const ffprobe = getFfprobePath();
  const resolved = path.resolve(filePath);
  const result = spawnSync(ffprobe, [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    resolved,
  ], { encoding: "utf-8", timeout: 10_000 });
  if (result.status !== 0 || !result.stdout?.trim()) return 0;
  const d = parseFloat(result.stdout.trim());
  return Number.isFinite(d) && d > 0 ? d : 0;
}

export function isFfmpegAvailable(): boolean {
  const ffmpeg = getFfmpegPath();
  const result = spawnSync(ffmpeg, ["-version"], {
    encoding: "utf-8",
    timeout: 5000,
  });
  return result.status === 0;
}

function runFfmpegCrossfade(
  resolvedA: string,
  resolvedB: string,
  resolvedOut: string,
  offsetSec: number,
  crossfadeSec: number,
  filterComplex: string
): { status: number; stderr: string } {
  const ffmpeg = getFfmpegPath();
  const result = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i", resolvedA,
      "-i", resolvedB,
      "-filter_complex", filterComplex,
      "-map", "[v]",
      "-map", "[a]",
      "-movflags", "+faststart",
      resolvedOut,
    ],
    { encoding: "utf-8", timeout: 120_000 }
  );
  return { status: result.status ?? -1, stderr: result.stderr || result.stdout || "" };
}

function crossfadeTwoClips(
  pathA: string,
  pathB: string,
  offsetSec: number,
  crossfadeSec: number,
  outputPath: string,
  durationA?: number,
  durationB?: number
): void {
  const resolvedA = path.resolve(pathA);
  const resolvedB = path.resolve(pathB);
  const resolvedOut = path.resolve(outputPath);

  const filterWithAudioCrossfade =
    `[0:v][1:v]xfade=transition=slideleft:duration=${crossfadeSec}:offset=${offsetSec}[v];` +
    `[0:a][1:a]acrossfade=d=${crossfadeSec}:c1=tri:c2=tri[a]`;

  const result = runFfmpegCrossfade(
    resolvedA, resolvedB, resolvedOut,
    offsetSec, crossfadeSec,
    filterWithAudioCrossfade
  );

  if (result.status === 0) return;

  const dA = Math.max(0.5, durationA ?? (getDuration(pathA) || 8));
  const dB = Math.max(0.5, durationB ?? (getDuration(pathB) || 8));
  const trimEndA = Math.min(dA, offsetSec + crossfadeSec);
  const trimStartB = Math.min(crossfadeSec, dB - 0.1);
  const trimEndB = dB;
  const filterVideoXfadeAudioConcat =
    `[0:v][1:v]xfade=transition=slideleft:duration=${crossfadeSec}:offset=${offsetSec}[v];` +
    `[0:a]atrim=0:${trimEndA},asetpts=PTS-STARTPTS[a0];` +
    `[1:a]atrim=${trimStartB}:${trimEndB},asetpts=PTS-STARTPTS[a1];` +
    `[a0][a1]concat=n=2:v=0:a=1[a]`;

  const fallback = runFfmpegCrossfade(
    resolvedA, resolvedB, resolvedOut,
    offsetSec, crossfadeSec,
    filterVideoXfadeAudioConcat
  );

  if (fallback.status !== 0) {
    throw new Error(`ffmpeg crossfade failed (exit ${result.status}). ${result.stderr}`);
  }
}

export function concatenateMp4s(inputPaths: string[], outputPath: string): void {
  if (inputPaths.length === 0) {
    throw new Error("concatenateMp4s: no input paths");
  }
  if (inputPaths.length === 1) {
    fs.copyFileSync(inputPaths[0]!, outputPath);
    return;
  }

  if (!isFfmpegAvailable()) {
    throw new Error(
      "ffmpeg is required to concatenate talking_object clips longer than 8 seconds. " +
      "Install ffmpeg and add it to PATH, or set FFMPEG_PATH in .env.local."
    );
  }

  const crossfadeSec = Math.min(1, Math.max(0.25, CROSSFADE_DURATION_SECONDS));
  const outputDir = path.dirname(outputPath);
  let currentPath = inputPaths[0]!;
  let currentDuration = getDuration(currentPath);
  if (currentDuration <= 0) currentDuration = 8;

  const tempPaths: string[] = [];

  for (let i = 1; i < inputPaths.length; i++) {
    const nextPath = inputPaths[i]!;
    const nextDuration = getDuration(nextPath) || 8;
    const offsetSec = Math.max(0, currentDuration - crossfadeSec);
    const isLast = i === inputPaths.length - 1;
    const outPath = isLast ? outputPath : path.join(outputDir, `crossfade-${Date.now()}-${i}.mp4`);
    if (!isLast) tempPaths.push(outPath);

    crossfadeTwoClips(currentPath, nextPath, offsetSec, crossfadeSec, outPath, currentDuration, nextDuration);

    if (!isLast) {
      currentPath = outPath;
      currentDuration = getDuration(currentPath) || currentDuration + nextDuration - crossfadeSec;
    }
  }

  for (const temp of tempPaths) {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {
    }
  }
}


export function mixBackgroundMusic(
  videoPath: string,
  outputPath: string,
  musicPath?: string | null,
  musicVolume: number = 0.2
): void {
  const resolvedVideo = path.resolve(videoPath);
  const resolvedOut = path.resolve(outputPath);
  const cwd = process.cwd();
  const defaultMusic = path.join(cwd, "public", "audio", "background-music.mp3");
  const envMusic =
    typeof process.env.BACKGROUND_MUSIC_PATH === "string" && process.env.BACKGROUND_MUSIC_PATH.trim() !== ""
      ? process.env.BACKGROUND_MUSIC_PATH.trim()
      : null;
  const music = musicPath ?? envMusic ?? defaultMusic;
  const resolvedMusic = path.resolve(music);

  if (!fs.existsSync(resolvedMusic)) {
    if (videoPath !== outputPath) fs.copyFileSync(resolvedVideo, resolvedOut);
    return;
  }

  if (!isFfmpegAvailable()) return;

  const vol = Math.max(0, Math.min(1, musicVolume));
  const dir = path.dirname(resolvedOut);
  const tempOut = path.join(dir, `with-music-${Date.now()}.mp4`);

  try {
    const ffmpeg = getFfmpegPath();
    const filterComplex =
      `[0:a]volume=1.0[vox];[1:a]volume=${vol}[bg];[vox][bg]amix=inputs=2:duration=first[a]`;
    const result = spawnSync(
      ffmpeg,
      [
        "-y",
        "-i", resolvedVideo,
        "-stream_loop", "-1",
        "-i", resolvedMusic,
        "-filter_complex", filterComplex,
        "-map", "0:v",
        "-map", "[a]",
        "-c:v", "copy",
        "-movflags", "+faststart",
        tempOut,
      ],
      { encoding: "utf-8", timeout: 120_000 }
    );

    if (result.status !== 0) {
      if (videoPath !== outputPath) fs.copyFileSync(resolvedVideo, resolvedOut);
      return;
    }

    fs.renameSync(tempOut, resolvedOut);
  } catch {
    try {
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    } catch {
    }
    if (videoPath !== outputPath) fs.copyFileSync(resolvedVideo, resolvedOut);
  }
}

