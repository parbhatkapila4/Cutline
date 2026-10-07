import fs from "fs";
import path from "path";

import { isDatabaseConfigured } from "@/lib/db/client";
import { deleteVideoJobRelatedDbRows, findVideoJobForOwners } from "@/lib/jobs/videoJobService";
import { deletePreviewArtifactsFromRedis } from "@/lib/preview/artifacts";
import { cancelJob, CLEANUP_JOB_NAME, getVideoQueue, type VideoJobData, type VideoJobResult } from "@/lib/queue/videoQueue";
import { deleteRegenSnapshot } from "@/lib/regen/snapshotStore";
import { cleanupJobArtifacts } from "@/lib/storage/cleanup";
import { deletePublishedBlob } from "@/lib/storage/publish";

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
  | { ok: false; status: 401 | 404 | 409 | 500; error: string };

export async function purgeUserVideo(
  videoId: string,
  ownerCandidates: string[]
): Promise<PurgeUserVideoResult> {
  if (ownerCandidates.length === 0) {
    return {
      ok: false,
      status: 401,
      error: "We couldn’t confirm you’re signed in. Sign in again to delete this video.",
    };
  }

  const row = isDatabaseConfigured() ? await findVideoJobForOwners(videoId, ownerCandidates) : null;
  const jobId = row?.queue_job_id ?? videoId;

  const queue = getVideoQueue();
  const job = await queue.getJob(jobId);
  if (job) {
    const data = job.data as VideoJobData | undefined;
    const clientId = data?.clientId;
    if (
      job.name === CLEANUP_JOB_NAME ||
      clientId === undefined ||
      clientId === null ||
      !ownerCandidates.includes(String(clientId))
    ) {
      return { ok: false, status: 404, error: "Video not found." };
    }
  }
  if (!row && !job) {
    return { ok: false, status: 404, error: "Video not found." };
  }

  const result = job?.returnvalue as VideoJobResult | undefined;

  try {
    await job?.remove();
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

  try {
    await deleteVideoJobRelatedDbRows(jobId, ownerCandidates);
  } catch (e) {
    console.error(
      "[purgeUserVideo] video_jobs delete failed jobId=" + jobId,
      e instanceof Error ? e.message : String(e)
    );
    return { ok: false, status: 500, error: "Could not remove this video. Please try again." };
  }

  await deleteRegenSnapshot(jobId);
  await deletePreviewArtifactsFromRedis(jobId);
  cleanupJobArtifacts(jobId);
  deleteMp4OutputsForJob(jobId);
  const blobUrls = new Set(
    [
      row?.final_url,
      row?.preview_url,
      result?.videoPath,
      ...(result?.variations ?? []).map((v) => v?.videoUrl),
    ].filter((url): url is string => typeof url === "string" && url !== "")
  );
  for (const url of blobUrls) {
    await deletePublishedBlob(url);
  }

  return { ok: true };
}
