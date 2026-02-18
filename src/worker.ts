import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { validateConfig } from "@/lib/config/validate";

try {
  validateConfig();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[config] Startup validation failed:", msg);
  process.exit(1);
}

import { scheduleCleanupJob, startVideoWorker, deleteStaleJobs } from "@/lib/queue/videoQueue";
import { cleanupExpiredTempDirs } from "@/lib/storage/cleanup";

const worker = startVideoWorker();

const expiredHours = process.env.CLEANUP_EXPIRED_HOURS ? Number(process.env.CLEANUP_EXPIRED_HOURS) : 0;
if (expiredHours > 0) {
  const tempRoot = process.env.TEMP_DIR || undefined;
  const runExpired = () => {
    cleanupExpiredTempDirs({ olderThanHours: expiredHours, tempRoot }).then((r) => {
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

scheduleCleanupJob()
  .then(() => console.log("[worker] Cleanup job scheduled (every CLEANUP_INTERVAL_HOURS)"))
  .catch((err) => console.error("[worker] Failed to schedule cleanup job:", err));

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

console.log("[worker] Video generation worker started. Queue: video-generation");

process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received, closing worker…");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[worker] SIGINT received, closing worker…");
  await worker.close();
  process.exit(0);
});
