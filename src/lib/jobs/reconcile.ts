import type { Job, Queue } from "bullmq";
import type { VideoJobData, VideoJobResult } from "@/lib/queue/videoQueue";
import {
  listOpenVideoJobs,
  markVideoJobCompleted,
  markVideoJobFailed,
  markVideoJobProcessing,
} from "@/lib/jobs/videoJobService";

export const OPEN_JOB_GRACE_MINUTES = 10;
const RECONCILE_BATCH_LIMIT = 500;

export type ReconcileQueue = {
  name: string;
  queue: Pick<Queue<VideoJobData, VideoJobResult>, "getJob">;
};

export type ReconcileSummary = {
  checked: number;
  completed: number;
  failed: number;
  started: number;
  recovered: number;
  lost: number;
  live: number;
  unresolved: number;
  errors: number;
};

export async function reconcileOpenVideoJobs(options: {
  queues: ReconcileQueue[];
  olderThanMinutes?: number;
  failUnscopedMissing?: boolean;
  findPublishedVideo?: (queueJobId: string) => Promise<VideoJobResult | null>;
  apply?: boolean;
  limit?: number;
}): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    checked: 0,
    completed: 0,
    failed: 0,
    started: 0,
    recovered: 0,
    lost: 0,
    live: 0,
    unresolved: 0,
    errors: 0,
  };
  const apply = options.apply !== false;
  const rows = await listOpenVideoJobs({
    olderThanMinutes: options.olderThanMinutes ?? OPEN_JOB_GRACE_MINUTES,
    queueNames: options.queues.map((q) => q.name),
    limit: options.limit ?? RECONCILE_BATCH_LIMIT,
  });

  for (const row of rows) {
    summary.checked += 1;
    const queueJobId = row.queue_job_id;
    if (!queueJobId) {
      summary.unresolved += 1;
      continue;
    }
    try {
      const candidates = row.queue_name
        ? options.queues.filter((q) => q.name === row.queue_name)
        : options.queues;
      let job: Job<VideoJobData, VideoJobResult> | undefined;
      for (const candidate of candidates) {
        job = await candidate.queue.getJob(queueJobId);
        if (job) break;
      }

      if (!job) {
        if (!row.queue_name && !options.failUnscopedMissing) {
          summary.unresolved += 1;
          continue;
        }
        const published = options.findPublishedVideo
          ? await options.findPublishedVideo(queueJobId)
          : null;
        if (published) {
          if (apply) {
            await markVideoJobCompleted(queueJobId, { finalUrl: published.videoPath, result: published });
          }
          summary.recovered += 1;
        } else {
          if (apply) await markVideoJobFailed(queueJobId, null);
          summary.lost += 1;
        }
        continue;
      }

      const state = await job.getState();
      if (state === "completed") {
        const result = (job.returnvalue ?? null) as VideoJobResult | null;
        const finalUrl = result?.videoPath || result?.variations?.[0]?.videoUrl || null;
        if (apply) await markVideoJobCompleted(queueJobId, { finalUrl, result });
        summary.completed += 1;
      } else if (state === "failed") {
        if (apply) await markVideoJobFailed(queueJobId, job.failedReason || null);
        summary.failed += 1;
      } else if (state === "active" && row.status === "queued") {
        if (apply) await markVideoJobProcessing(queueJobId);
        summary.started += 1;
      } else {
        summary.live += 1;
      }
    } catch (e) {
      summary.errors += 1;
      console.error(
        "[reconcile] jobId=" + queueJobId + " could not be settled: " +
        (e instanceof Error ? e.message : String(e))
      );
    }
  }
  return summary;
}
