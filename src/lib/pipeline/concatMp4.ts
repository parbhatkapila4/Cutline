import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export const CROSSFADE_DURATION_SECONDS = 0.6;

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

export function trimVideoIfLongerThan(
  filePath: string,
  maxDurationSec: number,
  options?: { epsilonSec?: number; throwIfCannotTrim?: boolean }
): void {
  const epsilon = options?.epsilonSec ?? 0.08;
  if (!Number.isFinite(maxDurationSec) || maxDurationSec <= 0.5) return;
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return;
  const d = getDuration(resolved);
  if (d <= 0 || d <= maxDurationSec + epsilon) return;

  if (!isFfmpegAvailable()) {
    const msg =
      `[ffmpeg] Output is ${d.toFixed(1)}s but the chosen length is ${maxDurationSec}s. ` +
      "Install ffmpeg on the worker (PATH) or set FFMPEG_PATH to trim.";
    if (options?.throwIfCannotTrim) {
      throw new Error(msg);
    }
    console.warn(msg + " Skipping trim.");
    return;
  }

  const dir = path.dirname(resolved);
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempCopy = path.join(dir, `trim-copy-${tag}.mp4`);
  const tempReenc = path.join(dir, `trim-reenc-${tag}.mp4`);
  const ffmpeg = getFfmpegPath();

  const replaceWith = (tempPath: string): void => {
    const outDur = getDuration(tempPath);
    if (outDur <= 0) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
      }
      throw new Error("Trim produced an unreadable file.");
    }
    try {
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
    } catch {
    }
    fs.renameSync(tempPath, resolved);
    console.log(
      `[ffmpeg] Trimmed video from ${d.toFixed(1)}s to ${outDur.toFixed(1)}s (max ${maxDurationSec}s)`
    );
  };

  const copyResult = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i",
      resolved,
      "-t",
      String(maxDurationSec),
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      tempCopy,
    ],
    { encoding: "utf-8", timeout: 300_000 }
  );

  const copyDur = copyResult.status === 0 && fs.existsSync(tempCopy) ? getDuration(tempCopy) : 0;
  if (copyResult.status === 0 && copyDur > 0 && copyDur <= maxDurationSec + 0.15) {
    replaceWith(tempCopy);
    return;
  }
  try {
    if (fs.existsSync(tempCopy)) fs.unlinkSync(tempCopy);
  } catch {
  }

  const reencResult = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i",
      resolved,
      "-t",
      String(maxDurationSec),
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      tempReenc,
    ],
    { encoding: "utf-8", timeout: 300_000 }
  );

  if (reencResult.status !== 0) {
    try {
      if (fs.existsSync(tempReenc)) fs.unlinkSync(tempReenc);
    } catch {
    }
    const msg = reencResult.stderr || reencResult.stdout || "";
    throw new Error(`ffmpeg re-encode trim failed (exit ${reencResult.status}). ${msg}`.slice(0, 2000));
  }

  replaceWith(tempReenc);
}

export function trimAudioBufferIfLongerThan(
  buffer: Buffer,
  format: "mp3" | "wav",
  maxDurationSec: number,
  jobId: string
): Buffer {
  if (!Number.isFinite(maxDurationSec) || maxDurationSec <= 0.5) return buffer;
  if (!isFfmpegAvailable()) return buffer;

  const dir = path.join(os.tmpdir(), `cutline-tts-trim-${jobId}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const ext = format === "mp3" ? "mp3" : "wav";
  const inPath = path.join(dir, `in.${ext}`);
  const outPath = path.join(dir, `out.${ext}`);
  try {
    fs.writeFileSync(inPath, buffer);
    const d = getDuration(inPath);
    if (d <= 0 || d <= maxDurationSec + 0.06) return buffer;

    const ffmpeg = getFfmpegPath();
    const args =
      format === "mp3"
        ? [
          "-y",
          "-i",
          inPath,
          "-t",
          String(maxDurationSec),
          "-c:a",
          "libmp3lame",
          "-b:a",
          "192k",
          outPath,
        ]
        : [
          "-y",
          "-i",
          inPath,
          "-t",
          String(maxDurationSec),
          "-c:a",
          "pcm_s16le",
          outPath,
        ];

    const r = spawnSync(ffmpeg, args, { encoding: "utf-8", timeout: 300_000 });
    if (r.status !== 0 || !fs.existsSync(outPath)) {
      return buffer;
    }
    const outDur = getDuration(outPath);
    if (outDur <= 0) return buffer;
    return fs.readFileSync(outPath);
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
    }
  }
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
    `[0:v][1:v]xfade=transition=fade:duration=${crossfadeSec}:offset=${offsetSec}[v];` +
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
    `[0:v][1:v]xfade=transition=fade:duration=${crossfadeSec}:offset=${offsetSec}[v];` +
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


function getSpeechBounds(
  filePath: string,
  thresholdDb: number,
  minSilenceDur: number
): { speechStart: number; speechEnd: number; duration: number } {
  const resolved = path.resolve(filePath);
  const duration = getDuration(resolved);
  if (duration <= 0) return { speechStart: 0, speechEnd: 0, duration: 0 };

  const ffmpeg = getFfmpegPath();
  const result = spawnSync(
    ffmpeg,
    [
      "-hide_banner",
      "-nostats",
      "-i", resolved,
      "-af", `silencedetect=noise=${thresholdDb}dB:d=${minSilenceDur}`,
      "-f", "null",
      "-",
    ],
    { encoding: "utf-8", timeout: 60_000 }
  );

  const log = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  const starts: number[] = [];
  const ends: number[] = [];

  const startRe = /silence_start:\s*([\d.]+)/g;
  const endRe = /silence_end:\s*([\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(log))) {
    const v = parseFloat(m[1]!);
    if (Number.isFinite(v) && v >= 0) starts.push(v);
  }
  while ((m = endRe.exec(log))) {
    const v = parseFloat(m[1]!);
    if (Number.isFinite(v) && v >= 0) ends.push(v);
  }

  let speechStart = 0;
  if (starts.length > 0 && starts[0]! < 0.06 && ends.length > 0) {
    speechStart = ends[0]!;
  }

  let speechEnd = duration;
  if (starts.length > ends.length && starts.length > 0) {
    speechEnd = starts[starts.length - 1]!;
  } else if (starts.length > 0 && ends.length > 0) {
    const lastEnd = ends[ends.length - 1]!;
    if (duration - lastEnd < 0.1) {
      speechEnd = starts[starts.length - 1]!;
    }
  }

  if (!Number.isFinite(speechStart) || speechStart < 0) speechStart = 0;
  if (!Number.isFinite(speechEnd) || speechEnd > duration) speechEnd = duration;
  if (speechEnd <= speechStart) {
    return { speechStart: 0, speechEnd: duration, duration };
  }
  return { speechStart, speechEnd, duration };
}

export function trimChunkSilence(
  filePath: string,
  options: {
    trimLeading: boolean;
    trimTrailing: boolean;
    thresholdDb?: number;
    minSilenceDur?: number;
    bufferSec?: number;
  }
): void {
  if (!options.trimLeading && !options.trimTrailing) return;
  if (!isFfmpegAvailable()) return;
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return;

  const thresholdDb = options.thresholdDb ?? -40;
  const minSilenceDur = options.minSilenceDur ?? 0.15;
  const buffer = options.bufferSec ?? 0.05;

  const { speechStart, speechEnd, duration } = getSpeechBounds(
    resolved,
    thresholdDb,
    minSilenceDur
  );
  if (duration <= 0) return;

  const newStart = options.trimLeading ? Math.max(0, speechStart - buffer) : 0;
  const newEnd = options.trimTrailing
    ? Math.min(duration, speechEnd + buffer)
    : duration;
  if (newStart < 0.03 && duration - newEnd < 0.03) return;
  if (newEnd - newStart < 0.5) return;

  const dir = path.dirname(resolved);
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmp = path.join(dir, `silence-trim-${tag}.mp4`);
  const ffmpeg = getFfmpegPath();

  const filter =
    `[0:v]trim=start=${newStart.toFixed(3)}:end=${newEnd.toFixed(3)},setpts=PTS-STARTPTS[v];` +
    `[0:a]atrim=start=${newStart.toFixed(3)}:end=${newEnd.toFixed(3)},asetpts=PTS-STARTPTS[a]`;

  const result = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i", resolved,
      "-filter_complex", filter,
      "-map", "[v]",
      "-map", "[a]",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      tmp,
    ],
    { encoding: "utf-8", timeout: 180_000 }
  );

  if (result.status !== 0 || !fs.existsSync(tmp)) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
    }
    return;
  }

  const outDur = getDuration(tmp);
  if (outDur < 0.5) {
    try {
      fs.unlinkSync(tmp);
    } catch {
    }
    return;
  }

  try {
    fs.unlinkSync(resolved);
    fs.renameSync(tmp, resolved);
    console.log(
      `[ffmpeg] Trimmed silence on chunk: ${duration.toFixed(2)}s -> ${outDur.toFixed(2)}s ` +
      `(lead=${options.trimLeading ? "on" : "off"}, trail=${options.trimTrailing ? "on" : "off"})`
    );
  } catch {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
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

