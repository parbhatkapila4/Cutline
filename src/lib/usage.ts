import Redis from "ioredis";
import { createManagedRedis } from "@/lib/redis/managedRedis";

const KEY_PREFIX = "cutline:usage:";
const TOKENS_PREFIX = "cutline:user:";

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw.trim() === "") return fallback;
  const n = parseInt(raw.trim(), 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

export const DEFAULT_TOKENS = parseIntEnv("DEFAULT_TOKENS", 10);
export const TOKENS_PER_VIDEO = parseIntEnv("TOKENS_PER_VIDEO", 10);

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redis = createManagedRedis(url, { maxRetriesPerRequest: null });
  }
  return redis;
}

function monthKey(identifier: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${KEY_PREFIX}${identifier}:${y}-${m}`;
}

export const FREE_PLAN_VIDEOS_PER_MONTH = parseIntEnv("FREE_PLAN_VIDEOS_PER_MONTH", 1);
export const FREE_PLAN_API_CALLS_PER_MONTH = parseIntEnv("FREE_PLAN_API_CALLS_PER_MONTH", 1);

export async function getTokens(identifier: string): Promise<number> {
  const key = `${TOKENS_PREFIX}${identifier}:tokens`;
  const r = getRedis();
  const raw = await r.get(key);
  if (raw === null) {
    await r.set(key, String(DEFAULT_TOKENS));
    return DEFAULT_TOKENS;
  }
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? DEFAULT_TOKENS : Math.max(0, n);
}

export async function decrementTokens(identifier: string, amount: number): Promise<number> {
  const key = `${TOKENS_PREFIX}${identifier}:tokens`;
  const r = getRedis();
  const exists = await r.exists(key);
  if (!exists) {
    await r.set(key, String(DEFAULT_TOKENS));
  }
  const next = await r.incrby(key, -amount);
  if (next < 0) {
    await r.set(key, "0");
    return 0;
  }
  return next;
}

export async function getApiCallsThisMonth(identifier: string): Promise<number> {
  const key = monthKey(identifier);
  const raw = await getRedis().get(key);
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export async function incrementApiCallsThisMonth(identifier: string): Promise<number> {
  const key = monthKey(identifier);
  const next = await getRedis().incr(key);
  return next;
}

export async function getVideosCompletedThisMonth(identifier: string): Promise<number> {
  const key = `${monthKey(identifier)}:videos`;
  const raw = await getRedis().get(key);
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export async function incrementVideosCompletedThisMonth(identifier: string): Promise<number> {
  const key = `${monthKey(identifier)}:videos`;
  const next = await getRedis().incr(key);
  return next;
}

export function getResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
