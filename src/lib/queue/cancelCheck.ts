import Redis from "ioredis";
import { createManagedRedis } from "@/lib/redis/managedRedis";

export const CANCELLED_JOBS_KEY = "cutline:job:cancelled";

function getRedisConnection(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return createManagedRedis(url, { maxRetriesPerRequest: null });
}

export async function isJobCancelled(jobId: string): Promise<boolean> {
  if (!jobId || typeof jobId !== "string") return false;
  try {
    const redis = getRedisConnection();
    const exists = await redis.sismember(CANCELLED_JOBS_KEY, jobId);
    await redis.quit();
    return exists === 1;
  } catch {
    return false;
  }
}
