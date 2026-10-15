import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { chunkCaptionText } from "@/lib/pipeline/captionChunks";
import { CAPTION_FONT_CELL_EM, captionTextWidthEm } from "@/lib/pipeline/captionMetrics";
import {
  CAPTION_BACKGROUND_OPACITY,
  CAPTION_LINE_HEIGHT_EM,
  captionFontSizePx,
  layoutCaption,
} from "@/remotion/captionLayout";

export type SubtitleEntry = { text: string; startMs: number; endMs: number };

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
  const isWindows = process.platform === "win32";
  if (typeof envPath === "string" && envPath.trim() !== "") {
    const dir = path.dirname(envPath.trim());
    return path.join(dir, isWindows ? "ffprobe.exe" : "ffprobe");
  }
  return isWindows ? "ffprobe.exe" : "ffprobe";
}

type VideoDimensions = { width: number; height: number };

function probeVideoDimensions(videoPath: string): VideoDimensions | null {
  try {
    const result = spawnSync(
      getFfprobePath(),
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=s=x:p=0",
        videoPath,
      ],
      { encoding: "utf-8", timeout: 10_000 }
    );
    if (result.status !== 0 || !result.stdout) return null;
    const out = result.stdout.trim();
    const m = /^(\d+)x(\d+)/.exec(out);
    if (!m) return null;
    const width = parseInt(m[1]!, 10);
    const height = parseInt(m[2]!, 10);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  } catch {
    return null;
  }
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

export function splitIntoDisplayCaptions(entries: SubtitleEntry[]): SubtitleEntry[] {
  const captions: SubtitleEntry[] = [];
  for (const entry of entries) {
    const chunks = chunkCaptionText(entry.text || "");
    if (chunks.length === 0) continue;
    const span = entry.endMs - entry.startMs;
    const maxPieces = Math.max(1, Math.floor(span / MIN_SUBTITLE_MS));
    while (chunks.length > maxPieces) {
      let at = 0;
      for (let i = 1; i < chunks.length - 1; i++) {
        if (chunks[i]!.length + chunks[i + 1]!.length < chunks[at]!.length + chunks[at + 1]!.length) {
          at = i;
        }
      }
      chunks.splice(at, 2, `${chunks[at]} ${chunks[at + 1]}`);
    }
    chunks.forEach((text, i) => {
      captions.push({
        text,
        startMs: entry.startMs + Math.round((i * span) / chunks.length),
        endMs: entry.startMs + Math.round(((i + 1) * span) / chunks.length),
      });
    });
  }
  return captions;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundedRectPath(w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(Math.round(radius), Math.floor(Math.min(w, h) / 2)));
  const c = Math.round(r * 0.4477);
  return [
    `m ${r} 0`,
    `l ${w - r} 0`,
    `b ${w - c} 0 ${w} ${c} ${w} ${r}`,
    `l ${w} ${h - r}`,
    `b ${w} ${h - c} ${w - c} ${h} ${w - r} ${h}`,
    `l ${r} ${h}`,
    `b ${c} ${h} 0 ${h - c} 0 ${h - r}`,
    `l 0 ${r}`,
    `b 0 ${c} ${c} 0 ${r} 0`,
  ].join(" ");
}

export function buildAssDocument(entries: SubtitleEntry[], dims: VideoDimensions): string {
  const valid = entries.filter(
    (e) => typeof e.startMs === "number" && typeof e.endMs === "number" && e.endMs > e.startMs && e.endMs - e.startMs >= MIN_SUBTITLE_MS
  );
  if (valid.length === 0) {
    throw new Error("No valid subtitle entries (each needs endMs > startMs and duration >= 400ms)");
  }
  const { width, height } = dims;
  const measure = (text: string, fontSizePx: number) => captionTextWidthEm(text) * fontSizePx;
  const baseFontSize = round2(captionFontSizePx(dims) * CAPTION_FONT_CELL_EM);
  const alpha = Math.round(255 * (1 - CAPTION_BACKGROUND_OPACITY))
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,${baseFontSize},&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,8,0,0,0,1
Style: Pill,Arial,${baseFontSize},&H${alpha}000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events: string[] = [];
  for (const caption of splitIntoDisplayCaptions(valid)) {
    const layout = layoutCaption(caption.text, dims, measure);
    if (layout.lines.length === 0) continue;
    const start = formatAssTime(caption.startMs);
    const end = formatAssTime(caption.endMs);
    const boxWidth = Math.round(layout.textWidthPx + 2 * layout.paddingXPx);
    const boxHeight = Math.round(layout.lines.length * layout.lineHeightPx + 2 * layout.paddingYPx);
    const left = Math.round((width - boxWidth) / 2);
    const top = height - layout.bottomPx - boxHeight;
    events.push(
      `Dialogue: 0,${start},${end},Pill,,0,0,0,,{\\pos(${left},${top})\\p1}${roundedRectPath(boxWidth, boxHeight, layout.radiusPx)}{\\p0}`
    );
    const halfLeading = ((CAPTION_LINE_HEIGHT_EM - CAPTION_FONT_CELL_EM) / 2) * layout.fontSizePx;
    const fontSize = round2(layout.fontSizePx * CAPTION_FONT_CELL_EM);
    layout.lines.forEach((line, i) => {
      const y = round2(top + layout.paddingYPx + i * layout.lineHeightPx + halfLeading);
      events.push(
        `Dialogue: 1,${start},${end},Caption,,0,0,0,,{\\pos(${round2(width / 2)},${y})\\fs${fontSize}}${line}`
      );
    });
  }
  return header + events.join("\n") + "\n";
}

function writeAssFile(
  entries: SubtitleEntry[],
  assPath: string,
  dims: VideoDimensions
): void {
  fs.writeFileSync(assPath, buildAssDocument(entries, dims), "utf-8");
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

  const dims = probeVideoDimensions(resolvedVideo) ?? { width: 1080, height: 1920 };

  try {
    writeAssFile(entries, assPath, dims);
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
