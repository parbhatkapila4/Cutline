import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";
import {
  creditTopupSeconds,
  getCinematicSecondsUsed,
  getSpendUsd,
  getTopupSecondsRemaining,
  recordSpendUsd,
  reserveCinematicSeconds,
  reserveSpendUsd,
} from "@/lib/cost/budget";
import { estimateUnmeteredCostUsd } from "@/lib/cost/pricing";
import { incrementVideosCompletedThisMonth } from "@/lib/usage";

const { mockAdd, mockGetUserPlan, mockDbConfigured, mockCreateVideoJob } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockGetUserPlan: vi.fn(),
  mockDbConfigured: vi.fn(() => false),
  mockCreateVideoJob: vi.fn(async () => ({ id: "row-1" })),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: vi.fn(() => ({})),
  scheduleCleanupJob: vi.fn(async () => { }),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "reservation-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
  getForwardedClientIp: () => null,
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: mockDbConfigured,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  createVideoJob: mockCreateVideoJob,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "reservation-user" } })) } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: mockGetUserPlan,
}));

vi.mock("@/lib/regen/remixFromJob", () => ({
  mergeRemixFromJob: vi.fn(async (body: Record<string, unknown>) => ({
    ok: true,
    merged: body,
    remixFromJobId: undefined,
  })),
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

vi.mock("@/lib/cost/budget", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cost/budget")>();
  return {
    ...actual,
    reserveSpendUsd: vi.fn(actual.reserveSpendUsd),
    reserveCinematicSeconds: vi.fn(actual.reserveCinematicSeconds),
  };
});

const USER = "reservation-user";

const generate = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        input: "A short explainer about cold brew coffee in one sentence.",
        ...body,
      }),
    }),
  );

const completeVideos = async (count: number) => {
  for (let i = 0; i < count; i++) await incrementVideosCompletedThisMonth(USER);
};

beforeEach(() => {
  fakeRedis.store.clear();
  mockAdd.mockReset();
  mockAdd.mockResolvedValue({ id: "reservation-job-1" });
  mockGetUserPlan.mockReset();
  mockDbConfigured.mockReset();
  mockDbConfigured.mockReturnValue(false);
  mockCreateVideoJob.mockReset();
  mockCreateVideoJob.mockResolvedValue({ id: "row-1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/generate - a request that never queues gives its reservation back", () => {
  it("a video-cap rejection leaves spend and cinematic seconds unchanged", async () => {
    vi.stubEnv("CINEMATIC_SECONDS_BEGINNER", "64");
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.beginner);
    await creditTopupSeconds(USER, 1);
    await completeVideos(10);

    const res = await generate({ mode: "talking_object", durationSeconds: 30 });

    expect(res.status).toBe(402);
    expect((await res.json()).details).toEqual(
      expect.objectContaining({ videosUsed: 10, videosLimit: 10 }),
    );
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getSpendUsd(USER)).toBe(0);
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
    expect(await getTopupSecondsRemaining(USER)).toBe(1);
  });

  it("an idempotency replay leaves spend and cinematic seconds unchanged", async () => {
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);
    let finishFirstAdd: (job: { id: string }) => void = () => { };
    mockAdd.mockImplementationOnce(
      () => new Promise<{ id: string }>((resolve) => { finishFirstAdd = resolve; }),
    );
    const body = { mode: "talking_object", durationSeconds: 30 };
    const key = { "x-idempotency-key": "replay-key" };

    const first = generate(body, key);
    await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    const spendHeldByFirst = await getSpendUsd(USER);
    const secondsHeldByFirst = await getCinematicSecondsUsed(USER);

    const second = generate(body, key);
    await vi.waitFor(async () =>
      expect(await getCinematicSecondsUsed(USER)).toBe(2 * secondsHeldByFirst),
    );
    finishFirstAdd({ id: "replayed-job" });
    const [firstRes, secondRes] = await Promise.all([first, second]);

    expect((await firstRes.json()).jobId).toBe("replayed-job");
    expect((await secondRes.json()).jobId).toBe("replayed-job");
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(await getSpendUsd(USER)).toBe(spendHeldByFirst);
    expect(await getCinematicSecondsUsed(USER)).toBe(secondsHeldByFirst);
  });

  it("a Free account with purchased seconds loses none of them to a cap rejection", async () => {
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.free);
    await creditTopupSeconds(USER, 100);
    await completeVideos(3);

    const res = await generate({ mode: "talking_object", durationSeconds: 20 });

    expect(res.status).toBe(402);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getTopupSecondsRemaining(USER)).toBe(100);
  });

  it("a refused spend claim is not refunded", async () => {
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);
    await recordSpendUsd(USER, 1);
    vi.mocked(reserveSpendUsd).mockResolvedValueOnce({ ok: false, spentUsd: 1, reserved: 0 });

    const res = await generate({ mode: "slideshow", durationSeconds: 30 });

    expect(res.status).toBe(402);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getSpendUsd(USER)).toBe(1);
  });

  it("a refused cinematic claim queues nothing", async () => {
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);
    vi.mocked(reserveCinematicSeconds).mockResolvedValueOnce({ ok: false, usedSeconds: 0 });

    const res = await generate({ mode: "talking_object", durationSeconds: 30 });

    expect(res.status).toBe(402);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getSpendUsd(USER)).toBe(0);
  });
});

describe("POST /api/generate - a request that queues keeps its reservation", () => {
  it("leaves the reservation held for the worker to settle", async () => {
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);

    const res = await generate({ mode: "talking_object", durationSeconds: 30 });

    expect(res.status).toBe(200);
    expect(await getCinematicSecondsUsed(USER)).toBe(32);
    expect(await getSpendUsd(USER)).toBeCloseTo(
      estimateUnmeteredCostUsd({ mode: "talking_object", durationSeconds: 30 }),
      6,
    );
  });
});

describe("POST /api/generate - DISABLE_CREDITS_CHECK", () => {
  it("is ignored in production, so the video cap still applies", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DISABLE_CREDITS_CHECK", "true");
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.free);
    await completeVideos(3);

    const res = await generate({ durationSeconds: 20 });

    expect(res.status).toBe(402);
    expect(mockAdd).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate - the video_jobs row must be written", () => {
  it("fails the request and queues nothing if createVideoJob throws", async () => {
    mockDbConfigured.mockReturnValue(true);
    mockCreateVideoJob.mockRejectedValueOnce(new Error("db down"));
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);

    const res = await generate({ mode: "slideshow", durationSeconds: 30 });

    expect(res.status).toBe(500);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getSpendUsd(USER)).toBe(0);
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });
});

describe("POST /api/generate - a Redis fail-open reserves nothing", () => {
  it("does not refund spend that was never held when the request is then refused", async () => {
    mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.beginner);
    await recordSpendUsd(USER, 5);
    await completeVideos(PLAN_CONFIGS.beginner.videosPerMonth ?? 10);
    vi.mocked(reserveSpendUsd).mockResolvedValueOnce({ ok: true, spentUsd: 0, reserved: 0 });

    const res = await generate({ mode: "slideshow", durationSeconds: 30 });

    expect(res.status).toBe(402);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getSpendUsd(USER)).toBe(5);
  });
});
