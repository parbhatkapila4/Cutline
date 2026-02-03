import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { scheduleCleanupJob, startVideoWorker } from "@/lib/queue/videoQueue";

const worker = startVideoWorker();

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
