import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fakeRedis } from "@/test/fakeRedis";

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

const {
  getVideosUsedThisMonth,
  incrementVideosCompletedThisMonth,
  releaseVideoOnce,
  releaseVideoThisMonth,
  reserveVideoThisMonth,
} = await import("./usage");

const USER = "usage-user";

beforeEach(() => {
  fakeRedis.store.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reserveVideoThisMonth", () => {
  it("lets exactly the remaining number through when requests race", async () => {
    await incrementVideosCompletedThisMonth(USER);

    const results = await Promise.all(Array.from({ length: 5 }, () => reserveVideoThisMonth(USER, 3)));

    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(await getVideosUsedThisMonth(USER)).toBe(3);
  });

  it("reports how many were used when it refuses, and leaves the count alone", async () => {
    for (let i = 0; i < 3; i++) await incrementVideosCompletedThisMonth(USER);

    const refused = await reserveVideoThisMonth(USER, 3);

    expect(refused).toEqual(expect.objectContaining({ ok: false, used: 3 }));
    expect(await getVideosUsedThisMonth(USER)).toBe(3);
  });

  it("counts a plan without a cap but never refuses it", async () => {
    for (let i = 0; i < 50; i++) expect((await reserveVideoThisMonth(USER, null)).ok).toBe(true);

    expect(await getVideosUsedThisMonth(USER)).toBe(50);
  });
});

describe("giving a video back", () => {
  it("gives a failed job's video back once, however often the release runs", async () => {
    const { month } = await reserveVideoThisMonth(USER, 3);

    expect(await releaseVideoOnce(USER, month, "job-1")).toBe(true);
    expect(await releaseVideoOnce(USER, month, "job-1")).toBe(false);

    expect(await getVideosUsedThisMonth(USER)).toBe(0);
  });

  it("never takes the count below zero", async () => {
    const { month } = await reserveVideoThisMonth(USER, 3);

    await releaseVideoThisMonth(USER, month);
    await releaseVideoThisMonth(USER, month);

    expect(await getVideosUsedThisMonth(USER)).toBe(0);
  });

  it("gives it back to the month it was counted in, even after the month rolls over", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 31, 23, 59));
    const { month } = await reserveVideoThisMonth(USER, 3);
    vi.setSystemTime(new Date(2026, 10, 1, 0, 5));
    await reserveVideoThisMonth(USER, 3);

    await releaseVideoOnce(USER, month, "job-from-october");

    expect(month).toBe("2026-10");
    expect(await getVideosUsedThisMonth(USER)).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 31, 23, 59));
    expect(await getVideosUsedThisMonth(USER)).toBe(0);
  });
});

describe("what a refusal reports", () => {
  it("never reports more videos used than the limit, even when refusals race", async () => {
    for (let i = 0; i < 3; i++) await incrementVideosCompletedThisMonth(USER);

    const refusals = await Promise.all(Array.from({ length: 4 }, () => reserveVideoThisMonth(USER, 3)));

    expect(refusals.every((r) => !r.ok && r.used === 3)).toBe(true);
    expect(await getVideosUsedThisMonth(USER)).toBe(3);
  });
});
