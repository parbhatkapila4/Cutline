import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOwners, mockRecord, mockConfigured } = vi.hoisted(() => ({
  mockOwners: vi.fn(async (): Promise<string[]> => ["user-1"]),
  mockRecord: vi.fn<(input: Record<string, unknown>) => Promise<string>>(async () => "recorded"),
  mockConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/jobs/jobOwnership", () => ({ resolveOwnerCandidates: mockOwners }));
vi.mock("@/lib/db/videoUsage", () => ({ recordVideoUsage: mockRecord }));
vi.mock("@/lib/db/client", () => ({ isDatabaseConfigured: mockConfigured }));

import { POST } from "./route";

const USER = "user-1";
const JOB = "3c4b1a8e-5f0d-4c51-9a7e-2b6f2f7d9e10";

const post = (body: unknown, id: string = JOB) =>
  POST(
    new Request(`http://localhost/api/videos/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  mockOwners.mockReset();
  mockOwners.mockResolvedValue([USER]);
  mockRecord.mockReset();
  mockRecord.mockResolvedValue("recorded");
  mockConfigured.mockReset();
  mockConfigured.mockReturnValue(true);
});

describe("POST /api/videos/[id]/events - what it accepts", () => {
  it.each([
    ["play_started", "video_page"],
    ["play_started", "create_page"],
    ["share_copied", "video_page"],
    ["share_copied", "create_page"],
    ["share_copied", "dashboard"],
  ])("records %s from %s for the signed-in user", async (eventType, surface) => {
    const res = await post({ eventType, surface });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(mockRecord).toHaveBeenCalledWith({ jobId: JOB, userId: USER, eventType, surface });
  });

  it("takes the user from the session, never from the body", async () => {
    await post({ eventType: "play_started", surface: "video_page", userId: "someone-else", jobId: "another-job" });

    expect(mockRecord).toHaveBeenCalledWith({
      jobId: JOB,
      userId: USER,
      eventType: "play_started",
      surface: "video_page",
    });
  });
});

describe("POST /api/videos/[id]/events - what it refuses", () => {
  it("answers 401 without a signed-in session and writes nothing", async () => {
    mockOwners.mockResolvedValue([]);

    const res = await post({ eventType: "play_started", surface: "video_page" });

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("answers 400 to a download: that is logged by the download route only", async () => {
    const res = await post({ eventType: "download", surface: "video_page" });

    expect(res.status).toBe(400);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown event", { eventType: "purchase", surface: "video_page" }],
    ["a missing event", { surface: "video_page" }],
    ["an event that is not a string", { eventType: ["play_started"], surface: "video_page" }],
    ["an empty event", { eventType: "", surface: "video_page" }],
    ["an unknown surface", { eventType: "play_started", surface: "homepage" }],
    ["a missing surface", { eventType: "play_started" }],
    ["a null surface", { eventType: "play_started", surface: null }],
    ["a surface with the wrong case", { eventType: "play_started", surface: "Video_Page" }],
    ["an empty object", {}],
    ["a null body", "null"],
    ["a string body", '"play_started"'],
    ["a body that is not JSON", "play_started"],
  ])("answers 400 to %s and writes nothing", async (_name, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it.each(["not a valid id", "a".repeat(65), "has.dot"])(
    "answers 400 to the video id %j and writes nothing",
    async (id) => {
      const res = await post({ eventType: "play_started", surface: "video_page" }, id);

      expect(res.status).toBe(400);
      expect(mockOwners).not.toHaveBeenCalled();
      expect(mockRecord).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/videos/[id]/events - ownership is the helper's call", () => {
  it("answers 404 for a video that is not the user's", async () => {
    mockRecord.mockResolvedValue("not_found");

    const res = await post({ eventType: "play_started", surface: "video_page" });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Job not found" });
  });

  it("answers 500 when the write failed", async () => {
    mockRecord.mockResolvedValue("failed");

    const res = await post({ eventType: "play_started", surface: "video_page" });

    expect(res.status).toBe(500);
  });

  it("answers 503 and writes nothing when there is no database", async () => {
    mockConfigured.mockReturnValue(false);

    const res = await post({ eventType: "play_started", surface: "video_page" });

    expect(res.status).toBe(503);
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
