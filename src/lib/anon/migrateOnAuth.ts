import { getAnonSessionIdFromRequest } from "./cookie";
import { migrateAnonJobsToUser } from "@/lib/jobs/videoJobService";

export type MigrateOnAuthResult = {
  didMigrate: boolean;
  anonSessionId: string | null;
  migratedCount: number;
};

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
