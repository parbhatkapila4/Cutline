import type { DownloadGateResult } from "@/lib/db/types";
import { getVideoJobById } from "@/lib/jobs/videoJobService";

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
  return { allowed: true, jobId };
}
