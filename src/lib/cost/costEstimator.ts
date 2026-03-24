import type { CostBreakdown } from "./types";
import { SERVICE_COSTS } from "./pricing";

function getRate(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface CostTracker {
  recordLlmTokens(approxTokens: number): void;
  recordTtsSeconds(seconds: number): void;
  recordVideoSeconds(seconds: number): void;
  recordImageCalls(count: number): void;
  getBreakdown(): CostBreakdown;
}

export function createCostTracker(): CostTracker {
  const costPer1kTokens = getRate("COST_PER_1K_TOKENS", SERVICE_COSTS.LLM_PER_1K_TOKENS);
  const costPerTtsSecond = getRate("COST_PER_TTS_SECOND", SERVICE_COSTS.TTS_PER_SECOND);
  const costPerVideoSecond = getRate("COST_PER_VIDEO_SECOND", SERVICE_COSTS.VEO_PER_SECOND);
  const costPerImageCall = getRate("COST_PER_IMAGE_CALL", SERVICE_COSTS.DALLE_PER_IMAGE);

  let llmTokens = 0;
  let ttsSeconds = 0;
  let videoSeconds = 0;
  let imageCalls = 0;

  return {
    recordLlmTokens(approxTokens: number) {
      llmTokens += Math.max(0, approxTokens);
    },
    recordTtsSeconds(seconds: number) {
      ttsSeconds += Math.max(0, seconds);
    },
    recordVideoSeconds(seconds: number) {
      videoSeconds += Math.max(0, seconds);
    },
    recordImageCalls(count: number) {
      imageCalls += Math.max(0, Math.round(count));
    },
    getBreakdown(): CostBreakdown {
      const llm = round((llmTokens / 1000) * costPer1kTokens);
      const tts = round(ttsSeconds * costPerTtsSecond);
      const video = round(videoSeconds * costPerVideoSecond);
      const images = round(imageCalls * costPerImageCall);
      const total = round(llm + tts + video + images);
      return { llm, tts, video, images, total };
    },
  };
}
