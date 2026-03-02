import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

import { getDuration } from "@/lib/pipeline/concatMp4";


const MIN_CHUNK_BYTES = 500_000;

const MIN_CHUNK_DURATION_SEC = 6;
const MAX_BLACK_RATIO = 0.7;

function getFfmpegPath(): string {
  const envPath = process.env.FFMPEG_PATH;
  if (typeof envPath === "string" && envPath.trim() !== "") {
    return envPath.trim();
  }
  const isWindows = process.platform === "win32";
  return isWindows ? "ffmpeg.exe" : "ffmpeg";
}

function getBlackDurationSec(filePath: string): number {
  const ffmpeg = getFfmpegPath();
  const resolved = path.resolve(filePath);
  const result = spawnSync(
    ffmpeg,
    [
      "-i", resolved,
      "-vf", "blackdetect=d=0.5:pix_th=0.10",
      "-an",
      "-f", "null",
      "-",
    ],
    { encoding: "utf-8", timeout: 30_000 }
  );

  const stderr = result.stderr || result.stdout || "";
  const matches = stderr.matchAll(/black_duration:([\d.]+)/g);
  let total = 0;
  for (const m of matches) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return total;
}

export interface ChunkValidationResult {
  valid: boolean;
  reason?: string;
}


export function validateVideoChunk(
  filePath: string,
  expectedDurationSec?: number
): ChunkValidationResult {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return { valid: false, reason: "File does not exist" };
  }

  const stat = fs.statSync(resolved);
  if (stat.size < MIN_CHUNK_BYTES) {
    return {
      valid: false,
      reason: `Chunk too small (${Math.round(stat.size / 1024)}KB < ${Math.round(MIN_CHUNK_BYTES / 1024)}KB minimum). Likely black or placeholder.`,
    };
  }

  const durationSec = getDuration(resolved);
  const minDuration = expectedDurationSec != null
    ? Math.max(MIN_CHUNK_DURATION_SEC, expectedDurationSec * 0.75)
    : MIN_CHUNK_DURATION_SEC;

  if (durationSec <= 0) {
    return { valid: false, reason: "Could not read video duration (corrupted or invalid)" };
  }

  if (durationSec < minDuration) {
    return {
      valid: false,
      reason: `Chunk duration too short (${durationSec.toFixed(1)}s < ${minDuration}s minimum).`,
    };
  }

  const blackSec = getBlackDurationSec(resolved);
  const blackRatio = blackSec / durationSec;
  if (blackRatio > MAX_BLACK_RATIO) {
    return {
      valid: false,
      reason: `Chunk is mostly black (${(blackRatio * 100).toFixed(0)}% black). Corrupted or placeholder.`,
    };
  }

  return { valid: true };
}
