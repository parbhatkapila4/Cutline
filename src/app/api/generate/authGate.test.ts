import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { POST as batchPost } from "@/app/api/v1/batch/generate/route";

const { mockAdd, mockGetSession, mockValidateApiKey } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockGetSession: vi.fn(),
  mockValidateApiKey: vi.fn(),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: vi.fn(() => ({})),
  scheduleCleanupJob: vi.fn(async () => { }),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "auth-gate-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: mockValidateApiKey,
}));

vi.mock("@/lib/usage", () => ({
  incrementApiCallsThisMonth: vi.fn(async () => { }),
  getVideosCompletedThisMonth: vi.fn(async () => 0),
}));

vi.mock("@/lib/cost/budget", () => ({
  getBudgetState: vi.fn(async () => ({
    plan: "professional",
    budgetUsd: 1000,
    spentUsd: 0,
    remainingUsd: 1000,
    fractionUsed: 0,
    cinematicSecondsAllowed: 1000,
    cinematicSecondsUsed: 0,
    cinematicSecondsRemaining: 1000,
  })),
  decideSpend: vi.fn(() => ({ outcome: "allow", state: {} })),
  recordCinematicSeconds: vi.fn(async () => 0),
  reserveCinematicSeconds: vi.fn(async () => ({ ok: true, usedSeconds: 0 })),
  reserveSpendUsd: vi.fn(async () => ({ ok: true, spentUsd: 0 })),
  adjustSpendUsd: vi.fn(async () => 0),
  releaseCinematicSeconds: vi.fn(async () => { }),
  recordSpendUsd: vi.fn(async () => 0),
  resetsAt: vi.fn(() => "Oct 1, 2026"),
}));

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: vi.fn(async () => ({
    id: "professional",
    label: "Professional",
    videosPerMonth: null,
    apiCallsPerMonth: 100_000,
  })),
}));

vi.mock("@/lib/regen/remixFromJob", () => ({
  mergeRemixFromJob: vi.fn(async (body: Record<string, unknown>) => ({
    ok: true,
    merged: body,
    remixFromJobId: undefined,
  })),
}));

const ITEM = {
  input: "A short explainer about cold brew coffee in one sentence.",
  durationSeconds: 20,
};

const generate = (headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(ITEM),
    }),
  );

const batch = (items: unknown[], headers: Record<string, string> = {}) =>
  batchPost(
    new Request("http://localhost/api/v1/batch/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", host: "localhost", ...headers },
      body: JSON.stringify({ items }),
    }),
  );

beforeEach(() => {
  mockAdd.mockReset();
  mockAdd.mockResolvedValue({ id: "auth-gate-job-1" });
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
  mockValidateApiKey.mockReset();
  mockValidateApiKey.mockResolvedValue(null);
});

describe("POST /api/generate - authentication is required", () => {
  it("rejects a caller with no session and no API key", async () => {
    const res = await generate();
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects a caller whose session lookup throws", async () => {
    mockGetSession.mockRejectedValue(new Error("session store down"));
    const res = await generate();
    expect(res.status).toBe(401);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("admits a signed-in caller", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "auth-gate-user" } });
    const res = await generate();
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
  });

  it("admits an API-key caller with no session", async () => {
    mockValidateApiKey.mockResolvedValue({ userId: "api-key-user", keyId: "key-1" });
    const res = await generate({ "x-api-key": "ck_live_test" });
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalled();
  });

  it("keys the job to the signed-in user, not to the client identifier", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "auth-gate-user" } });
    await generate();
    const payload = mockAdd.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(payload.userId).toBe("auth-gate-user");
    expect(payload.clientId).toBe("auth-gate-user");
  });

  it("never sets an anonymous session cookie", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "auth-gate-user" } });
    const res = await generate();
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});

describe("POST /api/v1/batch/generate - authentication is required", () => {
  it("rejects the whole request, processing no items", async () => {
    const res = await batch([ITEM, ITEM, ITEM]);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("AUTH_REQUIRED");
    expect(body.results).toBeUndefined();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects before validating the items, so a bad batch still reads as 401", async () => {
    const res = await batch([]);
    expect(res.status).toBe(401);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("admits a signed-in caller and processes every item", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "auth-gate-user" } });
    const res = await batch([ITEM, ITEM]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: Array<{ httpStatus: number }> };
    expect(body.results).toHaveLength(2);
    expect(body.results.every((r) => r.httpStatus === 200)).toBe(true);
    expect(mockAdd).toHaveBeenCalledTimes(2);
  });
});
