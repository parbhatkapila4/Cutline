import { CLEANUP_JOB_NAME, getVideoQueue, type VideoJobData } from "@/lib/queue/videoQueue";
import { resolveOwnerCandidates } from "@/lib/jobs/jobOwnership";
import { isDatabaseConfigured } from "@/lib/db";

export type JobAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 404 | 500; body: { error: string; code?: string } };

async function ownsJob(jobId: string, candidates: string[]): Promise<boolean> {
  if (isDatabaseConfigured()) {
    const { findVideoJobForOwners } = await import("@/lib/jobs/videoJobService");
    return (await findVideoJobForOwners(jobId, candidates)) != null;
  }
  const job = await getVideoQueue().getJob(jobId);
  if (!job || job.name === CLEANUP_JOB_NAME) return false;
  const clientId = (job.data as VideoJobData | undefined)?.clientId;
  return clientId != null && candidates.includes(String(clientId));
}

export async function authorizeJobOwner(
  request: Request,
  jobId: string
): Promise<JobAccessResult> {
  const candidates = await resolveOwnerCandidates(request);
  const userId = candidates[0];
  if (!userId) {
    return {
      ok: false,
      status: 401,
      body: { error: "Sign in required.", code: "AUTH_REQUIRED" },
    };
  }
  try {
    if (!(await ownsJob(jobId, candidates))) {
      return { ok: false, status: 404, body: { error: "Job not found" } };
    }
  } catch {
    return { ok: false, status: 500, body: { error: "Failed to verify job ownership" } };
  }
  return { ok: true, userId };
}
