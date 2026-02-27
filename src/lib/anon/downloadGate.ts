/**
 * Download gating: block anon-owned jobs, require auth.
 * After authentication, owner_type becomes "user" so download is allowed.
 */

import type { DownloadGateResult } from "@/lib/db/types";
import { getVideoJobById } from "@/lib/jobs/videoJobService";

/**
 * Check if download is allowed for this job.
 * - If job not found: caller should return 404.
 * - If owner_type === "anon": return allowed: false, reason: auth_required.
 * - If owner_type === "user": return allowed: true (caller must still verify request user matches owner_id).
 */
export async function checkDownloadAllowed(jobId: string): Promise<
  | { allowed: true; jobId: string }
  | { allowed: false; reason: "auth_required" }
  | { allowed: false; reason: "not_found" }
> {
  const job = await getVideoJobById(jobId);
  if (!job) return { allowed: false, reason: "not_found" };
  if (job.owner_type === "anon") {
    return { allowed: false, reason: "auth_required" };
  }
  return { allowed: true, job_id: jobId };
}
