import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { validateJobId } from "@/lib/validation/input";
import { isValidAspectRatio, type AspectRatio } from "@/lib/validation/aspectRatio";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { resolveOwnerCandidates } from "@/lib/jobs/jobOwnership";
import { isCancelledFailure } from "@/lib/jobs/jobStatus";
import { purgeUserVideo } from "@/lib/dashboard/purgeUserVideo";
import { videoTitleFromPrompt } from "@/lib/dashboard/videoTitle";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";
import type { VideoJob } from "@/lib/db/types";

export type DashboardVideoStatus = "completed" | "processing" | "expired" | "failed";

export type DashboardVideoVersion = {
  id: string;
  status: DashboardVideoStatus;
  createdAt: string;
  videoUrl?: string;
  editMessage?: string;
  editFromId?: string;
  message?: string;
  error?: string;
};

export type DashboardVideoDetail = {
  id: string;
  title: string;
  prompt: string;
  originalPrompt: string;
  date: string;
  duration: string;
  status: DashboardVideoStatus;
  createdAt: string;
  videoUrl?: string;
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
  aspectRatio?: AspectRatio;
  message?: string;
  error?: string;
  versions: DashboardVideoVersion[];
};

const NOT_FOUND = { error: "Video not found" };
const CANCELLED_MESSAGE = "This render was cancelled.";

function formatDate(ms: number | undefined): string {
  if (ms == null || typeof ms !== "number") return "-";
  try {
    const d = new Date(ms);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatDuration(seconds: number | undefined): string {
  if (seconds == null || typeof seconds !== "number" || seconds < 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function failureText(reason: string | null | undefined): string {
  return isCancelledFailure(reason) ? CANCELLED_MESSAGE : getUserFriendlyErrorMessage(reason ?? "Job failed.");
}

function resultMessage(result: VideoJobResult | null | undefined): string | undefined {
  return typeof result?.message === "string" && result.message.trim() ? result.message.trim() : undefined;
}

function rowId(row: VideoJob): string {
  return row.queue_job_id ?? row.id;
}

function rowStatus(row: VideoJob): DashboardVideoStatus {
  if (row.status === "completed") return row.final_url ? "completed" : "expired";
  if (row.status === "failed") return "failed";
  return "processing";
}

function versionFromRow(row: VideoJob): DashboardVideoVersion {
  const status = rowStatus(row);
  const data = row.job_data;
  const message = resultMessage(row.result);
  return {
    id: rowId(row),
    status,
    createdAt: row.created_at.toISOString(),
    ...(status === "completed" && row.final_url ? { videoUrl: row.final_url } : {}),
    ...(data?.editMessage ? { editMessage: data.editMessage } : {}),
    ...(data?.editFromJobId ? { editFromId: data.editFromJobId } : {}),
    ...(message ? { message } : {}),
    ...(status === "failed" ? { error: failureText(row.error) } : {}),
  };
}

async function loadFamily(row: VideoJob, ownerIds: string[]): Promise<VideoJob[]> {
  const rootId = row.job_data?.editRootJobId ?? rowId(row);
  try {
    const { listVideoJobFamily } = await import("@/lib/jobs/videoJobService");
    const members = await listVideoJobFamily(rootId, ownerIds, 100);
    return members.some((m) => m.id === row.id) ? members : [...members, row];
  } catch (e) {
    console.warn(
      "[api] GET /api/dashboard/videos/[jobId] could not load the edit history jobId=" + rowId(row) +
      " error=" + (e instanceof Error ? e.message : String(e))
    );
    return [row];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "status");
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
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  try {
    const { isDatabaseConfigured } = await import("@/lib/db/client");
    if (isDatabaseConfigured()) {
      const ownerCandidates = await resolveOwnerCandidates(request);
      const { findVideoJobForOwners } = await import("@/lib/jobs/videoJobService");
      const row = ownerCandidates.length > 0 ? await findVideoJobForOwners(jobId, ownerCandidates) : null;
      if (!row) {
        return NextResponse.json(NOT_FOUND, { status: 404 });
      }
      const legacyJob = row.job_data ? null : await getVideoQueue().getJob(jobId);
      const data = row.job_data ?? (legacyJob?.data as VideoJobData | undefined);
      const result = row.result ?? (legacyJob?.returnvalue as VideoJobResult | undefined);
      const finishedAt = row.finished_at ?? (legacyJob?.finishedOn ? new Date(legacyJob.finishedOn) : row.created_at);
      const status = rowStatus(row);
      const family = await loadFamily(row, ownerCandidates);
      const rootId = data?.editRootJobId ?? rowId(row);
      const originalPrompt = family.find((m) => rowId(m) === rootId)?.prompt ?? row.prompt ?? "";
      const message = resultMessage(result);
      const body: DashboardVideoDetail = {
        id: rowId(row),
        title: videoTitleFromPrompt(originalPrompt),
        prompt: row.prompt ?? "",
        originalPrompt,
        date: formatDate((status === "completed" ? finishedAt : row.created_at).getTime()),
        duration: formatDuration(data?.durationSeconds),
        status,
        createdAt: row.created_at.toISOString(),
        ...(status === "completed" && row.final_url ? { videoUrl: row.final_url } : {}),
        mode: data?.mode,
        durationSeconds: data?.durationSeconds,
        ...(isValidAspectRatio(data?.aspectRatio) ? { aspectRatio: data.aspectRatio } : {}),
        ...(message ? { message } : {}),
        ...(status === "failed" ? { error: failureText(row.error) } : {}),
        versions: family.map(versionFromRow),
      };
      return NextResponse.json(body);
    }

    const job = await getVideoQueue().getJob(jobId);
    if (!job || job.name === CLEANUP_JOB_NAME) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }
    const data = job.data as VideoJobData | undefined;
    const clientId = data?.clientId;
    const ownerCandidates = await resolveOwnerCandidates(request);
    if (clientId === undefined || clientId === null || !ownerCandidates.includes(String(clientId))) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    const state = await job.getState();
    const result = job.returnvalue as VideoJobResult | undefined;
    const videoPath = typeof result?.videoPath === "string" && result.videoPath ? result.videoPath : undefined;
    if (state === "completed" && !videoPath) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }
    const status: DashboardVideoStatus =
      state === "completed" ? "completed" : state === "failed" ? "failed" : "processing";
    const input = typeof data?.input === "string" ? data.input : "";
    const createdAt = new Date(job.timestamp ?? Date.now()).toISOString();
    const message = resultMessage(result);
    const error = status === "failed" ? failureText(job.failedReason) : undefined;
    const id = String(job.id ?? jobId);
    const body: DashboardVideoDetail = {
      id,
      title: videoTitleFromPrompt(input),
      prompt: input,
      originalPrompt: input,
      date: formatDate(job.finishedOn ?? job.processedOn ?? job.timestamp),
      duration: formatDuration(data?.durationSeconds),
      status,
      createdAt,
      ...(videoPath ? { videoUrl: videoPath } : {}),
      mode: data?.mode,
      durationSeconds: data?.durationSeconds,
      ...(isValidAspectRatio(data?.aspectRatio) ? { aspectRatio: data.aspectRatio } : {}),
      ...(message ? { message } : {}),
      ...(error ? { error } : {}),
      versions: [
        {
          id,
          status,
          createdAt,
          ...(videoPath ? { videoUrl: videoPath } : {}),
          ...(message ? { message } : {}),
          ...(error ? { error } : {}),
        },
      ],
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "status");
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
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  try {
    const ownerCandidates = await resolveOwnerCandidates(request);
    const result = await purgeUserVideo(jobId, ownerCandidates);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api] DELETE /api/dashboard/videos/[jobId]", e);
    return NextResponse.json({ error: "Failed to delete video." }, { status: 500 });
  }
}
