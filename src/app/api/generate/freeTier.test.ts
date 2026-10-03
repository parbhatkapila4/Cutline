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
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockStartVideoWorker: vi.fn(() => ({})),
  mockScheduleCleanupJob: vi.fn(async () => { }),
  mockGetUserPlan: vi.fn(),
  mockGetVideosCompleted: vi.fn(),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: mockStartVideoWorker,
  scheduleCleanupJob: mockScheduleCleanupJob,
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "free-tier-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
  getForwardedClientIp: () => null,
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "user-1" } })) } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  createVideoJob: vi.fn(async () => ({ id: "row-1" })),
}));

vi.mock("@/lib/usage", () => ({
  incrementApiCallsThisMonth: vi.fn(async () => { }),
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

const latestJobPayload = () =>
  mockAdd.mock.calls.at(-1)?.[1] as Record<string, unknown> | undefined;

beforeEach(() => {
  fakeRedis.store.clear();
  mockAdd.mockReset();
  mockAdd.mockResolvedValue({ id: "free-tier-job-1" });
  mockGetUserPlan.mockReset();
  mockGetVideosCompleted.mockReset();
  delete process.env.DISABLE_CREDITS_CHECK;
  mockGetUserPlan.mockResolvedValue(FREE);
  mockGetVideosCompleted.mockResolvedValue(0);
});

describe("gate: talking_object is Professional+", () => {
  it("rejects talking_object on free", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
    const res = await generate({ mode: "talking_object" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_REQUIRED");
    expect(body.error).toContain("Professional");
    expect(body.error).toContain("Talking-character videos");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects talking_object on beginner", async () => {
    mockGetUserPlan.mockResolvedValue(BEGINNER);
    const res = await generate({ mode: "talking_object" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("PLAN_REQUIRED");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects cartoon style too — the hole the old three-condition gate left", async () => {
    mockGetUserPlan.mockResolvedValue(BEGINNER);
    const res = await generate({ mode: "talking_object", talkingObjectStyle: "cartoon" });
    expect(res.status).toBe(403);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("allows talking_object on professional", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    const res = await generate({ mode: "talking_object" });
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.mode).toBe("talking_object");
  });
});

describe("gate: stock images only on free", () => {
  it("sets stockImagesOnly for a free render", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
    const res = await generate();
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.stockImagesOnly).toBe(true);
  });

  it("does not set it for a paid render", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    const res = await generate();
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.stockImagesOnly).toBeUndefined();
  });
});

describe("gate: free video count", () => {
  it("allows a free account through its first three videos", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
    for (const used of [0, 1, 2]) {
      mockAdd.mockClear();
      mockGetVideosCompleted.mockResolvedValue(used);
      expect((await generate()).status).toBe(200);
    }
  });

  it("blocks a free account at 3 of 3", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
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
});

describe("gate: free duration cap", () => {
  it("rejects a free render over 20 seconds", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
    const res = await generate({ durationSeconds: 30 });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_REQUIRED");
    expect(body.details?.maxDurationSeconds).toBe(20);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("allows a free render at exactly 20 seconds", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
    const res = await generate({ durationSeconds: 20 });
    expect(res.status).toBe(200);
  });

  it("allows a paid render over 20 seconds", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    const res = await generate({ durationSeconds: 30 });
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.durationSeconds).toBe(30);
  });
});


describe("meter: HeyGen does not charge Veo seconds at admission", () => {
  const heygenBody = {
    mode: "talking_object",
    talkingObjectStyle: "real",
    talkingRealMode: "studio",
    avatar: { mode: "preset", presetId: "presenter_female_1" },
    durationSeconds: 30,
  };

  it("reserves HeyGen output seconds, not Veo's 8-second rounding", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    const res = await generate(heygenBody);
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.reservedCinematicSeconds).toBe(30);
  });

  it("still reserves whole 8-second blocks for a Veo render", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    const res = await generate({ mode: "talking_object", durationSeconds: 30 });
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.reservedCinematicSeconds).toBe(32);
  });

  it("reserves nothing cinematic for a slideshow", async () => {
    mockGetUserPlan.mockResolvedValue(PRO);
    const res = await generate({ mode: "slideshow", durationSeconds: 30 });
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.reservedCinematicSeconds).toBeUndefined();
  });
});
