import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const {
  mockAdd,
  mockStartVideoWorker,
  mockScheduleCleanupJob,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockStartVideoWorker: vi.fn(() => ({})),
  mockScheduleCleanupJob: vi.fn(async () => { }),
}));
vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: mockStartVideoWorker,
  scheduleCleanupJob: mockScheduleCleanupJob,
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
    },
  },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/usage", () => ({
  incrementApiCallsThisMonth: vi.fn(async () => { }),
  getTokens: vi.fn(async () => 10_000),
  getVideosCompletedThisMonth: vi.fn(async () => 0),
}));

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: vi.fn(async () => ({
    id: "free",
    tokensUnlimited: true,
    videosPerMonth: null,
  })),
}));

vi.mock("@/lib/regen/remixFromJob", () => ({
  mergeRemixFromJob: vi.fn(async (body: Record<string, unknown>) => ({
    ok: true,
    merged: body,
    remixFromJobId: undefined,
  })),
}));

describe("POST /api/generate", () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: "test-job-1" });
  });

  const latestJobPayload = () => mockAdd.mock.calls.at(-1)?.[1] as Record<string, unknown> | undefined;

  it("accepts durationSeconds 30, 40, 50 and includes them in job data", async () => {
    for (const duration of [30, 40, 50]) {
      mockAdd.mockResolvedValue({ id: `job-${duration}` });
      const res = await POST(
        new Request("http://localhost/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: "A short explainer about the sky in one sentence here.",
            durationSeconds: duration,
          }),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobId).toBeDefined();
      expect(mockAdd).toHaveBeenCalled();
      expect(latestJobPayload()).toEqual(
        expect.objectContaining({
          input: expect.any(String),
          durationSeconds: duration,
          captions: "on",
        })
      );
    }
  });

  it("rejects durationSeconds below 10", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A short explainer about the sky.",
          durationSeconds: 5,
        }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
    const errors = Array.isArray(data.errors)
      ? data.errors
      : (data.details?.errors as Array<{ field: string; message: string }> | undefined);
    expect(Array.isArray(errors)).toBe(true);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "durationSeconds" }),
      ])
    );
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects durationSeconds above 60", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A short explainer about the sky.",
          durationSeconds: 10000,
        }),
      })
    );
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("includes captions on/off and mode in job data", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A 30 second video about coffee.",
          durationSeconds: 30,
          captions: "off",
          mode: "slideshow",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
    expect(latestJobPayload()).toEqual(
      expect.objectContaining({
        captions: "off",
        mode: "slideshow",
      })
    );
  });

  it("includes textModel and assetIds in job data when provided", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A product demo for our app.",
          durationSeconds: 30,
          textModel: "google/gemini-2.0-flash-001",
          assetIds: ["asset-1", "asset-2"],
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
    expect(latestJobPayload()).toEqual(
      expect.objectContaining({
        textModel: "google/gemini-2.0-flash-001",
        assetIds: ["asset-1", "asset-2"],
      })
    );
  });

  it("defaults captions to on when missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "Explain solar panels in one sentence for a short video.",
          durationSeconds: 30,
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
    expect(latestJobPayload()).toEqual(
      expect.objectContaining({
        captions: "on",
      })
    );
  });

  it("accepts mode talking_object and includes it in job data", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A 30 second talking character video about the moon.",
          mode: "talking_object",
          durationSeconds: 30,
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
    expect(latestJobPayload()).toEqual(
      expect.objectContaining({
        mode: "talking_object",
        durationSeconds: 30,
      })
    );
  });
});
