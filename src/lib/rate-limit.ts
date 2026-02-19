
import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";

export type RateLimitType = "generate" | "upload" | "status" | "general";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

const DEFAULT_GENERATE_PER_HOUR = 5;
const DEFAULT_UPLOAD_PER_HOUR = 20;
const DEFAULT_STATUS_PER_MINUTE = 60;
const DEFAULT_GENERAL_PER_MINUTE = 100;
const KEY_PREFIX = "cutline:rl:";

let redisClient: Redis | null = null;
const limiters: Partial<Record<RateLimitType, RateLimiterRedis>> = {};

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisClient = new Redis(url, { maxRetriesPerRequest: null });
  }
  return redisClient;
}

function isRateLimitEnabled(): boolean {
  const v = process.env.RATE_LIMIT_ENABLED;
  return v === undefined || v === "" || v.toLowerCase() === "true";
}

function getLimiter(type: RateLimitType): RateLimiterRedis {
  if (limiters[type]) return limiters[type]!;
  const redis = getRedis();
  const config = getConfig(type);
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `${KEY_PREFIX}${type}`,
    points: config.points,
    duration: config.durationSeconds,
  });
  limiters[type] = limiter;
  return limiter;
}

function getConfig(type: RateLimitType): { points: number; durationSeconds: number } {
  switch (type) {
    case "generate": {
      const max = Number(process.env.RATE_LIMIT_MAX) || Number(process.env.RATE_LIMIT_GENERATE) || DEFAULT_GENERATE_PER_HOUR;
      const window = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 3600;
      return { points: max, durationSeconds: window };
    }
    case "upload": {
      const n = Number(process.env.RATE_LIMIT_UPLOAD) || DEFAULT_UPLOAD_PER_HOUR;
      return { points: n, durationSeconds: 3600 };
    }
    case "status": {
      const n = Number(process.env.RATE_LIMIT_STATUS) || DEFAULT_STATUS_PER_MINUTE;
      return { points: n, durationSeconds: 60 };
    }
    case "general": {
      const n = Number(process.env.RATE_LIMIT_GENERAL) || DEFAULT_GENERAL_PER_MINUTE;
      return { points: n, durationSeconds: 60 };
    }
    default:
      return { points: DEFAULT_GENERAL_PER_MINUTE, durationSeconds: 60 };
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  if (!isRateLimitEnabled()) {
    return { allowed: true };
  }
  const limiter = getLimiter(type);
  const key = identifier;
  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch (rejected: unknown) {
    const res = rejected as { msBeforeNext?: number };
    const ms = typeof res?.msBeforeNext === "number" ? res.msBeforeNext : 60_000;
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(ms / 1000)),
    };
  }
}
