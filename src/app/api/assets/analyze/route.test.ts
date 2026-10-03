import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const { mockGetSession, mockValidateApiKey, mockCheckRateLimit, mockAnalyzeAssets } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockValidateApiKey: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockAnalyzeAssets: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: mockValidateApiKey,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/assets/analysis", () => ({
  analyzeAssets: mockAnalyzeAssets,
}));

const analyze = (headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/assets/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ assetIds: ["asset-1"] }),
    }),
  );

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
  mockValidateApiKey.mockReset();
  mockValidateApiKey.mockResolvedValue(null);
  mockCheckRateLimit.mockReset();
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockAnalyzeAssets.mockReset();
  mockAnalyzeAssets.mockResolvedValue({ ok: true });
});

describe("POST /api/assets/analyze", () => {
  it("rejects an anonymous caller without making the paid call", async () => {
    const res = await analyze();

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
    expect(mockAnalyzeAssets).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("rejects a rate-limited caller without making the paid call", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "analyze-user" } });
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfter: 42 });

    const res = await analyze();

    expect(res.status).toBe(429);
    expect(mockAnalyzeAssets).not.toHaveBeenCalled();
  });

  it("admits a signed-in caller and runs the analysis", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "analyze-user" } });

    const res = await analyze();

    expect(res.status).toBe(200);
    expect(mockAnalyzeAssets).toHaveBeenCalledWith(["asset-1"], undefined);
  });

  it("admits an API-key caller with no session", async () => {
    mockValidateApiKey.mockResolvedValue({ userId: "api-user", keyId: "key-1" });

    const res = await analyze({ "x-api-key": "ck_live_test" });

    expect(res.status).toBe(200);
    expect(mockAnalyzeAssets).toHaveBeenCalled();
  });
});
