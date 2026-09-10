import { Queue, Worker, type Job } from "bullmq";
import type { JobState } from "bullmq";
import { logPipelineEvent } from "@/lib/utils/pipelineLogger";
import Redis from "ioredis";
import { createManagedRedis } from "@/lib/redis/managedRedis";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { runCleanup } from "@/lib/storage/cleanup";
import { publishRenderedVideo } from "@/lib/storage/publish";
import { CANCELLED_JOBS_KEY, isJobCancelled } from "./cancelCheck";
import { notifyWebhook } from "@/lib/webhook/notify";

export { isJobCancelled };

const QUEUE_NAME = process.env.VIDEO_QUEUE_NAME || "video-generation";

export function getVideoQueueName(): string {
  return QUEUE_NAME;
}

function getRedisConnection(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return createManagedRedis(url, {
    maxRetriesPerRequest: null,
  });
}

export function createRedisConnection(): Redis {
  return getRedisConnection();
}

import { recordRenderEvent } from "@/lib/telemetry/renderEvents";
import { mapFailedReasonToFailureCode } from "@/lib/utils/error";
import type { BrandColors } from "@/lib/assets/types";
import type { Platform } from "@/lib/platform/types";
import type { CostBreakdown } from "@/lib/cost/types";
import type { AvatarSelection } from "@/lib/types/avatar";
import type {
  BrandBrainInput,
  QualityReport,
  ScriptFidelityMode,
} from "@/lib/types/pipelineEnhancements";

export type VideoJobData = {
  input: string;
  clientId?: string;
  requestId?: string;
  userId?: string;
  assetIds?: string[];
  brandColors?: BrandColors;
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
  reservedSpendUsd?: number;
  reservedCinematicSeconds?: number;
  reservedCinematicSplit?: { fromMonthly?: number; fromTopup?: number };
  spendIdentifier?: string;
  stockImagesOnly?: boolean;
  textModel?: string;
  captions?: "on" | "off";
  talkingObjectStyle?: "cartoon" | "real";
  talkingRealMode?: "studio" | "scenario";
  avatar?: AvatarSelection;
  renderMode?: "preview" | "final";
  previewJobId?: string;
  variationCount?: number;
  platform?: Platform;
  aspectRatio?: string;
  callbackUrl?: string;
  placeholders?: Record<string, string>;
  brandBrain?: BrandBrainInput;
  scriptFidelity?: ScriptFidelityMode;
  strictScript?: string;
  locale?: string;
  ttsVoiceId?: string;
  characterLockId?: string;
  qualityGateMode?: "off" | "warn" | "fail";
  regenFromJobId?: string;
  regenerateShotIds?: string[];
  seriesId?: string;
  remixFromJobId?: string;
};

export type VideoJobVariation = {
  videoUrl: string;
  cost?: CostBreakdown;
};

export type VideoJobResult = {
  videoPath: string;
  message?: string;
  isPreview?: boolean;
  cost?: CostBreakdown;
  variations?: VideoJobVariation[];
  qualityReport?: QualityReport;
};

export function purchasedGenerativeWork(progress: unknown): boolean {
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) return false;
  const p = progress as { stage?: unknown; detail?: unknown };
  const stage = typeof p.stage === "string" ? p.stage : "";
  const detail = typeof p.detail === "string" ? p.detail : "";
  if (stage === "veo") return detail.startsWith("chunk ");
  if (stage === "heygen") return detail === "generating";
  return false;
}

export const CLEANUP_JOB_NAME = "cleanup";

export async function cancelJob(jobId: string): Promise<{ ok: boolean; reason?: "not_found" | "already_finished" }> {
  if (!jobId || typeof jobId !== "string") {
    return { ok: false, reason: "not_found" };
  }
  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return { ok: false, reason: "not_found" };
    }
    const state = await job.getState();
    if (state === "completed" || state === "failed") {
      return { ok: false, reason: "already_finished" };
    }
    const redis = createRedisConnection();
    await redis.sadd(CANCELLED_JOBS_KEY, jobId);
    await redis.quit();
    return { ok: true };
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

let videoQueueInstance: Queue<VideoJobData, VideoJobResult> | null = null;

export function getVideoQueue(): Queue<VideoJobData, VideoJobResult> {
  if (videoQueueInstance) return videoQueueInstance;
  const connection = createRedisConnection();
  videoQueueInstance = new Queue<VideoJobData, VideoJobResult>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
  return videoQueueInstance;
}

const DEFAULT_AVG_JOB_SECONDS = 120;
const QUEUE_POSITION_WINDOW = 50;

export async function getQueueWaitMetrics(jobId: string): Promise<{
  queuePosition: number | null;
  queueEtaSeconds: number | null;
} | null> {
  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    const avgSec =
      Number(process.env.QUEUE_AVG_JOB_SECONDS) > 0
        ? Number(process.env.QUEUE_AVG_JOB_SECONDS)
        : DEFAULT_AVG_JOB_SECONDS;

    if (state === "active") {
      return { queuePosition: null, queueEtaSeconds: 0 };
    }
    if (state === "waiting") {
      const [waitingCount, head] = await Promise.all([
        queue.getWaitingCount(),
        queue.getWaiting(0, QUEUE_POSITION_WINDOW - 1),
      ]);
      const idx = head.findIndex((j) => String(j.id) === String(jobId));
      const position = idx >= 0 ? idx + 1 : Math.max(QUEUE_POSITION_WINDOW + 1, waitingCount);
      return {
        queuePosition: position,
        queueEtaSeconds: Math.max(0, Math.round((position - 1) * avgSec)),
      };
    }
    if (state === "delayed") {
      const [waitingCount, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getDelayed(0, QUEUE_POSITION_WINDOW - 1),
      ]);
      const idx = delayed.findIndex((j) => String(j.id) === String(jobId));
      if (idx < 0) {
        return {
          queuePosition: waitingCount + 1,
          queueEtaSeconds: Math.round(waitingCount * avgSec),
        };
      }
      const position = waitingCount + idx + 1;
      return {
        queuePosition: position,
        queueEtaSeconds: Math.max(0, Math.round((position - 1) * avgSec)),
      };
    }
    return { queuePosition: null, queueEtaSeconds: null };
  } catch {
    return null;
  }
}

export type JobSummary = {
  jobId: string;
  status: string;
  createdAt: number;
  videoUrl?: string;
  topic?: string;
  error?: string;
};

function jobStateToStatus(state: JobState | "unknown" | "paused", failedReason?: string | null): string {
  if (state === "failed" && failedReason?.includes("cancelled")) return "cancelled";
  switch (state) {
    case "waiting":
    case "delayed":
    case "paused":
      return "pending";
    case "active":
      return "processing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

const LIST_JOBS_DEFAULT_LIMIT = 20;
const LIST_JOBS_MAX_LIMIT = 50;
const LIST_JOBS_FETCH_WINDOW = 250;

export async function listRecentJobs(options: {
  limit?: number;
  ownerIds?: string[];
}): Promise<JobSummary[]> {
  const limit = Math.min(
    LIST_JOBS_MAX_LIMIT,
    Math.max(1, options.limit ?? LIST_JOBS_DEFAULT_LIMIT)
  );
  try {
    const queue = getVideoQueue();
    const types: JobState[] = ["waiting", "active", "completed", "failed"];
    const jobs = await queue.getJobs(types, 0, LIST_JOBS_FETCH_WINDOW - 1);
    const owners = options.ownerIds;
    const filtered = jobs
      .filter((j) => j.name !== CLEANUP_JOB_NAME && j.id != null)
      .filter((j) => {
        if (!owners) return true;
        const clientId = (j.data as VideoJobData | undefined)?.clientId;
        return typeof clientId === "string" && owners.includes(clientId);
      })
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, limit);
    const withState = await Promise.all(
      filtered.map(async (job) => {
        const state = await job.getState();
        const data = job.data as VideoJobData;
        const result = job.returnvalue as VideoJobResult | undefined;
        const status = jobStateToStatus(state, job.failedReason ?? null);
        const videoUrl =
          result?.variations?.[0]?.videoUrl ?? result?.videoPath;
        return {
          jobId: String(job.id),
          status,
          createdAt: job.timestamp,
          videoUrl: videoUrl ?? undefined,
          topic: data?.input ?? undefined,
          error: status === "failed" ? (job.failedReason ?? undefined) : undefined,
        };
      })
    );
    withState.sort((a, b) => b.createdAt - a.createdAt);
    return withState;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[queue] listRecentJobs error: " + msg.replace(/\s+/g, " "));
    return [];
  }
}

export async function deleteStaleJobs(options: { retentionDays: number }): Promise<number> {
  const { retentionDays } = options;
  if (!retentionDays || retentionDays <= 0) return 0;
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const limit = 1000;
  try {
    const queue = getVideoQueue();
    const [completedIds, failedIds] = await Promise.all([
      queue.clean(retentionMs, limit, "completed"),
      queue.clean(retentionMs, limit, "failed"),
    ]);
    const total = completedIds.length + failedIds.length;
    if (total > 0) {
      console.log("[queue] deleteStaleJobs removed " + total + " jobs (completed=" + completedIds.length + " failed=" + failedIds.length + ")");
    }
    return total;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[queue] deleteStaleJobs error: " + msg.replace(/\s+/g, " "));
    return 0;
  }
}

export async function scheduleCleanupJob(): Promise<void> {
  if (process.env.CLEANUP_ENABLED === "false") return;
  const intervalHours = Number(process.env.CLEANUP_INTERVAL_HOURS) || 1;
  const everyMs = Math.max(60_000, intervalHours * 60 * 60 * 1000);
  const queue = getVideoQueue();
  await queue.add(CLEANUP_JOB_NAME, {} as VideoJobData, {
    repeat: { every: everyMs },
  });
}

export function startVideoWorker(): Worker<VideoJobData, VideoJobResult> {
  const connection = createRedisConnection();
  const worker = new Worker<VideoJobData, VideoJobResult>(
    QUEUE_NAME,
    async (job: Job<VideoJobData, VideoJobResult>) => {
      if (job.name === CLEANUP_JOB_NAME) {
        const result = await runCleanup();
        console.log(
          "[worker] jobId=cleanup videos=" +
          result.videosDeleted +
          " uploads=" +
          result.uploadsDeleted +
          " tempImages=" +
          result.tempImagesDeleted +
          " errors=" +
          result.errors.length
        );
        if (result.errors.length > 0) {
          result.errors.forEach((e) =>
            console.error("[worker] jobId=cleanup error=" + String(e).replace(/\s+/g, " "))
          );
        }
        return { videoPath: "" } as VideoJobResult;
      }
      const {
        input,
        assetIds,
        brandColors,
        mode,
        durationSeconds,
        textModel,
        captions,
        talkingObjectStyle,
        talkingRealMode,
        avatar,
        renderMode,
        previewJobId,
        variationCount,
        platform,
        aspectRatio,
        requestId,
        callbackUrl,
        brandBrain,
        scriptFidelity,
        strictScript,
        locale,
        ttsVoiceId,
        characterLockId,
        qualityGateMode,
        regenFromJobId,
        regenerateShotIds,
        stockImagesOnly,
      } = job.data;
      const jobId = job.id;
      if (!jobId) {
        throw new Error("Job has no id");
      }
      const jobIdStr = String(jobId);
      if (await isJobCancelled(jobIdStr)) {
        throw new Error("Job cancelled");
      }
      logPipelineEvent({ jobId: jobIdStr, event: "job_started", ...(requestId ? { requestId } : {}) });
      recordRenderEvent({
        jobId: jobIdStr,
        userId: typeof job.data?.userId === "string" ? job.data.userId : null,
        eventType: "job_started",
      });
      try {
        const result = await runPipeline({
          input,
          jobId: jobIdStr,
          assetIds,
          brandColors,
          mode,
          durationSeconds,
          textModel,
          captions,
          talkingObjectStyle,
          talkingRealMode,
          avatar,
          renderMode,
          previewJobId,
          variationCount,
          platform: platform ?? "general",
          aspectRatio,
          requestId,
          job,
          ...(brandBrain ? { brandBrain } : {}),
          ...(scriptFidelity ? { scriptFidelity } : {}),
          ...(strictScript ? { strictScript } : {}),
          ...(locale ? { locale } : {}),
          ...(ttsVoiceId ? { ttsVoiceId } : {}),
          ...(characterLockId ? { characterLockId } : {}),
          ...(qualityGateMode ? { qualityGateMode } : {}),
          ...(stockImagesOnly ? { stockImagesOnly } : {}),
          ...(regenFromJobId ? { regenFromJobId } : {}),
          ...(regenerateShotIds?.length ? { regenerateShotIds } : {}),
        });

        const publishCache = new Map<string, string>();
        const publish = async (url: string): Promise<string> => {
          const cached = publishCache.get(url);
          if (cached !== undefined) return cached;
          const out = await publishRenderedVideo(url, jobIdStr);
          publishCache.set(url, out);
          return out;
        };
        if (result?.videoPath) {
          result.videoPath = await publish(result.videoPath);
        }
        if (result?.variations?.length) {
          for (const v of result.variations) {
            if (v?.videoUrl) v.videoUrl = await publish(v.videoUrl);
          }
        }
        return result;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Pipeline failed. Please try again.";
        throw new Error(message);
      }
    },
    {
      connection,
      concurrency: 1,

      lockDuration: 1_800_000,
      lockRenewTime: 30_000,

      maxStalledCount: 0,
    }
  );

  worker.on("completed", async (job) => {
    if (job?.name === CLEANUP_JOB_NAME) return;
    const result = job?.returnvalue as VideoJobResult | undefined;
    const data = job?.data as VideoJobData | undefined;
    const callbackUrl = data?.callbackUrl;
    if (callbackUrl && typeof callbackUrl === "string") {
      setImmediate(() => {
        void notifyWebhook({
          callbackUrl,
          payload: {
            jobId: String(job?.id ?? ""),
            status: "completed",
            videoUrl: result?.variations?.[0]?.videoUrl ?? result?.videoPath,
            variations: result?.variations?.map((v) => ({ videoUrl: v.videoUrl })),
            completedAt: new Date().toISOString(),
            ...(result?.qualityReport
              ? {
                qualityReport: {
                  passed: result.qualityReport.passed,
                  score: result.qualityReport.score,
                  issues: result.qualityReport.issues,
                },
              }
              : {}),
          },
        });
      });
    }
    const vid = result?.videoPath ?? "";
    const processedOn = typeof job?.processedOn === "number" ? job.processedOn : 0;
    const finishedOn = typeof job?.finishedOn === "number" ? job.finishedOn : Date.now();
    const durationMs = processedOn > 0 ? Math.round(finishedOn - processedOn) : undefined;
    recordRenderEvent({
      jobId: String(job?.id ?? ""),
      userId: typeof data?.userId === "string" ? data.userId : null,
      eventType: "job_completed",
      durationMs: durationMs ?? null,
    });
    logPipelineEvent({
      jobId: String(job?.id ?? ""),
      event: "job_completed",
      durationMs,
      videoPath: vid || undefined,
      ...(data?.requestId ? { requestId: data.requestId } : {}),
    });
    const clientId = data?.clientId;
    if (clientId && typeof clientId === "string") {
      try {
        const { adjustSpendUsd } = await import("@/lib/cost/budget");
        const unmetered = (c: { total?: number; video?: number } | undefined): number => {
          if (!c || typeof c.total !== "number") return 0;
          return Math.max(0, c.total - (typeof c.video === "number" ? c.video : 0));
        };
        let actualUsd = unmetered(result?.cost);
        if (actualUsd === 0 && Array.isArray(result?.variations)) {
          actualUsd = result.variations.reduce(
            (sum: number, v: { cost?: { total?: number; video?: number } }) =>
              sum + unmetered(v?.cost),
            0
          );
        }
        const reserved = typeof data?.reservedSpendUsd === "number" ? data.reservedSpendUsd : 0;
        const delta = actualUsd - reserved;
        if (delta !== 0) {
          const spendKeyId =
            typeof data?.spendIdentifier === "string" && data.spendIdentifier
              ? data.spendIdentifier
              : clientId;
          await adjustSpendUsd(spendKeyId, delta);
        }
        if (actualUsd === 0 && reserved === 0) {
          console.warn(
            "[worker] jobId=" + job?.id + " completed with no cost data; margin ledger unchanged"
          );
        }
      } catch (e) {
        console.error("[worker] jobId=" + job?.id + " budget/credits error=" + (e instanceof Error ? e.message : String(e)));
      }
      try {
        const { updateVideoJobStatusByQueueId } = await import("@/lib/jobs/videoJobService");
        await updateVideoJobStatusByQueueId(String(job?.id ?? ""), "completed", {
          final_url: vid || null,
        });
      } catch (e) {
        console.error("[worker] jobId=" + job?.id + " video_jobs update error=" + (e instanceof Error ? e.message : String(e)));
      }
      try {
        const { incrementVideosCompletedThisMonth } = await import("@/lib/usage");
        await incrementVideosCompletedThisMonth(clientId);
      } catch (e) {
        console.error("[worker] jobId=" + job?.id + " incrementVideosCompletedThisMonth error=" + (e instanceof Error ? e.message : String(e)));
      }
    }
    if (result?.cost) {
      const c = result.cost;
      console.log(
        "[worker] jobId=" + job?.id +
        " cost llm=$" + c.llm + " tts=$" + c.tts + " video=$" + c.video +
        " images=$" + c.images + " total=$" + c.total
      );
    }
  });

  worker.on("failed", (job, err) => {
    const jid = job?.id ?? "?";
    if (job?.name === CLEANUP_JOB_NAME) {
      console.error("[worker] jobId=cleanup failed error=" + (err?.message ?? String(err)).replace(/\s+/g, " "));
      return;
    }
    const data = job?.data as VideoJobData | undefined;
    const callbackUrl = data?.callbackUrl;
    const msg = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ");
    const isCancelled = msg.includes("cancelled");
    {
      const processedOn = typeof job?.processedOn === "number" ? job.processedOn : 0;
      const finishedOn = typeof job?.finishedOn === "number" ? job.finishedOn : Date.now();
      recordRenderEvent({
        jobId: String(jid),
        userId: typeof data?.userId === "string" ? data.userId : null,
        eventType: "job_failed",
        errorCode: mapFailedReasonToFailureCode(msg),
        durationMs: processedOn > 0 ? Math.round(finishedOn - processedOn) : null,
      });
    }
    if (typeof data?.reservedSpendUsd === "number" && data.reservedSpendUsd > 0) {
      console.warn(
        "[worker] jobId=" + jid + " failed; keeping $" + data.reservedSpendUsd.toFixed(3) +
        " budget reservation (spend already incurred is unknown)"
      );
    }
    void (async () => {
      const reserved = typeof data?.reservedCinematicSeconds === "number" ? data.reservedCinematicSeconds : 0;
      if (reserved <= 0) return;
      const spendKeyId =
        typeof data?.spendIdentifier === "string" && data.spendIdentifier
          ? data.spendIdentifier
          : typeof data?.clientId === "string"
            ? data.clientId
            : null;
      if (!spendKeyId) return;
      if (purchasedGenerativeWork(job?.progress)) {
        console.warn(
          "[worker] jobId=" + jid + " failed after generation started; keeping " +
          reserved + "s (provider was already paid)"
        );
        return;
      }
      try {
        const { releaseCinematicSecondsOnce } = await import("@/lib/cost/budget");
        const split = data?.reservedCinematicSplit ?? { fromMonthly: reserved, fromTopup: 0 };
        const released = await releaseCinematicSecondsOnce(spendKeyId, reserved, split, String(jid));
        if (released) {
          console.log(
            "[worker] jobId=" + jid + " failed before any generation; released " + reserved +
            "s (monthly " + (split.fromMonthly ?? 0) + ", purchased " + (split.fromTopup ?? 0) + ")"
          );
        }
      } catch (e) {
        console.error(
          "[worker] jobId=" + jid + " cinematic release failed error=" +
          (e instanceof Error ? e.message : String(e))
        );
      }
    })();
    void (async () => {
      try {
        const { updateVideoJobStatusByQueueId } = await import("@/lib/jobs/videoJobService");
        await updateVideoJobStatusByQueueId(String(jid), "failed");
      } catch (e) {
        console.error("[worker] jobId=" + jid + " video_jobs fail-update error=" + (e instanceof Error ? e.message : String(e)));
      }
    })();
    if (callbackUrl && typeof callbackUrl === "string") {
      setImmediate(() => {
        void notifyWebhook({
          callbackUrl,
          payload: {
            jobId: String(jid),
            status: isCancelled ? "cancelled" : "failed",
            completedAt: new Date().toISOString(),
            error: msg,
          },
        });
      });
    }
    const processedOn = typeof job?.processedOn === "number" ? job.processedOn : 0;
    const durationMs = processedOn > 0 ? Math.round(Date.now() - processedOn) : 0;
    logPipelineEvent({
      jobId: String(jid),
      event: "job_failed",
      error: msg,
      durationMs,
      ...(data?.requestId ? { requestId: data.requestId } : {}),
    });
    console.error("[worker] jobId=" + jid + " failed error=" + msg);
  });

  return worker;
}
