import { NextResponse } from "next/server";
import { getVideoQueue, CLEANUP_JOB_NAME, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { getSessionSafe } from "@/lib/auth/getSessionSafe";
import { getApiCallsThisMonth, getResetDate } from "@/lib/usage";
import { cinematicSecondsFor } from "@/lib/cost/pricing";
import { getBudgetState } from "@/lib/cost/budget";
import { getUserPlan } from "@/lib/users/planService";

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
      const result = job.returnvalue as VideoJobResult | undefined;
      const ts = job.finishedOn ?? job.processedOn;
      const secondsCost = cinematicSecondsFor({
        mode: data?.mode,
        durationSeconds: data?.durationSeconds,
        variationCount: data?.variationCount,
        talkingObjectStyle: data?.talkingObjectStyle,
        talkingRealMode: data?.talkingRealMode,
        avatar: data?.avatar,
      });
      return {
        id: String(job.id ?? ""),
        title: titleFromInput(data?.input) || "Video",
        status,
        time: relativeTime(ts),
        cinematicSeconds: secondsCost || undefined,
        costUsd: result?.cost?.total,
      };
    });

    const plan = await getUserPlan(planUserId);

    const budget = await getBudgetState(identifier, plan.id);

    let apiCallsUsed = 0;
    try {
      apiCallsUsed = await getApiCallsThisMonth(identifier);
    } catch (redisErr) {
      console.warn("[api/dashboard/usage] usage counters unavailable (redis):", redisErr);
    }

    const totalCostUsd = completedForClient.reduce((sum, job) => {
      const result = job.returnvalue as VideoJobResult | undefined;
      return sum + (result?.cost?.total ?? 0);
    }, 0);

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
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
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
