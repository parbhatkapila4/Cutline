import Redis from "ioredis";

export const CANCELLED_JOBS_KEY = "cutline:job:cancelled";

function getRedisConnection(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Redis(url, { maxRetriesPerRequest: null });
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
