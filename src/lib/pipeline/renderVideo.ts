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

  const RENDER_TIMEOUT_MS = 300_000;
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

  if (result.signal === "SIGTERM") {
    throw new Error(
      `Remotion render timed out after ${RENDER_TIMEOUT_MS / 60_000} minutes. Try a shorter video or increase timeout.`
    );
  }

  if (result.error) {
    throw new Error(`Render failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const msg = result.stderr || result.stdout || "";
    throw new Error(`Remotion render failed (exit ${result.status}). ${msg}`);
  }
}
