import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, number>();

const fakeRedis = {
  async get(key: string) {
    const v = store.get(key);
    return v === undefined ? null : String(v);
  },
  async incrby(key: string, by: number) {
    const next = (store.get(key) ?? 0) + by;
    store.set(key, next);
    return next;
  },
  async set(key: string, value: string, ...rest: unknown[]) {
    if (rest.includes("NX") && store.has(key)) return null;
    store.set(key, Number(value) || 1);
    return "OK";
  },
  async expire() {
    return 1;
  },
};

vi.mock("@/lib/redis/managedRedis", () => ({
  createManagedRedis: () => fakeRedis,
  FAIL_FAST_REDIS_OPTIONS: {},
}));

const {
  reserveCinematicSeconds,
  releaseCinematicSeconds,
  releaseCinematicSecondsOnce,
  creditTopupSeconds,
  debitTopupSeconds,
  getTopupSecondsRemaining,
  getCinematicSecondsUsed,
} = await import("./budget");

const USER = "user-topup";
const ALLOWED = 90;

beforeEach(() => {
  store.clear();
});

describe("monthly allowance decrement", () => {
  it("decrements by the seconds asked for and admits until the allowance is gone", async () => {
    const first = await reserveCinematicSeconds(USER, ALLOWED, 64);
    expect(first.ok).toBe(true);
    expect(await getCinematicSecondsUsed(USER)).toBe(64);
    const second = await reserveCinematicSeconds(USER, ALLOWED, 32);
    expect(second.ok).toBe(false);
    expect(await getCinematicSecondsUsed(USER)).toBe(64);

    const third = await reserveCinematicSeconds(USER, ALLOWED, 24);
    expect(third.ok).toBe(true);
    expect(await getCinematicSecondsUsed(USER)).toBe(88);
  });

  it("returns reserved seconds when a job never runs", async () => {
    const r = await reserveCinematicSeconds(USER, ALLOWED, 32);
    expect(r.ok).toBe(true);
    await releaseCinematicSeconds(USER, 32, { fromMonthly: r.fromMonthly, fromTopup: r.fromTopup });
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });
});

describe("top-up credit", () => {
  it("credits purchased seconds onto a balance that starts empty", async () => {
    expect(await getTopupSecondsRemaining(USER)).toBe(0);
    expect(await creditTopupSeconds(USER, 200)).toBe(200);
    expect(await getTopupSecondsRemaining(USER)).toBe(200);
  });

  it("accumulates across purchases and ignores nonsense amounts", async () => {
    await creditTopupSeconds(USER, 200);
    await creditTopupSeconds(USER, 200);
    expect(await getTopupSecondsRemaining(USER)).toBe(400);
    await creditTopupSeconds(USER, 0);
    await creditTopupSeconds(USER, -50);
    await creditTopupSeconds(USER, Number.NaN);
    expect(await getTopupSecondsRemaining(USER)).toBe(400);
  });
});

describe("consumption order: monthly first, then purchased", () => {
  it("does not touch purchased seconds while monthly ones remain", async () => {
    await creditTopupSeconds(USER, 200);
    const r = await reserveCinematicSeconds(USER, ALLOWED, 64);
    expect(r.ok).toBe(true);
    expect(r.fromMonthly).toBe(64);
    expect(r.fromTopup).toBe(0);
    expect(await getTopupSecondsRemaining(USER)).toBe(200);
  });

  it("splits a render across the monthly remainder and the purchased balance", async () => {
    await creditTopupSeconds(USER, 200);
    await reserveCinematicSeconds(USER, ALLOWED, 64);
    const r = await reserveCinematicSeconds(USER, ALLOWED, 64);
    expect(r.ok).toBe(true);
    expect(r.fromMonthly).toBe(26);
    expect(r.fromTopup).toBe(38);
    expect(await getCinematicSecondsUsed(USER)).toBe(ALLOWED);
    expect(await getTopupSecondsRemaining(USER)).toBe(162);
  });

  it("draws purely from purchased seconds once the month is spent", async () => {
    await creditTopupSeconds(USER, 200);
    await reserveCinematicSeconds(USER, ALLOWED, ALLOWED);
    const r = await reserveCinematicSeconds(USER, ALLOWED, 64);
    expect(r.ok).toBe(true);
    expect(r.fromMonthly).toBe(0);
    expect(r.fromTopup).toBe(64);
    expect(await getTopupSecondsRemaining(USER)).toBe(136);
  });

  it("refuses and rolls BOTH pools back when neither covers the render", async () => {
    await creditTopupSeconds(USER, 10);
    await reserveCinematicSeconds(USER, ALLOWED, 80);
    const r = await reserveCinematicSeconds(USER, ALLOWED, 64);
    expect(r.ok).toBe(false);
    expect(await getCinematicSecondsUsed(USER)).toBe(80);
    expect(await getTopupSecondsRemaining(USER)).toBe(10);
  });

  it("returns a split reservation to the pool it came from", async () => {
    await creditTopupSeconds(USER, 200);
    await reserveCinematicSeconds(USER, ALLOWED, 64);
    const r = await reserveCinematicSeconds(USER, ALLOWED, 64);
    await releaseCinematicSeconds(USER, 64, { fromMonthly: r.fromMonthly, fromTopup: r.fromTopup });
    expect(await getCinematicSecondsUsed(USER)).toBe(64);
    expect(await getTopupSecondsRemaining(USER)).toBe(200);
  });
});

describe("refund reversal", () => {
  it("takes unspent purchased seconds back", async () => {
    await creditTopupSeconds(USER, 200);
    const { balance, shortfall } = await debitTopupSeconds(USER, 200);
    expect(balance).toBe(0);
    expect(shortfall).toBe(0);
  });

  it("floors at zero and reports the shortfall when seconds were already spent", async () => {
    await creditTopupSeconds(USER, 200);
    await reserveCinematicSeconds(USER, 0, 100);
    expect(await getTopupSecondsRemaining(USER)).toBe(100);

    const { balance, shortfall } = await debitTopupSeconds(USER, 200);
    expect(balance).toBe(0);
    expect(shortfall).toBe(100);
  });
});

describe("release is idempotent: worker.on('failed') can fire twice", () => {
  it("refunds once for one job id, however many times it is called", async () => {
    await creditTopupSeconds(USER, 200);
    await reserveCinematicSeconds(USER, ALLOWED, 64);
    const r = await reserveCinematicSeconds(USER, ALLOWED, 64);
    const split = { fromMonthly: r.fromMonthly, fromTopup: r.fromTopup };

    expect(await releaseCinematicSecondsOnce(USER, 64, split, "job-1")).toBe(true);
    expect(await releaseCinematicSecondsOnce(USER, 64, split, "job-1")).toBe(false);
    expect(await releaseCinematicSecondsOnce(USER, 64, split, "job-1")).toBe(false);
    expect(await getCinematicSecondsUsed(USER)).toBe(64);
    expect(await getTopupSecondsRemaining(USER)).toBe(200);
  });

  it("without the guard, repeat firing would MINT purchased seconds", async () => {
    await creditTopupSeconds(USER, 10);
    await releaseCinematicSeconds(USER, 40, { fromMonthly: 0, fromTopup: 40 });
    await releaseCinematicSeconds(USER, 40, { fromMonthly: 0, fromTopup: 40 });
    expect(await getTopupSecondsRemaining(USER)).toBe(90);
  });

  it("keeps different jobs independent", async () => {
    await creditTopupSeconds(USER, 200);
    await reserveCinematicSeconds(USER, 0, 100);
    expect(await releaseCinematicSecondsOnce(USER, 50, { fromMonthly: 0, fromTopup: 50 }, "job-a")).toBe(true);
    expect(await releaseCinematicSecondsOnce(USER, 50, { fromMonthly: 0, fromTopup: 50 }, "job-b")).toBe(true);
    expect(await getTopupSecondsRemaining(USER)).toBe(200);
  });
});
