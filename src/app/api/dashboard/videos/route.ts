import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";

export type DashboardVideoItem = {
  id: string;
  title: string;
  prompt: string;
  date: string;
  duration: string;
  status: "completed" | "processing" | "failed";
  /** Present only when status is "completed"; empty for processing/failed */
  videoUrl?: string;
  /** Unix timestamp (ms) for sorting; derived from finishedOn/processedOn/timestamp */
  timestamp: number;
};

function formatDate(ms: number | undefined): string {
  if (ms == null || typeof ms !== "number") return "—";
  try {
    const d = new Date(ms);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDuration(seconds: number | undefined): string {
  if (seconds == null || typeof seconds !== "number" || seconds < 0) return "—";
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

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "status");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const queue = getVideoQueue();
    const [completed, failed, waiting, active] = await Promise.all([
      queue.getCompleted(0, 199),
      queue.getFailed(0, 199),
      queue.getWaiting(0, 199),
      queue.getActive(),
    ]);
    const items: DashboardVideoItem[] = [];

    const forClient = (job: { data?: unknown }) => {
      const data = job.data as VideoJobData | undefined;
      const clientId = data?.clientId;
      if (clientId === undefined || clientId === null) return false;
      return clientId === identifier;
    };

    const toItem = (
      job: { id?: string; data?: unknown; finishedOn?: number; processedOn?: number; timestamp?: number },
      status: "completed" | "processing" | "failed",
      videoUrl?: string
    ): DashboardVideoItem => {
      const data = job.data as VideoJobData | undefined;
      const input = data?.input;
      const ts = job.finishedOn ?? job.processedOn ?? job.timestamp ?? 0;
      return {
        id: String(job.id ?? ""),
        title: titleFromInput(input),
        prompt: typeof input === "string" ? input : "",
        date: formatDate(ts),
        duration: formatDuration(data?.durationSeconds),
        status,
        ...(videoUrl ? { videoUrl } : {}),
        timestamp: typeof ts === "number" ? ts : 0,
      };
    };

    for (const job of completed) {
      if (job.name === CLEANUP_JOB_NAME) continue;
      if (!forClient(job)) continue;
      const result = job.returnvalue as VideoJobResult | undefined;
      const videoPath = result?.videoPath;
      if (!videoPath || typeof videoPath !== "string") continue;
      items.push(toItem(job, "completed", videoPath));
    }
    for (const job of failed) {
      if (job.name === CLEANUP_JOB_NAME) continue;
      if (!forClient(job)) continue;
      items.push(toItem(job, "failed", ""));
    }
    const processingJobs = [...waiting.filter((j) => forClient(j)), ...active.filter((j) => forClient(j))];
    for (const job of processingJobs) {
      if (job.name === CLEANUP_JOB_NAME) continue;
      items.push(toItem(job, "processing", ""));
    }

    items.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(items);
  } catch (e) {
    console.error("[api] GET /api/dashboard/videos", e);
    return NextResponse.json({ error: "Failed to load videos." }, { status: 500 });
  }
}
