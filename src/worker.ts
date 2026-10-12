import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { validateConfig } from "@/lib/config/validate";
import { ensureVertexCredentials } from "@/lib/veo/credentials";

try {
  validateConfig();
  ensureVertexCredentials();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[config] Startup validation failed:", msg);
  process.exit(1);
}

import {
  removeLegacyCleanupJobs,
  startVideoWorker,
  deleteStaleJobs,
  getActiveJobIds,
  getVideoQueueName,
} from "@/lib/queue/videoQueue";
import { cleanupExpiredTempDirs } from "@/lib/storage/cleanup";
import { startWorkerHeartbeat, stopWorkerHeartbeat } from "@/lib/queue/heartbeat";
import { getMaintenanceIntervalMs, startMaintenanceLoop, stopMaintenanceLoop } from "@/lib/queue/maintenance";

const worker = startVideoWorker();
startWorkerHeartbeat();

const expiredHours = process.env.CLEANUP_EXPIRED_HOURS ? Number(process.env.CLEANUP_EXPIRED_HOURS) : 0;
if (expiredHours > 0) {
  const runExpired = () => {
    cleanupExpiredTempDirs({ olderThanHours: expiredHours, skipJobIds: getActiveJobIds() }).then((r) => {
      if (r.deleted > 0 || r.errors > 0) {
        console.log("[worker] cleanupExpiredTempDirs deleted=" + r.deleted + " errors=" + r.errors);
      }
    });
  };
  runExpired();
  const intervalMs = 60 * 60 * 1000;
  setInterval(runExpired, intervalMs);
  console.log("[worker] cleanupExpiredTempDirs scheduled every 60min (olderThanHours=" + expiredHours + ")");
}

removeLegacyCleanupJobs()
  .then((removed) => {
    if (removed > 0) console.log("[worker] Removed " + removed + " legacy cleanup job(s) from the video queue");
  })
  .catch((err) => console.error("[worker] Could not remove legacy cleanup jobs:", err));

startMaintenanceLoop();
console.log(
  "[worker] Maintenance (cleanup + video_jobs reconciliation) scheduled every " +
  Math.round(getMaintenanceIntervalMs() / 60_000) + "min"
);

const retentionDays = process.env.JOB_RETENTION_DAYS != null ? Number(process.env.JOB_RETENTION_DAYS) : 0;
if (retentionDays > 0) {
  const runStaleJobs = () => {
    deleteStaleJobs({ retentionDays })
      .then((count) => {
        if (count > 0) console.log("[worker] Deleted " + count + " stale jobs");
      })
      .catch((err) => console.error("[worker] deleteStaleJobs error:", err));
  };
  setImmediate(runStaleJobs);
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(runStaleJobs, intervalMs);
  console.log("[worker] Stale job cleanup scheduled every 24h (retentionDays=" + retentionDays + ")");
}

console.log("[worker] Video generation worker started. Queue: " + getVideoQueueName());

process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received, closing worker…");
  stopMaintenanceLoop();
  await stopWorkerHeartbeat();
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[worker] SIGINT received, closing worker…");
  stopMaintenanceLoop();
  await stopWorkerHeartbeat();
  await worker.close();
  process.exit(0);
});
