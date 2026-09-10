export const SERVICE_COSTS = {
  VEO_PER_SECOND: 0.40,
  TTS_PER_SECOND: 0.004,
  DALLE_PER_IMAGE: 0.12,
  LLM_PER_1K_TOKENS: 0.00025,
} as const;

export const HEYGEN_PER_SECOND: number | null = null;

let warnedMissingHeygenRate = false;
export function heygenRatePerSecond(): number {
  const override = process.env.COST_PER_HEYGEN_SECOND;
  if (override !== undefined && override.trim() !== "") {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (HEYGEN_PER_SECOND !== null) return HEYGEN_PER_SECOND;
  if (!warnedMissingHeygenRate) {
    warnedMissingHeygenRate = true;
    console.error(
      "[cost] HEYGEN RATE UNKNOWN. HeyGen avatar renders are being booked at $0.00 against the " +
      "gross-margin ceiling, so real HeyGen spend is invisible to it. Fill verifiedPriceUsd for " +
      "heygen.avatar_video_per_second in config/vendor-prices.json and set COST_PER_HEYGEN_SECOND, " +
      "or set HEYGEN_PER_SECOND in src/lib/cost/pricing.ts."
    );
  }
  return 0;
}
export const VEO_CHUNK_SECONDS = 8;
const ESTIMATED_LLM_TOKENS = 4800;
const ESTIMATED_AI_IMAGES_SLIDESHOW = 3;
const ESTIMATE_BUFFER = 1.1;

export type TalkingProvider = "veo" | "heygen";
export type TalkingShape = {
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
  variationCount?: number;
  talkingObjectStyle?: "cartoon" | "real";
  talkingRealMode?: string;
  avatar?: { mode?: string; presetId?: string; uploadAssetId?: string };
};

const AVATAR_PRESET_IDS = new Set([
  "presenter_female_1",
  "presenter_male_1",
  "creator_female_1",
  "creator_male_1",
]);

export function talkingProviderFor(params: TalkingShape): TalkingProvider | null {
  if ((params.mode ?? "slideshow") !== "talking_object") return null;
  const realNonScenario =
    params.talkingObjectStyle === "real" && params.talkingRealMode !== "scenario";
  if (!realNonScenario) return "veo";
  const avatar = params.avatar;
  if (avatar?.mode === "preset" && avatar.presetId && AVATAR_PRESET_IDS.has(avatar.presetId)) {
    return "heygen";
  }
  if (avatar?.mode === "upload" && avatar.uploadAssetId) return "heygen";
  return "veo";
}

export function veoSecondsFor(params: TalkingShape): number {
  if (talkingProviderFor(params) !== "veo") return 0;
  const dur = Math.max(1, params.durationSeconds ?? 30);
  const perVariation = Math.max(1, Math.ceil(dur / VEO_CHUNK_SECONDS)) * VEO_CHUNK_SECONDS;
  return perVariation * variationMultiplier(params.variationCount);
}

export function heygenSecondsFor(params: TalkingShape): number {
  if (talkingProviderFor(params) !== "heygen") return 0;
  const dur = Math.max(1, params.durationSeconds ?? 30);
  return Math.ceil(dur) * variationMultiplier(params.variationCount);
}

export function cinematicSecondsFor(params: TalkingShape): number {
  return veoSecondsFor(params) + heygenSecondsFor(params);
}
function variationMultiplier(variationCount?: number): number {
  const n = Math.floor(variationCount ?? 1);
  return Math.min(5, Math.max(1, Number.isFinite(n) ? n : 1));
}

export function estimateUnmeteredCostUsd(params: TalkingShape & {
  stockImagesOnly?: boolean;
}): number {
  return estimateCostUsd({ ...params, excludeCinematic: true });
}

export function estimateCostUsd(params: TalkingShape & {
  stockImagesOnly?: boolean;
  excludeCinematic?: boolean;
}): number {
  const mode = params.mode ?? "slideshow";
  const dur = Math.max(1, params.durationSeconds ?? 30);
  const variations = variationMultiplier(params.variationCount);
  const fixed = (ESTIMATED_LLM_TOKENS / 1000) * SERVICE_COSTS.LLM_PER_1K_TOKENS;

  let perVariation = 0;
  if (mode === "talking_object") {
    if (!params.excludeCinematic) {
      const one = { ...params, variationCount: 1, durationSeconds: dur };
      perVariation += veoSecondsFor(one) * SERVICE_COSTS.VEO_PER_SECOND;
      perVariation += heygenSecondsFor(one) * heygenRatePerSecond();
    }
    perVariation += dur * SERVICE_COSTS.TTS_PER_SECOND;
  } else {
    perVariation += dur * SERVICE_COSTS.TTS_PER_SECOND;
    if (!params.stockImagesOnly) {
      perVariation += ESTIMATED_AI_IMAGES_SLIDESHOW * SERVICE_COSTS.DALLE_PER_IMAGE;
    }
  }

  return (fixed + perVariation * variations) * ESTIMATE_BUFFER;
}

