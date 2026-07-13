import fs from "fs";
import path from "path";

import { getVariationStrategy } from "@/lib/variation/strategies";
import type { Platform } from "@/lib/platform/types";
import { analyzeAssets } from "@/lib/assets/analysis";
import { getAssetFilePath, getAssetMetadata } from "@/lib/assets/storage";
import type { BrandColors } from "@/lib/assets/types";
import type { AvatarSelection } from "@/lib/types/avatar";
import { sourceImages, normalizeImageSpecForRender } from "@/lib/images/source";
import {
  retry,
  withRetry,
  getRetryConfig,
  shouldRetryForLLM,
  shouldRetryForTTS,
  shouldRetryForImage,
  shouldRetryForRender,
} from "@/lib/utils/retry";
import { interpretIntent } from "@/lib/pipeline/intent";
import { planNarrative } from "@/lib/pipeline/narrative";
import { planShots } from "@/lib/pipeline/shots";
import { generateScript, extendScript } from "@/lib/pipeline/script";
import { generateSubtitles } from "@/lib/pipeline/subtitles";
import { refineSubtitles } from "@/lib/pipeline/subtitle-refinement";
import { generateTTS } from "@/lib/pipeline/tts";
import { createTalkingVideo } from "@/lib/lipsync/heygen";
import { composeMotion } from "@/lib/pipeline/motion";
import { composeVisuals } from "@/lib/pipeline/visuals";
import { runRemotionRender } from "@/lib/pipeline/renderVideo";
import { cleanupJobArtifacts } from "@/lib/storage/cleanup";
import { isJobCancelled } from "@/lib/queue/cancelCheck";
import { generateTalkingVideoWithVeo, VeoQuotaOrLimitError, VeoContentFilteredError } from "@/lib/veo";
import { rewriteNarrationForSafety } from "@/lib/pipeline/safetyReword";
import { resolveCartoonSubject } from "@/lib/pipeline/cartoonSubject";
import {
  concatenateMp4s,
  isFfmpegAvailable,
  getDuration,
  CROSSFADE_DURATION_SECONDS,
  mixBackgroundMusic,
  trimVideoIfLongerThan,
  trimAudioBufferIfLongerThan,
  trimChunkSilence,
} from "@/lib/pipeline/concatMp4";
import { validateVideoChunk } from "@/lib/pipeline/validateChunk";
import { burnSubtitlesIntoVideo, type SubtitleEntry } from "@/lib/pipeline/burnSubtitles";
import { DURATION_MIN } from "@/lib/validation/duration";
import { getDimensionsForAspectRatio, isValidAspectRatio } from "@/lib/validation/aspectRatio";
import { getMaxDurationSeconds, getMaxOutputMb } from "@/lib/config/limits";
import { logPipelineEvent } from "@/lib/utils/pipelineLogger";
import {
  recordJobStart,
  recordJobEnd,
  recordStageStart,
  recordStageEnd,
  recordStageProgress,
  setActiveJob,
  clearActiveJob,
} from "@/lib/telemetry/store";
import { savePreviewArtifacts, loadPreviewArtifacts } from "@/lib/preview/artifacts";
import { getCaptionsRenderOption } from "@/lib/pipeline/captionsRenderOption";
import { createCostTracker } from "@/lib/cost/costEstimator";
import type { CostBreakdown } from "@/lib/cost/types";
import type { Job } from "bullmq";
import { runQualityGate } from "@/lib/pipeline/qualityGate";
import { mapStrictScriptToShots } from "@/lib/pipeline/strictScriptMap";
import { saveRegenSnapshot } from "@/lib/regen/snapshotStore";
import type {
  BrandBrainInput,
  QualityReport,
  RegenSnapshotV1,
  ScriptFidelityMode,
} from "@/lib/types/pipelineEnhancements";

const TOKENS_ESTIMATE = {
  intent: 400,
  narrative: 600,
  shots: 800,
  script: 1000,
  assetAnalysis: 500,
  imageQueryPerShot: 300,
  scriptExtend: 400,
} as const;

const LOCK_DURATION_MS = 1_800_000;
function hashStringToInt(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function withStageTelemetry<T>(
  jobId: string,
  stageName: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    recordStageStart(jobId, stageName);
  } catch {
  }
  return fn()
    .then((r) => {
      try {
        recordStageEnd(jobId, stageName);
      } catch {
      }
      return r;
    })
    .catch((e) => {
      try {
        recordStageEnd(
          jobId,
          stageName,
          e instanceof Error ? e.message : String(e)
        );
      } catch {
      }
      throw e;
    });
}

export type PipelineOptions = {
  input: string;
  jobId: string;
  requestId?: string;
  assetIds?: string[];
  brandColors?: BrandColors;
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
  textModel?: string;
  captions?: "on" | "off";
  talkingObjectStyle?: "cartoon" | "real";
  talkingRealMode?: "studio" | "scenario";
  avatar?: AvatarSelection;
  renderMode?: "preview" | "final";
  previewJobId?: string;
  variationCount?: number;
  outputSuffix?: string;
  variationStrategy?: string;
  platform?: Platform;
  aspectRatio?: string;
  job?: Job;
  brandBrain?: BrandBrainInput;
  scriptFidelity?: ScriptFidelityMode;
  strictScript?: string;
  locale?: string;
  ttsVoiceId?: string;
  characterLockId?: string;
  qualityGateMode?: "off" | "warn" | "fail";
  regenSnapshot?: RegenSnapshotV1;
  regenFromJobId?: string;
  regenerateShotIds?: string[];
};


const VEO_WORDS_PER_CHUNK = 18;
const VEO_CHUNK_SECONDS = 8;
const VEO_CHUNK_VALIDATE_RETRIES = 2;
const VEO_SAFETY_REWORDS = 2;
const VEO_FILTER_REROLLS = 1;

function maxVeoChunksForTargetDuration(targetSec: number): number {
  const L = VEO_CHUNK_SECONDS;
  const c = CROSSFADE_DURATION_SECONDS;
  if (!Number.isFinite(targetSec) || targetSec <= 0) return 1;
  if (targetSec < L * 0.75) return 1;
  const maxN = Math.floor((targetSec - c + 1e-6) / (L - c));
  return Math.max(1, maxN);
}

function veoCharacterLockSuffix(characterLockId?: string, opts?: { variant?: "default" | "wardrobeAndSetOk" }): string {
  const t = characterLockId?.trim();
  if (!t) return "";
  if (opts?.variant === "wardrobeAndSetOk") {
    return ` Series character identifier "${t}": keep the same real person (face, age, body type) across clips; refresh outfit layers and background per segment so shots do not look duplicated, without switching to a different individual.`;
  }
  return ` Series character identifier "${t}": keep the same character design and face across videos in this series.`;
}

function scenarioVisualBeatForChunk(chunkIndex: number): string {
  const beats = [
    "This segment: change location, wardrobe layer, or camera distance so it is not a visual repeat of the prior clip; same person.",
    "This segment: new backdrop or angle; vary jacket, colors, or accessories while keeping the same speaker.",
    "This segment: different area within the scene, fresher lighting or framing; outfit may shift subtly; same individual.",
    "This segment: alternate real-world context tied to the topic; update styling and environment from the last beat.",
  ];
  return ` ${beats[chunkIndex % beats.length]}`;
}

const CINEMATIC_SUBJECT_POOL: readonly string[] = [
  "warm middle-aged East Asian man with salt-and-pepper hair and round wire-frame glasses, charcoal henley shirt with rolled sleeves",
  "early-30s Afro-Latina woman with a curly bob, gold hoop earrings, mustard denim jacket over a white tee",
  "late-20s white man with a soft beard, hoodie pushed up to the forearms, headphones around the neck",
  "late-30s South Asian woman with sleek straight hair past the shoulders, slate blazer over a cream t-shirt",
  "Black woman in her 50s with gray locs in a low bun, oversized statement glasses, deep-burgundy turtleneck",
  "athletic early-20s mixed-race woman with a high ponytail, oversized college hoodie, no makeup",
  "Mediterranean-looking man in his early 40s, short salt-and-pepper beard, white henley with sleeves rolled, leather watch",
  "Korean-American woman in her late 20s, sharp blunt bangs, oversized cream sweater, layered gold chains",
  "Black man in his early 30s, low fade haircut, gold-framed glasses, terracotta corduroy jacket over a black tee",
  "Brazilian woman in her early 30s, sun-streaked wavy hair, light freckles, olive utility shirt unbuttoned over a white tank",
  "Pacific Islander man in his mid-30s, a tattoo peeking from the collar, navy crewneck sweatshirt, gentle smile",
  "white woman in her late 40s, silver-streaked auburn pixie cut, oversized linen shirt, single minimalist hoop earring",
];

const CINEMATIC_SETTING_POOL: readonly string[] = [
  "third-wave coffee shop with exposed brick and pendant lighting, warm afternoon sun through the front window",
  "open-plan loft with leafy houseplants and a wood-and-steel desk softly out of focus behind",
  "cozy independent bookshop interior, floor-to-ceiling shelves, warm reading lamps in the background",
  "urban side street with brick facade and fairy lights strung overhead, evening blue hour",
  "modern studio apartment kitchen, marble counter, terracotta wall, soft late-morning light",
  "neighborhood park bench under leafy trees, golden hour, dappled sunlight across the subject",
  "minimalist hotel lobby with brushed-concrete walls and a sculptural pendant lamp overhead",
  "industrial design studio, raw concrete, oversized monstera plant, daylight from clerestory windows",
  "rooftop terrace at dusk, blurred city skyline behind, string lights overhead",
  "vintage record store with crate-dug LPs visible in soft-focus background",
  "bright airy bakery, marble counter and brass fixtures, croissants softly out of focus",
  "creative co-working space, whiteboard sketches softly blurred behind, sun streaming sideways through tall windows",
];

function hashStringForCinematic(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickCinematicSubject(
  jobId: string | undefined,
  chunkIndex: number = 0
): string {
  const key = (jobId ?? "") + ":subject:" + String(chunkIndex);
  return CINEMATIC_SUBJECT_POOL[
    hashStringForCinematic(key) % CINEMATIC_SUBJECT_POOL.length
  ]!;
}

function pickCinematicSetting(
  jobId: string | undefined,
  chunkIndex: number = 0
): string {
  const key = (jobId ?? "") + ":setting:" + String(chunkIndex);
  return CINEMATIC_SETTING_POOL[
    hashStringForCinematic(key) % CINEMATIC_SETTING_POOL.length
  ]!;
}

function buildCinematicBasePrompt(
  jobId: string | undefined,
  aspectRatio?: string,
  chunkIndex: number = 0
): string {
  const subject = pickCinematicSubject(jobId, chunkIndex);
  const setting = pickCinematicSetting(jobId, chunkIndex);
  const isPortrait = aspectRatio === "9:16" || aspectRatio === "4:5";
  const orientationHint = isPortrait
    ? "vertical phone-style framing"
    : "horizontal widescreen framing";
  return `Ultra-real influencer-style video, ${orientationHint}, shot like a genuine creator reel. SUBJECT: ${subject}. LOCATION: ${setting}. The presenter speaks directly to camera while naturally inhabiting the space - small head movements, natural blinks, hands occasionally entering frame. DELIVERY: tight and continuous - begin speaking on the very first frame with no silent intro, breath, or warm-up; speak at a steady natural pace without mid-line drift; end on the final word with no afterthought pause or trailing thought. Practical camera with subtle handheld movement, shallow depth of field, environmental details kept in soft focus. Avoid generic newsroom or static talking-head framing. Avoid corporate stock-footage look.`;
}

function splitScriptIntoChunks(
  fullText: string,
  targetWordsPerChunk: number = VEO_WORDS_PER_CHUNK
): string[] {
  const trimmed = fullText.trim();
  if (!trimmed) return [];

  const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  const sentences =
    trimmed.match(/[^.!?]+[.!?]*/g)?.filter((s) => s.trim()) ?? [trimmed];

  function splitLongSentence(text: string): string[] {
    const w = wordCount(text);
    if (w <= targetWordsPerChunk) return [text.trim()];
    const str = text.trim();
    const clauses = str.split(/([,;])/).filter(Boolean);
    if (clauses.length <= 1) {
      const words = str.split(/\s+/).filter(Boolean);
      const parts: string[] = [];
      for (let i = 0; i < words.length; i += targetWordsPerChunk) {
        parts.push(words.slice(i, i + targetWordsPerChunk).join(" "));
      }
      return parts;
    }
    const parts: string[] = [];
    let current = "";
    let currentWords = 0;
    for (let i = 0; i < clauses.length; i++) {
      const piece = clauses[i]!;
      const isDelim = /^[,;]$/.test(piece.trim());
      if (isDelim) {
        current += piece;
        continue;
      }
      const cw = wordCount(piece);
      if (cw === 0) continue;
      if (currentWords + cw > targetWordsPerChunk && current.length > 0) {
        parts.push(current.trim().replace(/\s*[,;]\s*$/, ""));
        current = piece.trim();
        currentWords = cw;
      } else {
        current = current ? current + (current.endsWith(",") || current.endsWith(";") ? " " : "") + piece.trim() : piece.trim();
        currentWords += cw;
      }
    }
    if (current.trim()) parts.push(current.trim().replace(/\s*[,;]\s*$/, ""));
    return parts.length > 0 ? parts : [str];
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;

  for (const sent of sentences) {
    const s = sent.trim();
    const w = wordCount(s);
    if (w === 0) continue;

    if (w > targetWordsPerChunk) {
      if (current.length > 0) {
        chunks.push(current.join(" ").trim());
        current = [];
        words = 0;
      }
      const subParts = splitLongSentence(s);
      for (const part of subParts) {
        const pw = wordCount(part);
        if (words + pw > targetWordsPerChunk && current.length > 0) {
          chunks.push(current.join(" ").trim());
          current = [];
          words = 0;
        }
        current.push(part);
        words += pw;
      }
      continue;
    }

    if (words + w > targetWordsPerChunk && current.length > 0) {
      chunks.push(current.join(" ").trim());
      current = [];
      words = 0;
    }
    current.push(s);
    words += w;
  }

  if (current.length > 0) chunks.push(current.join(" ").trim());
  return chunks;
}

function isVeoQuotaOrRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes("veo api limit reached")) return true;
  if (m.includes("resource exhausted") || m.includes("resource_exhausted")) return true;
  if (m.includes("rate limit") || m.includes("rate_limit") || m.includes("too many requests")) return true;
  if (/\b429\b/.test(m)) return true;
  if (
    m.includes("quota exceeded") ||
    m.includes("exceeded your quota") ||
    m.includes("over quota") ||
    m.includes("out of quota")
  ) {
    return true;
  }
  return false;
}

function coerceDurationSeconds(value: unknown, logContext?: { jobId: string }): number | undefined {
  if (value == null) return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  const maxAllowed = getMaxDurationSeconds();
  const rounded = Math.round(num);
  const clamped = Math.min(maxAllowed, Math.max(DURATION_MIN, rounded));
  if (rounded > maxAllowed && logContext) {
    console.log("[pipeline] jobId=" + logContext.jobId + " duration capped to " + clamped + " seconds (max " + maxAllowed + ")");
  }
  return clamped;
}

function checkOutputSizeIfConfigured(outputPath: string): void {
  const maxMb = getMaxOutputMb();
  if (maxMb == null) return;
  const stat = fs.statSync(outputPath);
  const sizeMb = stat.size / (1024 * 1024);
  if (sizeMb > maxMb) {
    throw new Error(`Output video exceeds maximum size (${maxMb} MB).`);
  }
}

export { getCaptionsRenderOption };

export type PipelineResult = {
  videoPath: string;
  message?: string;
  isPreview?: boolean;
  cost?: CostBreakdown;
  variations?: Array<{ videoUrl: string; cost?: CostBreakdown }>;
  qualityReport?: QualityReport;
};

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { renderMode, previewJobId, variationCount, platform, jobId, job } = options;
  const isFinalFromPreview = renderMode === "final" && previewJobId;
  const isPreview = renderMode === "preview";
  const count = isFinalFromPreview || isPreview
    ? 1
    : Math.min(Math.max(1, variationCount ?? 1), 5);

  if (jobId) {
    try {
      recordJobStart(jobId, {
        platform: platform ?? undefined,
        variationCount: count > 1 ? count : undefined,
        requestId: options.requestId,
      });
    } catch {
    }
    if (job) {
      try {
        setActiveJob(jobId, job);
      } catch {
      }
    }
  }

  try {
    if (count === 1) {
      const costTracker = createCostTracker();
      const result = await runPipelineOnce(options, costTracker);
      if (jobId) {
        try {
          recordJobEnd(jobId, "completed");
        } catch {
        }
      }
      return result;
    }

    const results: Array<{ videoUrl: string; cost?: CostBreakdown }> = [];
    let qualityReport: QualityReport | undefined;
    for (let v = 0; v < count; v++) {
      const costTracker = createCostTracker();
      const iterOpts: PipelineOptions = {
        ...options,
        outputSuffix: `-v${v + 1}`,
        variationStrategy: getVariationStrategy(v),
      };
      const result = await runPipelineOnce(iterOpts, costTracker);
      results.push({ videoUrl: result.videoPath, cost: costTracker.getBreakdown() });
      if (v === 0) qualityReport = result.qualityReport;
      if (job?.token) await job.extendLock(job.token, LOCK_DURATION_MS);
    }
    if (jobId) {
      try {
        recordJobEnd(jobId, "completed");
      } catch {
      }
    }
    return {
      videoPath: results[0]!.videoUrl,
      variations: results,
      qualityReport,
    };
  } catch (e) {
    if (jobId) {
      try {
        recordJobEnd(
          jobId,
          "failed",
          e instanceof Error ? e.message : String(e)
        );
      } catch {
      }
    }
    throw e;
  } finally {
    if (jobId) {
      try {
        clearActiveJob(jobId);
      } catch {
      }
      try {
        await cleanupJobArtifacts(jobId);
      } catch (cleanupErr) {
        console.warn("[pipeline] jobId=" + jobId + " cleanupJobArtifacts failed:", cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr));
      }
    }
  }
}

async function runPipelineOnce(
  options: PipelineOptions,
  costTracker: ReturnType<typeof createCostTracker>
): Promise<{
  videoPath: string;
  message?: string;
  isPreview?: boolean;
  cost?: CostBreakdown;
  qualityReport?: QualityReport;
}> {
  const startTime = Date.now();
  const {
    input,
    jobId,
    requestId,
    assetIds,
    brandColors,
    mode,
    durationSeconds: optionsDuration,
    textModel,
    captions,
    talkingObjectStyle,
    talkingRealMode,
    avatar,
    renderMode,
    previewJobId,
    outputSuffix,
    variationStrategy,
    platform,
    aspectRatio,
    job,
  } = options;
  const logEvent = (p: Parameters<typeof logPipelineEvent>[0]) =>
    logPipelineEvent({ ...p, ...(requestId ? { requestId } : {}) });
  const resolvedPlatform: Platform = platform ?? "general";
  const llmOptions = textModel ? { model: textModel } : undefined;
  const cwd = process.cwd();
  const outputDir = path.join(cwd, "public", "temp");
  const isPreview = renderMode === "preview";
  const fileSuffix = (outputSuffix ?? "") + (isPreview ? "-preview" : "");
  const outputPath = path.join(outputDir, `${jobId}${fileSuffix}.mp4`);
  const retryConfig = getRetryConfig();
  const isFinalFromPreview = renderMode === "final" && previewJobId;
  let loadedArtifacts: Awaited<ReturnType<typeof loadPreviewArtifacts>> = null;
  if (isFinalFromPreview && previewJobId) {
    loadedArtifacts = await loadPreviewArtifacts(previewJobId);
    if (loadedArtifacts) {
      console.log("[pipeline] jobId=" + jobId + " loaded preview artifacts from " + previewJobId);
    } else {
      console.log("[pipeline] jobId=" + jobId + " preview artifacts not found, running full pipeline");
    }
  }

  logEvent({ jobId, event: "pipeline_started" });

  async function checkCancelledAndThrow(): Promise<void> {
    if (await isJobCancelled(jobId)) {
      console.log("[pipeline] jobId=" + jobId + " Job cancelled");
      logEvent({ jobId, event: "job_cancelled" });
      throw new Error("Job cancelled");
    }
  }

  await checkCancelledAndThrow();

  let regenSnapshot: RegenSnapshotV1 | undefined = options.regenSnapshot;
  if (options.regenFromJobId && regenSnapshot == null) {
    const { loadRegenSnapshot } = await import("@/lib/regen/snapshotStore");
    regenSnapshot = (await loadRegenSnapshot(options.regenFromJobId)) ?? undefined;
    if (regenSnapshot == null) {
      throw new Error(
        "Shot regeneration source is missing or expired. Run a slideshow job first, then retry within 7 days."
      );
    }
  }

  const modeEff = mode ?? "slideshow";
  if (regenSnapshot && modeEff === "slideshow" && !isPreview && !loadedArtifacts) {
    const { buildImageSpecForRegen } = await import("@/lib/regen/patchImages");
    const { runSlideshowTailFromSubtitles } = await import("@/lib/regen/slideshowTailFromSubtitles");
    const snap = regenSnapshot;
    const motionSpec =
      options.brandBrain?.motionStyle && options.brandBrain.motionStyle !== "default"
        ? composeMotion(snap.shotList, { motionStyle: options.brandBrain.motionStyle })
        : snap.motionSpec;
    const visualSpec = snap.visualSpec;
    const normalizedImageSpec = await buildImageSpecForRegen(
      snap,
      jobId,
      options.regenerateShotIds ?? []
    );
    const qgm = options.qualityGateMode ?? "warn";
    let qualityReport = runQualityGate(snap.script, snap.shotList, options.brandBrain);
    if (qgm === "off") {
      qualityReport = { passed: true, score: 100, issues: [] };
    } else if (qgm === "fail" && !qualityReport.passed) {
      throw new Error("Quality gate failed: " + qualityReport.issues.join("; "));
    } else if (qgm === "warn" && !qualityReport.passed) {
      console.warn("[pipeline] jobId=" + jobId + " quality: " + qualityReport.issues.join("; "));
    }
    const r = await runSlideshowTailFromSubtitles({
      jobId,
      requestId,
      script: snap.script,
      shotList: snap.shotList,
      intent: snap.intent,
      narrative: snap.narrative,
      captions: snap.captions ?? captions ?? "on",
      motionSpec,
      visualSpec,
      normalizedImageSpec,
      logoUrl: snap.logoUrl,
      logoPlacement: snap.logoPlacement,
      outputPath,
      fileSuffix,
      aspectRatio: snap.aspectRatio ?? aspectRatio,
      isPreview: false,
      ttsVoiceId: options.ttsVoiceId,
      costTracker,
      checkCancelledAndThrow,
      logEvent,
      job,
      startTime,
      brandBrain: options.brandBrain,
    });
    return { ...r, qualityReport };
  }

  let intent!: Awaited<ReturnType<typeof interpretIntent>>;
  let plan!: Awaited<ReturnType<typeof planNarrative>>;
  let shotList!: Awaited<ReturnType<typeof planShots>>;
  let script!: Awaited<ReturnType<typeof generateScript>>;

  if (loadedArtifacts) {
    intent = loadedArtifacts.intent;
    plan = loadedArtifacts.narrative;
    shotList = loadedArtifacts.shotList;
    script = loadedArtifacts.script;
    const clamped = coerceDurationSeconds(optionsDuration, { jobId });
    if (clamped !== undefined) {
      intent = { ...intent, durationSeconds: clamped };
    }
  } else {
    await checkCancelledAndThrow();
    logEvent({ jobId, event: "stage_start", stage: "intent" });
    intent = await withStageTelemetry(jobId, "intent", () =>
      retry(
        () => interpretIntent(input, { ...llmOptions, platform: resolvedPlatform }).then((r) => {
          costTracker.recordLlmTokens(TOKENS_ESTIMATE.intent);
          return r;
        }),
        {
          maxRetries: retryConfig.llm.maxRetries,
          backoffMs: retryConfig.llm.backoffMs,
          shouldRetry: shouldRetryForLLM,
          label: "LLM (Intent)",
        }
      ));

    const clampedDuration = coerceDurationSeconds(optionsDuration, { jobId });
    if (clampedDuration !== undefined) {
      intent = { ...intent, durationSeconds: clampedDuration };
      console.log("[pipeline] jobId=" + jobId + " durationSeconds overridden to " + clampedDuration);
    }

    await checkCancelledAndThrow();
    logEvent({ jobId, event: "stage_start", stage: "narrative" });
    plan = await withStageTelemetry(jobId, "narrative", () => retry(
      () => planNarrative(intent, { ...llmOptions, variationStrategy, platform: resolvedPlatform }).then((r) => {
        costTracker.recordLlmTokens(TOKENS_ESTIMATE.narrative);
        return r;
      }),
      {
        maxRetries: retryConfig.llm.maxRetries,
        backoffMs: retryConfig.llm.backoffMs,
        shouldRetry: shouldRetryForLLM,
        label: "LLM (Narrative)",
      }
    ));
    await checkCancelledAndThrow();
    logEvent({ jobId, event: "stage_start", stage: "shots" });
    shotList = await withStageTelemetry(jobId, "shots", () => retry(
      () => planShots(intent, plan, { ...llmOptions, platform: resolvedPlatform }).then((r) => {
        costTracker.recordLlmTokens(TOKENS_ESTIMATE.shots);
        return r;
      }),
      {
        maxRetries: retryConfig.llm.maxRetries,
        backoffMs: retryConfig.llm.backoffMs,
        shouldRetry: shouldRetryForLLM,
        label: "LLM (Shots)",
      }
    ));
  }

  const clampedDuration = coerceDurationSeconds(optionsDuration, { jobId });
  const scriptDurationSec = clampedDuration ?? intent.durationSeconds;
  const scriptOptions = !loadedArtifacts
    ? {
      mode: isPreview ? "slideshow" : mode,
      durationSeconds: scriptDurationSec,
      ...(textModel ? { model: textModel } : {}),
      ...(variationStrategy ? { variationStrategy } : {}),
      platform: resolvedPlatform,
      brandBrain: options.brandBrain,
      locale: options.locale,
      jobId,
      ...(talkingRealMode ? { talkingRealMode } : {}),
    }
    : undefined;
  if (!loadedArtifacts) {
    await checkCancelledAndThrow();
    logEvent({ jobId, event: "stage_start", stage: "script" });
    if (options.scriptFidelity === "strict") {
      const rawStrict = options.strictScript?.trim();
      if (!rawStrict) {
        throw new Error('strictScript is required when scriptFidelity is "strict".');
      }
      script = await withStageTelemetry(jobId, "script", () =>
        retry(
          () =>
            mapStrictScriptToShots(intent, plan, shotList, rawStrict, textModel).then((r) => {
              costTracker.recordLlmTokens(TOKENS_ESTIMATE.script);
              return r;
            }),
          {
            maxRetries: retryConfig.llm.maxRetries,
            backoffMs: retryConfig.llm.backoffMs,
            shouldRetry: shouldRetryForLLM,
            label: "LLM (Strict script map)",
          }
        )
      );
    } else {
      script = await withStageTelemetry(jobId, "script", () =>
        retry(
          () =>
            generateScript(intent, plan, shotList, {
              durationSeconds: scriptDurationSec,
              ...scriptOptions,
            }).then((r) => {
              costTracker.recordLlmTokens(TOKENS_ESTIMATE.script);
              return r;
            }),
          {
            maxRetries: retryConfig.llm.maxRetries,
            backoffMs: retryConfig.llm.backoffMs,
            shouldRetry: shouldRetryForLLM,
            label: "LLM (Script)",
          }
        )
      );
    }
  }

  const isSlideshow = mode !== "talking_object" && !isPreview;
  if (
    isSlideshow &&
    !loadedArtifacts &&
    options.scriptFidelity !== "strict" &&
    script != null &&
    scriptDurationSec != null &&
    scriptDurationSec >= 15
  ) {
    const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    const targetMinWords = Math.floor(scriptDurationSec * 2.5);
    for (let round = 0; round < 2; round++) {
      const scriptWordCount = script.entries
        .filter((e) => e.text != null && e.text.trim() !== "")
        .reduce((sum, e) => sum + wordCount(e.text!), 0);
      if (scriptWordCount >= targetMinWords) break;
      const fullScriptText = script.entries
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((e) => e.text)
        .filter((t): t is string => t != null && t.trim() !== "")
        .join(" ");
      const wordsNeeded = targetMinWords - scriptWordCount;
      const extension = await extendScript(fullScriptText, intent, wordsNeeded, textModel ? { model: textModel } : undefined);
      if (!extension.trim()) break;
      const entries = [...script.entries].sort((a, b) => a.order - b.order);
      const lastWithText = entries.filter((e) => e.text != null && e.text.trim() !== "").pop();
      if (!lastWithText) break;
      lastWithText.text = (lastWithText.text!.trim() + " " + extension.trim()).trim();
      script = { entries };
      console.log("[pipeline] jobId=" + jobId + " script extended (round " + (round + 1) + ") to meet " + scriptDurationSec + "s: added " + wordCount(extension) + " words (total now ~" + (scriptWordCount + wordCount(extension)) + ")");
    }
    const sortedEntries = [...script.entries].sort((a, b) => a.order - b.order);
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    if (lastEntry?.text != null && lastEntry.text.trim() !== "") {
      const words = lastEntry.text.trim().split(/\s+/).filter(Boolean);
      if (words.length > 5) {
        lastEntry.text = words.slice(0, 5).join(" ").replace(/[.,;:]$/, "") + "!";
        script = { entries: sortedEntries };
      }
    }
  }

  const qgmMain = options.qualityGateMode ?? "warn";
  let qualityReportMain = runQualityGate(script, shotList, options.brandBrain);
  if (qgmMain === "off") {
    qualityReportMain = { passed: true, score: 100, issues: [] };
  } else if (qgmMain === "fail" && !qualityReportMain.passed) {
    throw new Error("Quality gate failed: " + qualityReportMain.issues.join("; "));
  } else if (qgmMain === "warn" && !qualityReportMain.passed) {
    console.warn("[pipeline] jobId=" + jobId + " quality: " + qualityReportMain.issues.join("; "));
  }

  if (mode === "talking_object" && !isPreview) {
    try {
      const PRESET_AVATAR_FILES: Record<string, string> = {
        presenter_female_1: "presenter-female-1.jpg",
        presenter_male_1: "presenter-male-1.jpg",
        creator_female_1: "creator-female-1.jpg",
        creator_male_1: "creator-male-1.jpg",
      };

      let resolvedAvatarPath: string | undefined;

      if (talkingRealMode !== "scenario" && talkingObjectStyle === "real" && avatar?.mode === "preset" && avatar.presetId) {
        const filename = PRESET_AVATAR_FILES[avatar.presetId];
        if (filename) {
          resolvedAvatarPath = path.join(process.cwd(), "public", "avatars", "presets", filename);
          console.log("[pipeline] jobId=" + jobId + " using preset avatar image: " + resolvedAvatarPath);
        }
      }

      if (!resolvedAvatarPath && talkingRealMode !== "scenario" && talkingObjectStyle === "real" && avatar?.mode === "upload") {
        const uploadedAvatarId = avatar.uploadAssetId;
        if (uploadedAvatarId) {
          const uploadedMeta = getAssetMetadata(uploadedAvatarId);
          if (!uploadedMeta || uploadedMeta.type !== "referenceImage") {
            throw new Error("Uploaded avatar image is invalid. Please re-upload your photo and try again.");
          }
          const uploadedPath = getAssetFilePath(uploadedAvatarId);
          if (!uploadedPath) {
            throw new Error("Uploaded avatar image is missing from storage. Please re-upload and try again.");
          }
          resolvedAvatarPath = uploadedPath;
        }
      }

      if (resolvedAvatarPath) {
        if (!process.env.HEYGEN_API_KEY || process.env.HEYGEN_API_KEY.trim() === "") {
          throw new Error(
            "Avatar video requires HEYGEN_API_KEY on the server. Add it to .env.local or choose the default avatar."
          );
        }

        const fullScriptText = script.entries
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((e) => e.text)
          .filter((t): t is string => t != null && t.trim() !== "")
          .join(" ");

        const talkingAvatarMaxSec =
          coerceDurationSeconds(optionsDuration, { jobId }) ??
          coerceDurationSeconds(intent.durationSeconds, { jobId });

        await checkCancelledAndThrow();
        logEvent({ jobId, event: "stage_start", stage: "tts" });
        let ttsResult = await withStageTelemetry(jobId, "tts", () =>
          retry(
            () =>
              generateTTS(script, shotList, { voiceId: options.ttsVoiceId }).then((r) => {
                costTracker.recordTtsSeconds(r.durationMs / 1000);
                return r;
              }),
            {
              maxRetries: retryConfig.tts.maxRetries,
              backoffMs: retryConfig.tts.backoffMs,
              shouldRetry: shouldRetryForTTS,
              label: "TTS",
            }
          )
        );

        if (talkingAvatarMaxSec != null) {
          const trimmedAudio = trimAudioBufferIfLongerThan(
            ttsResult.audioBuffer,
            ttsResult.audioFormat,
            talkingAvatarMaxSec,
            jobId
          );
          if (trimmedAudio.length !== ttsResult.audioBuffer.length) {
            console.log(
              "[pipeline] jobId=" +
              jobId +
              " TTS audio truncated to max " +
              talkingAvatarMaxSec +
              "s for HeyGen (was longer than selected duration)"
            );
          }
          ttsResult = {
            ...ttsResult,
            audioBuffer: trimmedAudio,
            durationMs: Math.min(ttsResult.durationMs, Math.round(talkingAvatarMaxSec * 1000)),
          };
        }

        await checkCancelledAndThrow();
        logEvent({ jobId, event: "stage_start", stage: "heygen" });

        const heygenDimension =
          aspectRatio && isValidAspectRatio(aspectRatio)
            ? getDimensionsForAspectRatio(aspectRatio)
            : { width: 1920, height: 1080 };

        const seed = hashStringToInt(jobId + "|heygen");
        const expressionPool: Array<"happy" | "default"> = ["happy", "happy", "default"];
        const heygenExpression = expressionPool[seed % expressionPool.length] ?? "happy";
        const heygenScale = 0.97 + ((seed >>> 4) % 7) * 0.01;
        const calmStrategies = new Set(["educational", "minimal"]);
        const heygenTalkingStyle: "stable" | "expressive" =
          options.variationStrategy && calmStrategies.has(options.variationStrategy)
            ? "stable"
            : "expressive";

        await withStageTelemetry(jobId, "heygen", () =>
          withRetry(
            () =>
              createTalkingVideo(
                resolvedAvatarPath,
                ttsResult.audioBuffer,
                ttsResult.audioFormat,
                jobId,
                outputPath,
                {
                  dimension: heygenDimension,
                  talkingStyle: heygenTalkingStyle,
                  expression: heygenExpression,
                  superResolution: true,
                  matting: true,
                  backgroundColor: "#0f1115",
                  scale: heygenScale,
                }
              ),
            { maxAttempts: 2, baseDelayMs: 1500, maxDelayMs: 8000 }
          )
        );

        if (talkingAvatarMaxSec != null) {
          trimVideoIfLongerThan(outputPath, talkingAvatarMaxSec, { throwIfCannotTrim: true });
        }

        if (captions !== "off") {
          try {
            const durationSecRaw = getDuration(outputPath);
            const durationSec =
              talkingAvatarMaxSec != null
                ? Math.min(durationSecRaw, talkingAvatarMaxSec)
                : durationSecRaw;
            if (durationSec > 0 && fullScriptText.trim()) {
              const wordCountScript = fullScriptText.trim().split(/\s+/).filter(Boolean).length;
              const minCaptionSec = 1.5;
              const maxSegments = Math.max(1, Math.floor(durationSec / minCaptionSec));
              const numSegments = Math.min(maxSegments, Math.min(6, Math.max(2, Math.ceil(wordCountScript / 14))));
              const phrases = splitScriptIntoChunks(
                fullScriptText.trim(),
                Math.max(1, Math.ceil(wordCountScript / numSegments))
              ).slice(0, numSegments);
              if (phrases.length === 0) {
                phrases.push(fullScriptText.trim().slice(0, 200));
              }
              const n = Math.max(1, phrases.length);
              const durationMs = durationSec * 1000;
              const entries: SubtitleEntry[] = phrases
                .map((text, i) => ({
                  text,
                  startMs: Math.round((i / n) * durationMs),
                  endMs: Math.round(((i + 1) / n) * durationMs),
                }))
                .filter((e) => e.endMs > e.startMs && e.endMs - e.startMs >= 800);
              if (entries.length > 0) {
                await checkCancelledAndThrow();
                logEvent({ jobId, event: "stage_start", stage: "burn_subtitles" });
                await withStageTelemetry(jobId, "burn_subtitles", async () => {
                  burnSubtitlesIntoVideo(outputPath, entries);
                });
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`Caption burn failed (captions were requested): ${msg}`);
          }
        }

        const durationSec = getDuration(outputPath);
        if (durationSec > 0) costTracker.recordVideoSeconds(durationSec);
        checkOutputSizeIfConfigured(outputPath);
        logEvent({
          jobId,
          event: "pipeline_completed",
          durationMs: Date.now() - startTime,
        });
        return {
          videoPath: `/temp/${jobId}${fileSuffix}.mp4`,
          cost: costTracker.getBreakdown(),
          qualityReport: qualityReportMain,
        };
      }

      const avatarPresetPrompt: Record<string, string> = {
        presenter_female_1: "Young professional woman presenter, natural makeup, business-casual outfit, warm and confident expression.",
        presenter_male_1: "Young professional man presenter, clean and modern look, business-casual outfit, confident expression.",
        creator_female_1: "Female content creator style, casual modern outfit, approachable and energetic expression.",
        creator_male_1: "Male content creator style, casual modern outfit, friendly and expressive delivery.",
      };
      const resolveAvatarPromptSuffix = (): string => {
        if (!avatar) return "";
        if (avatar.mode === "default") return "";
        if (avatar.mode === "preset") {
          return avatar.presetId ? ` Match this avatar profile: ${avatarPresetPrompt[avatar.presetId] ?? ""}` : "";
        }
        if (avatar.mode === "upload") {
          const uploadedId = avatar.uploadAssetId;
          if (!uploadedId) return "";
          const uploadedMeta = getAssetMetadata(uploadedId);
          if (!uploadedMeta || uploadedMeta.type !== "referenceImage") {
            console.warn("[pipeline] jobId=" + jobId + " avatar upload is invalid; falling back to default avatar");
            return "";
          }
          const uploadedPath = getAssetFilePath(uploadedId);
          if (!uploadedPath) {
            console.warn("[pipeline] jobId=" + jobId + " avatar upload path missing; falling back to default avatar");
            return "";
          }
          return " Match the same person identity and appearance from the uploaded avatar reference image.";
        }
        return "";
      };
      const avatarPromptSuffix = resolveAvatarPromptSuffix();

      let effectiveDuration =
        coerceDurationSeconds(optionsDuration, { jobId }) ?? coerceDurationSeconds(intent.durationSeconds, { jobId });
      if (effectiveDuration == null || effectiveDuration <= VEO_CHUNK_SECONDS) {
        effectiveDuration = 60;
        console.log("[pipeline] jobId=" + jobId + " talking_object duration forced to 60s (safety net)");
      }
      const useMultiClip = effectiveDuration > VEO_CHUNK_SECONDS;
      console.log(
        "[pipeline] jobId=" + jobId + " talking_object effectiveDuration=" + effectiveDuration +
        " " + (useMultiClip ? "multi-clip" : "single clip")
      );

      const isCartoon = talkingObjectStyle === "cartoon";
      let cartoonBasePrompt =
        `Cartoon humanoid character with a friendly face (eyes, eyebrows, nose, mouth), a stylized cartoon body with arms and simple hands, talking to camera. Approachable, topic-neutral cartoon person, NOT a recognizable real human or celebrity.`;
      if (isCartoon) {
        const cartoonSubject = await resolveCartoonSubject(intent.rawInput, {
          proposedSubject: intent.mainSubject ?? null,
          model: textModel,
        });
        if (cartoonSubject.shape === "object") {
          cartoonBasePrompt =
            `Cartoon ${cartoonSubject.subject} with a friendly face (eyes, eyebrows, nose, mouth) and simple hands, talking to camera. The character is clearly recognizable as a ${cartoonSubject.subject} - stylized but unambiguous in shape.`;
        }
        console.log(
          "[pipeline] jobId=" + jobId + " cartoon shape=" +
          (cartoonSubject.shape === "object"
            ? "object:" + cartoonSubject.subject
            : "humanoid")
        );
      }
      const fullScriptText = script.entries
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((e) => e.text)
        .filter((t): t is string => t != null && t.trim() !== "")
        .join(" ");

      if (!useMultiClip) {
        const singleClipBase =
          talkingObjectStyle === "real"
            ? talkingRealMode === "scenario"
              ? `${buildCinematicBasePrompt(jobId, aspectRatio)}${avatarPromptSuffix}`
              : `Real person, photorealistic human, living person, talking to camera. Natural setting or subtle scenery in the background.${avatarPromptSuffix}`
            : cartoonBasePrompt;
        const singleLock =
          talkingObjectStyle === "real" && talkingRealMode === "scenario"
            ? veoCharacterLockSuffix(options.characterLockId, { variant: "wardrobeAndSetOk" })
            : veoCharacterLockSuffix(options.characterLockId);
        const prompt = `${singleClipBase} Say the following: ${fullScriptText}${singleLock}`;
        await checkCancelledAndThrow();
        logEvent({ jobId, event: "stage_start", stage: "veo" });
        await withStageTelemetry(jobId, "veo", () =>
          withRetry(
            () =>
              generateTalkingVideoWithVeo(prompt, jobId, outputPath, {
                talkingObjectStyle,
                aspectRatio,
              }),
            { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
          )
        );
        trimVideoIfLongerThan(outputPath, effectiveDuration);
        if (captions !== "off") {
          try {
            const durationSec = getDuration(outputPath);
            if (durationSec > 0 && fullScriptText.trim()) {
              const wordCountScript = fullScriptText.trim().split(/\s+/).filter(Boolean).length;
              const minCaptionSec = 1.5;
              const maxSegments = Math.max(1, Math.floor(durationSec / minCaptionSec));
              const numSegments = Math.min(maxSegments, Math.min(4, Math.max(2, Math.ceil(wordCountScript / 15))));
              const phrases = splitScriptIntoChunks(fullScriptText.trim(), Math.max(1, Math.ceil(wordCountScript / numSegments))).slice(0, numSegments);
              if (phrases.length === 0) {
                phrases.push(fullScriptText.trim().slice(0, 200));
              }
              const n = Math.max(1, phrases.length);
              const durationMs = durationSec * 1000;
              const entries: SubtitleEntry[] = phrases.map((text, i) => ({
                text,
                startMs: Math.round((i / n) * durationMs),
                endMs: Math.round(((i + 1) / n) * durationMs),
              })).filter((e) => e.endMs > e.startMs && e.endMs - e.startMs >= 800);
              if (entries.length > 0) {
                await checkCancelledAndThrow();
                logEvent({ jobId, event: "stage_start", stage: "burn_subtitles" });
                await withStageTelemetry(jobId, "burn_subtitles", async () => {
                  burnSubtitlesIntoVideo(outputPath, entries);
                });
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`Caption burn failed (captions were requested): ${msg}`);
          }
        }
        const durationSec = getDuration(outputPath);
        if (durationSec > 0) costTracker.recordVideoSeconds(durationSec);
        checkOutputSizeIfConfigured(outputPath);
        logEvent({
          jobId,
          event: "pipeline_completed",
          durationMs: Date.now() - startTime,
        });
        return {
          videoPath: `/temp/${jobId}${fileSuffix}.mp4`,
          cost: costTracker.getBreakdown(),
          qualityReport: qualityReportMain,
        };
      }

      const wordsPerChunk = VEO_WORDS_PER_CHUNK;
      const targetDurationSec = effectiveDuration;
      const naiveChunkBudget = Math.max(1, Math.ceil(targetDurationSec / VEO_CHUNK_SECONDS));
      const maxChunksFitDuration = maxVeoChunksForTargetDuration(targetDurationSec);
      const targetChunks = Math.min(naiveChunkBudget, maxChunksFitDuration);
      if (naiveChunkBudget > maxChunksFitDuration) {
        console.log(
          "[pipeline] jobId=" + jobId + " clip budget capped " + naiveChunkBudget + " → " + targetChunks +
          " so concatenated runtime fits ~" + targetDurationSec + "s (avoids trimming mid-speech)."
        );
      }
      const targetTotalWords = targetChunks * wordsPerChunk;

      const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

      let combinedScript = fullScriptText.trim();
      let message: string | undefined;
      if (combinedScript && splitScriptIntoChunks(combinedScript, wordsPerChunk).length < targetChunks) {
        const maxExtendRounds = 5;
        for (let round = 0; round < maxExtendRounds; round++) {
          const chunksNow = splitScriptIntoChunks(combinedScript, wordsPerChunk);
          if (chunksNow.length >= targetChunks) break;
          const currentWords = wordCount(combinedScript);
          const wordsNeeded = targetTotalWords - currentWords;
          if (wordsNeeded <= 0) break;
          const extendOptions = textModel ? { model: textModel } : undefined;
          const extension = await extendScript(combinedScript, intent, wordsNeeded, extendOptions);
          costTracker.recordLlmTokens(TOKENS_ESTIMATE.scriptExtend);
          if (!extension || !extension.trim()) {
            console.log("[pipeline] jobId=" + jobId + " script extension returned empty; using current content");
            break;
          }
          combinedScript = (combinedScript + " " + extension).trim();
        }
        const chunksAfterExtend = splitScriptIntoChunks(combinedScript, wordsPerChunk);
        const wasExtended = combinedScript.length > fullScriptText.trim().length;
        if (wasExtended) {
          message = `Your prompt was short; we added more content to match your chosen ${targetDurationSec} seconds.`;
          console.log(
            "[pipeline] jobId=" + jobId + " script was short; extended with new content to " + targetDurationSec + "s (" + targetChunks + " chunks)"
          );
        } else if (chunksAfterExtend.length < targetChunks) {
          message = `Your prompt was short; we added content where possible. Video length is shorter than your chosen ${targetDurationSec} seconds.`;
          console.log(
            "[pipeline] jobId=" + jobId + " script extension insufficient; using " + chunksAfterExtend.length + " chunks (target " + targetChunks + ")"
          );
        }
      }

      if (naiveChunkBudget > maxChunksFitDuration) {
        const capMsg =
          `To finish cleanly within about ${targetDurationSec} seconds, we use ${targetChunks} segments so speech is not cut off at the end.`;
        message = message ? `${message} ${capMsg}` : capMsg;
      }

      const textChunks = splitScriptIntoChunks(combinedScript, wordsPerChunk).slice(0, targetChunks);
      const finalChunkTexts: string[] = [];
      await checkCancelledAndThrow();
      logEvent({ jobId, event: "stage_start", stage: "veo" });
      const chunkPaths = await withStageTelemetry(jobId, "veo", async (): Promise<string[]> => {
        if (textChunks.length === 0) {
          throw new Error("Talking object script produced no text chunks.");
        }
        if (!isFfmpegAvailable()) {
          console.warn(
            "[pipeline] jobId=" + jobId + " ffmpeg not available; talking_object videos longer than 8s require ffmpeg for concatenation. Set FFMPEG_PATH or add ffmpeg to PATH."
          );
          throw new Error(
            "Video length is over 8 seconds. Multiple clips need to be concatenated; ffmpeg is required. Install ffmpeg and add it to PATH, or set FFMPEG_PATH in .env.local."
          );
        }
        const jobTempDir = path.join(outputDir, jobId);
        fs.mkdirSync(jobTempDir, { recursive: true });
        const chunkPaths: string[] = [];
        const N = textChunks.length;
        for (let i = 0; i < N; i++) {
          if (job?.token) {
            await job.extendLock(job.token, LOCK_DURATION_MS);
          }
          const chunkPath = path.join(jobTempDir, `veo_chunk_${i}.mp4`);
          const base =
            talkingObjectStyle === "real"
              ? talkingRealMode === "scenario"
                ? `${buildCinematicBasePrompt(jobId, aspectRatio, i)}${avatarPromptSuffix}`
                : `Real person, photorealistic human, living person, talking to camera. Natural setting or subtle scenery in the background.${avatarPromptSuffix}`
              : cartoonBasePrompt;
          const multiRealBeat =
            talkingObjectStyle === "real" && N > 1
              ? talkingRealMode === "scenario"
                ? " This segment must show a DIFFERENT presenter from prior clips — distinct person, distinct ethnicity/age/wardrobe, distinct location — documentary-style multi-voice cut. Do NOT carry over the previous speaker."
                : " This segment: shift background or wardrobe slightly from the prior clip so it does not look duplicated; same person."
              : "";
          const baseAugmented = `${base}${multiRealBeat}`;
          const chunkText = textChunks[i]!;
          const isCinematicScenarioChunk =
            talkingObjectStyle === "real" && talkingRealMode === "scenario";
          const lockVariant =
            talkingObjectStyle === "real" && N > 1 && !isCinematicScenarioChunk
              ? ("wardrobeAndSetOk" as const)
              : ("default" as const);
          const lockSuffix = isCinematicScenarioChunk
            ? ""
            : lockVariant === "wardrobeAndSetOk"
              ? veoCharacterLockSuffix(options.characterLockId, { variant: "wardrobeAndSetOk" })
              : veoCharacterLockSuffix(options.characterLockId);
          let flow: string;
          if (N === 1) {
            flow = "Begin speaking on frame 1 with no silent intro, breath, or warm-up; say exactly the following at a steady natural pace and finish on the last word with no afterthought pause: ";
          } else if (i === 0) {
            flow = isCinematicScenarioChunk
              ? "Begin speaking on frame 1 with no silent intro, breath, or warm-up. Deliver this opening line tightly at a steady natural pace; end on the last word with no afterthought pause. Say exactly the following in about 8 seconds: "
              : "This is the opening of a continuous speech. Begin speaking on frame 1 with no silent intro. Say exactly the following in about 8 seconds, finish the last word clearly with no long pause: ";
          } else if (i === N - 1) {
            flow = isCinematicScenarioChunk
              ? "A NEW presenter (different person from prior clips) begins speaking on frame 1 with no silent intro, breath, or warm-up. Deliver the closing line tightly; complete the final sentence fully and stop immediately with no trailing thought or afterthought pause. Say exactly the following: "
              : "This continues directly from the previous clip with no gap. Start immediately; say exactly the following as the closing segment. Complete the final sentence fully, then stop speaking with no extra clause or trailing thought: ";
          } else {
            flow = isCinematicScenarioChunk
              ? "A NEW presenter (different person from prior clips) begins speaking on frame 1 with no silent intro, breath, or warm-up. Deliver this segment tightly at a steady natural pace; end on the last word with no afterthought pause. Say exactly the following in about 8 seconds: "
              : "This continues directly from the previous clip with no gap. Start immediately, say exactly the following in about 8 seconds, and finish the last word clearly: ";
          }
          const endInstruction =
            N > 1 && i < N - 1
              ? isCinematicScenarioChunk
                ? " End on the last word with no afterthought pause; the video cuts to a different presenter immediately after."
                : " Do not pause at the end; the next clip will continue from here."
              : N > 1 && i === N - 1
                ? " Do not add another sentence after the final line."
                : "";
          const buildChunkPrompt = (text: string) =>
            `${baseAugmented} ${flow}${text}${endInstruction}${lockSuffix}`;

          let currentChunkText = chunkText;
          let prompt = buildChunkPrompt(currentChunkText);
          const MAX_GENERATE_ATTEMPTS = VEO_CHUNK_VALIDATE_RETRIES + 1;
          let genAttempt = 0;
          let safetyRewords = 0;
          let filterRerolls = 0;
          let lastChunkError: Error | null = null;

          while (true) {
            try {
              recordStageProgress(jobId, "veo", `chunk ${i + 1} of ${N}`);
            } catch {
            }
            try {
              if (genAttempt > 0 || safetyRewords > 0 || filterRerolls > 0) {
                console.log("[pipeline] jobId=" + jobId + " mode=talking_object stage=veo chunk " + (i + 1) + "/" + N + " (gen " + genAttempt + "/" + VEO_CHUNK_VALIDATE_RETRIES + ", reroll " + filterRerolls + "/" + VEO_FILTER_REROLLS + ", reword " + safetyRewords + "/" + VEO_SAFETY_REWORDS + ")");
                if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
              } else {
                console.log("[pipeline] jobId=" + jobId + " mode=talking_object stage=veo chunk " + (i + 1) + "/" + N);
              }
              await withRetry(
                () =>
                  generateTalkingVideoWithVeo(prompt, jobId + "-chunk-" + i, chunkPath, {
                    talkingObjectStyle,
                    aspectRatio,
                  }),
                { maxAttempts: 4, baseDelayMs: 2000, maxDelayMs: 20000 }
              );
              const validation = validateVideoChunk(chunkPath, VEO_CHUNK_SECONDS);
              if (!validation.valid) {
                throw new Error(validation.reason ?? "Chunk validation failed");
              }
              trimChunkSilence(chunkPath, {
                trimLeading: i === 0,
                trimTrailing: true,
              });
              chunkPaths.push(chunkPath);
              finalChunkTexts.push(currentChunkText);
              lastChunkError = null;
              break;
            } catch (err) {
              lastChunkError = err instanceof Error ? err : new Error(String(err));
              if (fs.existsSync(chunkPath)) {
                try {
                  fs.unlinkSync(chunkPath);
                } catch (unlinkErr) {
                  console.warn("[pipeline] jobId=" + jobId + " failed to unlink chunk:", unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr));
                }
              }

              if (lastChunkError instanceof VeoContentFilteredError) {
                if (filterRerolls < VEO_FILTER_REROLLS) {
                  filterRerolls++;
                  console.warn("[pipeline] jobId=" + jobId + " chunk " + (i + 1) + " blocked by content-safety filter; retrying same prompt unchanged (reroll " + filterRerolls + "/" + VEO_FILTER_REROLLS + ")");
                  await new Promise((r) => setTimeout(r, 2000));
                  continue;
                }
                if (safetyRewords >= VEO_SAFETY_REWORDS) {
                  throw new Error(
                    `Chunk ${i + 1}/${N} was blocked by the content-safety filter after ${1 + VEO_FILTER_REROLLS + VEO_SAFETY_REWORDS} attempts (including rewording). ` +
                    `Try changing this part of your topic. Last error: ${lastChunkError.message}`
                  );
                }
                safetyRewords++;
                console.warn("[pipeline] jobId=" + jobId + " chunk " + (i + 1) + " blocked by content-safety filter; rewording narration (" + safetyRewords + "/" + VEO_SAFETY_REWORDS + ")");
                let reworded: string | null = null;
                try {
                  reworded = await rewriteNarrationForSafety(
                    currentChunkText,
                    textModel ? { model: textModel } : undefined
                  );
                } catch (rwErr) {
                  console.warn("[pipeline] jobId=" + jobId + " safety reword failed: " + (rwErr instanceof Error ? rwErr.message : String(rwErr)));
                }
                if (!reworded || !reworded.trim() || reworded.trim() === currentChunkText.trim()) {
                  console.warn("[pipeline] jobId=" + jobId + " chunk " + (i + 1) + " reword produced no usable variation; retrying generation with current narration (reword " + safetyRewords + "/" + VEO_SAFETY_REWORDS + ")");
                } else {
                  currentChunkText = reworded.trim();
                  prompt = buildChunkPrompt(currentChunkText);
                }
                await new Promise((r) => setTimeout(r, 2000));
                continue;
              }

              genAttempt++;
              if (genAttempt >= MAX_GENERATE_ATTEMPTS) {
                throw new Error(
                  `Chunk ${i + 1}/${N} failed validation after ${MAX_GENERATE_ATTEMPTS} attempts. ` +
                  `All chunks must be valid before concatenation. Last error: ${lastChunkError.message}`
                );
              }
              const delayMs = genAttempt * 3000;
              console.warn("[pipeline] jobId=" + jobId + " chunk " + (i + 1) + " invalid, retrying in " + delayMs + "ms: " + lastChunkError.message);
              await new Promise((r) => setTimeout(r, delayMs));
            }
          }
        }

        for (let i = 0; i < chunkPaths.length; i++) {
          const v = validateVideoChunk(chunkPaths[i]!, VEO_CHUNK_SECONDS);
          if (!v.valid) {
            throw new Error(
              `Chunk ${i + 1}/${chunkPaths.length} failed pre-concat validation: ${v.reason ?? "unknown"}. ` +
              `All chunks must be valid before concatenation.`
            );
          }
        }
        return chunkPaths;
      });
      await checkCancelledAndThrow();
      logEvent({ jobId, event: "stage_start", stage: "concat" });
      await withStageTelemetry(jobId, "concat", async () => {
        concatenateMp4s(chunkPaths, outputPath);
      });
      trimVideoIfLongerThan(outputPath, targetDurationSec);
      try {
        mixBackgroundMusic(outputPath, outputPath, undefined, 0.22);
        console.log("[pipeline] jobId=" + jobId + " stage=background-music (mixed if available)");
      } catch (e) {
        console.warn("[pipeline] jobId=" + jobId + " background music mix skipped:", e);
      }
      if (captions !== "off") {
        try {
          const totalVideoSec = getDuration(outputPath);
          const videoDurationSec = totalVideoSec > 0 ? totalVideoSec : (() => {
            const chunkDurations = chunkPaths.map((p) => getDuration(p) || 8);
            const crossfadeSec = CROSSFADE_DURATION_SECONDS;
            return chunkDurations.reduce((a, b) => a + b, 0) - (textChunks.length - 1) * crossfadeSec;
          })();
          if (videoDurationSec <= 0) {
            throw new Error("Could not get video duration for captions. Captions were requested but cannot be added.");
          } else {
            const n = Math.max(1, textChunks.length);
            const durationMs = videoDurationSec * 1000;
            const minCaptionMs = 1000;
            const entries: SubtitleEntry[] = [];
            for (let i = 0; i < textChunks.length; i++) {
              const text = (finalChunkTexts[i] ?? textChunks[i] ?? "").trim();
              if (!text) continue;
              const startMs = Math.round((i / n) * durationMs);
              let endMs = Math.round(((i + 1) / n) * durationMs);
              if (endMs <= startMs) endMs = startMs + minCaptionMs;
              if (endMs - startMs < minCaptionMs) endMs = startMs + minCaptionMs;
              if (endMs > durationMs) endMs = Math.round(durationMs);
              entries.push({ text, startMs, endMs });
            }
            if (entries.length === 0) {
              throw new Error("No caption segments could be generated. Captions were requested but cannot be added.");
            }
            await checkCancelledAndThrow();
            logEvent({ jobId, event: "stage_start", stage: "burn_subtitles" });
            await withStageTelemetry(jobId, "burn_subtitles", async () => {
              burnSubtitlesIntoVideo(outputPath, entries);
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`Caption burn failed (captions were requested): ${msg}`);
        }
      }
      const videoDurationSec = getDuration(outputPath);
      if (videoDurationSec > 0) costTracker.recordVideoSeconds(videoDurationSec);
      checkOutputSizeIfConfigured(outputPath);
      logEvent({
        jobId,
        event: "pipeline_completed",
        durationMs: Date.now() - startTime,
      });
      return {
        videoPath: `/temp/${jobId}${fileSuffix}.mp4`,
        cost: costTracker.getBreakdown(),
        qualityReport: qualityReportMain,
        ...(message ? { message } : {}),
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const isCapacity =
        e instanceof VeoQuotaOrLimitError || isVeoQuotaOrRateLimitError(errMsg);
      if (!isCapacity) {
        throw e;
      }
      console.warn(
        "[pipeline] jobId=" + jobId + " talking-character capacity/quota; falling back to slideshow. Detail: " + errMsg
      );
      const fallback = await runPipelineOnce(
        { ...options, mode: "slideshow" },
        costTracker
      );
      const notice =
        "We couldn’t finish the talking-character version of your video (the service was busy or temporarily unavailable), so we made a slideshow with images and voiceover using the same script instead. You can try talking-character mode again later.";
      return {
        ...fallback,
        message: fallback.message ? `${notice} ${fallback.message}` : notice,
      };
    }
  }

  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "subtitles" });
  const subtitleTrack = await withStageTelemetry(jobId, "subtitles", async () =>
    loadedArtifacts ? loadedArtifacts.subtitleTrack : generateSubtitles(script, shotList)
  );
  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "tts" });
  const ttsResult = await withStageTelemetry(jobId, "tts", () => retry(
    () =>
      generateTTS(
        script,
        shotList,
        isPreview ? { usePreviewTTS: true } : { voiceId: options.ttsVoiceId }
      ).then((r) => {
        costTracker.recordTtsSeconds(r.durationMs / 1000);
        return r;
      }),
    {
      maxRetries: retryConfig.tts.maxRetries,
      backoffMs: retryConfig.tts.backoffMs,
      shouldRetry: shouldRetryForTTS,
      label: "TTS",
    }
  ));
  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "subtitle_refine" });
  const subtitleTrackRefined = await withStageTelemetry(jobId, "subtitle_refine", async () =>
    refineSubtitles(
      subtitleTrack,
      ttsResult.wordTimings,
      script,
      shotList,
      ttsResult.segmentDurationsMs
    )
  );

  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "motion" });
  const motionSpec = await withStageTelemetry(jobId, "motion", async () =>
    composeMotion(shotList, { motionStyle: options.brandBrain?.motionStyle ?? "default" })
  );

  const hasAssets =
    (Array.isArray(assetIds) && assetIds.length > 0) || brandColors != null;
  const analyzedAssets = hasAssets
    ? await withStageTelemetry(jobId, "asset_analysis", async () => {
      await checkCancelledAndThrow();
      logEvent({ jobId, event: "stage_start", stage: "asset_analysis" });
      return retry(
        () => analyzeAssets(assetIds ?? [], brandColors).then((r) => {
          costTracker.recordLlmTokens(TOKENS_ESTIMATE.assetAnalysis);
          return r;
        }),
        {
          maxRetries: retryConfig.llm.maxRetries,
          backoffMs: retryConfig.llm.backoffMs,
          shouldRetry: shouldRetryForLLM,
          label: "LLM (Asset analysis)",
        }
      );
    })
    : undefined;

  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "visuals" });
  const visualSpec = await withStageTelemetry(jobId, "visuals", async () =>
    composeVisuals(intent, shotList, analyzedAssets)
  );

  const assetPaths =
    Array.isArray(assetIds) && assetIds.length > 0
      ? (() => {
        const productPhotos: string[] = [];
        for (const id of assetIds) {
          const meta = getAssetMetadata(id);
          if (meta?.type === "productPhoto") {
            const fp = getAssetFilePath(id);
            if (fp) productPhotos.push(fp);
          }
        }
        return productPhotos.length > 0 ? { productPhotos } : undefined;
      })()
      : undefined;

  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "image_sourcing" });
  const imageSpec = await withStageTelemetry(jobId, "image_sourcing", () =>
    retry(
      () =>
        sourceImages(
          intent,
          shotList,
          script,
          analyzedAssets,
          assetPaths,
          jobId,
          isPreview,
          aspectRatio
        ),
      {
        maxRetries: retryConfig.image.maxRetries,
        backoffMs: retryConfig.image.backoffMs,
        shouldRetry: shouldRetryForImage,
        label: "Image sourcing",
      }
    )
  ).catch((e) => {
    const message =
      e instanceof Error ? e.message : "Could not obtain images for video.";
    throw new Error(message);
  });
  costTracker.recordLlmTokens(shotList.shots.length * TOKENS_ESTIMATE.imageQueryPerShot);
  costTracker.recordImageCalls(imageSpec.entries.length);

  const normalizedImageSpec = normalizeImageSpecForRender(imageSpec, jobId, cwd);

  let logoUrl: string | undefined;
  let logoPlacement: "outro" | "watermark" | "hero" | undefined;
  if (analyzedAssets?.logo && Array.isArray(assetIds) && assetIds.length > 0) {
    for (const id of assetIds) {
      const meta = getAssetMetadata(id);
      if (meta?.type === "logo") {
        const logoPath = getAssetFilePath(id);
        if (logoPath) {
          const imagesDir = path.join(cwd, "public", "temp", jobId, "images");
          fs.mkdirSync(imagesDir, { recursive: true });
          const ext = path.extname(logoPath) || ".png";
          const destPath = path.join(imagesDir, `logo${ext}`);
          fs.copyFileSync(logoPath, destPath);
          logoUrl = `/temp/${jobId}/images/logo${ext}`;
          logoPlacement = analyzedAssets.logo.suggestedPlacement;
          break;
        }
      }
    }
  }

  const audioBase64 =
    ttsResult.audioBuffer != null && ttsResult.audioBuffer.length > 0
      ? ttsResult.audioBuffer.toString("base64")
      : null;

  const audioDurationSec = ttsResult.durationMs / 1000;
  const plannedDurationSec = shotList.totalDurationSeconds ?? shotList.shots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);

  const subtitleTrackClamped = (() => {
    const maxMs = ttsResult.durationMs;
    const chunks = (subtitleTrackRefined.chunks ?? [])
      .map((c) => {
        let startMs = c.startMs;
        let endMs = Math.min(c.endMs, maxMs);
        if (endMs <= startMs) endMs = Math.min(startMs + 400, maxMs);
        if (startMs >= maxMs) {
          startMs = Math.max(0, maxMs - 400);
          endMs = maxMs;
        }
        if (endMs <= startMs) return null;
        return { ...c, startMs, endMs };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
    return { chunks };
  })();

  const { showCaptions, subtitleTrack: renderSubtitleTrack } = getCaptionsRenderOption(captions, subtitleTrackClamped);

  let finalShotList = shotList;
  let finalMotionSpec = motionSpec;
  let compositionDurationSec = plannedDurationSec;
  if (audioDurationSec > 0 && audioDurationSec < plannedDurationSec) {
    const scale = audioDurationSec / plannedDurationSec;
    const scaledShots = shotList.shots.map((sh) => ({
      ...sh,
      durationSeconds: Math.max(1, Math.round((sh.durationSeconds ?? 0) * scale)),
    }));
    let scaledSum = scaledShots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);
    if (scaledSum !== Math.round(audioDurationSec)) {
      const last = scaledShots[scaledShots.length - 1];
      if (last) {
        const diff = Math.round(audioDurationSec) - scaledSum;
        last.durationSeconds = Math.max(1, (last.durationSeconds ?? 0) + diff);
      }
      scaledSum = scaledShots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);
    }
    finalShotList = { shots: scaledShots, totalDurationSeconds: scaledSum };
    const shotDurationById = new Map(scaledShots.map((s) => [s.id, s.durationSeconds ?? 0]));
    finalMotionSpec = {
      entries: motionSpec.entries.map((e) => ({
        ...e,
        durationSeconds: Math.max(1, shotDurationById.get(e.shotId) ?? Math.round((e.durationSeconds ?? 0) * scale)),
      })),
    };
    compositionDurationSec = audioDurationSec;
    console.log("[pipeline] jobId=" + jobId + " audio shorter than planned (" + Math.round(audioDurationSec) + "s vs " + Math.round(plannedDurationSec) + "s); scaled shots and composition to audio length.");
  }

  const effectiveOutputPath = outputPath;
  const aspectDimensions =
    !isPreview && aspectRatio && isValidAspectRatio(aspectRatio)
      ? getDimensionsForAspectRatio(aspectRatio)
      : null;
  const renderInput = {
    script,
    shotList: finalShotList,
    subtitleTrack: renderSubtitleTrack,
    showCaptions,
    motionSpec: finalMotionSpec,
    visualSpec,
    imageSpec: normalizedImageSpec,
    ...(logoUrl && logoPlacement ? { logoUrl, logoPlacement } : {}),
    audioBase64,
    audioFormat: ttsResult.audioFormat,
    durationSeconds: compositionDurationSec,
    ...(isPreview ? { width: 1280, height: 720 } : aspectDimensions ? { width: aspectDimensions.width, height: aspectDimensions.height } : {}),
  };

  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "render" });
  await withStageTelemetry(jobId, "render", () => retry(
    () =>
      new Promise<void>((resolve, reject) => {
        try {
          runRemotionRender(renderInput, effectiveOutputPath);
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
    {
      maxRetries: retryConfig.render.maxRetries,
      backoffMs: retryConfig.render.backoffMs,
      shouldRetry: shouldRetryForRender,
      label: "Remotion render",
    }
  ));

  const slideshowCapSec = Math.max(1, Math.round(compositionDurationSec));
  trimVideoIfLongerThan(effectiveOutputPath, slideshowCapSec);

  if (isPreview) {
    checkOutputSizeIfConfigured(effectiveOutputPath);
    await savePreviewArtifacts(jobId, {
      intent,
      narrative: plan,
      shotList,
      script,
      subtitleTrack,
    });
    logEvent({
      jobId,
      event: "pipeline_completed",
      durationMs: Date.now() - startTime,
    });
    return {
      videoPath: `/temp/${jobId}${fileSuffix}.mp4`,
      isPreview: true,
      cost: costTracker.getBreakdown(),
      qualityReport: qualityReportMain,
    };
  }

  checkOutputSizeIfConfigured(effectiveOutputPath);
  await saveRegenSnapshot(jobId, {
    version: 1,
    sourceJobId: jobId,
    intent,
    narrative: plan,
    shotList,
    script,
    motionSpec,
    visualSpec,
    imageSpec: normalizedImageSpec,
    captions: captions ?? "on",
    aspectRatio,
    platform: resolvedPlatform,
    ...(logoUrl && logoPlacement ? { logoUrl, logoPlacement } : {}),
  });
  logEvent({
    jobId,
    event: "pipeline_completed",
    durationMs: Date.now() - startTime,
  });
  return {
    videoPath: `/temp/${jobId}${fileSuffix}.mp4`,
    cost: costTracker.getBreakdown(),
    qualityReport: qualityReportMain,
  };
}
