import Redis from "ioredis";
import { createManagedRedis, FAIL_FAST_REDIS_OPTIONS } from "@/lib/redis/managedRedis";

export const CANCELLED_JOBS_KEY = "cutline:job:cancelled";
const CANCEL_POLL_INTERVAL_MS = 3_000;
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

export async function withCancellationWatch<T>(
  jobId: string,
  run: (signal: AbortSignal) => Promise<T>,
  options: { intervalMs?: number; isCancelled?: (jobId: string) => Promise<boolean> } = {}
): Promise<T> {
  const controller = new AbortController();
  const isCancelled = options.isCancelled ?? isJobCancelled;
  const intervalMs = options.intervalMs ?? CANCEL_POLL_INTERVAL_MS;
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    let cancelled = false;
    try {
      cancelled = await isCancelled(jobId);
    } catch {
    }
    if (done) return;
    if (cancelled) {
      controller.abort();
      return;
    }
    timer = setTimeout(poll, intervalMs);
  };
  timer = setTimeout(poll, intervalMs);
  try {
    return await run(controller.signal);
  } finally {
    done = true;
    clearTimeout(timer);
  }
}
