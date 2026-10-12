import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { Queue } from "bullmq";
import { isDatabaseConfigured } from "@/lib/db/client";
import { OPEN_JOB_GRACE_MINUTES, reconcileOpenVideoJobs } from "@/lib/jobs/reconcile";
import { getVideoQueueName } from "@/lib/queue/queueName";
import { createManagedRedis } from "@/lib/redis/managedRedis";
import { findPublishedVideoForJob, isBlobConfigured } from "@/lib/storage/publish";
import type { VideoJobData, VideoJobResult } from "@/lib/queue/videoQueue";

const USAGE = `
Settles video_jobs rows stuck in queued/processing.

  npx tsx scripts/reconcile-video-jobs.ts --queue <name> [--queue <name> ...] [--older-than-minutes N] [--apply] [--skip-blob-check]

Pass every queue that writes to this database (production and dev share one
video_jobs table). A row whose job is found in one of them takes that job's
outcome. A row whose job is in none of them is marked completed if its video
is in Blob storage (videos/<jobId>...), and failed if not. Without --apply
nothing is written; the summary shows what would change. --apply refuses to
run without BLOB_READ_WRITE_TOKEN unless --skip-blob-check is passed.
`;

function parseArgs(argv: string[]): {
  queues: string[];
  apply: boolean;
  skipBlobCheck: boolean;
  olderThanMinutes: number;
} {
  const queues: string[] = [];
  let apply = false;
  let skipBlobCheck = false;
  let olderThanMinutes = OPEN_JOB_GRACE_MINUTES;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--skip-blob-check") skipBlobCheck = true;
    else if (arg === "--queue") {
      const name = argv[++i];
      if (name) queues.push(name);
    } else if (arg === "--older-than-minutes") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 0) olderThanMinutes = n;
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    }
  }
  if (queues.length === 0) queues.push(getVideoQueueName());
  return { queues, apply, skipBlobCheck, olderThanMinutes };
}

async function main(): Promise<void> {
  const { queues, apply, skipBlobCheck, olderThanMinutes } = parseArgs(process.argv.slice(2));
  if (!isDatabaseConfigured()) {
    console.error("\nDATABASE_URL is not set. Nothing to reconcile.\n");
    process.exit(1);
  }
  if (apply && !isBlobConfigured() && !skipBlobCheck) {
    console.error(
      "\nBLOB_READ_WRITE_TOKEN is not set, so a row whose job is gone cannot be checked for a published video.\n" +
      "Set it, or pass --skip-blob-check to mark those rows failed without checking.\n"
    );
    process.exit(1);
  }
  const connection = createManagedRedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  const opened = queues.map((name) => ({
    name,
    queue: new Queue<VideoJobData, VideoJobResult>(name, { connection }),
  }));
  try {
    const summary = await reconcileOpenVideoJobs({
      queues: opened,
      olderThanMinutes,
      failUnscopedMissing: true,
      findPublishedVideo: findPublishedVideoForJob,
      apply,
      limit: 5000,
    });
    console.log("\nQueues checked: " + queues.join(", "));
    console.log("Blob lookup for missing jobs: " + (isBlobConfigured() ? "on" : "off"));
    console.log(apply ? "Applied." : "Dry run: no rows were changed. Re-run with --apply to write.");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await Promise.all(opened.map((q) => q.queue.close()));
    await connection.quit();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
