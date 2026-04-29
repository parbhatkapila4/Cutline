import fs from "fs";
import type { Job } from "bullmq";
import type { Script } from "@/lib/types/script";
import type { ShotList } from "@/lib/types/shots";
import type { MotionSpec } from "@/lib/types/motion";
import type { VisualSpec } from "@/lib/types/visuals";
import type { ImageSpec } from "@/lib/images/types";
import type { BrandBrainInput } from "@/lib/types/pipelineEnhancements";
import { generateSubtitles } from "@/lib/pipeline/subtitles";
import { refineSubtitles } from "@/lib/pipeline/subtitle-refinement";
import { generateTTS } from "@/lib/pipeline/tts";
import { runRemotionRender } from "@/lib/pipeline/renderVideo";
import { getCaptionsRenderOption } from "@/lib/pipeline/captionsRenderOption";
import { getDimensionsForAspectRatio, isValidAspectRatio } from "@/lib/validation/aspectRatio";
import { getMaxOutputMb } from "@/lib/config/limits";
import {
  retry,
  getRetryConfig,
  shouldRetryForTTS,
  shouldRetryForRender,
} from "@/lib/utils/retry";
import { saveRegenSnapshot } from "@/lib/regen/snapshotStore";
import type { RegenSnapshotV1 } from "@/lib/types/pipelineEnhancements";
import type { Intent } from "@/lib/types/intent";
import type { NarrativePlan } from "@/lib/types/narrative";
import type { CostBreakdown } from "@/lib/cost/types";
import { createCostTracker } from "@/lib/cost/costEstimator";

type CostTracker = ReturnType<typeof createCostTracker>;

function checkOutputSizeIfConfigured(outputPath: string): void {
  const maxMb = getMaxOutputMb();
  if (maxMb == null) return;
  const stat = fs.statSync(outputPath);
  const sizeMb = stat.size / (1024 * 1024);
  if (sizeMb > maxMb) {
    throw new Error(`Output video exceeds maximum size (${maxMb} MB).`);
  }
}

async function withStageTelemetry<T>(
  jobId: string,
  stageName: string,
  fn: () => Promise<T>
): Promise<T> {
  const { recordStageStart, recordStageEnd } = await import("@/lib/telemetry/store");
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
        recordStageEnd(jobId, stageName, e instanceof Error ? e.message : String(e));
      } catch {
      }
      throw e;
    });
}

export type SlideshowTailFromSubtitlesParams = {
  jobId: string;
  requestId?: string;
  script: Script;
  shotList: ShotList;
  intent: Intent;
  narrative: NarrativePlan;
  captions: "on" | "off";
  motionSpec: MotionSpec;
  visualSpec: VisualSpec;
  normalizedImageSpec: ImageSpec;
  logoUrl?: string;
  logoPlacement?: "outro" | "watermark" | "hero";
  outputPath: string;
  fileSuffix: string;
  aspectRatio?: string;
  isPreview: boolean;
  ttsVoiceId?: string;
  costTracker: CostTracker;
  checkCancelledAndThrow: () => Promise<void>;
  logEvent: (p: {
    jobId: string;
    event: string;
    stage?: string;
    durationMs?: number;
    requestId?: string;
  }) => void;
  job?: Job;
  startTime: number;
  brandBrain?: BrandBrainInput;
};

export async function runSlideshowTailFromSubtitles(
  p: SlideshowTailFromSubtitlesParams
): Promise<{ videoPath: string; isPreview?: boolean; cost: CostBreakdown }> {
  const {
    jobId,
    requestId,
    script,
    shotList,
    intent,
    narrative,
    captions,
    motionSpec,
    visualSpec,
    normalizedImageSpec,
    logoUrl,
    logoPlacement,
    outputPath,
    fileSuffix,
    aspectRatio,
    isPreview,
    ttsVoiceId,
    costTracker,
    checkCancelledAndThrow,
    logEvent,
    startTime,
    brandBrain: _brandBrain,
  } = p;

  void _brandBrain;

  const retryConfig = getRetryConfig();
  const log = (ev: Parameters<typeof logEvent>[0]) =>
    logEvent({ ...ev, ...(requestId ? { requestId } : {}) });

  await checkCancelledAndThrow();
  log({ jobId, event: "stage_start", stage: "subtitles" });
  const subtitleTrack = await withStageTelemetry(jobId, "subtitles", async () =>
    generateSubtitles(script, shotList)
  );

  await checkCancelledAndThrow();
  log({ jobId, event: "stage_start", stage: "tts" });
  const ttsResult = await withStageTelemetry(jobId, "tts", () =>
    retry(
      () =>
        generateTTS(script, shotList, {
          usePreviewTTS: isPreview,
          voiceId: ttsVoiceId,
        }).then((r) => {
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

  await checkCancelledAndThrow();
  log({ jobId, event: "stage_start", stage: "subtitle_refine" });
  const subtitleTrackRefined = await withStageTelemetry(jobId, "subtitle_refine", async () =>
    refineSubtitles(
      subtitleTrack,
      ttsResult.wordTimings,
      script,
      shotList,
      ttsResult.segmentDurationsMs
    )
  );

  const audioBase64 =
    ttsResult.audioBuffer != null && ttsResult.audioBuffer.length > 0
      ? ttsResult.audioBuffer.toString("base64")
      : null;

  const audioDurationSec = ttsResult.durationMs / 1000;
  const plannedDurationSec =
    shotList.totalDurationSeconds ?? shotList.shots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);

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

  const { showCaptions, subtitleTrack: renderSubtitleTrack } = getCaptionsRenderOption(
    captions,
    subtitleTrackClamped
  );

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
        durationSeconds: Math.max(
          1,
          shotDurationById.get(e.shotId) ?? Math.round((e.durationSeconds ?? 0) * scale)
        ),
      })),
    };
    compositionDurationSec = audioDurationSec;
    console.log(
      "[pipeline] jobId=" + jobId + " (regen tail) scaled shots to match shorter audio."
    );
  }

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
    ...(isPreview ? { width: 1280, height: 720 } : aspectDimensions
      ? { width: aspectDimensions.width, height: aspectDimensions.height }
      : {}),
  };

  await checkCancelledAndThrow();
  log({ jobId, event: "stage_start", stage: "render" });
  await withStageTelemetry(jobId, "render", () =>
    retry(
      () =>
        new Promise<void>((resolve, reject) => {
          try {
            runRemotionRender(renderInput, outputPath);
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
    )
  );

  if (isPreview) {
    checkOutputSizeIfConfigured(outputPath);
    const { savePreviewArtifacts } = await import("@/lib/preview/artifacts");
    await savePreviewArtifacts(jobId, {
      intent,
      narrative,
      shotList,
      script,
      subtitleTrack,
    });
    log({
      jobId,
      event: "pipeline_completed",
      durationMs: Date.now() - startTime,
    });
    return { videoPath: `/temp/${jobId}${fileSuffix}.mp4`, isPreview: true, cost: costTracker.getBreakdown() };
  }

  checkOutputSizeIfConfigured(outputPath);

  const snap: RegenSnapshotV1 = {
    version: 1,
    sourceJobId: jobId,
    intent,
    narrative,
    shotList,
    script,
    motionSpec: finalMotionSpec,
    visualSpec,
    imageSpec: normalizedImageSpec,
    captions: captions ?? "on",
    aspectRatio,
    ...(logoUrl && logoPlacement ? { logoUrl, logoPlacement } : {}),
  };
  await saveRegenSnapshot(jobId, snap);

  log({
    jobId,
    event: "pipeline_completed",
    durationMs: Date.now() - startTime,
  });
  return { videoPath: `/temp/${jobId}${fileSuffix}.mp4`, cost: costTracker.getBreakdown() };
}
