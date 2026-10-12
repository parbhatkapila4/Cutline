import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getDetail } from "./route";
import { GET as getLibrary } from "../route";

const { mockGetJob, mockFindRow, mockListRows, mockLibraryQueue } = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
  mockFindRow: vi.fn(),
  mockListRows: vi.fn(),
  mockLibraryQueue: {
    getCompleted: vi.fn(),
    getFailed: vi.fn(),
    getWaiting: vi.fn(),
    getActive: vi.fn(),
  },
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ getJob: mockGetJob, ...mockLibraryQueue }),
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "detail-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "detail-user" } })) } },
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  findVideoJobForOwners: mockFindRow,
  listVideoJobsByOwner: mockListRows,
}));

vi.mock("@/lib/dashboard/purgeUserVideo", () => ({
  purgeUserVideo: vi.fn(),
}));

const USER = "detail-user";
const JOB_ID = "9b2e6f3a-1c4d-4e8f-a7b6-5d3c2e1f0a98";
const VIDEO = "https://store.public.blob.vercel-storage.com/videos/detail.mp4";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "row-detail",
  owner_type: "user",
  owner_id: USER,
  prompt: "A short explainer about cold brew coffee.",
  status: "completed",
  preview_url: null,
  final_url: VIDEO,
  created_at: new Date("2026-10-01T00:00:00Z"),
  queue_job_id: JOB_ID,
  job_data: { input: "A short explainer about cold brew coffee.", mode: "talking_object", durationSeconds: 45 },
  result: { videoPath: VIDEO, message: "Rendered with stock footage." },
  error: null,
  queue_name: "video-generation",
  started_at: new Date("2026-10-01T00:01:00Z"),
  finished_at: new Date("2026-10-03T12:00:00Z"),
  ...overrides,
});

const detail = () =>
  getDetail(new Request(`http://localhost/api/dashboard/videos/${JOB_ID}`), {
    params: Promise.resolve({ jobId: JOB_ID }),
  });

const library = async () => {
  const res = await getLibrary(new Request("http://localhost/api/dashboard/videos"));
  expect(res.status).toBe(200);
  return (await res.json()) as Array<{ id: string; status: string; videoUrl?: string; duration: string; date: string }>;
};

beforeEach(() => {
  mockGetJob.mockReset();
  mockGetJob.mockResolvedValue(undefined);
  mockFindRow.mockReset();
  mockFindRow.mockResolvedValue(null);
  mockListRows.mockReset();
  mockListRows.mockResolvedValue([]);
  for (const fn of Object.values(mockLibraryQueue)) {
    fn.mockReset();
    fn.mockResolvedValue([]);
  }
});

describe("GET /api/dashboard/videos/[jobId] - a finished video is read from video_jobs", () => {
  it("opens a finished video after the queue has dropped the job", async () => {
    mockFindRow.mockResolvedValue(row());

    const res = await detail();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        id: JOB_ID,
        status: "completed",
        videoUrl: VIDEO,
        mode: "talking_object",
        durationSeconds: 45,
        duration: "0:45",
        message: "Rendered with stock footage.",
        date: new Date("2026-10-03T12:00:00Z").toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      }),
    );
    expect(mockFindRow).toHaveBeenCalledWith(JOB_ID, [USER]);
    expect(mockGetJob).not.toHaveBeenCalled();
  });

  it("fills in an older row's settings from the queue while the queue still has the job", async () => {
    mockFindRow.mockResolvedValue(row({ job_data: null, result: null }));
    mockGetJob.mockResolvedValue({
      data: { input: "A short explainer about cold brew coffee.", mode: "slideshow", durationSeconds: 30 },
      returnvalue: { videoPath: VIDEO },
      finishedOn: Date.parse("2026-10-02T00:00:00Z"),
    });

    const body = await (await detail()).json();

    expect(body).toEqual(expect.objectContaining({ videoUrl: VIDEO, mode: "slideshow", duration: "0:30" }));
  });

  it("still opens an older row whose queue job is gone, without a duration", async () => {
    mockFindRow.mockResolvedValue(row({ job_data: null, result: null, finished_at: null }));

    const res = await detail();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expect.objectContaining({ videoUrl: VIDEO, duration: "-" }));
  });

  it("returns 404 for a video that is still rendering, has expired, or is not the user's", async () => {
    for (const found of [row({ status: "processing", final_url: null }), row({ final_url: null }), null]) {
      mockFindRow.mockResolvedValue(found);

      const res = await detail();

      expect(res.status).toBe(404);
    }
    expect(mockGetJob).not.toHaveBeenCalled();
  });
});

describe("the library and the detail page read the same source", () => {
  it("list the same finished video with the same file, and both drop an expired one", async () => {
    const finished = row();
    const expired = row({ id: "row-expired", queue_job_id: "expired-job", final_url: null });
    mockListRows.mockResolvedValue([finished, expired]);
    mockFindRow.mockResolvedValue(finished);

    const items = await library();
    const opened = await (await detail()).json();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({ id: opened.id, videoUrl: opened.videoUrl, duration: opened.duration, date: opened.date }),
    );
    for (const fn of Object.values(mockLibraryQueue)) expect(fn).not.toHaveBeenCalled();

    mockFindRow.mockResolvedValue(expired);
    expect((await detail()).status).toBe(404);
  });
});
