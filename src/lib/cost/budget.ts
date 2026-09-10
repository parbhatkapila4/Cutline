import Redis from "ioredis";
import { createManagedRedis, FAIL_FAST_REDIS_OPTIONS } from "@/lib/redis/managedRedis";
import { PLAN_CONFIGS, type PlanId } from "@/lib/plans";

const SPEND_PREFIX = "cutline:spend:";
const CINEMATIC_PREFIX = "cutline:cine:";
const TOPUP_PREFIX = "cutline:cinetopup:";
const RELEASE_GUARD_PREFIX = "cutline:cinerelease:";
const RELEASE_GUARD_TTL_SECONDS = 14 * 24 * 60 * 60;
const MONTH_KEY_TTL_SECONDS = 70 * 24 * 60 * 60;
const MICROS_PER_USD = 1_000_000;

function numEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : fallback;
}

export const PLAN_PRICE_USD: Record<PlanId, number> = {
  free: 0,
  beginner: numEnv("PLAN_PRICE_BEGINNER_USD", 29),
  professional: numEnv("PLAN_PRICE_PROFESSIONAL_USD", 59),
  enterprise: numEnv("PLAN_PRICE_ENTERPRISE_USD", 299),
};

export function targetGrossMargin(): number {
  const m = numEnv("TARGET_GROSS_MARGIN", 0.5);
  return Math.min(0.95, Math.max(0, m));
}

export function freeTrialBudgetUsd(): number {
  return numEnv("FREE_PLAN_BUDGET_USD", 0.6);
}

export function monthlyBudgetUsd(plan: PlanId): number {
  if (plan === "free") return freeTrialBudgetUsd();
  const price = PLAN_PRICE_USD[plan] ?? 0;
  return Math.max(0, price * (1 - targetGrossMargin()));
}

export function cinematicSecondsPerMonth(plan: PlanId): number {
  const fallback: Record<PlanId, number> = {
    free: 0,
    beginner: 0,
    professional: 90,
    enterprise: 400,
  };
  return Math.max(0, Math.floor(numEnv(`CINEMATIC_SECONDS_${plan.toUpperCase()}`, fallback[plan])));
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

function spendKey(identifier: string): string {
  return `${SPEND_PREFIX}${identifier}:${monthStamp()}`;
}

function cinematicKey(identifier: string): string {
  return `${CINEMATIC_PREFIX}${identifier}:${monthStamp()}`;
}

function topupKey(identifier: string): string {
  return `${TOPUP_PREFIX}${identifier}`;
}


export function resetsAt(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

async function readCounter(key: string): Promise<number> {
  try {
    const raw = await getRedis().get(key);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  } catch (e) {
    console.error(
      `[budget] could not read ${key}; treating as 0 spent. error=${e instanceof Error ? e.message : String(e)}`
    );
    return 0;
  }
}

export async function getSpendUsd(identifier: string): Promise<number> {
  return (await readCounter(spendKey(identifier))) / MICROS_PER_USD;
}

export async function getCinematicSecondsUsed(identifier: string): Promise<number> {
  return readCounter(cinematicKey(identifier));
}

export async function recordSpendUsd(identifier: string, usd: number): Promise<number> {
  if (!Number.isFinite(usd) || usd <= 0) return getSpendUsd(identifier);
  const key = spendKey(identifier);
  const micros = Math.round(usd * MICROS_PER_USD);
  const next = await getRedis().incrby(key, micros);
  if (next === micros) await getRedis().expire(key, MONTH_KEY_TTL_SECONDS);
  return next / MICROS_PER_USD;
}

export async function adjustSpendUsd(identifier: string, deltaUsd: number): Promise<number> {
  if (!Number.isFinite(deltaUsd) || deltaUsd === 0) return getSpendUsd(identifier);
  const key = spendKey(identifier);
  const micros = Math.round(deltaUsd * MICROS_PER_USD);
  const next = await getRedis().incrby(key, micros);
  if (next < 0) {
    await getRedis().set(key, "0", "KEEPTTL");
    return 0;
  }
  if (next === micros) await getRedis().expire(key, MONTH_KEY_TTL_SECONDS);
  return next / MICROS_PER_USD;
}
export async function reserveSpendUsd(
  identifier: string,
  budgetUsd: number,
  usd: number
): Promise<{ ok: boolean; spentUsd: number }> {
  if (!Number.isFinite(usd) || usd <= 0) {
    return { ok: true, spentUsd: await getSpendUsd(identifier) };
  }
  const key = spendKey(identifier);
  const micros = Math.round(usd * MICROS_PER_USD);
  let next: number;
  try {
    next = await getRedis().incrby(key, micros);
    if (next === micros) await getRedis().expire(key, MONTH_KEY_TTL_SECONDS);
  } catch (e) {
    console.error(
      `[budget] FAIL-OPEN: spend ceiling unavailable for ${identifier}; admitting this render unmetered. ` +
      `error=${e instanceof Error ? e.message : String(e)}`
    );
    return { ok: true, spentUsd: 0 };
  }
  if (next / MICROS_PER_USD > budgetUsd) {
    try {
      await getRedis().incrby(key, -micros);
    } catch {
    }
    return { ok: false, spentUsd: (next - micros) / MICROS_PER_USD };
  }
  return { ok: true, spentUsd: next / MICROS_PER_USD };
}
export async function getTopupSecondsRemaining(identifier: string): Promise<number> {
  return readCounter(topupKey(identifier));
}

export async function creditTopupSeconds(
  identifier: string,
  seconds: number
): Promise<number> {
  if (!Number.isFinite(seconds) || seconds <= 0) return getTopupSecondsRemaining(identifier);
  return getRedis().incrby(topupKey(identifier), Math.floor(seconds));
}
const TOPUP_APPLIED_TTL_SECONDS = 90 * 24 * 60 * 60;

export async function creditTopupSecondsOnce(
  identifier: string,
  seconds: number,
  eventKey: string
): Promise<number> {
  if (!Number.isFinite(seconds) || seconds <= 0) return getTopupSecondsRemaining(identifier);
  const script = `
    if redis.call('SET', KEYS[2], '1', 'NX', 'EX', ARGV[2]) then
      return redis.call('INCRBY', KEYS[1], ARGV[1])
    end
    local cur = redis.call('GET', KEYS[1])
    if cur then return tonumber(cur) end
    return 0
  `;
  const result = await getRedis().eval(
    script,
    2,
    topupKey(identifier),
    `${TOPUP_PREFIX}applied:${eventKey}`,
    String(Math.floor(seconds)),
    String(TOPUP_APPLIED_TTL_SECONDS)
  );
  return typeof result === "number" ? result : Number(result) || 0;
}

export async function debitTopupSeconds(
  identifier: string,
  seconds: number
): Promise<{ balance: number; shortfall: number }> {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { balance: await getTopupSecondsRemaining(identifier), shortfall: 0 };
  }
  const amount = Math.floor(seconds);
  const key = topupKey(identifier);
  const next = await getRedis().incrby(key, -amount);
  if (next < 0) {
    const restored = await getRedis().incrby(key, -next);
    return { balance: Math.max(0, restored), shortfall: -next };
  }
  return { balance: next, shortfall: 0 };
}

export async function reserveCinematicSeconds(
  identifier: string,
  allowedSeconds: number,
  seconds: number
): Promise<{ ok: boolean; usedSeconds: number; fromMonthly?: number; fromTopup?: number }> {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { ok: true, usedSeconds: await getCinematicSecondsUsed(identifier) };
  }
  const key = cinematicKey(identifier);
  const amount = Math.ceil(seconds);
  let next: number;
  try {
    next = await getRedis().incrby(key, amount);
    if (next === amount) await getRedis().expire(key, MONTH_KEY_TTL_SECONDS);
  } catch (e) {
    console.error(
      `[budget] FAIL-CLOSED: cinematic meter unavailable for ${identifier}; refusing the render. ` +
      `error=${e instanceof Error ? e.message : String(e)}`
    );
    return { ok: false, usedSeconds: 0 };
  }

  if (next <= allowedSeconds) {
    return { ok: true, usedSeconds: next, fromMonthly: amount, fromTopup: 0 };
  }

  const before = next - amount;
  const fromMonthly = Math.max(0, allowedSeconds - before);
  const shortfall = amount - fromMonthly;
  try {
    await getRedis().incrby(key, -(amount - fromMonthly));
  } catch {
  }

  let topupAfter: number;
  try {
    topupAfter = await getRedis().incrby(topupKey(identifier), -shortfall);
  } catch (e) {
    console.error(
      `[budget] FAIL-CLOSED: top-up meter unavailable for ${identifier}; refusing the render. ` +
      `error=${e instanceof Error ? e.message : String(e)}`
    );
    if (fromMonthly > 0) {
      try {
        await getRedis().incrby(key, -fromMonthly);
      } catch {
      }
    }
    return { ok: false, usedSeconds: before };
  }
  if (topupAfter < 0) {
    try {
      await getRedis().incrby(topupKey(identifier), shortfall);
      if (fromMonthly > 0) await getRedis().incrby(key, -fromMonthly);
    } catch {
    }
    return { ok: false, usedSeconds: before };
  }
  return { ok: true, usedSeconds: before + fromMonthly, fromMonthly, fromTopup: shortfall };
}

export async function releaseCinematicSecondsOnce(
  identifier: string,
  seconds: number,
  split: { fromMonthly?: number; fromTopup?: number },
  guardKey: string
): Promise<boolean> {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  let claimed: string | null;
  try {
    claimed = await getRedis().set(
      `${RELEASE_GUARD_PREFIX}${guardKey}`,
      "1",
      "EX",
      RELEASE_GUARD_TTL_SECONDS,
      "NX"
    );
  } catch (e) {
    console.error(
      `[budget] release guard unavailable for ${guardKey}; NOT releasing ${seconds}s. ` +
      `error=${e instanceof Error ? e.message : String(e)}`
    );
    return false;
  }
  if (claimed !== "OK") return false;
  await releaseCinematicSeconds(identifier, seconds, split);
  return true;
}
export async function releaseCinematicSeconds(
  identifier: string,
  seconds: number,
  split?: { fromMonthly?: number; fromTopup?: number }
): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const fromTopup = Math.max(0, Math.ceil(split?.fromTopup ?? 0));
  const fromMonthly = split
    ? Math.max(0, Math.ceil(split.fromMonthly ?? 0))
    : Math.ceil(seconds);
  try {
    if (fromMonthly > 0) {
      const key = cinematicKey(identifier);
      const next = await getRedis().incrby(key, -fromMonthly);
      if (next < 0) await getRedis().set(key, "0", "KEEPTTL");
    }
    if (fromTopup > 0) {
      await getRedis().incrby(topupKey(identifier), fromTopup);
    }
  } catch {
  }
}

export type BudgetState = {
  plan: PlanId;
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  fractionUsed: number;
  cinematicSecondsAllowed: number;
  cinematicSecondsUsed: number;
  cinematicSecondsRemaining: number;
  topupSecondsRemaining: number;
  totalSecondsRemaining: number;
};

export async function getBudgetState(
  identifier: string,
  plan: PlanId
): Promise<BudgetState> {
  const [spentUsd, cineUsed, topup] = await Promise.all([
    getSpendUsd(identifier),
    getCinematicSecondsUsed(identifier),
    getTopupSecondsRemaining(identifier),
  ]);
  const budgetUsd = monthlyBudgetUsd(plan);
  const cinematicSecondsAllowed = cinematicSecondsPerMonth(plan);
  const cinematicSecondsRemaining = Math.max(0, cinematicSecondsAllowed - cineUsed);
  return {
    plan,
    budgetUsd,
    spentUsd,
    remainingUsd: Math.max(0, budgetUsd - spentUsd),
    fractionUsed: budgetUsd > 0 ? Math.min(1, spentUsd / budgetUsd) : 1,
    cinematicSecondsAllowed,
    cinematicSecondsUsed: cineUsed,
    cinematicSecondsRemaining,
    topupSecondsRemaining: topup,
    totalSecondsRemaining: cinematicSecondsRemaining + topup,
  };
}

export type SpendDecision =
  | { outcome: "allow"; state: BudgetState }
  | { outcome: "downgrade"; state: BudgetState; toMode: "slideshow"; reason: string }
  | { outcome: "deny"; state: BudgetState; reason: string };


export function decideSpend(params: {
  state: BudgetState;
  estimateUsd: number;
  cinematicSeconds: number;
  fallbackEstimateUsd: number;
}): SpendDecision {
  const { state, estimateUsd, cinematicSeconds, fallbackEstimateUsd } = params;

  if (cinematicSeconds > 0) {
    const overCinematic = cinematicSeconds > state.totalSecondsRemaining;
    const overBudget = estimateUsd > state.remainingUsd;
    if (overCinematic || overBudget) {
      if (fallbackEstimateUsd <= state.remainingUsd) {
        return {
          outcome: "downgrade",
          state,
          toMode: "slideshow",
          reason: !overCinematic
            ? "This cinematic render would exceed this month's allowance, so it is rendering in standard mode."
            : state.cinematicSecondsAllowed === 0
              ? "Cinematic mode is available on paid plans. This one is rendering in standard mode."
              : "Cinematic seconds for this month are used up, so this one is rendering in standard mode.",
        };
      }
      return {
        outcome: "deny",
        state,
        reason: "You have used this month's generation allowance. It resets at the start of next month.",
      };
    }
    return { outcome: "allow", state };
  }

  if (estimateUsd > state.remainingUsd) {
    return {
      outcome: "deny",
      state,
      reason: "You have used this month's generation allowance. It resets at the start of next month.",
    };
  }
  return { outcome: "allow", state };
}
export function hasUnlimitedStandardVideos(plan: PlanId): boolean {
  return PLAN_CONFIGS[plan]?.videosPerMonth == null;
}
