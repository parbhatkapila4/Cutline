import { NextResponse } from "next/server";
import {
  getVideoQueue,
  cancelJob,
  listRecentJobs,
  getQueueWaitMetrics,
  type VideoJobResult,
} from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
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
import { requestOwnsResource } from "@/lib/jobs/jobOwnership";
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

  // Daily AI-spend circuit breaker (per identifier / per API key), on top of
  // the hourly limit above. Caps total generations in any 24h window.
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

  // assetIds (uploaded images) are only consumed by the Slideshow pipeline.
  // A talking-object request carrying assetIds is malformed - the UI gates
  // this, but reject server-side too so a stale or hand-rolled client can't
  // slip them through into a render that ignores them.
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

  // Pro-only feature gate: image uploads, custom avatars, and cinematic scenes
  // require Professional or Enterprise. Anonymous callers are treated as free.
  // Only enforced when a database is configured (no DB = open dev mode).
  if (isDatabaseConfigured()) {
    const usesImages = Array.isArray(data.assetIds) && data.assetIds.length > 0;
    const usesProAvatar =
      data.avatar?.mode === "preset" || data.avatar?.mode === "upload";
    const usesCinematic =
      data.mode === "talking_object" &&
      data.talkingObjectStyle === "real" &&
      data.talkingRealMode === "scenario";
    if (usesImages || usesProAvatar || usesCinematic) {
      const { getUserPlan } = await import("@/lib/users/planService");
      const callerIsPro = userId ? isProPlan((await getUserPlan(userId)).id) : false;
      if (!callerIsPro) {
        const feature = usesCinematic
          ? "Cinematic scenes"
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

  const creditsIdentifier = userId ?? anonFlow?.result.anon_session_id ?? identifier;

  try {
    await ensureInProcessWorkerStarted();
    const queue = getVideoQueue();
    const { incrementApiCallsThisMonth, getTokens, getVideosCompletedThisMonth } = await import("@/lib/usage");
    const { estimateTokenCost } = await import("@/lib/cost/pricing");
    const { getUserPlan } = await import("@/lib/users/planService");
    const creditsCheckDisabled =
      process.env.DISABLE_CREDITS_CHECK === "true" || process.env.DISABLE_CREDITS_CHECK === "1";
    const skipCreditsForAnon = Boolean(anonFlow?.result.allowed);
    if (!creditsCheckDisabled && !skipCreditsForAnon) {
      const userPlan = await getUserPlan(userId);

      if (!userPlan.tokensUnlimited) {
        const estimatedTokens = estimateTokenCost({
          mode: data.mode ?? "slideshow",
          durationSeconds: data.durationSeconds ?? 30,
        });
        const tokensRemaining = await getTokens(creditsIdentifier);
        if (tokensRemaining < estimatedTokens) {
          return apiError({
            code: ErrorCode.INSUFFICIENT_CREDITS,
            message: `Not enough tokens. You have ${tokensRemaining} tokens, this video needs approximately ${estimatedTokens} tokens.`,
            status: 402,
            details: { tokensRemaining, tokensRequired: estimatedTokens },
            headers,
          });
        }
      }

      const videosCompletedThisMonth = await getVideosCompletedThisMonth(creditsIdentifier);
      if (
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
      mode: data.regenFromJobId ? "slideshow" : (data.mode ?? "slideshow"),
      durationSeconds: data.durationSeconds,
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

    // Assign an unguessable UUID as the BullMQ jobId for every job (the anon
    // flow already supplies its own UUID). This stops the previous behavior
    // where non-anon jobs got sequential integer IDs (1, 2, 3…) that an
    // attacker could enumerate. Ownership checks are the primary control;
    // this is defense-in-depth so IDs can't be guessed in the first place.
    const anonJobId = anonFlow?.result.allowed ? anonFlow.result.job_id : undefined;
    const newJobId = anonJobId ?? randomUUID();
    const queueAddOptions = { jobId: newJobId };

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
    return NextResponse.json({ jobId }, { headers: resHeaders });
  } catch (e) {
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

    // Ownership: only the caller who created this job may read its status.
    // Return 404 (not 403) so we don't confirm the existence of others' jobs.
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

  // Ownership: only the creator may cancel their own job. Fetch first and
  // verify before cancelling so an attacker can't kill other users' renders.
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
    // Downloading is a Pro+ feature.
    const apiKeyUser = await validateApiKeyAndGetUserId(request.headers.get("x-api-key"));
    let downloaderId: string | undefined;
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      downloaderId = session?.user?.id != null ? String(session.user.id) : undefined;
    } catch {
      downloaderId = undefined;
    }
    if (apiKeyUser) downloaderId = apiKeyUser.userId;
    const { getUserPlan } = await import("@/lib/users/planService");
    if (!downloaderId || !isProPlan((await getUserPlan(downloaderId)).id)) {
      return apiError({
        code: ErrorCode.PLAN_REQUIRED,
        message: "Downloading videos is available on Professional and Enterprise plans.",
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

    // Ownership: only the creator may download the MP4. The DB-backed gate
    // above only blocks anonymous-owned jobs; this closes the case where any
    // caller could pull another user's finished video by jobId.
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
    const jobs = await listRecentJobs({ limit });
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
