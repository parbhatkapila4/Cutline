import { runCleanup } from "@/lib/storage/cleanup";
import { findPublishedVideoForJob } from "@/lib/storage/publish";
import { reconcileOpenVideoJobs } from "@/lib/jobs/reconcile";
import { getActiveJobIds, getVideoQueue, getVideoQueueName } from "@/lib/queue/videoQueue";

declare global {
  var __cutlineMaintenanceTimer: ReturnType<typeof setInterval> | undefined;
  var __cutlineMaintenanceRun: Promise<void> | undefined;
}

export function getMaintenanceIntervalMs(): number {
  const hours = Number(process.env.CLEANUP_INTERVAL_HOURS) || 1;
  return Math.max(60_000, hours * 60 * 60 * 1000);
}

async function sweepOnce(): Promise<void> {
  try {
    const cleanup = await runCleanup({ skipJobIds: getActiveJobIds() });
    console.log(
      "[maintenance] cleanup videos=" + cleanup.videosDeleted +
      " uploads=" + cleanup.uploadsDeleted +
      " tempImages=" + cleanup.tempImagesDeleted +
      " errors=" + cleanup.errors.length
    );
    for (const error of cleanup.errors) {
      console.error("[maintenance] cleanup error=" + String(error).replace(/\s+/g, " "));
    }
  } catch (e) {
    console.error("[maintenance] cleanup failed: " + (e instanceof Error ? e.message : String(e)));
  }

  try {
    const summary = await reconcileOpenVideoJobs({
      queues: [{ name: getVideoQueueName(), queue: getVideoQueue() }],
      findPublishedVideo: findPublishedVideoForJob,
    });
    if (summary.checked > 0) {
      console.log("[maintenance] video_jobs reconciled " + JSON.stringify(summary));
    }
  } catch (e) {
    console.error("[maintenance] reconcile failed: " + (e instanceof Error ? e.message : String(e)));
  }
}

export async function runMaintenance(): Promise<void> {
  if (globalThis.__cutlineMaintenanceRun) return globalThis.__cutlineMaintenanceRun;
  const run = sweepOnce().finally(() => {
    globalThis.__cutlineMaintenanceRun = undefined;
  });
  globalThis.__cutlineMaintenanceRun = run;
  return run;
}

export function startMaintenanceLoop(): void {
  if (globalThis.__cutlineMaintenanceTimer) return;
  const timer = setInterval(() => {
    void runMaintenance();
  }, getMaintenanceIntervalMs());
  if (typeof timer.unref === "function") timer.unref();
  globalThis.__cutlineMaintenanceTimer = timer;
  void runMaintenance();
}

export function stopMaintenanceLoop(): void {
  if (!globalThis.__cutlineMaintenanceTimer) return;
  clearInterval(globalThis.__cutlineMaintenanceTimer);
  globalThis.__cutlineMaintenanceTimer = undefined;
}
