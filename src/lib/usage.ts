import Redis from "ioredis";
import { createManagedRedis, FAIL_FAST_REDIS_OPTIONS } from "@/lib/redis/managedRedis";

const KEY_PREFIX = "cutline:usage:";

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw.trim() === "") return fallback;
  const n = parseInt(raw.trim(), 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redis = createManagedRedis(url, FAIL_FAST_REDIS_OPTIONS);
  }
  return redis;
}

function monthStamp(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthKey(identifier: string): string {
  return `${KEY_PREFIX}${identifier}:${monthStamp()}`;
}
const MONTH_KEY_TTL_SECONDS = 70 * 24 * 60 * 60;

async function expireIfNew(key: string, next: number): Promise<void> {
  if (next === 1) {
    await getRedis().expire(key, MONTH_KEY_TTL_SECONDS);
  }
}

export const FREE_PLAN_VIDEOS_PER_MONTH = parseIntEnv("FREE_PLAN_VIDEOS_PER_MONTH", 3);
export const FREE_PLAN_API_CALLS_PER_MONTH = parseIntEnv("FREE_PLAN_API_CALLS_PER_MONTH", 3);


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
  await expireIfNew(key, next);
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
  await expireIfNew(key, next);
  return next;
}

export function getResetDate(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
