import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { validateJobId } from "@/lib/validation/input";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { getAnonSessionIdFromRequest } from "@/lib/anon/cookie";
import { auth } from "@/lib/auth";
import { purgeUserVideo } from "@/lib/dashboard/purgeUserVideo";

export type DashboardVideoDetail = {
  id: string;
  title: string;
  prompt: string;
  date: string;
  duration: string;
  status: "completed";
  videoUrl: string;
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
};

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

function titleFromInput(input: string | undefined): string {
  if (input == null || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 50);
}

/**
 * Resolve the identifier used to authorize access to a job. Mirrors the list route:
 * prefer the signed-in user id, fall back to the anon session cookie, and finally
 * the network identifier. This must align with how `clientId` is stamped on jobs
 * in `src/app/api/generate/handlers.ts` (`userId ?? anonSessionId ?? identifier`).
 */
async function resolveOwnerCandidates(request: Request): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    if (typeof userId === "string" && userId.trim()) candidates.push(userId);
  } catch {
  }
  const anonId = getAnonSessionIdFromRequest(request);
  if (anonId) candidates.push(anonId);
  candidates.push(getClientIdentifier(request));
  return candidates;
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
    return NextResponse.json(
      { error: "Video not found" },
      { status: 404 }
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
    const result = job.returnvalue as VideoJobResult | undefined;
    const videoPath = result?.videoPath;
    if (!videoPath || typeof videoPath !== "string") {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const clientId = data?.clientId;
    const ownerCandidates = await resolveOwnerCandidates(request);
    if (
      clientId === undefined ||
      clientId === null ||
      !ownerCandidates.includes(String(clientId))
    ) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const input = data?.input;
    const ts = job.finishedOn ?? job.processedOn;

    const body: DashboardVideoDetail = {
      id: String(job.id ?? ""),
      title: titleFromInput(input),
      prompt: typeof input === "string" ? input : "",
      date: formatDate(ts),
      duration: formatDuration(data?.durationSeconds),
      status: "completed",
      videoUrl: videoPath,
      mode: data?.mode,
      durationSeconds: data?.durationSeconds,
    };

    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Video not found" },
      { status: 404 }
    );
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
