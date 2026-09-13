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
  releaseCinematicSecondsOnce,
  creditTopupSeconds,
  getTopupSecondsRemaining,
  getCinematicSecondsUsed,
} = await import("@/lib/cost/budget");

const USER = "user-failure-release";
const ALLOWED = 90;

beforeEach(() => {
  store.clear();
});

describe("a failed job releases its whole reservation", () => {
  it("gives back every monthly second when the job fails", async () => {
    const cine = await reserveCinematicSeconds(USER, ALLOWED, 18);
    expect(cine.ok).toBe(true);
    expect(await getCinematicSecondsUsed(USER)).toBe(18);

    const released = await releaseCinematicSecondsOnce(
      USER,
      18,
      { fromMonthly: cine.fromMonthly, fromTopup: cine.fromTopup },
      "job-1"
    );

    expect(released).toBe(true);
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });

  it("returns monthly and purchased seconds to the meter they came from", async () => {
    await creditTopupSeconds(USER, 30);
    await reserveCinematicSeconds(USER, ALLOWED, 80);

    const cine = await reserveCinematicSeconds(USER, ALLOWED, 18);
    expect(cine.ok).toBe(true);
    expect(cine.fromMonthly).toBe(10);
    expect(cine.fromTopup).toBe(8);
    expect(await getCinematicSecondsUsed(USER)).toBe(90);
    expect(await getTopupSecondsRemaining(USER)).toBe(22);

    const released = await releaseCinematicSecondsOnce(
      USER,
      18,
      { fromMonthly: cine.fromMonthly, fromTopup: cine.fromTopup },
      "job-2"
    );

    expect(released).toBe(true);
    expect(await getCinematicSecondsUsed(USER)).toBe(80);
    expect(await getTopupSecondsRemaining(USER)).toBe(30);
  });

  it("refunds no matter how far into generation the job got", async () => {
    for (const guardKey of ["failed-at-intent", "failed-mid-veo", "failed-on-last-chunk"]) {
      const cine = await reserveCinematicSeconds(USER, ALLOWED, 24);
      expect(cine.ok).toBe(true);
      const released = await releaseCinematicSecondsOnce(
        USER,
        24,
        { fromMonthly: cine.fromMonthly, fromTopup: cine.fromTopup },
        guardKey
      );
      expect(released).toBe(true);
      expect(await getCinematicSecondsUsed(USER)).toBe(0);
    }
  });

  it("releases five consecutive failures in full", async () => {
    for (let i = 0; i < 5; i++) {
      const cine = await reserveCinematicSeconds(USER, ALLOWED, 18);
      expect(cine.ok).toBe(true);
      await releaseCinematicSecondsOnce(
        USER,
        18,
        { fromMonthly: cine.fromMonthly, fromTopup: cine.fromTopup },
        `job-run-${i}`
      );
    }
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
    expect(await getTopupSecondsRemaining(USER)).toBe(0);
  });
});

describe("the release guard", () => {
  it("refunds once even if the failed event fires twice", async () => {
    const cine = await reserveCinematicSeconds(USER, ALLOWED, 18);
    const split = { fromMonthly: cine.fromMonthly, fromTopup: cine.fromTopup };

    expect(await releaseCinematicSecondsOnce(USER, 18, split, "job-3")).toBe(true);
    expect(await releaseCinematicSecondsOnce(USER, 18, split, "job-3")).toBe(false);

    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });

  it("does not let one job's guard suppress another job's refund", async () => {
    const a = await reserveCinematicSeconds(USER, ALLOWED, 18);
    const b = await reserveCinematicSeconds(USER, ALLOWED, 18);
    expect(await getCinematicSecondsUsed(USER)).toBe(36);

    expect(
      await releaseCinematicSecondsOnce(USER, 18, { fromMonthly: a.fromMonthly, fromTopup: a.fromTopup }, "job-a")
    ).toBe(true);
    expect(
      await releaseCinematicSecondsOnce(USER, 18, { fromMonthly: b.fromMonthly, fromTopup: b.fromTopup }, "job-b")
    ).toBe(true);

    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });

  it("ignores a non-positive reservation", async () => {
    expect(await releaseCinematicSecondsOnce(USER, 0, { fromMonthly: 0, fromTopup: 0 }, "job-4")).toBe(false);
  });
});

