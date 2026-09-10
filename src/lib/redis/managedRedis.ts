import Redis from "ioredis";
import type { RedisOptions } from "ioredis";

export const FAIL_FAST_REDIS_OPTIONS: RedisOptions = {
  enableOfflineQueue: true,
  maxRetriesPerRequest: 2,
  connectTimeout: 2000,
  commandTimeout: 2000,
};

export function createManagedRedis(
  connectionUrl: string,
  options?: RedisOptions
): Redis {
  const redis = options ? new Redis(connectionUrl, options) : new Redis(connectionUrl);
  redis.on("error", (err) => {
    console.warn("[redis]", err.message);
  });
  return redis;
}
