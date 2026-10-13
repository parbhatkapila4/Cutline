import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";
import { reserveVideoThisMonth } from "@/lib/usage";

const { mockOverview, mockRecent, mockQueue, db } = vi.hoisted(() => ({
  mockOverview: vi.fn(),
  mockRecent: vi.fn(),
  mockQueue: {
    getCompleted: vi.fn(async (): Promise<unknown[]> => []),
    getFailed: vi.fn(async (): Promise<unknown[]> => []),
    getWaiting: vi.fn(async (): Promise<unknown[]> => []),
    getActive: vi.fn(async (): Promise<unknown[]> => []),
  },
  db: { configured: true },
}));

vi.mock("@/lib/auth/getSessionSafe", () => ({
  getSessionSafe: vi.fn(async () => ({ user: { id: "usage-user" } })),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "usage-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseConfigured: () => db.configured,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  getVideoJobOverview: mockOverview,
  listRecentFinishedVideoJobs: mockRecent,
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => mockQueue,
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: vi.fn(async () => PLAN_CONFIGS.free),
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

const USER = "usage-user";

const row = (overrides: Record<string, unknown>) => ({
  id: "row",
  owner_type: "user",
  owner_id: USER,
  prompt: "A short explainer about cold brew coffee.",
  status: "completed",
  preview_url: null,
  final_url: "https://store.public.blob.vercel-storage.com/videos/a.mp4",
  created_at: new Date(Date.now() - 3 * 3600_000),
  queue_job_id: "job",
  job_data: null,
  result: null,
  error: null,
  queue_name: "video-generation",
  started_at: null,
  finished_at: null,
  ...overrides,
});

beforeEach(() => {
  fakeRedis.store.clear();
  db.configured = true;
  mockOverview.mockReset();
  mockOverview.mockResolvedValue({
    totalVideos: 7,
    thisWeek: 2,
    inProgress: 1,
    totalDurationSec: 185,
    totalCostUsd: 1.234,
  });
  mockRecent.mockReset();
  mockRecent.mockResolvedValue([]);
  for (const fn of Object.values(mockQueue)) fn.mockClear();
});

describe("GET /api/dashboard/usage", () => {
  it("shows the count the cap enforces, and everything else from video_jobs", async () => {
    await reserveVideoThisMonth(USER, 3);
    await reserveVideoThisMonth(USER, 3);

    const body = await (await GET(new Request("http://localhost/api/dashboard/usage"))).json();

    expect(body).toEqual(
      expect.objectContaining({
        plan: "free",
        videosUsed: 2,
        videosLimit: 3,
        totalCostUsd: 1.23,
        overview: expect.objectContaining({
          totalVideos: 7,
          thisWeek: 2,
          thisMonth: 2,
          totalDurationMin: 3,
          inProgress: 1,
        }),
      }),
    );
    expect(mockOverview).toHaveBeenCalledWith(USER, expect.any(Date));
    for (const fn of Object.values(mockQueue)) expect(fn).not.toHaveBeenCalled();
  });

  it("lists recent activity from rows, and an older row without settings shows no seconds or cost", async () => {
    mockRecent.mockResolvedValue([
      row({
        queue_job_id: "job-new",
        job_data: { input: "x", mode: "talking_object", durationSeconds: 30 },
        result: { videoPath: "x", cost: { llm: 0, tts: 0, video: 0.4, images: 0, total: 0.5 } },
        finished_at: new Date(Date.now() - 30_000),
      }),
      row({ queue_job_id: "job-old", status: "failed", final_url: null }),
    ]);

    const { recentActivity } = await (await GET(new Request("http://localhost/api/dashboard/usage"))).json();

    expect(recentActivity).toHaveLength(2);
    expect(recentActivity[0]).toEqual(
      expect.objectContaining({ id: "job-new", status: "completed", time: "Just now", costUsd: 0.5 }),
    );
    expect(recentActivity[0].cinematicSeconds).toBeGreaterThan(0);
    expect(recentActivity[1]).toEqual({
      id: "job-old",
      title: "A short explainer about cold brew coffee.",
      status: "failed",
      time: "3 hours ago",
    });
    expect(mockRecent).toHaveBeenCalledWith(USER, 5);
  });

  it("calls a cancelled row cancelled, the way the job list does, and a real failure failed", async () => {
    mockRecent.mockResolvedValue([
      row({ queue_job_id: "job-cancelled", status: "failed", final_url: null, error: "Job cancelled" }),
      row({
        queue_job_id: "job-cancelled-on-last-retry",
        status: "failed",
        final_url: null,
        error: "Job cancelled Failed after 3 retries.",
      }),
      row({
        queue_job_id: "job-broken",
        status: "failed",
        final_url: null,
        error: "Remotion render failed (exit 1) after 12s.",
      }),
    ]);

    const { recentActivity } = await (await GET(new Request("http://localhost/api/dashboard/usage"))).json();

    expect(recentActivity.map((a: { id: string; status: string }) => [a.id, a.status])).toEqual([
      ["job-cancelled", "cancelled"],
      ["job-cancelled-on-last-retry", "cancelled"],
      ["job-broken", "failed"],
    ]);
  });

  it("makes the same distinction when it has to read the queue", async () => {
    db.configured = false;
    mockQueue.getFailed.mockResolvedValueOnce([
      {
        name: "video",
        id: "q-cancelled",
        data: { clientId: USER, input: "Cancelled one" },
        failedReason: "Job cancelled",
        finishedOn: Date.now() - 1_000,
      },
      {
        name: "video",
        id: "q-failed",
        data: { clientId: USER, input: "Broken one" },
        failedReason: "ElevenLabs TTS failed: 500.",
        finishedOn: Date.now() - 2_000,
      },
    ]);

    const { recentActivity } = await (await GET(new Request("http://localhost/api/dashboard/usage"))).json();

    expect(recentActivity.map((a: { id: string; status: string }) => [a.id, a.status])).toEqual([
      ["q-cancelled", "cancelled"],
      ["q-failed", "failed"],
    ]);
  });
});
