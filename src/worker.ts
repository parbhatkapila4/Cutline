import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { scheduleCleanupJob, startVideoWorker } from "@/lib/queue/videoQueue";
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
