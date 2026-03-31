import { createManagedRedis } from "@/lib/redis/managedRedis";

const PING_TIMEOUT_MS = 2000;

export type ReadinessResult = {
  ok: boolean;
  checks: Record<string, string>;
};

export function runReadinessChecks(): ReadinessResult {
  const checks: Record<string, string> = {};
  const requiredEnv = ["OPENROUTER_API_KEY", "REDIS_URL"];
  const missing = requiredEnv.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    checks.env = `missing: ${missing.join(", ")}`;
    return { ok: false, checks };
  }
  return { ok: true, checks };
}

export async function pingRedis(): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = createManagedRedis(url, { maxRetriesPerRequest: 0 });
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), PING_TIMEOUT_MS)
      ),
    ]);
    await redis.quit();
    return { ok: result === "PONG" };
  } catch (e) {
    try {
      await redis.quit();
    } catch {
    }
    return { ok: false, error: e instanceof Error ? e.message : "unreachable" };
  }
}

export async function getReadiness(): Promise<ReadinessResult> {
  const { ok: envOk, checks } = runReadinessChecks();
  if (!envOk) return { ok: false, checks };

  const redisResult = await pingRedis();
  if (!redisResult.ok) {
    return {
      ok: false,
      checks: { ...checks, redis: redisResult.error ?? "unreachable" },
    };
  }
  return { ok: true, checks };
}
