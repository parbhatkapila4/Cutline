import Redis from "ioredis";
import type { RedisOptions } from "ioredis";

/**
 * ioredis emits an "error" event on transient disconnects (e.g. ECONNRESET when a
 * managed Redis TLS connection idles out). Without a listener, Node treats that
 * as an unhandled exception and Next.js logs it repeatedly. The client reconnects
 * on its own; we only attach a handler so those events are not "unhandled".
 */
export function createManagedRedis(
  connectionUrl: string,
  options?: RedisOptions
): Redis {
  const redis = new Redis(connectionUrl, options);
  redis.on("error", (err) => {
    if (process.env.REDIS_DEBUG === "true") {
      console.warn("[redis]", err.message);
    }
  });
  return redis;
}
