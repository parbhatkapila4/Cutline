import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export type SubtitleEntry = { text: string; startMs: number; endMs: number };

function getFfmpegPath(): string {
  const envPath = process.env.FFMPEG_PATH;
  if (typeof envPath === "string" && envPath.trim() !== "") {
    return envPath.trim();
  }
  const isWindows = process.platform === "win32";
  return isWindows ? "ffmpeg.exe" : "ffmpeg";
}


function formatSrtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const millis = Math.round(ms % 1000);
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
    "," + String(millis).padStart(3, "0"),
  ].join(":");
}

function formatAssTime(ms: number): string {
  const totalSec = ms / 1000;
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const centisec = Math.floor((ms % 1000) / 10);
  return [
    String(hours),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0") + "." + String(centisec).padStart(2, "0"),
  ].join(":");
}

const MIN_SUBTITLE_MS = 400;

export function countValidSubtitleEntries(entries: SubtitleEntry[]): number {
  return entries.filter(
    (e) => typeof e.startMs === "number" && typeof e.endMs === "number" && e.endMs > e.startMs && e.endMs - e.startMs >= MIN_SUBTITLE_MS
  ).length;
}

export function writeSrtFile(entries: SubtitleEntry[], srtPath: string): void {
  const valid = entries.filter(
    (e) => typeof e.startMs === "number" && typeof e.endMs === "number" && e.endMs > e.startMs && e.endMs - e.startMs >= MIN_SUBTITLE_MS
  );
  if (valid.length === 0) {
    throw new Error("No valid subtitle entries (each needs endMs > startMs and duration >= 400ms)");
  }
  const lines: string[] = [];
  for (let i = 0; i < valid.length; i++) {
    const e = valid[i]!;
    const startMs = Math.max(0, Math.round(e.startMs));
    const endMs = Math.round(e.endMs);
    if (endMs <= startMs) continue;
    lines.push(String(i + 1));
    lines.push(
      `${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}`
    );
    lines.push((e.text || "").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
    lines.push("");
  }
  const content = lines.join("\n");
  fs.writeFileSync(srtPath, content, "utf-8");
}

function writeAssFile(entries: SubtitleEntry[], assPath: string): void {
  const valid = entries.filter(
    (e) => typeof e.startMs === "number" && typeof e.endMs === "number" && e.endMs > e.startMs && e.endMs - e.startMs >= MIN_SUBTITLE_MS
  );
  if (valid.length === 0) {
    throw new Error("No valid subtitle entries (each needs endMs > startMs and duration >= 400ms)");
  }
  const header = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
Style: Default,Arial,28,&H00FFFFFF,&H00000000,1,2,0,2,10,10,20

[Events]
Format: Layer, Start, End, Style, Text
`;
  const lines = valid.map(
    (e) =>
      `Dialogue: 0,${formatAssTime(e.startMs)},${formatAssTime(e.endMs)},Default,${(e.text || "").trim().replace(/\r\n/g, "\\N").replace(/\r/g, "\\N").replace(/\n/g, "\\N")}`
  );
  fs.writeFileSync(assPath, header + lines.join("\n"), "utf-8");
}

export function burnSubtitlesIntoVideo(
  videoPath: string,
  entries: SubtitleEntry[]
): void {
  if (entries.length === 0) return;
  if (countValidSubtitleEntries(entries) === 0) return;

  const resolvedVideo = path.resolve(videoPath);
  const dir = path.dirname(resolvedVideo);
  const outTempPath = path.join(dir, `burned-${Date.now()}.mp4`);

  const ts = Date.now();
  const assDir = os.tmpdir();
  const assBasename = `cutline-${ts}.ass`;
  const assPath = path.join(assDir, assBasename);

  try {
    writeAssFile(entries, assPath);
  } catch (e) {
    console.warn("[burnSubtitles] Failed to write ASS:", e);
    throw e;
  }

  try {
    const ffmpeg = getFfmpegPath();
    const result = spawnSync(
      ffmpeg,
      [
        "-y",
        "-i", resolvedVideo,
        "-vf", `ass=${assBasename}`,
        "-c:a", "copy",
        "-movflags", "+faststart",
        outTempPath,
      ],
      { encoding: "utf-8", timeout: 120_000, cwd: assDir }
    );

    if (result.status !== 0) {
      const stderr = result.stderr || result.stdout || "";
      throw new Error(`ffmpeg burn subtitles failed (exit ${result.status}). ${stderr}`);
    }

    fs.renameSync(outTempPath, resolvedVideo);
  } finally {
    try {
      fs.unlinkSync(assPath);
    } catch {
    }
    try {
      if (fs.existsSync(outTempPath)) fs.unlinkSync(outTempPath);
    } catch {
    }
  }
}
