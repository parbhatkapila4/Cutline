import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

import type {
  MotionSpec,
  Script,
  ShotList,
  SubtitleTrack,
  VisualSpec,
} from "@/lib/types";
import type { ImageSpec } from "@/lib/images/types";

const REMOTION_ENTRY = "src/remotion/index.tsx";
const COMPOSITION_ID = "CUTLINEComposition";
const RENDER_TIMEOUT_MS = 600_000;
const TIMEOUT_TOLERANCE_MS = 5_000;
const OOM_SIGNATURE_RE = /\bSIGKILL\b|\bENOMEM\b|out of memory|cannot allocate memory/i;
const MAX_RENDER_STDERR_CHARS = 2000;

export class RenderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderTimeoutError";
  }
}
export class RenderOutOfMemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderOutOfMemoryError";
  }
}

export class RenderKilledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderKilledError";
  }
}

function renderFailureDetail(result: {
  stderr?: string | null;
  stdout?: string | null;
}): string {
  const raw = (result.stderr || result.stdout || "").trim();
  if (!raw) return "";
  const body =
    raw.length > MAX_RENDER_STDERR_CHARS
      ? raw.slice(0, MAX_RENDER_STDERR_CHARS) + "…[truncated]"
      : raw;
  return "\n" + body;
}

export type RenderInput = {
  script: Script;
  shotList: ShotList;
  subtitleTrack: SubtitleTrack;
  showCaptions?: boolean;
  motionSpec: MotionSpec;
  visualSpec: VisualSpec;
  imageSpec: ImageSpec;
  audioBase64: string | null;
  audioFormat?: "wav" | "mp3";
  logoUrl?: string;
  logoPlacement?: "outro" | "watermark" | "hero";
  width?: number;
  height?: number;
  durationSeconds?: number;
};

function normalizeSubtitleChunks(
  chunks: SubtitleTrack["chunks"]
): Array<{ text: string; startMs: number; endMs: number; shotId: string }> {
  if (!Array.isArray(chunks)) return [];
  return chunks.map((c) => {
    const text = typeof c.text === "string" ? c.text : "";
    let startMs: number;
    let endMs: number;
    const shotId = typeof c.shotId === "string" ? c.shotId : "";
    const withTime = c as unknown as { startTime?: number; duration?: number };
    if (
      typeof withTime.startTime === "number" &&
      typeof withTime.duration === "number"
    ) {
      startMs = withTime.startTime * 1000;
      endMs = startMs + withTime.duration * 1000;
    } else if (typeof c.startMs === "number" && typeof c.endMs === "number") {
      startMs = c.startMs;
      endMs = c.endMs;
    } else {
      startMs = 0;
      endMs = 0;
    }
    if (endMs <= startMs) endMs = startMs + 1;
    return { text, startMs, endMs, shotId };
  });
}

export function buildRemotionProps(input: RenderInput): Record<string, unknown> {
  const normalizedTrack = {
    chunks: normalizeSubtitleChunks(input.subtitleTrack?.chunks ?? []),
  };
  const base: Record<string, unknown> = {
    script: input.script,
    shotList: input.shotList,
    subtitleTrack: normalizedTrack,
    showCaptions: input.showCaptions ?? (normalizedTrack.chunks.length > 0),
    motionSpec: input.motionSpec,
    visualSpec: input.visualSpec,
    imageSpec: input.imageSpec,
    ...(input.logoUrl && input.logoPlacement
      ? { logoUrl: input.logoUrl, logoPlacement: input.logoPlacement }
      : {}),
    audioBase64: input.audioBase64,
    audioFormat: input.audioFormat ?? "wav",
  };
  if (typeof input.width === "number") base.width = input.width;
  if (typeof input.height === "number") base.height = input.height;
  if (typeof input.durationSeconds === "number" && input.durationSeconds > 0) base.durationSeconds = input.durationSeconds;
  return base;
}

export function runRemotionRender(
  input: RenderInput,
  outputPath: string
): void {
  const cwd = process.cwd();
  const tempDir = path.join(cwd, ".remotion-temp");

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  } catch (e) {
    throw new Error("Failed to create temp or output directory.");
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const propsPath = path.join(tempDir, `props-${id}.json`);
  const props = buildRemotionProps(input);

  try {
    fs.writeFileSync(propsPath, JSON.stringify(props), "utf-8");
  } catch (e) {
    throw new Error("Failed to write props file.");
  }

  const remotionCli = path.join(
    cwd,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js"
  );

  if (!fs.existsSync(remotionCli)) {
    throw new Error(
      `Remotion CLI not found at ${remotionCli}. Run npm install.`
    );
  }

  const startedAt = Date.now();
  const result = spawnSync(
    process.execPath,
    [
      remotionCli,
      "render",
      REMOTION_ENTRY,
      COMPOSITION_ID,
      outputPath,
      "--props",
      propsPath,
      "--codec",
      "h264",
      "--crf",
      "15",
      "--jpeg-quality",
      "100",
      "--pixel-format",
      "yuv420p",
      "--color-space",
      "bt709",
      "--audio-bitrate",
      "192k",
      "--audio-codec",
      "aac",
      "--enforce-audio-track",
      "--concurrency",
      "1",
    ],
    {
      cwd,
      encoding: "utf-8",
      timeout: RENDER_TIMEOUT_MS,
    }
  );

  try {
    fs.unlinkSync(propsPath);
  } catch {
  }

  const elapsedMs = Date.now() - startedAt;
  const elapsedSec = Math.round(elapsedMs / 1000);
  const budgetSec = Math.round(RENDER_TIMEOUT_MS / 1000);
  const detail = renderFailureDetail(result);

  if (result.signal === "SIGKILL") {
    throw new RenderOutOfMemoryError(
      `Remotion render was killed by SIGKILL after ${elapsedSec}s of a ${budgetSec}s budget — the renderer ran out of memory. Try a shorter video, or give the worker more RAM.${detail}`
    );
  }

  if (result.signal === "SIGTERM") {
    if (elapsedMs >= RENDER_TIMEOUT_MS - TIMEOUT_TOLERANCE_MS) {
      throw new RenderTimeoutError(
        `Remotion render timed out after ${elapsedSec}s (budget ${budgetSec}s). Try a shorter video or raise RENDER_TIMEOUT_MS.${detail}`
      );
    }
    throw new RenderKilledError(
      `Remotion render was terminated by SIGTERM after ${elapsedSec}s, far short of its ${budgetSec}s budget — an external signal stopped the process (container shutdown, redeploy, or eviction). The render itself was not slow.${detail}`
    );
  }

  if (result.error) {
    throw new Error(`Render failed after ${elapsedSec}s: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const raw = (result.stderr || result.stdout || "").trim();
    if (OOM_SIGNATURE_RE.test(raw)) {
      throw new RenderOutOfMemoryError(
        `Remotion render ran out of memory after ${elapsedSec}s (exit ${result.status}); a child process was killed by the OS.${detail}`
      );
    }
    throw new Error(
      `Remotion render failed (exit ${result.status}) after ${elapsedSec}s.${detail}`
    );
  }
}
