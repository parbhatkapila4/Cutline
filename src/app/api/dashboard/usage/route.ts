import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { getSessionSafe } from "@/lib/auth/getSessionSafe";
import { getApiCallsThisMonth, getResetDate, getVideosUsedThisMonth } from "@/lib/usage";
import { cinematicSecondsFor } from "@/lib/cost/pricing";
import { getBudgetState } from "@/lib/cost/budget";
import { getUserPlan } from "@/lib/users/planService";
import { isDatabaseConfigured } from "@/lib/db/client";
import { isCancelledFailure } from "@/lib/jobs/jobStatus";

function titleFromInput(input: string | undefined): string {
  if (input == null || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 50);
}

function relativeTime(ms: number | undefined): string {
  if (ms == null || typeof ms !== "number") return "-";
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 86400 * 2) return "Yesterday";
  return `${Math.floor(sec / 86400)} days ago`;
}

async function resolveUsageContext(
  request: Request
): Promise<{ identifier: string; planUserId: string | undefined } | null> {
  const session = await getSessionSafe(request.headers);
  const userId = session?.user?.id;
  if (typeof userId === "string" && userId.trim()) {
    const id = userId.trim();
    return { identifier: id, planUserId: id };
  }
  return null;
}

type RecentActivityItem = {
  id: string;
  title: string;
  status: "completed" | "failed" | "cancelled";
  time: string;
  cinematicSeconds?: number;
  costUsd?: number;
};

function finishedStatus(completed: boolean, failure: string | null | undefined): RecentActivityItem["status"] {
  if (completed) return "completed";
  return isCancelledFailure(failure) ? "cancelled" : "failed";
}

type Activity = {
  totalVideos: number;
  thisWeek: number;
  totalDurationMin: number;
  inProgress: number;
  totalCostUsd: number;
  recentActivity: RecentActivityItem[];
};

function cinematicSecondsOf(data: VideoJobData | undefined): number | undefined {
  const seconds = cinematicSecondsFor({
    mode: data?.mode,
    durationSeconds: data?.durationSeconds,
    variationCount: data?.variationCount,
    talkingObjectStyle: data?.talkingObjectStyle,
    talkingRealMode: data?.talkingRealMode,
    avatar: data?.avatar,
  });
  return seconds || undefined;
}

async function activityFromRows(identifier: string, weekStart: Date): Promise<Activity> {
  const { getVideoJobOverview, listRecentFinishedVideoJobs } = await import("@/lib/jobs/videoJobService");
  const [overview, recent] = await Promise.all([
    getVideoJobOverview(identifier, weekStart),
    listRecentFinishedVideoJobs(identifier, 5),
  ]);
  return {
    totalVideos: overview.totalVideos,
    thisWeek: overview.thisWeek,
    totalDurationMin: Math.floor(overview.totalDurationSec / 60),
    inProgress: overview.inProgress,
    totalCostUsd: overview.totalCostUsd,
    recentActivity: recent.map((row) => ({
      id: row.queue_job_id ?? row.id,
      title: titleFromInput(row.prompt) || "Video",
      status: finishedStatus(row.status === "completed", row.error),
      time: relativeTime((row.finished_at ?? row.created_at).getTime()),
      cinematicSeconds: cinematicSecondsOf(row.job_data ?? undefined),
      costUsd: row.result?.cost?.total,
    })),
  };
}

async function activityFromQueue(identifier: string, weekStart: Date): Promise<Activity> {
  const queue = getVideoQueue();
  const startOfWeekTs = weekStart.getTime();
  const [completed, failed, waiting, active] = await Promise.all([
    queue.getCompleted(0, 199),
    queue.getFailed(0, 199),
    queue.getWaiting(0, 199),
    queue.getActive(),
  ]);

  const forClient = (job: { name?: string; data?: unknown }) => {
    if (job.name === CLEANUP_JOB_NAME) return false;
    const clientId = (job.data as VideoJobData | undefined)?.clientId;
    return clientId != null && clientId === identifier;
  };

  const completedForClient = completed.filter((j) => forClient(j));
  const thisWeek = completedForClient.filter(
    (job) => (job.finishedOn ?? job.processedOn ?? 0) >= startOfWeekTs
  ).length;
  const totalDurationSec = completedForClient.reduce((sum, job) => {
    const sec = (job.data as VideoJobData | undefined)?.durationSeconds;
    return sum + (typeof sec === "number" && sec >= 0 ? sec : 0);
  }, 0);
  const inProgress = [...waiting, ...active].filter((j) => forClient(j)).length;
  const totalCostUsd = completedForClient.reduce((sum, job) => {
    const result = job.returnvalue as VideoJobResult | undefined;
    return sum + (result?.cost?.total ?? 0);
  }, 0);

  const allForActivity = [
    ...completedForClient.map((j) => ({ job: j, status: finishedStatus(true, null) })),
    ...failed.filter((j) => forClient(j)).map((j) => ({ job: j, status: finishedStatus(false, j.failedReason) })),
  ];
  allForActivity.sort((a, b) => {
    const ta = a.job.finishedOn ?? a.job.processedOn ?? 0;
    const tb = b.job.finishedOn ?? b.job.processedOn ?? 0;
    return tb - ta;
  });
  const recentActivity = allForActivity.slice(0, 5).map(({ job, status }) => {
    const data = job.data as VideoJobData | undefined;
    const result = job.returnvalue as VideoJobResult | undefined;
    return {
      id: String(job.id ?? ""),
      title: titleFromInput(data?.input) || "Video",
      status,
      time: relativeTime(job.finishedOn ?? job.processedOn),
      cinematicSeconds: cinematicSecondsOf(data),
      costUsd: result?.cost?.total,
    };
  });

  return {
    totalVideos: completedForClient.length,
    thisWeek,
    totalDurationMin: Math.floor(totalDurationSec / 60),
    inProgress,
    totalCostUsd,
    recentActivity,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const durParam = url.searchParams.get("durationSeconds");
  const estimateMode = modeParam === "talking_object" ? "talking_object" : "slideshow";
  const estimateDuration =
    durParam != null && durParam !== ""
      ? Math.max(1, Math.min(600, Math.round(Number(durParam) || 30)))
      : 30;
  const estimatedSecondsNextVideo = cinematicSecondsFor({
    mode: estimateMode,
    durationSeconds: estimateDuration,
  });

  const rateLimitIdentifier = getClientIdentifier(request);
  const limit = await checkRateLimit(rateLimitIdentifier, "status");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const ctx = await resolveUsageContext(request);
    if (!ctx) {
      return NextResponse.json({
        plan: "free",
        planLabel: "Free",
        videosLimit: 1,
        apiCallsLimit: 1,
        videosUsed: 0,
        apiCallsUsed: 0,
        resetDate: getResetDate(),
        estimate: {
          mode: estimateMode,
          durationSeconds: estimateDuration,
          cinematicSeconds: estimatedSecondsNextVideo,
        },
        cinematic: {
          includedSeconds: 0,
          usedSeconds: 0,
          remainingSeconds: 0,
          topupSeconds: 0,
          totalRemainingSeconds: 0,
        },
        recentActivity: [],
        overview: {
          totalVideos: 0,
          thisWeek: 0,
          thisMonth: 0,
          totalDurationMin: 0,
          inProgress: 0,
          storageUsed: null as string | null,
          avgRenderSec: null as number | null,
        },
      });
    }

    const { identifier, planUserId } = ctx;

    const d = new Date();
    const weekStart = new Date(d);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(d.getDate() - d.getDay());

    const activity = isDatabaseConfigured()
      ? await activityFromRows(identifier, weekStart)
      : await activityFromQueue(identifier, weekStart);

    const plan = await getUserPlan(planUserId);

    const budget = await getBudgetState(identifier, plan.id);

    let apiCallsUsed = 0;
    let videosUsed = 0;
    try {
      [apiCallsUsed, videosUsed] = await Promise.all([
        getApiCallsThisMonth(identifier),
        getVideosUsedThisMonth(identifier),
      ]);
    } catch (redisErr) {
      console.warn("[api/dashboard/usage] usage counters unavailable (redis):", redisErr);
    }

    return NextResponse.json({
      plan: plan.id,
      planLabel: plan.label,
      videosLimit: plan.videosPerMonth,
      apiCallsLimit: plan.apiCallsPerMonth,
      videosUsed,
      apiCallsUsed,
      resetDate: getResetDate(),
      estimate: {
        mode: estimateMode,
        durationSeconds: estimateDuration,
        cinematicSeconds: estimatedSecondsNextVideo,
      },
      cinematic: {
        includedSeconds: budget.cinematicSecondsAllowed,
        usedSeconds: budget.cinematicSecondsUsed,
        remainingSeconds: budget.cinematicSecondsRemaining,
        topupSeconds: budget.topupSecondsRemaining,
        totalRemainingSeconds: budget.totalSecondsRemaining,
      },
      totalCostUsd: Math.round(activity.totalCostUsd * 100) / 100,
      recentActivity: activity.recentActivity,
      overview: {
        totalVideos: activity.totalVideos,
        thisWeek: activity.thisWeek,
        thisMonth: videosUsed,
        totalDurationMin: activity.totalDurationMin,
        inProgress: activity.inProgress,
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
