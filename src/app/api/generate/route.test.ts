import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockAdd = vi.fn();
vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

describe("POST /api/generate", () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({ id: "test-job-1" });
  });

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
      expect(mockAdd).toHaveBeenCalledWith("video", expect.objectContaining({
        input: expect.any(String),
        durationSeconds: duration,
        captions: "on",
      }));
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
    expect(data.error).toMatch(/durationSeconds|10|60/);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects durationSeconds above 60", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A short explainer about the sky.",
          durationSeconds: 90,
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
          captions: "off",
          mode: "slideshow",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith("video", expect.objectContaining({
      captions: "off",
      mode: "slideshow",
    }));
  });

  it("includes textModel and assetIds in job data when provided", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: "A product demo for our app.",
          textModel: "google/gemini-2.0-flash-001",
          assetIds: ["asset-1", "asset-2"],
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith("video", expect.objectContaining({
      textModel: "google/gemini-2.0-flash-001",
      assetIds: ["asset-1", "asset-2"],
    }));
  });

  it("defaults captions to on when missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "Explain solar panels in one sentence for a short video." }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith("video", expect.objectContaining({
      captions: "on",
    }));
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
    expect(mockAdd).toHaveBeenCalledWith("video", expect.objectContaining({
      mode: "talking_object",
      durationSeconds: 30,
    }));
  });
});
