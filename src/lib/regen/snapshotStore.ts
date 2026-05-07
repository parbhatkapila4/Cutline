import Redis from "ioredis";
import { createManagedRedis } from "@/lib/redis/managedRedis";
import type { RegenSnapshotV1 } from "@/lib/types/pipelineEnhancements";

const PREFIX = "cutline:regen:";
const TTL_SECONDS = 604800;

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisClient = createManagedRedis(url, { maxRetriesPerRequest: null });
  }
  return redisClient;
}

export async function saveRegenSnapshot(
  jobId: string,
  snapshot: RegenSnapshotV1
): Promise<void> {
  const key = PREFIX + jobId;
  const value = JSON.stringify(snapshot);
  try {
    const redis = getRedis();
    await redis.setex(key, TTL_SECONDS, value);
  } catch (e) {
    console.warn(
      "[regen] saveRegenSnapshot failed jobId=" + jobId,
      e instanceof Error ? e.message : String(e)
    );
  }
}

export async function deleteRegenSnapshot(jobId: string): Promise<void> {
  if (!jobId || typeof jobId !== "string") return;
  try {
    const redis = getRedis();
    await redis.del(PREFIX + jobId);
  } catch (e) {
    console.warn(
      "[regen] deleteRegenSnapshot failed jobId=" + jobId,
      e instanceof Error ? e.message : String(e)
    );
  }
}

export async function loadRegenSnapshot(
  jobId: string
): Promise<RegenSnapshotV1 | null> {
  try {
    const redis = getRedis();
    const value = await redis.get(PREFIX + jobId);
    if (!value) return null;
    const parsed = JSON.parse(value) as RegenSnapshotV1;
    if (parsed?.version !== 1 || !parsed.shotList || !parsed.script || !parsed.imageSpec) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
