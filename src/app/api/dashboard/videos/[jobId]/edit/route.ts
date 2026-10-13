import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData } from "@/lib/queue/videoQueue";
import { getVideoQueueName } from "@/lib/queue/queueName";
import { jobUploadIds, resolveAssetRecords } from "@/lib/assets/storage";
import { getUploadRetentionHours } from "@/lib/storage/cleanup";
import type { AssetMetadata } from "@/lib/assets/types";
import { validateJobId } from "@/lib/validation/input";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { resolveOwnerCandidates } from "@/lib/jobs/jobOwnership";
import { interpretEdit } from "@/lib/edit/interpreter";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/users/planService";
import { isProPlan } from "@/lib/plans";
import { isDatabaseConfigured } from "@/lib/db";
import { apiError } from "@/lib/api/errors";
import { randomUUID } from "crypto";
import {
  admitVideoJob,
  emptyReservation,
  releaseReservation,
  reservationJobFields,
  type Reservation,
} from "@/lib/jobs/admission";

type EditBody = { message?: unknown };

const NOT_CARRIED_OVER: ReadonlyArray<keyof VideoJobData> = [
  "input",
  "assets",
  "requestId",
  "callbackUrl",
  "previewJobId",
  "regenFromJobId",
  "regenerateShotIds",
  "remixFromJobId",
  "stockImagesOnly",
  "spendIdentifier",
  "reservedSpendUsd",
  "reservedCinematicSeconds",
  "reservedCinematicSplit",
  "reservedVideoMonth",
];

function carriedSettings(data: VideoJobData): Omit<VideoJobData, "input"> {
  const carried: Partial<VideoJobData> = { ...data };
  for (const key of NOT_CARRIED_OVER) delete carried[key];
  return carried;
}

function uploadsDeletedMessage(): string {
  const hours = getUploadRetentionHours();
  const keptFor = hours > 0 ? ` (uploads are kept for ${hours} hour${hours === 1 ? "" : "s"})` : "";
  return (
    `This video was made with files you uploaded, and those files have been deleted${keptFor}, ` +
    "so it can't be edited. To change it, create a new video and upload the files again."
  );
}

type EditSource = { data: VideoJobData; clientId: string };

async function loadEditSource(request: Request, jobId: string): Promise<EditSource | null> {
  const ownerCandidates = await resolveOwnerCandidates(request);
  if (isDatabaseConfigured()) {
    const { findVideoJobForOwners } = await import("@/lib/jobs/videoJobService");
    const row = ownerCandidates.length > 0 ? await findVideoJobForOwners(jobId, ownerCandidates) : null;
    if (!row || row.status !== "completed") return null;
    if (row.job_data) return { data: row.job_data, clientId: row.owner_id };
  }

  const job = await getVideoQueue().getJob(jobId);
  if (!job || job.name === CLEANUP_JOB_NAME) return null;
  if ((await job.getState()) !== "completed") return null;
  const data = job.data as VideoJobData | undefined;
  const clientId = data?.clientId;
  if (!data || clientId == null || !ownerCandidates.includes(String(clientId))) return null;
  return { data, clientId: String(clientId) };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "generate");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const { jobId } = await params;
  const validation = validateJobId(jobId);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Video not found" },
      { status: 404 }
    );
  }

  let body: EditBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { message: string }." },
      { status: 400 }
    );
  }

  const rawMessage = body?.message;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (message.length === 0) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  let reservation: Reservation | null = null;
  let queued = false;
  try {
    const queue = getVideoQueue();
    const source = await loadEditSource(request, jobId);
    if (!source) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }
    const { data, clientId } = source;

    const originalInput = typeof data?.input === "string" && data.input.trim() !== ""
      ? data.input.trim()
      : "";
    if (!originalInput) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    let sessionUserId: string | undefined;
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      const uid = session?.user?.id;
      if (typeof uid === "string" && uid.trim()) sessionUserId = uid.trim();
    } catch {
    }

    if (isDatabaseConfigured()) {
      const plan = await getUserPlan(sessionUserId);
      if (!isProPlan(plan.id)) {
        return NextResponse.json(
          {
            error: "Editing is available on Professional and Enterprise plans. Upgrade to edit videos.",
            code: "PLAN_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const uploadIds = jobUploadIds({ assetIds: data?.assetIds, avatar: data?.avatar });
    let uploadedAssets: AssetMetadata[] = [];
    if (uploadIds.length > 0) {
      let lookup: { found: AssetMetadata[]; missing: string[] };
      try {
        lookup = await resolveAssetRecords(uploadIds);
      } catch (e) {
        const { logServerError } = await import("@/lib/utils/error");
        logServerError("POST /api/dashboard/videos/[jobId]/edit (asset lookup)", e);
        return NextResponse.json(
          { error: "Your uploaded files could not be checked. Please try again." },
          { status: 503 }
        );
      }
      if (lookup.missing.length > 0) {
        return NextResponse.json(
          { error: uploadsDeletedMessage(), code: "UPLOADS_DELETED" },
          { status: 400 }
        );
      }
      uploadedAssets = lookup.found;
    }

    const jobData: Omit<VideoJobData, "input"> = {
      ...carriedSettings(data),
      clientId: String(clientId),
      ...(uploadedAssets.length > 0 ? { assets: uploadedAssets } : {}),
    };

    reservation = emptyReservation(String(clientId));
    const admission = await admitVideoJob(reservation, jobData);
    if (!admission.ok) {
      return apiError(admission.error);
    }

    let newInput: string;
    try {
      newInput = await interpretEdit(originalInput, message, {
        model: typeof data?.textModel === "string" && data.textModel.trim() !== ""
          ? data.textModel.trim()
          : undefined,
      });
    } catch (e) {
      const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
      logServerError("POST /api/dashboard/videos/[jobId]/edit (interpretEdit)", e);
      return NextResponse.json(
        { error: sanitizeErrorMessage(e instanceof Error ? e.message : "Edit interpretation failed.") },
        { status: 500 }
      );
    }

    const newJobId = randomUUID();
    const payload: VideoJobData = {
      ...jobData,
      input: newInput,
      mode: admission.mode,
      ...reservationJobFields(reservation),
    };
    const writeRow = isDatabaseConfigured();
    if (writeRow) {
      try {
        const { createVideoJob } = await import("@/lib/jobs/videoJobService");
        await createVideoJob({
          owner_type: "user",
          owner_id: String(clientId),
          prompt: newInput,
          status: "queued",
          queue_job_id: newJobId,
          job_data: payload,
          queue_name: getVideoQueueName(),
        });
      } catch (e) {
        console.error(
          "[api] POST /api/dashboard/videos/[jobId]/edit could not persist video_jobs row jobId=" +
          newJobId + " error=" + (e instanceof Error ? e.message : String(e))
        );
        return NextResponse.json(
          { error: "Could not start the edit. Please try again." },
          { status: 500 }
        );
      }
    }

    let newJob;
    try {
      newJob = await queue.add("video", payload, { jobId: newJobId });
    } catch (e) {
      if (writeRow) {
        try {
          const { deleteOpenVideoJob } = await import("@/lib/jobs/videoJobService");
          await deleteOpenVideoJob(newJobId);
        } catch (cleanupError) {
          console.error(
            "[api] POST /api/dashboard/videos/[jobId]/edit could not remove the row for unqueued jobId=" +
            newJobId + " error=" + (cleanupError instanceof Error ? cleanupError.message : String(cleanupError))
          );
        }
      }
      throw e;
    }
    queued = true;
    const returnedJobId = String(newJob.id);
    console.log("[api] POST /api/dashboard/videos/[jobId]/edit jobId=" + jobId + " newJobId=" + returnedJobId);
    return NextResponse.json({ newJobId: returnedJobId, ...(admission.notice ? { notice: admission.notice } : {}) });
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/dashboard/videos/[jobId]/edit", e);
    return NextResponse.json(
      { error: sanitizeErrorMessage(e) },
      { status: 500 }
    );
  } finally {
    if (!queued && reservation) await releaseReservation(reservation);
  }
}
