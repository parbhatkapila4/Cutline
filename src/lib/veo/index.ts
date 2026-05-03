import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

import { getDuration } from "@/lib/pipeline/concatMp4";
import { isValidAspectRatio, type AspectRatio } from "@/lib/validation/aspectRatio";

const VEO_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10_000;

const QUOTA_LIMIT_PATTERNS = [
  "quota",
  "rate limit",
  "resource exhausted",
  "resource_exhausted",
  "429",
  "limit exceeded",
  "daily limit",
  "per minute",
];

function isQuotaOrLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return QUOTA_LIMIT_PATTERNS.some((p) => lower.includes(p));
}

export class VeoQuotaOrLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeoQuotaOrLimitError";
  }
}

function throwFromVeoRaw(raw: string): never {
  if (isQuotaOrLimitError(raw)) {
    throw new VeoQuotaOrLimitError(
      "We couldn’t create the talking-character video right now. The service may be busy or temporarily full. Please try again in a few minutes."
    );
  }
  console.error("[veo] generation error (raw):", raw);
  throw new Error(
    "We couldn’t create the talking-character video. Try a slightly different description, switch to cartoon style if you used a real person, or use slideshow mode instead."
  );
}

const MIN_VIDEO_BYTES = 500_000;

const MIN_VIDEO_DURATION_SEC = 0.5;

export type TalkingObjectStyle = "cartoon" | "real";

export interface GenerateTalkingVideoOptions {
  talkingObjectStyle?: TalkingObjectStyle;
  aspectRatio?: string;
}

function veoConfigAspectRatio(user?: string): "16:9" | "9:16" {
  if (!user || !isValidAspectRatio(user)) return "16:9";
  const portrait: AspectRatio[] = ["9:16", "4:5"];
  if (portrait.includes(user)) return "9:16";
  return "16:9";
}

export async function generateTalkingVideoWithVeo(
  prompt: string,
  _jobId: string,
  outputPath: string,
  options?: GenerateTalkingVideoOptions
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("[veo] Missing GEMINI_API_KEY. Talking-character video is disabled until it is configured.");
    throw new Error(
      "Talking-character video isn’t available on this setup right now. Use slideshow mode instead, or try again later."
    );
  }

  const style = options?.talkingObjectStyle ?? "cartoon";

  const ai = new GoogleGenAI({ apiKey });

  const config: {
    aspectRatio?: string;
    durationSeconds?: number;
  } = {
    aspectRatio: veoConfigAspectRatio(options?.aspectRatio),
    durationSeconds: 8,
  };

  let operation: Awaited<ReturnType<typeof ai.models.generateVideos>>;
  try {
    operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt,
      config,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throwFromVeoRaw(msg);
  }

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    const msg =
      typeof operation.error === "object" && operation.error !== null && "message" in operation.error
        ? String((operation.error as { message?: unknown }).message)
        : String(operation.error);
    throwFromVeoRaw(msg);
  }

  const resp = operation.response;
  const raiCount = resp?.raiMediaFilteredCount ?? 0;
  const raiReasons = resp?.raiMediaFilteredReasons ?? [];

  if (raiCount > 0 || raiReasons.length > 0) {
    const userMessage =
      style === "real"
        ? `That description wasn’t accepted for a real-person look (often for safety or policy reasons). Try “Cartoon” style or change what you asked for.`
        : `That description wasn’t accepted (often for safety or policy reasons). Try changing your topic or wording.`;
    console.error("[veo] RAI/filtered response:", { raiMediaFilteredCount: raiCount, raiMediaFilteredReasons: raiReasons });
    throw new Error(userMessage);
  }

  const generatedVideos = resp?.generatedVideos;
  if (!generatedVideos?.length || !generatedVideos[0]?.video) {
    const safeResp = resp
      ? {
        responseKeys: Object.keys(resp),
        generatedVideosLength: generatedVideos?.length ?? "missing",
        raiMediaFilteredCount: resp.raiMediaFilteredCount,
        raiMediaFilteredReasons: resp.raiMediaFilteredReasons,
      }
      : { responseKeys: "no response" };
    console.error(
      "[veo] No video in response. Diagnostic:",
      JSON.stringify(safeResp, null, 2)
    );
    throw new Error(
      "We couldn’t retrieve your talking-character video from the service. Please try again, or use slideshow mode."
    );
  }

  const videoFile = generatedVideos[0].video;
  const destPath = path.resolve(outputPath);

  try {
    await ai.files.download({
      file: videoFile,
      downloadPath: destPath,
    });
  } catch (downloadErr) {
    const msg = downloadErr instanceof Error ? downloadErr.message : String(downloadErr);
    console.error("[veo] download failed:", outputPath, msg);
    if (isQuotaOrLimitError(msg)) {
      throw new VeoQuotaOrLimitError(
        "We couldn’t finish downloading your talking-character video. The service may be busy. Try again in a few minutes."
      );
    }
    throw new Error(
      "We couldn’t save your talking-character video after it was generated. Try again, or use slideshow mode."
    );
  }

  try {
    const stat = fs.statSync(destPath);
    if (stat.size < MIN_VIDEO_BYTES) {
      fs.unlinkSync(destPath);
      throw new Error(
        style === "real"
          ? "The file we got back wasn’t usable for a real-person video. Try “Cartoon” style or a different description."
          : "The file we got back wasn’t usable. Try a different description or slideshow mode."
      );
    }
    const durationSec = getDuration(destPath);
    if (durationSec < MIN_VIDEO_DURATION_SEC) {
      fs.unlinkSync(destPath);
      throw new Error(
        "The generated video appears empty or invalid (duration too short). Try a different prompt or style."
      );
    }
  } catch (err) {
    if (err instanceof VeoQuotaOrLimitError) throw err;
    throw new Error(
      `Failed to validate generated video: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
