import { NextResponse } from "next/server";
import { getVideoQueue, type VideoJobResult } from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { validateJobId } from "@/lib/validation/input";

type JobStatus = "pending" | "processing" | "completed" | "failed";

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
  const jobIdValidation = validateJobId(jobId);
  if (!jobIdValidation.valid) {
    return NextResponse.json(
      { error: jobIdValidation.error },
      { status: 400 }
    );
  }

  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      console.log("[api] GET /api/generate/[jobId] jobId=" + jobId + " status=404");
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    const state = await job.getState();
    const status: JobStatus = mapStateToStatus(state);

    const response: {
      status: JobStatus;
      videoUrl?: string;
      message?: string;
      error?: string;
    } = { status };

    if (status === "completed") {
      const result = job.returnvalue as VideoJobResult | undefined;
      if (result?.videoPath) {
        response.videoUrl = result.videoPath;
      }
      if (result?.message) {
        response.message = result.message;
      }
    }

    if (status === "failed") {
      const { getUserFriendlyErrorMessage } = await import("@/lib/utils/error");
      response.error = getUserFriendlyErrorMessage(job.failedReason ?? "Job failed.");
    }

    return NextResponse.json(response);
  } catch (e) {
    console.log("[api] GET /api/generate/[jobId] jobId=" + jobId + " status=500");
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("GET /api/generate/[jobId]", e);
    return NextResponse.json(
      { error: sanitizeErrorMessage(e) },
      { status: 500 }
    );
  }
}

function mapStateToStatus(
  state: string
): JobStatus {
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
