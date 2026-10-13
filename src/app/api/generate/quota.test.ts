import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";
import { getVideosUsedThisMonth, incrementVideosCompletedThisMonth } from "@/lib/usage";

const {
  mockAdd,
  mockStartVideoWorker,
  mockScheduleCleanupJob,
  mockGetUserPlan,
  mockGetSession,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockStartVideoWorker: vi.fn(() => ({})),
  mockScheduleCleanupJob: vi.fn(async () => {}),
  mockGetUserPlan: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: mockStartVideoWorker,
  scheduleCleanupJob: mockScheduleCleanupJob,
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "quota-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
  getForwardedClientIp: () => null,
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

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

const FREE = PLAN_CONFIGS.free;
const BEGINNER = PLAN_CONFIGS.beginner;
const PRO = PLAN_CONFIGS.professional;
const USER = "quota-test-user";

const useVideos = async (count: number) => {
  for (let i = 0; i < count; i++) await incrementVideosCompletedThisMonth(USER);
};

const generate = (body: Record<string, unknown> = {}) =>
  POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "A short explainer about cold brew coffee in one sentence.",
        durationSeconds: 20,
        ...body,
      }),
    }),
  );

describe("POST /api/generate - plan quotas", () => {
  beforeEach(() => {
    fakeRedis.store.clear();
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: "quota-job-1" });
    mockGetUserPlan.mockClear();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ user: { id: USER } });
    delete process.env.DISABLE_CREDITS_CHECK;
    mockGetUserPlan.mockResolvedValue(FREE);
  });

  it("lets a free account through on its first video of the month", async () => {
    const res = await generate();
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
  });

  it("blocks a free account that has already used its three videos", async () => {
    await useVideos(3);
    const res = await generate();
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("MONTHLY_LIMIT_REACHED");
    expect(body.details).toEqual(
      expect.objectContaining({ videosUsed: 3, videosLimit: 3, plan: "free" }),
    );
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("blocks a beginner at 10 of 10 but not at 9", async () => {
    mockGetUserPlan.mockResolvedValue(BEGINNER);

    await useVideos(9);
    expect((await generate()).status).toBe(200);

    mockAdd.mockClear();
    const blocked = await generate();
    expect(blocked.status).toBe(402);
    expect((await blocked.json()).code).toBe("MONTHLY_LIMIT_REACHED");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("never caps a plan whose videosPerMonth is null, however many it has run", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    await useVideos(9_999);
    expect((await generate()).status).toBe(200);
    expect(await getVideosUsedThisMonth(USER)).toBe(10_000);
  });
});

describe("POST /api/generate - the monthly video count is taken at admission", () => {
  beforeEach(() => {
    fakeRedis.store.clear();
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: "quota-job-1" });
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ user: { id: USER } });
    delete process.env.DISABLE_CREDITS_CHECK;
    mockGetUserPlan.mockResolvedValue(FREE);
  });

  it("lets exactly the remaining videos through when submissions race", async () => {
    await useVideos(1);

    const results = await Promise.all([generate(), generate(), generate(), generate()]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 402, 402]);
    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(await getVideosUsedThisMonth(USER)).toBe(3);
  });

  it("does not use up a video when it refuses one", async () => {
    await useVideos(3);

    expect((await generate()).status).toBe(402);

    expect(await getVideosUsedThisMonth(USER)).toBe(3);
  });

  it("gives the video back when the job cannot be queued", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    await useVideos(2);
    mockAdd.mockRejectedValueOnce(new Error("queue unavailable"));

    const failed = await generate();

    expect(failed.status).toBeGreaterThanOrEqual(500);
    expect(await getVideosUsedThisMonth(USER)).toBe(2);
    expect((await generate()).status).toBe(200);
    expect(await getVideosUsedThisMonth(USER)).toBe(3);
  });

  it("tells the worker which month the video was counted in", async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    expect((await generate()).status).toBe(200);

    expect(mockAdd.mock.calls[0][1]).toEqual(expect.objectContaining({ reservedVideoMonth: month }));
  });
});
