import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const { mockListRows, mockQueue } = vi.hoisted(() => ({
  mockListRows: vi.fn(),
  mockQueue: {
    getCompleted: vi.fn(),
    getFailed: vi.fn(),
    getWaiting: vi.fn(),
    getActive: vi.fn(),
  },
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => mockQueue,
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "list-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "list-user" } })) } },
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  listVideoJobsByOwner: mockListRows,
}));

const USER = "list-user";
const BLOB = "https://store.public.blob.vercel-storage.com/videos/a.mp4";
const DELETED_BLOB = "https://store.public.blob.vercel-storage.com/videos/b.mp4";

const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id: `row-${id}`,
  owner_type: "user",
  owner_id: USER,
  prompt: `Prompt ${id}`,
  status: "completed",
  preview_url: null,
  final_url: null,
  created_at: new Date("2026-10-01T00:00:00Z"),
  queue_job_id: id,
  ...overrides,
});

const queueJob = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: "video",
  data: { clientId: USER, input: `Prompt ${id}`, durationSeconds: 30 },
  finishedOn: Date.parse("2026-10-01T00:05:00Z"),
  ...overrides,
});

const list = async () => {
  const res = await GET(new Request("http://localhost/api/dashboard/videos"));
  expect(res.status).toBe(200);
  return (await res.json()) as Array<{ id: string; status: string; videoUrl?: string }>;
};

beforeEach(() => {
  mockListRows.mockReset();
  mockListRows.mockResolvedValue([]);
  for (const fn of Object.values(mockQueue)) {
    fn.mockReset();
    fn.mockResolvedValue([]);
  }
});

describe("GET /api/dashboard/videos - what the library lists", () => {
  it("lists finished and in-flight videos and leaves out failed and expired ones", async () => {
    mockListRows.mockResolvedValue([
      row("rendering", { status: "queued", created_at: new Date("2026-10-04T00:00:00Z") }),
      row("finished", { final_url: BLOB, created_at: new Date("2026-10-03T00:00:00Z") }),
      row("expired", { created_at: new Date("2026-10-02T00:00:00Z") }),
      row("failed", { status: "failed" }),
    ]);

    const items = await list();

    expect(items.map((item) => [item.id, item.status])).toEqual([
      ["rendering", "processing"],
      ["finished", "completed"],
    ]);
    expect(items[1].videoUrl).toBe(BLOB);
  });

  it("does not bring an expired video back from a job that still holds its old URL", async () => {
    mockListRows.mockResolvedValue([row("expired")]);
    mockQueue.getCompleted.mockResolvedValue([
      queueJob("expired", { returnvalue: { videoPath: DELETED_BLOB } }),
    ]);

    expect(await list()).toEqual([]);
  });

  it("leaves out a failed render that only exists in the queue", async () => {
    mockQueue.getFailed.mockResolvedValue([queueJob("queue-only")]);

    expect(await list()).toEqual([]);
  });
});
