import { NextResponse } from "next/server";
import {
  getVideoQueue,
  cancelJob,
  listRecentJobs,
  getQueueWaitMetrics,
  type VideoJobResult,
} from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit, getForwardedClientIp } from "@/lib/rate-limit";
import { getRequestIdFromRequest } from "@/lib/requestId";
import { validateGenerateInput, validateJobId } from "@/lib/validation/input";
import { DEFAULT_PLATFORM } from "@/lib/platform/types";
import { getCorsHeaders } from "@/lib/cors";
import { apiError, ErrorCode } from "@/lib/api/errors";
import {
  IDEMPOTENCY_KEY_MAX_LENGTH,
  getIdempotencyResult,
  setIdempotencyResult,
  withIdempotencyLock,
} from "@/lib/api/idempotency";
import { runGenerationFlow, checkDownloadAllowed } from "@/lib/anon";
import { requestOwnsResource, resolveOwnerCandidates } from "@/lib/jobs/jobOwnership";
import { isDatabaseConfigured } from "@/lib/db";
import { isProPlan } from "@/lib/plans";
import { auth } from "@/lib/auth";
import { ensureInProcessWorkerStarted } from "@/lib/queue/autoStartWorker";
import { validateApiKeyAndGetUserId } from "@/lib/api-keys/service";
import { mergeRemixFromJob } from "@/lib/regen/remixFromJob";
import { brandKitToPipelineFields, getBrandKitForUser } from "@/lib/brand-kits/service";
import type { BrandColors } from "@/lib/assets/types";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const FREE_MAX_DURATION_SECONDS = 20;

type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

function mapStateToStatus(state: string, failedReason?: string | null): JobStatus {
  if (state === "failed" && failedReason?.includes("cancelled")) {
    return "cancelled";
  }
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

export function handleGenerateOptions(request: Request): NextResponse {
  const origin = request.headers.get("Origin");
  const cors = getCorsHeaders(origin);
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, Allow: "GET, POST, OPTIONS" },
  });
}

export async function handleGeneratePost(request: Request): Promise<NextResponse> {
  const requestId = getRequestIdFromRequest(request);
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const headers = { "X-Request-ID": requestId, ...corsHeaders };
  const idempotencyKeyRaw = request.headers.get("x-idempotency-key");
  const idempotencyKey = (idempotencyKeyRaw ?? "").trim();
  if (idempotencyKey.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    return apiError({
      code: ErrorCode.BAD_REQUEST,
      message: "Idempotency key too long",
      status: 400,
      headers,
    });
  }
  const identifier = getClientIdentifier(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({
      code: ErrorCode.INVALID_JSON,
      message: "Invalid JSON",
      status: 400,
      details: { errors: [{ field: "body", message: "Invalid JSON" }] },
      headers,
    });
  }

  const fromApiKeyEarly = await validateApiKeyAndGetUserId(request.headers.get("x-api-key"));
  let userIdEarly: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userIdEarly = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    userIdEarly = undefined;
  }
  if (fromApiKeyEarly) {
    userIdEarly = fromApiKeyEarly.userId;
  }

  const limit = fromApiKeyEarly
    ? await checkRateLimit(`apk:${fromApiKeyEarly.keyId}`, "apiKeyGenerate")
    : await checkRateLimit(identifier, "generate");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return apiError({
      code: ErrorCode.RATE_LIMITED,
      message: "Too Many Requests",
      status: 429,
      details: { retryAfter },
      headers: { ...headers, "Retry-After": String(retryAfter) },
    });
  }

  const dailyKey = fromApiKeyEarly ? `apk:${fromApiKeyEarly.keyId}` : identifier;
  const dailyLimit = await checkRateLimit(dailyKey, "generateDaily");
  if (!dailyLimit.allowed) {
    const retryAfter = dailyLimit.retryAfter ?? 3600;
    return apiError({
      code: ErrorCode.RATE_LIMITED,
      message: "Daily generation limit reached. Please try again tomorrow.",
      status: 429,
      details: { retryAfter, scope: "daily" },
      headers: { ...headers, "Retry-After": String(retryAfter) },
    });
  }

  let bodyRecord = body != null && typeof body === "object" ? (body as Record<string, unknown>) : null;
  let remixSourceJobId: string | undefined;
  if (bodyRecord && typeof bodyRecord.remixFromJobId === "string" && bodyRecord.remixFromJobId.trim() !== "") {
    const merged = await mergeRemixFromJob(bodyRecord, {
      userId: userIdEarly,
      request,
    });
    if (!merged.ok) {
      return apiError({
        code: ErrorCode.BAD_REQUEST,
        message: merged.message,
        status: 400,
        headers,
      });
    }
    bodyRecord = merged.merged;
    remixSourceJobId = merged.remixFromJobId;
    body = merged.merged;
  }

  const validation = validateGenerateInput(body);
  if (!validation.success) {
    return apiError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Validation failed",
      status: 400,
      details: { errors: validation.errors },
      headers,
    });
  }

  let data = validation.data;

  if (
    Array.isArray(data.assetIds) &&
    data.assetIds.length > 0 &&
    data.mode === "talking_object"
  ) {
    return apiError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Image uploads (assetIds) are only supported in Slideshow mode.",
      status: 400,
      details: {
        errors: [
          {
            field: "assetIds",
            message: "Only supported when mode is 'slideshow'.",
          },
        ],
      },
      headers,
    });
  }

  const previewJobIdStr = data.previewJobId;
  const renderModeValid = data.renderMode;

  if (renderModeValid === "final" && previewJobIdStr) {
    try {
      const queue = getVideoQueue();
      const previewJob = await queue.getJob(previewJobIdStr);
      if (!previewJob) {
        return apiError({
          code: ErrorCode.PREVIEW_JOB_NOT_FOUND,
          message: "Preview job not found or not completed.",
          status: 400,
          headers,
        });
      }
      const state = await previewJob.getState();
      if (state !== "completed") {
        return apiError({
          code: ErrorCode.PREVIEW_JOB_NOT_FOUND,
          message: "Preview job not found or not completed.",
          status: 400,
          headers,
        });
      }
    } catch {
      return apiError({
        code: ErrorCode.PREVIEW_JOB_NOT_FOUND,
        message: "Preview job not found or not completed.",
        status: 400,
        headers,
      });
    }
  }

  if (idempotencyKey) {
    const cached = getIdempotencyResult(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached.responseBody as { jobId: string }, {
        headers,
      });
    }
  }

  const fromApiKey = fromApiKeyEarly;
  const userId = userIdEarly;

  if (data.brandKitId && !userId) {
    return apiError({
      code: ErrorCode.AUTH_REQUIRED,
      message: "brandKitId requires a signed-in user or API key.",
      status: 401,
      headers,
    });
  }

  if (data.brandKitId && !isDatabaseConfigured()) {
    return apiError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "brandKitId requires a configured database.",
      status: 503,
      headers,
    });
  }

  if (data.brandKitId && userId) {
    const kit = await getBrandKitForUser(userId, data.brandKitId);
    if (!kit) {
      return apiError({
        code: ErrorCode.BAD_REQUEST,
        message: "Brand kit not found.",
        status: 404,
        headers,
      });
    }
    const kf = brandKitToPipelineFields(kit);
    const mergedColors: BrandColors | undefined =
      kf.brandColors || data.brandColors
        ? ({ ...kf.brandColors, ...data.brandColors } as BrandColors)
        : undefined;
    const mergedBrain =
      kf.brandBrain || data.brandBrain ? { ...kf.brandBrain, ...data.brandBrain } : undefined;
    data = {
      ...data,
      ...(mergedColors ? { brandColors: mergedColors } : {}),
      ...(mergedBrain && Object.keys(mergedBrain).length ? { brandBrain: mergedBrain } : {}),
    };
  }

  let anonFlow: Awaited<ReturnType<typeof runGenerationFlow>> | null = null;
  if (!userId && isDatabaseConfigured()) {
    anonFlow = await runGenerationFlow(request, data.input);
    if (!anonFlow.result.allowed) {
      return apiError({
        code: ErrorCode.ANON_LIMIT_REACHED,
        message: "Sign in to generate more videos, download, or access your dashboard.",
        status: 403,
        details: { reason: anonFlow.result.reason, anon_session_id: anonFlow.result.anon_session_id },
        headers,
      });
    }
  }

  {
    const usesImages = Array.isArray(data.assetIds) && data.assetIds.length > 0;
    const usesProAvatar =
      data.avatar?.mode === "preset" || data.avatar?.mode === "upload";
    const usesCinematic = data.mode === "talking_object";
    if (usesImages || usesProAvatar || usesCinematic) {
      const { getUserPlan } = await import("@/lib/users/planService");
      const callerIsPro = userId ? isProPlan((await getUserPlan(userId)).id) : false;
      let holdsPurchasedSeconds = false;
      if (!callerIsPro && usesCinematic && !usesImages && !usesProAvatar && userId) {
        try {
          const { getTopupSecondsRemaining } = await import("@/lib/cost/budget");
          holdsPurchasedSeconds = (await getTopupSecondsRemaining(userId)) > 0;
        } catch {
          holdsPurchasedSeconds = false;
        }
      }
      if (!callerIsPro && !holdsPurchasedSeconds) {
        const feature = usesCinematic
          ? "Talking-character videos"
          : usesProAvatar
            ? "Custom avatars"
            : "Image uploads";
        return apiError({
          code: ErrorCode.PLAN_REQUIRED,
          message: `${feature} require a Professional or Enterprise plan. Upgrade to use this feature.`,
          status: 403,
          details: {
            feature: usesCinematic ? "cinematic" : usesProAvatar ? "avatar" : "image_upload",
            requiredPlan: "professional",
          },
          headers,
        });
      }
    }
  }

  const { getUserPlan: getPlanForLimits } = await import("@/lib/users/planService");
  const isFreePlan = (await getPlanForLimits(userId)).id === "free";

  if (isFreePlan && (data.durationSeconds ?? 0) > FREE_MAX_DURATION_SECONDS) {
    return apiError({
      code: ErrorCode.PLAN_REQUIRED,
      message: `Free videos are up to ${FREE_MAX_DURATION_SECONDS} seconds. Upgrade for longer videos.`,
      status: 403,
      details: {
        feature: "duration",
        maxDurationSeconds: FREE_MAX_DURATION_SECONDS,
        requiredPlan: "beginner",
      },
      headers,
    });
  }

  const creditsIdentifier = userId ?? anonFlow?.result.anon_session_id ?? identifier;

  const spendIdentifier = userId ?? getForwardedClientIp(request) ?? creditsIdentifier;

  let effectiveMode: "slideshow" | "talking_object" | null = null;
  let downgradeNotice: string | null = null;
  let reservedCinematicSeconds = 0;
  let reservedCinematicSplit: { fromMonthly: number; fromTopup: number } = {
    fromMonthly: 0,
    fromTopup: 0,
  };
  let reservedSpendUsd = 0;

  try {
    await ensureInProcessWorkerStarted();
    const queue = getVideoQueue();
    const { incrementApiCallsThisMonth, getVideosCompletedThisMonth } = await import("@/lib/usage");
    const { getUserPlan } = await import("@/lib/users/planService");
    const creditsCheckRequested =
      process.env.DISABLE_CREDITS_CHECK === "true" || process.env.DISABLE_CREDITS_CHECK === "1";
    const creditsCheckDisabled =
      creditsCheckRequested && process.env.NODE_ENV !== "production";
    if (creditsCheckRequested && !creditsCheckDisabled) {
      console.warn(
        "[api] DISABLE_CREDITS_CHECK is set but ignored in production; spend limits remain enforced."
      );
    }
    const skipCreditsForAnon = Boolean(anonFlow?.result.allowed);
    if (!creditsCheckDisabled) {
      const userPlan = await getUserPlan(userId);

      const { estimateUnmeteredCostUsd, cinematicSecondsFor } = await import("@/lib/cost/pricing");
      const {
        getBudgetState,
        decideSpend,
        reserveCinematicSeconds,
        reserveSpendUsd,
        releaseCinematicSeconds: releaseCine,
        resetsAt,
      } = await import("@/lib/cost/budget");
      const requestedMode = data.regenFromJobId ? "slideshow" : (data.mode ?? "slideshow");
      const requestedDuration = data.durationSeconds ?? 30;
      const requestedVariations = data.variationCount ?? 1;
      const providerArgs = {
        talkingObjectStyle: data.talkingObjectStyle,
        talkingRealMode: data.talkingRealMode,
        avatar: data.avatar,
      };
      const costArgs = {
        mode: requestedMode,
        durationSeconds: requestedDuration,
        variationCount: requestedVariations,
        ...providerArgs,
        stockImagesOnly: isFreePlan,
      } as const;
      const budgetState = await getBudgetState(spendIdentifier, userPlan.id);
      const decision = decideSpend({
        state: budgetState,
        estimateUsd: estimateUnmeteredCostUsd(costArgs),
        cinematicSeconds: cinematicSecondsFor(costArgs),
        fallbackEstimateUsd: estimateUnmeteredCostUsd({
          mode: "slideshow",
          durationSeconds: requestedDuration,
          variationCount: requestedVariations,
          stockImagesOnly: isFreePlan,
        }),
      });

      if (decision.outcome === "deny") {
        return apiError({
          code: ErrorCode.MONTHLY_LIMIT_REACHED,
          message: decision.reason,
          status: 402,
          details: {
            plan: userPlan.id,
            allowanceUsedPercent: Math.round(decision.state.fractionUsed * 100),
            resetsAt: resetsAt(),
          },
          headers,
        });
      }
      if (decision.outcome === "downgrade") {
        effectiveMode = decision.toMode;
        downgradeNotice = decision.reason;
      }

      const admittedMode = effectiveMode ?? requestedMode;
      const admittedArgs = {
        mode: admittedMode,
        durationSeconds: requestedDuration,
        variationCount: requestedVariations,
        ...providerArgs,
        stockImagesOnly: isFreePlan,
      } as const;

      const seconds = cinematicSecondsFor(admittedArgs);
      if (seconds > 0) {
        const cine = await reserveCinematicSeconds(
          spendIdentifier,
          budgetState.cinematicSecondsAllowed,
          seconds
        );
        if (!cine.ok) {
          return apiError({
            code: ErrorCode.MONTHLY_LIMIT_REACHED,
            message:
              "Cinematic seconds for this month are used up. Standard renders are still available, and this resets next month.",
            status: 402,
            details: { plan: userPlan.id, resetsAt: resetsAt() },
            headers,
          });
        }
        reservedCinematicSeconds = seconds;
        reservedCinematicSplit = {
          fromMonthly: cine.fromMonthly ?? seconds,
          fromTopup: cine.fromTopup ?? 0,
        };
      }

      reservedSpendUsd = estimateUnmeteredCostUsd(admittedArgs);
      const claim = await reserveSpendUsd(
        spendIdentifier,
        budgetState.budgetUsd,
        reservedSpendUsd
      );
      if (!claim.ok) {
        if (reservedCinematicSeconds > 0) {
          await releaseCine(spendIdentifier, reservedCinematicSeconds, reservedCinematicSplit);
          reservedCinematicSeconds = 0;
          reservedCinematicSplit = { fromMonthly: 0, fromTopup: 0 };
        }
        reservedSpendUsd = 0;
        return apiError({
          code: ErrorCode.MONTHLY_LIMIT_REACHED,
          message:
            "You have used this month's generation allowance. It resets at the start of next month.",
          status: 402,
          details: { plan: userPlan.id, resetsAt: resetsAt() },
          headers,
        });
      }

      const videosCompletedThisMonth = skipCreditsForAnon
        ? 0
        : await getVideosCompletedThisMonth(creditsIdentifier);
      if (
        !skipCreditsForAnon &&
        userPlan.videosPerMonth != null &&
        videosCompletedThisMonth >= userPlan.videosPerMonth
      ) {
        return apiError({
          code: ErrorCode.MONTHLY_LIMIT_REACHED,
          message: "Your current plan limit has been reached. Please upgrade to continue creating videos.",
          status: 402,
          details: {
            videosUsed: videosCompletedThisMonth,
            videosLimit: userPlan.videosPerMonth,
            plan: userPlan.id,
          },
          headers,
        });
      }
    }
    const jobPayload = {
      input: data.input,
      clientId: creditsIdentifier,
      requestId,
      ...(userId ? { userId } : {}),
      ...(anonFlow?.result.allowed ? { videoJobId: anonFlow.result.job_id } : {}),
      ...(data.assetIds?.length ? { assetIds: data.assetIds } : {}),
      ...(data.brandColors ? { brandColors: data.brandColors } : {}),
      mode: effectiveMode ?? (data.regenFromJobId ? "slideshow" : (data.mode ?? "slideshow")),
      durationSeconds: data.durationSeconds,
      ...(reservedSpendUsd > 0 ? { reservedSpendUsd } : {}),
      ...(reservedCinematicSeconds > 0
        ? {
          reservedCinematicSeconds,
          reservedCinematicSplit,
        }
        : {}),
      ...(spendIdentifier !== creditsIdentifier ? { spendIdentifier } : {}),
      ...(isFreePlan ? { stockImagesOnly: true } : {}),
      ...(data.textModel ? { textModel: data.textModel } : {}),
      captions: data.captions,
      ...(data.talkingObjectStyle ? { talkingObjectStyle: data.talkingObjectStyle } : {}),
      ...(data.talkingRealMode ? { talkingRealMode: data.talkingRealMode } : {}),
      ...(data.avatar ? { avatar: data.avatar } : {}),
      ...(data.renderMode ? { renderMode: data.renderMode } : {}),
      ...(data.previewJobId ? { previewJobId: data.previewJobId } : {}),
      variationCount: data.variationCount ?? 1,
      platform: data.platform ?? DEFAULT_PLATFORM,
      ...(data.aspectRatio ? { aspectRatio: data.aspectRatio } : {}),
      ...(data.callbackUrl ? { callbackUrl: data.callbackUrl } : {}),
      ...(data.placeholders && Object.keys(data.placeholders).length > 0
        ? { placeholders: data.placeholders }
        : {}),
      ...(data.brandBrain ? { brandBrain: data.brandBrain } : {}),
      ...(data.scriptFidelity ? { scriptFidelity: data.scriptFidelity } : {}),
      ...(data.strictScript ? { strictScript: data.strictScript } : {}),
      ...(data.locale ? { locale: data.locale } : {}),
      ...(data.ttsVoiceId ? { ttsVoiceId: data.ttsVoiceId } : {}),
      ...(data.characterLockId ? { characterLockId: data.characterLockId } : {}),
      ...(data.qualityGateMode ? { qualityGateMode: data.qualityGateMode } : {}),
      ...(data.regenFromJobId ? { regenFromJobId: data.regenFromJobId } : {}),
      ...(data.regenerateShotIds?.length ? { regenerateShotIds: data.regenerateShotIds } : {}),
      ...(data.seriesId ? { seriesId: data.seriesId } : {}),
      ...(remixSourceJobId ? { remixFromJobId: remixSourceJobId } : {}),
    };

    const anonJobId = anonFlow?.result.allowed ? anonFlow.result.job_id : undefined;
    const newJobId = anonJobId ?? randomUUID();
    const queueAddOptions = { jobId: newJobId };

    if (!anonJobId && userId && isDatabaseConfigured()) {
      try {
        const { createVideoJob } = await import("@/lib/jobs/videoJobService");
        await createVideoJob({
          owner_type: "user",
          owner_id: userId,
          prompt: typeof data.input === "string" ? data.input : String(data.input ?? ""),
          status: "queued",
          queue_job_id: newJobId,
        });
      } catch (e) {
        console.error(
          "[api] POST /api/generate could not persist video_jobs row jobId=" +
          newJobId +
          " error=" +
          (e instanceof Error ? e.message : String(e))
        );
      }
    }

    if (idempotencyKey) {
      const result = await withIdempotencyLock(idempotencyKey, async () => {
        const again = getIdempotencyResult(idempotencyKey);
        if (again) return again.responseBody as { jobId: string };
        const job = await queue.add("video", jobPayload, queueAddOptions);
        await incrementApiCallsThisMonth(creditsIdentifier);
        const jobId = anonJobId ?? String(job.id);
        const responseBody = { jobId };
        setIdempotencyResult(idempotencyKey, {
          jobId,
          status: "pending",
          responseBody,
        });
        return responseBody;
      });
      console.log("[api] POST /api/generate requestId=" + requestId + " jobId=" + result.jobId + " idempotencyKey=" + idempotencyKey);
      const resHeaders: Record<string, string> = { ...headers };
      if (anonFlow?.setCookieHeader) resHeaders["Set-Cookie"] = anonFlow.setCookieHeader;
      return NextResponse.json(result, { headers: resHeaders });
    }

    const job = await queue.add("video", jobPayload, queueAddOptions);
    await incrementApiCallsThisMonth(creditsIdentifier);
    const jobId = anonJobId ?? String(job.id);
    console.log("[api] POST /api/generate requestId=" + requestId + " jobId=" + jobId);
    const resHeaders: Record<string, string> = { ...headers };
    if (anonFlow?.setCookieHeader) resHeaders["Set-Cookie"] = anonFlow.setCookieHeader;
    return NextResponse.json(
      { jobId, ...(downgradeNotice ? { notice: downgradeNotice } : {}) },
      { headers: resHeaders }
    );
  } catch (e) {
    if (reservedCinematicSeconds > 0 || reservedSpendUsd > 0) {
      try {
        const { releaseCinematicSeconds, adjustSpendUsd } = await import("@/lib/cost/budget");
        if (reservedCinematicSeconds > 0) {
          await releaseCinematicSeconds(
            spendIdentifier,
            reservedCinematicSeconds,
            reservedCinematicSplit,
          );
        }
        if (reservedSpendUsd > 0) {
          await adjustSpendUsd(spendIdentifier, -reservedSpendUsd);
        }
      } catch { }
    }
    const { logServerError } = await import("@/lib/utils/error");
    logServerError("POST /api/generate", e);
    const errMsg = e instanceof Error ? e.message : String(e);
    const isRedisReadOnly =
      errMsg.includes("READONLY") ||
      errMsg.includes("readonly") ||
      (e as { code?: string }).code === "READONLY";
    if (isRedisReadOnly) {
      return apiError({
        code: ErrorCode.QUEUE_UNAVAILABLE,
        message:
          "Queue is temporarily unavailable. Redis is in read-only mode (often during a server upgrade). Please try again in a few minutes.",
        status: 503,
        headers,
      });
    }
    return apiError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong",
      status: 500,
      headers,
    });
  }
}

export function handleJobOptions(request: Request): NextResponse {
  const origin = request.headers.get("Origin");
  const cors = getCorsHeaders(origin);
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, Allow: "GET, POST, OPTIONS" },
  });
}

export async function handleJobGet(request: Request, jobId: string): Promise<NextResponse> {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "status");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return apiError({
      code: ErrorCode.RATE_LIMITED,
      message: "Too many requests. Please try again later.",
      status: 429,
      details: { retryAfter },
      headers: { ...corsHeaders, "Retry-After": String(retryAfter) },
    });
  }

  const jobIdValidation = validateJobId(jobId);
  if (!jobIdValidation.valid) {
    return apiError({
      code: ErrorCode.BAD_REQUEST,
      message: jobIdValidation.error,
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      console.log("[api] GET /api/generate/[jobId] jobId=" + jobId + " status=404");
      return apiError({
        code: ErrorCode.JOB_NOT_FOUND,
        message: "Job not found.",
        status: 404,
        headers: corsHeaders,
      });
    }

    const owns = await requestOwnsResource(
      request,
      (job.data as { clientId?: string } | undefined)?.clientId
    );
    if (!owns) {
      console.log("[api] GET /api/generate/[jobId] jobId=" + jobId + " status=404 (not owner)");
      return apiError({
        code: ErrorCode.JOB_NOT_FOUND,
        message: "Job not found.",
        status: 404,
        headers: corsHeaders,
      });
    }

    const state = await job.getState();
    const failedReason = job.failedReason;
    const status: JobStatus = mapStateToStatus(state, failedReason);

    const response: {
      status: JobStatus;
      videoUrl?: string;
      message?: string;
      error?: string;
      failureCode?: string;
      queuePosition?: number | null;
      queueEtaSeconds?: number | null;
      isPreview?: boolean;
      stage?: string;
      stageDetail?: string;
      stageStartedAt?: string;
      workerOnline?: boolean;
      cost?: { llm: number; tts: number; video: number; images: number; total: number };
      variations?: Array<{ videoUrl: string; cost?: { llm: number; tts: number; video: number; images: number; total: number } }>;
      qualityReport?: { passed: boolean; score: number; issues: string[] };
    } = { status };

    if (status === "pending") {
      const qm = await getQueueWaitMetrics(jobId);
      if (qm) {
        response.queuePosition = qm.queuePosition;
        response.queueEtaSeconds = qm.queueEtaSeconds;
      }
    }
    if (status === "pending" || status === "processing") {
      const { isWorkerAlive } = await import("@/lib/queue/heartbeat");
      response.workerOnline = await isWorkerAlive(queue);
    }
    if (status === "processing") {
      const progress = job.progress;
      if (progress && typeof progress === "object" && !Array.isArray(progress)) {
        const p = progress as Record<string, unknown>;
        if (typeof p.stage === "string" && p.stage.trim()) {
          response.stage = p.stage.trim();
        }
        if (typeof p.detail === "string" && p.detail.trim()) {
          response.stageDetail = p.detail.trim();
        }
        if (typeof p.startedAt === "string" && p.startedAt.trim()) {
          response.stageStartedAt = p.startedAt.trim();
        }
      }
    }

    if (status === "completed") {
      const result = job.returnvalue as VideoJobResult | undefined;
      if (result?.variations && result.variations.length > 0) {
        response.videoUrl = result.variations[0].videoUrl;
        response.variations = result.variations;
      } else if (result?.videoPath) {
        response.videoUrl = result.videoPath;
      }
      if (result?.message) {
        response.message = result.message;
      }
      if (result?.isPreview === true) {
        response.isPreview = true;
      }
      if (result?.cost) {
        response.cost = result.cost;
      }
      if (result?.qualityReport) {
        response.qualityReport = {
          passed: result.qualityReport.passed,
          score: result.qualityReport.score,
          issues: result.qualityReport.issues,
        };
      }
    }

    if (status === "failed") {
      const { getUserFriendlyErrorMessage, mapFailedReasonToFailureCode } = await import("@/lib/utils/error");
      response.error = getUserFriendlyErrorMessage(job.failedReason ?? "Job failed.");
      response.failureCode = mapFailedReasonToFailureCode(job.failedReason);
    }

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (e) {
    console.log("[api] GET /api/generate/[jobId] jobId=" + jobId + " status=500");
    const { logServerError } = await import("@/lib/utils/error");
    logServerError("GET /api/generate/[jobId]", e);
    return apiError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong",
      status: 500,
      headers: corsHeaders,
    });
  }
}

export function handleCancelOptions(request: Request): NextResponse {
  const origin = request.headers.get("Origin");
  const cors = getCorsHeaders(origin);
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, Allow: "GET, POST, OPTIONS" },
  });
}

export async function handleCancelPost(request: Request, jobId: string): Promise<NextResponse> {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const jobIdValidation = validateJobId(jobId);
  if (!jobIdValidation.valid) {
    return apiError({
      code: ErrorCode.BAD_REQUEST,
      message: jobIdValidation.error,
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return apiError({
        code: ErrorCode.JOB_NOT_FOUND,
        message: "Job not found.",
        status: 404,
        details: { reason: "not_found" },
        headers: corsHeaders,
      });
    }
    const owns = await requestOwnsResource(
      request,
      (job.data as { clientId?: string } | undefined)?.clientId
    );
    if (!owns) {
      return apiError({
        code: ErrorCode.JOB_NOT_FOUND,
        message: "Job not found.",
        status: 404,
        details: { reason: "not_found" },
        headers: corsHeaders,
      });
    }
  } catch (e) {
    const { logServerError } = await import("@/lib/utils/error");
    logServerError("POST /api/generate/[jobId]/cancel (ownership)", e);
    return apiError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong",
      status: 500,
      headers: corsHeaders,
    });
  }

  const result = await cancelJob(jobId);
  if (result.ok) {
    return NextResponse.json({ cancelled: true, jobId }, { headers: corsHeaders });
  }
  if (result.reason === "not_found") {
    return apiError({
      code: ErrorCode.JOB_NOT_FOUND,
      message: "Job not found.",
      status: 404,
      details: { reason: "not_found" },
      headers: corsHeaders,
    });
  }
  return apiError({
    code: ErrorCode.JOB_CANNOT_CANCEL,
    message: "Job cannot be cancelled",
    status: 409,
    details: { reason: "already_finished" },
    headers: corsHeaders,
  });
}

export function handleDownloadOptions(request: Request): NextResponse {
  const origin = request.headers.get("Origin");
  const cors = getCorsHeaders(origin);
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, Allow: "GET, POST, OPTIONS" },
  });
}

export async function handleDownloadGet(request: Request, jobId: string): Promise<NextResponse> {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const jobIdValidation = validateJobId(jobId);
  if (!jobIdValidation.valid) {
    return apiError({
      code: ErrorCode.BAD_REQUEST,
      message: jobIdValidation.error,
      status: 400,
      headers: corsHeaders,
    });
  }

  const { searchParams } = new URL(request.url);
  const variantParam = searchParams.get("variant");
  const variantIndex = variantParam != null ? Math.max(0, Math.floor(Number(variantParam))) : 0;

  if (isDatabaseConfigured()) {
    const gate = await checkDownloadAllowed(jobId);
    if (gate.allowed === false && gate.reason === "auth_required") {
      return apiError({
        code: ErrorCode.AUTH_REQUIRED,
        message: "Sign in to download this video.",
        status: 403,
        headers: corsHeaders,
      });
    }
    const apiKeyUser = await validateApiKeyAndGetUserId(request.headers.get("x-api-key"));
    let downloaderId: string | undefined;
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      downloaderId = session?.user?.id != null ? String(session.user.id) : undefined;
    } catch {
      downloaderId = undefined;
    }
    if (apiKeyUser) downloaderId = apiKeyUser.userId;
    if (!downloaderId) {
      return apiError({
        code: ErrorCode.AUTH_REQUIRED,
        message: "Sign in to download this video.",
        status: 403,
        headers: corsHeaders,
      });
    }
  }

  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return apiError({
        code: ErrorCode.JOB_NOT_FOUND,
        message: "Job not found.",
        status: 404,
        headers: corsHeaders,
      });
    }
    const owns = await requestOwnsResource(
      request,
      (job.data as { clientId?: string } | undefined)?.clientId
    );
    if (!owns) {
      return apiError({
        code: ErrorCode.JOB_NOT_FOUND,
        message: "Job not found.",
        status: 404,
        headers: corsHeaders,
      });
    }

    const state = await job.getState();
    if (state !== "completed") {
      return apiError({
        code: ErrorCode.JOB_NOT_READY,
        message: "Video not ready. Job is not completed.",
        status: 404,
        headers: corsHeaders,
      });
    }

    const result = job.returnvalue as VideoJobResult | undefined;
    let videoPath: string | undefined;

    if (result?.variations && result.variations.length > 0) {
      const v = result.variations[Math.min(variantIndex, result.variations.length - 1)];
      videoPath = v?.videoUrl;
    } else if (result?.videoPath) {
      videoPath = result.videoPath;
    }

    if (!videoPath || typeof videoPath !== "string") {
      return apiError({
        code: ErrorCode.VIDEO_NOT_FOUND,
        message: "Video path not found.",
        status: 404,
        headers: corsHeaders,
      });
    }

    if (/^https?:\/\//i.test(videoPath)) {
      const downloadUrl = videoPath + (videoPath.includes("?") ? "&" : "?") + "download=1";
      return new NextResponse(null, {
        status: 302,
        headers: { ...corsHeaders, Location: downloadUrl },
      });
    }

    const basename = path.basename(videoPath);
    const cwd = process.cwd();
    const filePath = path.join(cwd, "public", "temp", basename);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return apiError({
        code: ErrorCode.VIDEO_NOT_FOUND,
        message: "Video file not found. It may have been cleaned up.",
        status: 404,
        headers: corsHeaders,
      });
    }

    const suggestedFilename = basename.startsWith("cutline-") ? basename : `cutline-${basename}`;
    const contentDisposition = `attachment; filename="${suggestedFilename}"`;

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "video/mp4",
        "Content-Disposition": contentDisposition,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (e) {
    console.error("[api] GET /api/generate/[jobId]/download error:", e);
    return apiError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong",
      status: 500,
      headers: corsHeaders,
    });
  }
}

const LIST_JOBS_DEFAULT_LIMIT = 20;
const LIST_JOBS_MAX_LIMIT = 50;

export function handleJobsOptions(request: Request): NextResponse {
  const origin = request.headers.get("Origin");
  const cors = getCorsHeaders(origin);
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, Allow: "GET, OPTIONS" },
  });
}

export async function handleJobsGet(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  const limitIdentifier = getClientIdentifier(request);
  const listLimit = await checkRateLimit(limitIdentifier, "status");
  if (!listLimit.allowed) {
    const retryAfter = listLimit.retryAfter ?? 60;
    return apiError({
      code: ErrorCode.RATE_LIMITED,
      message: "Too Many Requests",
      status: 429,
      details: { retryAfter },
      headers: { ...corsHeaders, "Retry-After": String(retryAfter) },
    });
  }

  const fromApiKey = await validateApiKeyAndGetUserId(request.headers.get("x-api-key"));
  let sessionUserId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    sessionUserId = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    sessionUserId = undefined;
  }
  if (!fromApiKey && !sessionUserId) {
    return apiError({
      code: ErrorCode.AUTH_REQUIRED,
      message: "Authentication required.",
      status: 401,
      headers: corsHeaders,
    });
  }

  const ownerIds = new Set(await resolveOwnerCandidates(request));
  if (fromApiKey) ownerIds.add(fromApiKey.userId);

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  let limit = LIST_JOBS_DEFAULT_LIMIT;
  if (limitParam != null && limitParam !== "") {
    const parsed = parseInt(limitParam, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > LIST_JOBS_MAX_LIMIT) {
      return apiError({
        code: ErrorCode.BAD_REQUEST,
        message: `Invalid limit. Must be between 1 and ${LIST_JOBS_MAX_LIMIT}.`,
        status: 400,
        headers: corsHeaders,
      });
    }
    limit = parsed;
  }
  try {
    const jobs = await listRecentJobs({ limit, ownerIds: [...ownerIds] });
    const body = {
      jobs: jobs.map((j) => ({
        jobId: j.jobId,
        status: j.status,
        createdAt: new Date(j.createdAt).toISOString(),
        ...(j.videoUrl != null ? { videoUrl: j.videoUrl } : {}),
        ...(j.topic != null ? { topic: j.topic } : {}),
        ...(j.error != null ? { error: j.error } : {}),
      })),
    };
    return NextResponse.json(body, { headers: corsHeaders });
  } catch (e) {
    const { logServerError } = await import("@/lib/utils/error");
    logServerError("GET /api/generate/jobs", e);
    return apiError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong",
      status: 500,
      headers: corsHeaders,
    });
  }
}
