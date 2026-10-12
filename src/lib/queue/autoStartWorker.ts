import type { Worker } from "bullmq";
import type { VideoJobData, VideoJobResult } from "@/lib/queue/videoQueue";

declare global {
  var __cutlineInProcessWorker: Worker<VideoJobData, VideoJobResult> | undefined;
  var __cutlineInProcessWorkerStarted: boolean | undefined;
}

function shouldAutoStartWorker(): boolean {
  const explicit = process.env.CUTLINE_AUTOSTART_WORKER;
  if (explicit === "false" || explicit === "0") return false;
  if (explicit === "true" || explicit === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export async function ensureInProcessWorkerStarted(): Promise<void> {
  if (!shouldAutoStartWorker()) return;
  if (globalThis.__cutlineInProcessWorkerStarted) return;

  const { startVideoWorker } = await import("@/lib/queue/videoQueue");
  const worker = startVideoWorker();
  globalThis.__cutlineInProcessWorker = worker;
  globalThis.__cutlineInProcessWorkerStarted = true;
  try {
    const { startWorkerHeartbeat } = await import("@/lib/queue/heartbeat");
    startWorkerHeartbeat();
  } catch (e) {
    console.warn(
      "[worker] startWorkerHeartbeat failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
  if (process.env.NODE_ENV !== "test") {
    try {
      const { removeLegacyCleanupJobs } = await import("@/lib/queue/videoQueue");
      await removeLegacyCleanupJobs();
    } catch (e) {
      console.warn(
        "[worker] removeLegacyCleanupJobs failed:",
        e instanceof Error ? e.message : String(e)
      );
    }
    try {
      const { startMaintenanceLoop } = await import("@/lib/queue/maintenance");
      startMaintenanceLoop();
    } catch (e) {
      console.warn(
        "[worker] startMaintenanceLoop failed:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  console.log("[worker] In-process video worker started");
}
