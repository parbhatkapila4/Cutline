import Redis from "ioredis";
import { createManagedRedis, FAIL_FAST_REDIS_OPTIONS } from "@/lib/redis/managedRedis";

export const CANCELLED_JOBS_KEY = "cutline:job:cancelled";
let cancelRedis: Redis | null = null;

function getRedisConnection(): Redis {
  if (cancelRedis) return cancelRedis;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  cancelRedis = createManagedRedis(url, FAIL_FAST_REDIS_OPTIONS);
  return cancelRedis;
}

export async function isJobCancelled(jobId: string): Promise<boolean> {
  if (!jobId || typeof jobId !== "string") return false;
  try {
    const redis = getRedisConnection();
    const exists = await redis.sismember(CANCELLED_JOBS_KEY, jobId);
    return exists === 1;
  } catch {
    return false;
  }
}
