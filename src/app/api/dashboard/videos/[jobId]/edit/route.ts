import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData } from "@/lib/queue/videoQueue";
import { validateJobId } from "@/lib/validation/input";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { interpretEdit } from "@/lib/edit/interpreter";

type EditBody = { message?: unknown };

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

  try {
    const queue = getVideoQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }
    if (job.name === CLEANUP_JOB_NAME) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const state = await job.getState();
    if (state !== "completed") {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const data = job.data as VideoJobData | undefined;
    const originalInput = typeof data?.input === "string" && data.input.trim() !== ""
      ? data.input.trim()
      : "";
    if (!originalInput) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
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

    const jobData: VideoJobData = {
      input: newInput,
      ...(data?.clientId ? { clientId: data.clientId } : {}),
      ...(data?.mode ? { mode: data.mode } : {}),
      ...(data?.durationSeconds !== undefined ? { durationSeconds: data.durationSeconds } : {}),
      ...(Array.isArray(data?.assetIds) && data.assetIds.length > 0 ? { assetIds: data.assetIds } : {}),
      ...(data?.brandColors ? { brandColors: data.brandColors } : {}),
      ...(typeof data?.textModel === "string" && data.textModel.trim() !== "" ? { textModel: data.textModel.trim() } : {}),
      ...(data?.captions === "on" || data?.captions === "off" ? { captions: data.captions } : {}),
    };

    const newJob = await queue.add("video", jobData);
    const newJobId = String(newJob.id);
    console.log("[api] POST /api/dashboard/videos/[jobId]/edit jobId=" + jobId + " newJobId=" + newJobId);
    return NextResponse.json({ newJobId });
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/dashboard/videos/[jobId]/edit", e);
    return NextResponse.json(
      { error: sanitizeErrorMessage(e) },
      { status: 500 }
    );
  }
}
