import type { CostBreakdown } from "./types";

// ---------------------------------------------------------------------------
// Real service costs (USD) - based on provider pricing as of March 2026
// ---------------------------------------------------------------------------

export const SERVICE_COSTS = {
  /** Google Veo 3.1 Standard - $0.40 per second of generated video */
  VEO_PER_SECOND: 0.40,

  /** ElevenLabs Multilingual v2 - ~$0.004 per second of TTS audio */
  TTS_PER_SECOND: 0.004,

  /** DALL·E 3, 1024×1024, standard quality - $0.04 per image */
  DALLE_PER_IMAGE: 0.04,

  /** Gemini Flash Lite via OpenRouter - ~$0.00025 per 1K tokens */
  LLM_PER_1K_TOKENS: 0.00025,
} as const;

/** 20 % profit margin applied on top of our raw cost */
export const MARKUP_MULTIPLIER = 1.2;

/** 1 token = $0.10 of user charge (post-markup) */
export const USD_PER_TOKEN = 0.1;

// ---------------------------------------------------------------------------
// Internal constants for estimation
// ---------------------------------------------------------------------------
const VEO_CHUNK_SECONDS = 8;
const ESTIMATED_LLM_TOKENS = 4800;
const ESTIMATED_AI_IMAGES_SLIDESHOW = 3;
const ESTIMATE_BUFFER = 1.1; // 10 % headroom so pre-check never under-estimates

// ---------------------------------------------------------------------------
// Pre-pipeline estimation (used before enqueue to check balance)
// ---------------------------------------------------------------------------

export function estimateTokenCost(params: {
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
}): number {
  const mode = params.mode ?? "slideshow";
  const dur = Math.max(1, params.durationSeconds ?? 30);

  let cost = 0;

  // LLM (roughly fixed per pipeline run)
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

// ---------------------------------------------------------------------------
// Post-pipeline calculation (uses actual CostBreakdown from costEstimator)
// ---------------------------------------------------------------------------

export function calculateTokensFromCost(breakdown: CostBreakdown): number {
  return usdToTokens(breakdown.total);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usdToTokens(costUsd: number): number {
  const withMarkup = costUsd * MARKUP_MULTIPLIER;
  return Math.max(1, Math.ceil(withMarkup / USD_PER_TOKEN));
}

export function tokensToUsd(tokens: number): string {
  return (tokens * USD_PER_TOKEN).toFixed(2);
}
