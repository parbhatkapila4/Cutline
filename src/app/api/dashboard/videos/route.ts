import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { videoTitleFromPrompt } from "@/lib/dashboard/videoTitle";

export type DashboardVideoItem = {
  id: string;
  title: string;
  prompt: string;
  date: string;
  duration: string;
  status: "completed" | "processing" | "failed" | "expired";
  videoUrl?: string;
  timestamp: number;
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

type DashboardOwner = { id: string; ownerType: "user" };

async function resolveDashboardOwner(request: Request): Promise<DashboardOwner | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    if (typeof userId === "string" && userId.trim()) {
      return { id: userId, ownerType: "user" };
    }
  } catch {
  }
  return null;
}

async function loadPersistedItems(owner: DashboardOwner): Promise<DashboardVideoItem[]> {
  const { listVideoJobsByOwner } = await import("@/lib/jobs/videoJobService");
  const rows = await listVideoJobsByOwner(owner.ownerType, owner.id, 100);
  return rows.map((row) => {
    const ts = row.created_at instanceof Date ? row.created_at.getTime() : 0;
    const finishedTs = row.finished_at instanceof Date ? row.finished_at.getTime() : ts;
    const videoUrl = row.final_url ?? row.preview_url ?? undefined;
    const status: DashboardVideoItem["status"] =
      row.status === "completed"
        ? (videoUrl ? "completed" : "expired")
        : row.status === "failed"
          ? "failed"
          : "processing";
    return {
      id: row.queue_job_id ?? row.id,
      title: videoTitleFromPrompt(row.prompt),
      prompt: row.prompt ?? "",
      date: formatDate(status === "completed" ? finishedTs : ts),
      duration: formatDuration(row.job_data?.durationSeconds),
      status,
      ...(status === "completed" && videoUrl ? { videoUrl } : {}),
      timestamp: ts,
    };
  });
}

export async function GET(request: Request) {
  const rateLimitIdentifier = getClientIdentifier(request);
  const limit = await checkRateLimit(rateLimitIdentifier, "status");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const owner = await resolveDashboardOwner(request);
    if (!owner) return NextResponse.json([]);
    const identifier = owner.id;

    const HIDDEN: ReadonlyArray<DashboardVideoItem["status"]> = ["failed", "expired"];
    const { isDatabaseConfigured } = await import("@/lib/db/client");
    if (isDatabaseConfigured()) {
      const persisted = await loadPersistedItems(owner);
      const visible = persisted.filter((item) => !HIDDEN.includes(item.status));
      visible.sort((a, b) => b.timestamp - a.timestamp);
      return NextResponse.json(visible);
    }

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
        title: videoTitleFromPrompt(input),
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

    const byId = new Map<string, DashboardVideoItem>();
    for (const item of items) {
      if (item.id) byId.set(item.id, item);
    }

    const merged = [...byId.values()].filter((item) => !HIDDEN.includes(item.status));
    merged.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(merged);
  } catch (e) {
    console.error("[api] GET /api/dashboard/videos", e);
    return NextResponse.json({ error: "Failed to load videos." }, { status: 500 });
  }
}
