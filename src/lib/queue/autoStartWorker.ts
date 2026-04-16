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

  const { startVideoWorker, scheduleCleanupJob } = await import("@/lib/queue/videoQueue");
  const worker = startVideoWorker();
  globalThis.__cutlineInProcessWorker = worker;
  globalThis.__cutlineInProcessWorkerStarted = true;
  try {
    await scheduleCleanupJob();
  } catch (e) {
    console.warn(
      "[worker] scheduleCleanupJob failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
  console.log("[worker] In-process video worker started");
}
