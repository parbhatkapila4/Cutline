import type { CostBreakdown } from "./types";
export const SERVICE_COSTS = {
  VEO_PER_SECOND: 0.40,
  TTS_PER_SECOND: 0.004,
  DALLE_PER_IMAGE: 0.04,
  LLM_PER_1K_TOKENS: 0.00025,
} as const;

export const MARKUP_MULTIPLIER = 1.2;
export const USD_PER_TOKEN = 0.1;

const VEO_CHUNK_SECONDS = 8;
const ESTIMATED_LLM_TOKENS = 4800;
const ESTIMATED_AI_IMAGES_SLIDESHOW = 3;
const ESTIMATE_BUFFER = 1.1;

export function estimateTokenCost(params: {
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
}): number {
  const mode = params.mode ?? "slideshow";
  const dur = Math.max(1, params.durationSeconds ?? 30);

  let cost = 0;

  cost += (ESTIMATED_LLM_TOKENS / 1000) * SERVICE_COSTS.LLM_PER_1K_TOKENS;

  if (mode === "talking_object") {
    const chunks = Math.max(1, Math.ceil(dur / VEO_CHUNK_SECONDS));
    cost += chunks * VEO_CHUNK_SECONDS * SERVICE_COSTS.VEO_PER_SECOND;
    cost += dur * SERVICE_COSTS.TTS_PER_SECOND;
  } else {
    cost += dur * SERVICE_COSTS.TTS_PER_SECOND;
    cost += ESTIMATED_AI_IMAGES_SLIDESHOW * SERVICE_COSTS.DALLE_PER_IMAGE;
  }

  const withBuffer = cost * ESTIMATE_BUFFER;
  return usdToTokens(withBuffer);
}

export function calculateTokensFromCost(breakdown: CostBreakdown): number {
  return usdToTokens(breakdown.total);
}

function usdToTokens(costUsd: number): number {
  const withMarkup = costUsd * MARKUP_MULTIPLIER;
  return Math.max(1, Math.ceil(withMarkup / USD_PER_TOKEN));
}

export function tokensToUsd(tokens: number): string {
  return (tokens * USD_PER_TOKEN).toFixed(2);
}
