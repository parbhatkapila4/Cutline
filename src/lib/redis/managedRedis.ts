import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
export function createManagedRedis(
  connectionUrl: string,
  options?: RedisOptions
): Redis {
  const redis = options ? new Redis(connectionUrl, options) : new Redis(connectionUrl);
  redis.on("error", (err) => {
    if (process.env.REDIS_DEBUG === "true") {
      console.warn("[redis]", err.message);
    }
  });
  return redis;
}
