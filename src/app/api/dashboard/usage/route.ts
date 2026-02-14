import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData } from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import {
  getTokens,
  getApiCallsThisMonth,
  getResetDate,
  DEFAULT_TOKENS,
  FREE_PLAN_VIDEOS_PER_MONTH,
  FREE_PLAN_API_CALLS_PER_MONTH,
} from "@/lib/usage";

function titleFromInput(input: string | undefined): string {
  if (input == null || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 50);
}

function relativeTime(ms: number | undefined): string {
  if (ms == null || typeof ms !== "number") return "—";
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 86400 * 2) return "Yesterday";
  return `${Math.floor(sec / 86400)} days ago`;
}

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "status");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const queue = getVideoQueue();
    const d = new Date();
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const startOfWeek = new Date(d);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const startOfWeekTs = startOfWeek.getTime();

    const [completed, failed, waiting, active] = await Promise.all([
      queue.getCompleted(0, 199),
      queue.getFailed(0, 199),
      queue.getWaiting(0, 199),
      queue.getActive(),
    ]);

    const forClient = (job: { data?: unknown; finishedOn?: number; processedOn?: number; id?: string; failedReason?: string }) => {
      const data = job.data as VideoJobData | undefined;
      const clientId = data?.clientId;
      if (clientId === undefined || clientId === null) return false;
      return clientId === identifier;
    };

    const completedForClient = completed.filter((j) => forClient(j));
    const completedThisMonth = completedForClient.filter(
      (job) => (job.finishedOn ?? job.processedOn ?? 0) >= startOfMonth
    );
    const videosUsed = completedThisMonth.length;

    const totalVideos = completedForClient.length;
    const thisWeek = completedForClient.filter(
      (job) => (job.finishedOn ?? job.processedOn ?? 0) >= startOfWeekTs
    ).length;
    const totalDurationSec = completedForClient.reduce((sum, job) => {
      const data = job.data as VideoJobData | undefined;
      const sec = data?.durationSeconds;
      return sum + (typeof sec === "number" && sec >= 0 ? sec : 0);
    }, 0);
    const totalDurationMin = Math.floor(totalDurationSec / 60);
    const inProgress = [
      ...waiting.filter((j) => forClient(j)),
      ...active.filter((j) => forClient(j)),
    ].length;

    const allForActivity = [
      ...completed.filter((j) => forClient(j)).map((j) => ({ job: j, status: "completed" as const })),
      ...failed.filter((j) => forClient(j)).map((j) => ({ job: j, status: "failed" as const })),
    ];
    allForActivity.sort((a, b) => {
      const ta = a.job.finishedOn ?? a.job.processedOn ?? 0;
      const tb = b.job.finishedOn ?? b.job.processedOn ?? 0;
      return tb - ta;
    });
    const recentActivity = allForActivity.slice(0, 5).map(({ job, status }) => {
      const data = job.data as VideoJobData | undefined;
      const ts = job.finishedOn ?? job.processedOn;
      return {
        id: String(job.id ?? ""),
        title: titleFromInput(data?.input) || "Video",
        status,
        time: relativeTime(ts),
      };
    });

    const [tokensRemaining, apiCallsUsed] = await Promise.all([
      getTokens(identifier),
      getApiCallsThisMonth(identifier),
    ]);
    const usedThisPeriod = Math.max(0, DEFAULT_TOKENS - tokensRemaining);

    return NextResponse.json({
      plan: "free",
      planLabel: "Free",
      videosLimit: FREE_PLAN_VIDEOS_PER_MONTH,
      apiCallsLimit: FREE_PLAN_API_CALLS_PER_MONTH,
      videosUsed,
      apiCallsUsed,
      resetDate: getResetDate(),
      tokens: {
        initialBalance: DEFAULT_TOKENS,
        remaining: tokensRemaining,
        used: usedThisPeriod,
      },
      recentActivity,
      overview: {
        totalVideos,
        thisWeek,
        thisMonth: videosUsed,
        totalDurationMin,
        inProgress,
        storageUsed: null as string | null,
        avgRenderSec: null as number | null,
      },
    });
  } catch (e) {
    console.error("[api] GET /api/dashboard/usage", e);
    return NextResponse.json(
      { error: "Failed to load usage." },
      { status: 500 }
    );
  }
}
