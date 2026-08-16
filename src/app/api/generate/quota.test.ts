import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const {
  mockAdd,
  mockStartVideoWorker,
  mockScheduleCleanupJob,
  mockGetUserPlan,
  mockGetTokens,
  mockGetVideosCompleted,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockStartVideoWorker: vi.fn(() => ({})),
  mockScheduleCleanupJob: vi.fn(async () => {}),
  mockGetUserPlan: vi.fn(),
  mockGetTokens: vi.fn(),
  mockGetVideosCompleted: vi.fn(),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: mockStartVideoWorker,
  scheduleCleanupJob: mockScheduleCleanupJob,
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "quota-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/usage", () => ({
  incrementApiCallsThisMonth: vi.fn(async () => {}),
  getTokens: mockGetTokens,
  getVideosCompletedThisMonth: mockGetVideosCompleted,
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

const FREE = {
  id: "free",
  label: "Free",
  videosPerMonth: 1,
  apiCallsPerMonth: 1,
  tokensUnlimited: false,
  tokensPerMonth: 10,
};
const BEGINNER = {
  ...FREE,
  id: "beginner",
  label: "Beginner",
  videosPerMonth: 10,
  tokensPerMonth: 120,
};
const PRO = {
  id: "professional",
  label: "Professional",
  videosPerMonth: null,
  apiCallsPerMonth: 100_000,
  tokensUnlimited: true,
  tokensPerMonth: null,
};

const generate = (body: Record<string, unknown> = {}) =>
  POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "A short explainer about cold brew coffee in one sentence.",
        durationSeconds: 30,
        ...body,
      }),
    }),
  );

describe("POST /api/generate - plan quotas", () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: "quota-job-1" });
    mockGetUserPlan.mockClear();
    mockGetTokens.mockClear();
    mockGetVideosCompleted.mockClear();
    delete process.env.DISABLE_CREDITS_CHECK;
    mockGetUserPlan.mockResolvedValue(FREE);
    mockGetTokens.mockResolvedValue(10_000);
    mockGetVideosCompleted.mockResolvedValue(0);
  });

  it("lets a free account through on its first video of the month", async () => {
    const res = await generate();
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
  });

  it("blocks a free account that has already used its one video", async () => {
    mockGetVideosCompleted.mockResolvedValue(1);
    const res = await generate();
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("MONTHLY_LIMIT_REACHED");
    expect(body.details).toEqual(
      expect.objectContaining({ videosUsed: 1, videosLimit: 1, plan: "free" }),
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

  it("blocks a render the remaining token balance cannot cover", async () => {
    mockGetTokens.mockResolvedValue(1);
    const res = await generate();
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("INSUFFICIENT_CREDITS");
    expect(body.details.tokensRemaining).toBe(1);
    expect(body.details.tokensRequired).toBeGreaterThan(1);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("reads the token balance with the PLAN's monthly grant, not the global default", async () => {
    mockGetUserPlan.mockResolvedValue(BEGINNER);
    await generate();
    expect(mockGetTokens).toHaveBeenCalledWith(expect.any(String), 120);
  });

  it("does not consult the token balance at all on an unlimited plan", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    await generate();
    expect(mockGetTokens).not.toHaveBeenCalled();
  });
});
