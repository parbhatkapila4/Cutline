/**
 * Pipeline orchestrator: runs the full video generation flow from intent to rendered MP4.
 *
 * Stages (slideshow mode):
 * 1. Intent — LLM parses input into audience, goal, tone, duration
 * 2. Narrative — LLM plans arc and beats
 * 3. Shots — LLM breaks into 8–12 shots with motion and text density
 * 4. Script — LLM generates spoken text per shot
 * 5. Subtitles — Chunk script, estimate timing
 * 6. TTS — ElevenLabs/PlayHT generates audio
 * 7. Subtitle refine — Word timings from TTS → aligned chunks
 * 8. Motion — Per-shot motion spec
 * 9. Asset analysis — (if uploads) LLM vision on assets
 * 10. Visuals — Visual spec from intent + assets
 * 11. Image sourcing — Per-shot: query → Unsplash/DALL·E/Pexels
 * 12. Remotion render — Compose script, shots, subtitles, motion, images, audio → MP4
 *
 * Talking-object mode: replaces image sourcing with Veo-generated clips.
 */
import fs from "fs";
import path from "path";

import { getVariationStrategy } from "@/lib/variation/strategies";
import type { Platform } from "@/lib/platform/types";
import { analyzeAssets } from "@/lib/assets/analysis";
import { getAssetFilePath, getAssetMetadata } from "@/lib/assets/storage";
import type { BrandColors } from "@/lib/assets/types";
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
import { composeMotion } from "@/lib/pipeline/motion";
import { composeVisuals } from "@/lib/pipeline/visuals";
import { runRemotionRender } from "@/lib/pipeline/renderVideo";
import { cleanupJobArtifacts } from "@/lib/storage/cleanup";
import { isJobCancelled } from "@/lib/queue/cancelCheck";
import { generateTalkingVideoWithVeo } from "@/lib/veo";
import { concatenateMp4s, isFfmpegAvailable, getDuration, CROSSFADE_DURATION_SECONDS, mixBackgroundMusic } from "@/lib/pipeline/concatMp4";
import { validateVideoChunk } from "@/lib/pipeline/validateChunk";
import { burnSubtitlesIntoVideo, type SubtitleEntry } from "@/lib/pipeline/burnSubtitles";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";
import { getMaxDurationSeconds, getMaxOutputMb } from "@/lib/config/limits";
import { logPipelineEvent } from "@/lib/utils/pipelineLogger";
import {
  recordJobStart,
  recordJobEnd,
  recordStageStart,
  recordStageEnd,
} from "@/lib/telemetry/store";
import { savePreviewArtifacts, loadPreviewArtifacts } from "@/lib/preview/artifacts";
import { createCostTracker } from "@/lib/cost/costEstimator";
import type { CostBreakdown } from "@/lib/cost/types";
import type { Job } from "bullmq";

/** Approximate LLM token counts per stage for cost estimation */
const TOKENS_ESTIMATE = {
  intent: 400,
  narrative: 600,
  shots: 800,
  script: 1000,
  assetAnalysis: 500,
  imageQueryPerShot: 300,
  scriptExtend: 400,
} as const;


/** BullMQ job lock extension interval (30 min) for long-running pipelines */
const LOCK_DURATION_MS = 1_800_000;

/** Wraps a pipeline stage with telemetry (recordStageStart/recordStageEnd) */
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
  renderMode?: "preview" | "final";
  previewJobId?: string;
  variationCount?: number;
  outputSuffix?: string;
  variationStrategy?: string;
  platform?: Platform;
  job?: Job;
};


const VEO_WORDS_PER_CHUNK = 18;

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

const VEO_CHUNK_SECONDS = 8;
const VEO_CHUNK_VALIDATE_RETRIES = 2;

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


export function getCaptionsRenderOption(
  captions: "on" | "off" | undefined,
  subtitleTrackRefined: { chunks: Array<{ text: string; startMs: number; endMs: number; shotId: string }> }
): { showCaptions: boolean; subtitleTrack: { chunks: Array<{ text: string; startMs: number; endMs: number; shotId: string }> } } {
  const showCaptions = captions !== "off";
  return {
    showCaptions,
    subtitleTrack: showCaptions ? subtitleTrackRefined : { chunks: [] },
  };
}

export type PipelineResult = {
  videoPath: string;
  message?: string;
  isPreview?: boolean;
  cost?: CostBreakdown;
  variations?: Array<{ videoUrl: string; cost?: CostBreakdown }>;
};

/**
 * Orchestrates the full video generation pipeline. Runs stages in order with
 * retries for transient failures. Supports slideshow (images + TTS + Remotion)
 * and talking-object (Veo-generated clips). Handles preview/final and multi-variant flows.
 */
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
    for (let v = 0; v < count; v++) {
      const costTracker = createCostTracker();
      const iterOpts: PipelineOptions = {
        ...options,
        outputSuffix: `-v${v + 1}`,
        variationStrategy: getVariationStrategy(v),
      };
      const result = await runPipelineOnce(iterOpts, costTracker);
      results.push({ videoUrl: result.videoPath, cost: costTracker.getBreakdown() });
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
): Promise<{ videoPath: string; message?: string; isPreview?: boolean; cost?: CostBreakdown }> {
  const startTime = Date.now();
  const { input, jobId, requestId, assetIds, brandColors, mode, durationSeconds: optionsDuration, textModel, captions, talkingObjectStyle, renderMode, previewJobId, outputSuffix, variationStrategy, platform, job } = options;
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
    }
    : undefined;
  if (!loadedArtifacts) {
    await checkCancelledAndThrow();
    logEvent({ jobId, event: "stage_start", stage: "script" });
    script = await withStageTelemetry(jobId, "script", () => retry(
      () => generateScript(intent, plan, shotList, { durationSeconds: scriptDurationSec, ...scriptOptions }).then((r) => {
        costTracker.recordLlmTokens(TOKENS_ESTIMATE.script);
        return r;
      }),
      {
        maxRetries: retryConfig.llm.maxRetries,
        backoffMs: retryConfig.llm.backoffMs,
        shouldRetry: shouldRetryForLLM,
        label: "LLM (Script)",
      }
    ));
  }

  const isSlideshow = mode !== "talking_object" && !isPreview;
  if (isSlideshow && !loadedArtifacts && script != null && scriptDurationSec != null && scriptDurationSec >= 15) {
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

  if (mode === "talking_object" && !isPreview) {
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

    const mainSubject =
      intent.mainSubject && intent.mainSubject.trim() !== ""
        ? intent.mainSubject
        : "friendly character";
    const fullScriptText = script.entries
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((e) => e.text)
      .filter((t): t is string => t != null && t.trim() !== "")
      .join(" ");

    if (!useMultiClip) {
      const singleClipBase =
        talkingObjectStyle === "real"
          ? "Real person, photorealistic human, living person, talking to camera. Natural setting or subtle scenery in the background."
          : `Cartoon ${mainSubject} with a friendly face (eyes, eyebrows, nose, mouth) and simple hands, talking to camera.`;
      const prompt = `${singleClipBase} Say the following: ${fullScriptText}`;
      await checkCancelledAndThrow();
      logEvent({ jobId, event: "stage_start", stage: "veo" });
      await withStageTelemetry(jobId, "veo", () =>
        withRetry(
          () => generateTalkingVideoWithVeo(prompt, jobId, outputPath, { talkingObjectStyle }),
          { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
        )
      );
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
      return { videoPath: `/temp/${jobId}${fileSuffix}.mp4`, cost: costTracker.getBreakdown() };
    }

    const wordsPerChunk = VEO_WORDS_PER_CHUNK;
    const targetDurationSec = effectiveDuration;
    const targetChunks = Math.max(1, Math.ceil(targetDurationSec / VEO_CHUNK_SECONDS));
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

    let textChunks = splitScriptIntoChunks(combinedScript, wordsPerChunk).slice(0, targetChunks);
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
            ? "Real person, photorealistic human, living person, talking to camera. Natural setting or subtle scenery in the background."
            : `Cartoon ${mainSubject} with a friendly face (eyes, eyebrows, nose, mouth) and simple hands, talking to camera.`;
        const chunkText = textChunks[i]!;
        let flow: string;
        if (N === 1) {
          flow = "Say exactly the following, naturally and at a steady pace: ";
        } else if (i === 0) {
          flow = "This is the opening of a continuous speech. Say exactly the following in about 8 seconds, finish the last word clearly with no long pause: ";
        } else if (i === N - 1) {
          flow = "This continues directly from the previous clip with no gap. Start immediately and say exactly the following, then end naturally: ";
        } else {
          flow = "This continues directly from the previous clip with no gap. Start immediately, say exactly the following in about 8 seconds, and finish the last word clearly: ";
        }
        const endInstruction = N > 1 && i < N - 1 ? " Do not pause at the end; the next clip will continue from here." : "";
        const prompt = `${base} ${flow}${chunkText}${endInstruction}`;

        let lastChunkError: Error | null = null;
        for (let attempt = 0; attempt <= VEO_CHUNK_VALIDATE_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log("[pipeline] jobId=" + jobId + " mode=talking_object stage=veo chunk " + (i + 1) + "/" + N + " retry " + attempt + "/" + VEO_CHUNK_VALIDATE_RETRIES);
              if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
            } else {
              console.log("[pipeline] jobId=" + jobId + " mode=talking_object stage=veo chunk " + (i + 1) + "/" + N);
            }
            await withRetry(
              () => generateTalkingVideoWithVeo(prompt, jobId + "-chunk-" + i, chunkPath, { talkingObjectStyle }),
              { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
            );
            const validation = validateVideoChunk(chunkPath, VEO_CHUNK_SECONDS);
            if (!validation.valid) {
              throw new Error(validation.reason ?? "Chunk validation failed");
            }
            chunkPaths.push(chunkPath);
            lastChunkError = null;
            break;
          } catch (err) {
            lastChunkError = err instanceof Error ? err : new Error(String(err));
            if (attempt < VEO_CHUNK_VALIDATE_RETRIES) {
              const delayMs = (attempt + 1) * 3000;
              console.warn("[pipeline] jobId=" + jobId + " chunk " + (i + 1) + " invalid, retrying in " + delayMs + "ms: " + lastChunkError.message);
              if (fs.existsSync(chunkPath)) {
                try {
                  fs.unlinkSync(chunkPath);
                } catch (unlinkErr) {
                  console.warn("[pipeline] jobId=" + jobId + " failed to unlink chunk:", unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr));
                }
              }
              await new Promise((r) => setTimeout(r, delayMs));
            } else {
              throw new Error(
                `Chunk ${i + 1}/${N} failed validation after ${VEO_CHUNK_VALIDATE_RETRIES + 1} attempts. ` +
                `All chunks must be valid before concatenation. Last error: ${lastChunkError.message}`
              );
            }
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
            const text = (textChunks[i] ?? "").trim();
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
    return { videoPath: `/temp/${jobId}${fileSuffix}.mp4`, cost: costTracker.getBreakdown(), ...(message ? { message } : {}) };
  }

  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "subtitles" });
  const subtitleTrack = await withStageTelemetry(jobId, "subtitles", async () =>
    loadedArtifacts ? loadedArtifacts.subtitleTrack : generateSubtitles(script, shotList)
  );
  await checkCancelledAndThrow();
  logEvent({ jobId, event: "stage_start", stage: "tts" });
  const ttsResult = await withStageTelemetry(jobId, "tts", () => retry(
    () => generateTTS(script, shotList, isPreview ? { usePreviewTTS: true } : undefined).then((r) => {
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
    composeMotion(shotList)
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
  let imageSpec;
  imageSpec = await withStageTelemetry(jobId, "image_sourcing", () =>
    retry(
      () =>
        sourceImages(
          intent,
          shotList,
          script,
          analyzedAssets,
          assetPaths,
          jobId,
          isPreview
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
    ...(isPreview ? { width: 1280, height: 720 } : {}),
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

  if (isPreview) {
    const previewDurationSec = shotList.totalDurationSeconds ?? shotList.shots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);
    if (previewDurationSec > 0) costTracker.recordVideoSeconds(previewDurationSec);
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
    return { videoPath: `/temp/${jobId}${fileSuffix}.mp4`, isPreview: true, cost: costTracker.getBreakdown() };
  }

  const slideshowDurationSec = compositionDurationSec > 0 ? compositionDurationSec : (shotList.totalDurationSeconds ?? shotList.shots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0));
  if (slideshowDurationSec > 0) costTracker.recordVideoSeconds(slideshowDurationSec);
  checkOutputSizeIfConfigured(effectiveOutputPath);
  logEvent({
    jobId,
    event: "pipeline_completed",
    durationMs: Date.now() - startTime,
  });
  return { videoPath: `/temp/${jobId}${fileSuffix}.mp4`, cost: costTracker.getBreakdown() };
}
