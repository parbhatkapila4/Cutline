import fs from "fs";
import path from "path";

import { deleteVideoJobRelatedDbRows } from "@/lib/jobs/videoJobService";
import { deletePreviewArtifactsFromRedis } from "@/lib/preview/artifacts";
import { cancelJob, CLEANUP_JOB_NAME, getVideoQueue, type VideoJobData } from "@/lib/queue/videoQueue";
import { deleteRegenSnapshot } from "@/lib/regen/snapshotStore";
import { cleanupJobArtifacts } from "@/lib/storage/cleanup";

function deleteMp4OutputsForJob(jobId: string): void {
  if (!jobId || typeof jobId !== "string") return;
  const cwd = process.cwd();
  const tempDir = path.join(cwd, "public", "temp");
  try {
    if (!fs.existsSync(tempDir) || !fs.statSync(tempDir).isDirectory()) return;
    for (const name of fs.readdirSync(tempDir)) {
      if (!name.toLowerCase().endsWith(".mp4")) continue;
      const base = name.slice(0, -4);
      if (base === jobId || base.startsWith(`${jobId}-`)) {
        const full = path.join(tempDir, name);
        try {
          if (fs.statSync(full).isFile()) fs.unlinkSync(full);
        } catch {
        }
      }
    }
  } catch (e) {
    console.warn(
      "[purgeUserVideo] deleteMp4OutputsForJob:",
      e instanceof Error ? e.message : String(e)
    );
  }
}

export type PurgeUserVideoResult =
  | { ok: true }
  | { ok: false; status: 404 | 409 | 500; error: string };

export async function purgeUserVideo(
  jobId: string,
  ownerCandidates: string[]
): Promise<PurgeUserVideoResult> {
  const queue = getVideoQueue();
  const job = await queue.getJob(jobId);
  if (!job || job.name === CLEANUP_JOB_NAME) {
    return { ok: false, status: 404, error: "Video not found." };
  }
  const data = job.data as VideoJobData | undefined;
  const clientId = data?.clientId;
  if (clientId === undefined || clientId === null || !ownerCandidates.includes(String(clientId))) {
    return { ok: false, status: 404, error: "Video not found." };
  }

  try {
    await job.remove();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("locked")) {
      const cancelled = await cancelJob(jobId);
      if (cancelled.ok) {
        return {
          ok: false,
          status: 409,
          error:
            "This video is still processing. We’ve cancelled it. Wait a few seconds, then try deleting again.",
        };
      }
      return {
        ok: false,
        status: 409,
        error:
          "This video is still processing and could not be cancelled automatically. Try again in a moment.",
      };
    }
    console.error("[purgeUserVideo] job.remove failed jobId=" + jobId, msg);
    return { ok: false, status: 500, error: "Could not remove this video. Please try again." };
  }

  await deleteRegenSnapshot(jobId);
  await deletePreviewArtifactsFromRedis(jobId);
  cleanupJobArtifacts(jobId);
  deleteMp4OutputsForJob(jobId);
  await deleteVideoJobRelatedDbRows(jobId, String(clientId));

  return { ok: true };
}
