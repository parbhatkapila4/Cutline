/**
 * Auth upgrade: when user authenticates, migrate all anon session jobs to the user.
 * Idempotent — safe to call on every login if anon_session_id cookie is present.
 */

import { getAnonSessionIdFromRequest } from "./cookie";
import { migrateAnonJobsToUser } from "@/lib/jobs/videoJobService";

export type MigrateOnAuthResult = {
  didMigrate: boolean;
  anonSessionId: string | null;
  migratedCount: number;
};

/**
 * If request has anon_session_id cookie, migrate all video_jobs for that session
 * to the given user (owner_type = 'user', owner_id = userId).
 * Returns whether migration ran and how many jobs were updated.
 * Call this after successful authentication (e.g. in auth callback or session creation).
 */
export async function migrateAnonToUserOnAuth(
  request: Request,
  userId: string
): Promise<MigrateOnAuthResult> {
  const anonSessionId = getAnonSessionIdFromRequest(request);
  if (!anonSessionId) {
    return { didMigrate: false, anonSessionId: null, migratedCount: 0 };
  }
  const { migrated } = await migrateAnonJobsToUser(anonSessionId, userId);
  return {
    didMigrate: migrated > 0,
    anonSessionId,
    migratedCount: migrated,
  };
}
