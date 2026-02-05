import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 180_000;

const hasRedis = !!process.env.REDIS_URL;

describe.skipIf(!hasRedis)("POST /api/generate integration", () => {
  beforeAll(() => {
    if (!hasRedis) return;
  });

  it("POST /api/generate returns jobId and job completes or fails when polled", async () => {
    const res = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "Explain why coffee wakes you up in 30 seconds" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { jobId?: string; error?: string };
    expect(data.error).toBeUndefined();
    expect(data.jobId).toBeDefined();
    expect(typeof data.jobId).toBe("string");
    const jobId = data.jobId as string;

    const start = Date.now();
    while (Date.now() - start < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await fetch(`${BASE}/api/generate/${jobId}`);
      expect(statusRes.ok).toBe(true);
      const statusData = (await statusRes.json()) as { status: string; videoUrl?: string; error?: string };

      if (statusData.status === "completed") {
        expect(statusData.status).toBe("completed");
        if ("videoUrl" in statusData) expect(typeof statusData.videoUrl).toBe("string");
        return;
      }
      if (statusData.status === "failed") {
        expect(statusData.error).toBeDefined();
        return;
      }
    }

    expect.fail("Polling did not reach completed or failed within max wait time");
  }, MAX_WAIT_MS + 10_000);

  it("POST /api/generate accepts captions on and off and returns jobId", async () => {
    const res = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "A 15 second test video about the sky.",
        captions: "off",
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { jobId?: string; error?: string };
    expect(data.error).toBeUndefined();
    expect(data.jobId).toBeDefined();
    expect(typeof data.jobId).toBe("string");

    const resOn = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "A 15 second test video about the ocean.",
        captions: "on",
      }),
    });
    expect(resOn.status).toBe(200);
    const dataOn = (await resOn.json()) as { jobId?: string; error?: string };
    expect(dataOn.error).toBeUndefined();
    expect(dataOn.jobId).toBeDefined();
  });
});
