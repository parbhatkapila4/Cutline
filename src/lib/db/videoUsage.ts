import { randomUUID } from "crypto";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";
import { findVideoJobForOwners } from "@/lib/jobs/videoJobService";
import {
  isVideoUsageEventType,
  isVideoUsageSurface,
  type VideoUsageEventType,
  type VideoUsageSurface,
} from "@/lib/dashboard/videoUsageEvents";

export type RecordVideoUsageInput = {
  jobId: string;
  userId: string;
  eventType: VideoUsageEventType;
  surface?: VideoUsageSurface | null;
};

export type RecordVideoUsageOutcome = "recorded" | "not_found" | "failed";
export async function recordVideoUsage(input: RecordVideoUsageInput): Promise<RecordVideoUsageOutcome> {
  try {
    const { jobId, userId, eventType } = input;
    const surface = input.surface ?? null;
    if (!isVideoUsageEventType(eventType) || (surface !== null && !isVideoUsageSurface(surface))) {
      console.warn("[video-usage] refused an event with an unknown type or surface");
      return "failed";
    }
    if (!jobId || !userId) return "not_found";
    if (!isDatabaseConfigured()) return "failed";

    const job = await findVideoJobForOwners(jobId, [userId]);
    if (!job) return "not_found";

    const sql = getSql();
    await sql`
      INSERT INTO video_usage_events (id, job_id, user_id, event_type, surface)
      VALUES (${randomUUID()}, ${job.queue_job_id ?? job.id}, ${userId}, ${eventType}, ${surface})
    `;
    return "recorded";
  } catch (e) {
    console.warn(
      "[video-usage] could not record event (ignored):",
      e instanceof Error ? e.message : String(e)
    );
    return "failed";
  }
}
