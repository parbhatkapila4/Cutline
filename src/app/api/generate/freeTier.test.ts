import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";
import { incrementVideosCompletedThisMonth } from "@/lib/usage";

const {
  mockAdd,
  mockStartVideoWorker,
  mockScheduleCleanupJob,
  mockGetUserPlan,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockStartVideoWorker: vi.fn(() => ({})),
  mockScheduleCleanupJob: vi.fn(async () => { }),
  mockGetUserPlan: vi.fn(),
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
  delete process.env.DISABLE_CREDITS_CHECK;
  mockGetUserPlan.mockResolvedValue(FREE);
});

const useVideos = async (count: number) => {
  for (let i = 0; i < count; i++) await incrementVideosCompletedThisMonth("user-1");
};

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
    for (let i = 0; i < 3; i++) {
      mockAdd.mockClear();
      expect((await generate()).status).toBe(200);
    }
  });

  it("blocks a free account at 3 of 3", async () => {
    mockGetUserPlan.mockResolvedValue(FREE);
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

describe("shape: a talking character is only taken in the shapes its renderer makes", () => {
  const veoBody = { mode: "talking_object", durationSeconds: 30 };
  const heygenBody = {
    mode: "talking_object",
    talkingObjectStyle: "real",
    talkingRealMode: "studio",
    avatar: { mode: "preset", presetId: "presenter_female_1" },
    durationSeconds: 30,
  };

  beforeEach(() => {
    mockGetUserPlan.mockResolvedValue(PRO);
  });

  it.each(["4:5", "1:1", "3:2", "21:9"])("turns %s away for a Veo render before anything is queued", async (aspectRatio) => {
    const res = await generate({ ...veoBody, aspectRatio });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details.errors).toEqual([expect.objectContaining({ field: "aspectRatio" })]);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("says which shapes it can make", async () => {
    const res = await generate({ ...veoBody, aspectRatio: "4:5" });
    expect((await res.json()).error).toContain("16:9 or 9:16");
  });

  it.each(["16:9", "9:16"])("takes %s for a Veo render and queues it as asked", async (aspectRatio) => {
    const res = await generate({ ...veoBody, aspectRatio });
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.aspectRatio).toBe(aspectRatio);
  });

  it("takes a Veo render that names no shape", async () => {
    const res = await generate(veoBody);
    expect(res.status).toBe(200);
    expect(latestJobPayload()?.aspectRatio).toBeUndefined();
  });

  it("turns 4:5 away for a scenario render with a preset avatar, which Veo also makes", async () => {
    const res = await generate({ ...heygenBody, talkingRealMode: "scenario", aspectRatio: "4:5" });
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("takes every shape for a HeyGen render, which is asked for the exact frame", async () => {
    for (const aspectRatio of ["4:5", "1:1", "3:2", "21:9"]) {
      mockAdd.mockClear();
      const res = await generate({ ...heygenBody, aspectRatio });
      expect(res.status).toBe(200);
      expect(latestJobPayload()?.aspectRatio).toBe(aspectRatio);
    }
  });

  it("takes every shape for a slideshow", async () => {
    for (const aspectRatio of ["4:5", "1:1", "3:2", "21:9"]) {
      mockAdd.mockClear();
      const res = await generate({ mode: "slideshow", durationSeconds: 30, aspectRatio });
      expect(res.status).toBe(200);
      expect(latestJobPayload()?.aspectRatio).toBe(aspectRatio);
    }
  });
});
