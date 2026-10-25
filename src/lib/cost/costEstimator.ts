import type { CostBreakdown } from "./types";
import { SERVICE_COSTS, VEO_CHUNK_SECONDS, heygenRatePerSecond } from "./pricing";
import { llmCallCostUsd, type LlmCall } from "./llmPricing";
import type { ImageSpecEntry } from "@/lib/images/types";
export function countPaidImageCalls(entries: readonly ImageSpecEntry[] | undefined | null): number {
  if (!Array.isArray(entries)) return 0;
  return entries.filter((e) => e?.source === "ai-generated").length;
}

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
  recordLlmCall(call: LlmCall): void;
  recordTtsSeconds(seconds: number): void;
  recordVeoChunks(count: number): void;
  recordHeygenSeconds(seconds: number): void;
  recordImageCalls(count: number): void;
  getBreakdown(): CostBreakdown;
}

export function createCostTracker(): CostTracker {
  const costPerTtsSecond = getRate("COST_PER_TTS_SECOND", SERVICE_COSTS.TTS_PER_SECOND);
  const costPerVideoSecond = getRate("COST_PER_VIDEO_SECOND", SERVICE_COSTS.VEO_PER_SECOND);
  const costPerImageCall = getRate("COST_PER_IMAGE_CALL", SERVICE_COSTS.DALLE_PER_IMAGE);

  let llmUsd = 0;
  let ttsSeconds = 0;
  let veoChunks = 0;
  let heygenSeconds = 0;
  let imageCalls = 0;

  return {
    recordLlmCall(call: LlmCall) {
      const usd = llmCallCostUsd(call);
      if (Number.isFinite(usd) && usd > 0) llmUsd += usd;
    },
    recordTtsSeconds(seconds: number) {
      ttsSeconds += Math.max(0, seconds);
    },
    recordVeoChunks(count: number) {
      veoChunks += Math.max(0, Math.round(count));
    },
    recordHeygenSeconds(seconds: number) {
      heygenSeconds += Math.max(0, seconds);
    },
    recordImageCalls(count: number) {
      imageCalls += Math.max(0, Math.round(count));
    },
    getBreakdown(): CostBreakdown {
      const llm = round(llmUsd);
      const tts = round(ttsSeconds * costPerTtsSecond);
      const video = round(
        veoChunks * VEO_CHUNK_SECONDS * costPerVideoSecond +
        heygenSeconds * heygenRatePerSecond()
      );
      const images = round(imageCalls * costPerImageCall);
      const total = round(llm + tts + video + images);
      return { llm, tts, video, images, total };
    },
  };
}
