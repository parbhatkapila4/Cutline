import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";

const {
  mockAdd,
  mockStartVideoWorker,
  mockScheduleCleanupJob,
  mockGetUserPlan,
  mockGetVideosCompleted,
  mockGetSession,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockStartVideoWorker: vi.fn(() => ({})),
  mockScheduleCleanupJob: vi.fn(async () => {}),
  mockGetUserPlan: vi.fn(),
  mockGetVideosCompleted: vi.fn(),
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

vi.mock("@/lib/usage", () => ({
  incrementApiCallsThisMonth: vi.fn(async () => {}),
  getVideosCompletedThisMonth: mockGetVideosCompleted,
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
    mockGetVideosCompleted.mockClear();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ user: { id: "quota-test-user" } });
    delete process.env.DISABLE_CREDITS_CHECK;
    mockGetUserPlan.mockResolvedValue(FREE);
    mockGetVideosCompleted.mockResolvedValue(0);
  });

  it("lets a free account through on its first video of the month", async () => {
    const res = await generate();
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
  });

  it("blocks a free account that has already used its three videos", async () => {
    mockGetVideosCompleted.mockResolvedValue(3);
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

    mockGetVideosCompleted.mockResolvedValue(9);
    expect((await generate()).status).toBe(200);

    mockAdd.mockClear();
    mockGetVideosCompleted.mockResolvedValue(10);
    const blocked = await generate();
    expect(blocked.status).toBe(402);
    expect((await blocked.json()).code).toBe("MONTHLY_LIMIT_REACHED");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("never caps a plan whose videosPerMonth is null, however many it has run", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    mockGetVideosCompleted.mockResolvedValue(9_999);
    expect((await generate()).status).toBe(200);
  });



});
