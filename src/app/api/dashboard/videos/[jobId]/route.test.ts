import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getDetail } from "./route";
import { GET as getLibrary } from "../route";

const { mockGetJob, mockFindRow, mockListRows, mockListFamily, mockLibraryQueue } = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
  mockFindRow: vi.fn(),
  mockListRows: vi.fn(),
  mockListFamily: vi.fn(),
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
  listVideoJobFamily: mockListFamily,
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
  mockListFamily.mockReset();
  mockListFamily.mockImplementation(async () => {
    const found = await mockFindRow.mock.results.at(-1)?.value;
    return found ? [found] : [];
  });
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

  it("returns 404 for a video that is not the user's", async () => {
    mockFindRow.mockResolvedValue(null);

    const res = await detail();

    expect(res.status).toBe(404);
    expect(mockGetJob).not.toHaveBeenCalled();
  });
});

describe("GET /api/dashboard/videos/[jobId] - videos that are not playable", () => {
  it("opens a video that is still rendering, without a file", async () => {
    mockFindRow.mockResolvedValue(row({ status: "processing", final_url: null, result: null, finished_at: null }));

    const res = await detail();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ id: JOB_ID, status: "processing", createdAt: "2026-10-01T00:00:00.000Z" }),
    );
    expect(body).not.toHaveProperty("videoUrl");
  });

  it("opens a video whose file has expired, so the page can offer to make it again", async () => {
    mockFindRow.mockResolvedValue(row({ final_url: null }));

    const res = await detail();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ status: "expired", prompt: "A short explainer about cold brew coffee." }),
    );
    expect(body).not.toHaveProperty("videoUrl");
  });

  it("explains a failed render in plain words, and calls a cancelled one cancelled", async () => {
    mockFindRow.mockResolvedValue(row({ status: "failed", final_url: null, error: "Render timed out after 3600s" }));
    expect(await (await detail()).json()).toEqual(
      expect.objectContaining({ status: "failed", error: "That took longer than expected. Please try again." }),
    );

    mockFindRow.mockResolvedValue(row({ status: "failed", final_url: null, error: "Job cancelled by user" }));
    expect(await (await detail()).json()).toEqual(
      expect.objectContaining({ status: "failed", error: "This render was cancelled." }),
    );
  });
});

describe("GET /api/dashboard/videos/[jobId] - shape and name", () => {
  it("returns the shape the video was made in, and names it from the prompt's first sentence", async () => {
    mockFindRow.mockResolvedValue(
      row({
        prompt: "Launch video for Halden Cold Brew. Open on the pour and end on the free trial.",
        job_data: { input: "Launch video", mode: "slideshow", durationSeconds: 15, aspectRatio: "9:16" },
      }),
    );

    const body = await (await detail()).json();

    expect(body).toEqual(
      expect.objectContaining({ aspectRatio: "9:16", title: "Launch video for Halden Cold Brew" }),
    );
  });

  it("leaves out a shape it does not recognise", async () => {
    mockFindRow.mockResolvedValue(row({ job_data: { input: "x", aspectRatio: "7:3" } }));

    expect(await (await detail()).json()).not.toHaveProperty("aspectRatio");
  });
});

describe("GET /api/dashboard/videos/[jobId] - versions made with Edit with AI", () => {
  const ROOT = JOB_ID;
  const V2 = "2c1f7e4a-8b3d-4f6e-9a1c-7d5e3b2a1f00";
  const V3 = "3d2a8f5b-9c4e-4a7f-8b2d-6e4f3c2b1a11";
  const V2_FILE = "https://store.public.blob.vercel-storage.com/videos/v2.mp4";
  const original = row({ prompt: "Launch video for Halden Cold Brew. Warm and confident." });
  const second = row({
    id: "row-v2",
    queue_job_id: V2,
    prompt: "A punchier launch video for Halden Cold Brew.",
    created_at: new Date("2026-10-01T00:10:00Z"),
    final_url: V2_FILE,
    job_data: {
      input: "A punchier launch video",
      editFromJobId: ROOT,
      editRootJobId: ROOT,
      editMessage: "Make it shorter and punchier",
    },
    result: { videoPath: V2_FILE },
  });
  const third = row({
    id: "row-v3",
    queue_job_id: V3,
    status: "processing",
    final_url: null,
    result: null,
    created_at: new Date("2026-10-01T00:20:00Z"),
    job_data: {
      input: "With a CTA",
      editFromJobId: V2,
      editRootJobId: ROOT,
      editMessage: "Add a clear call to action at the end",
    },
  });

  it("lists every version of the chain, oldest first, from any version's page", async () => {
    mockFindRow.mockResolvedValue(second);
    mockListFamily.mockResolvedValue([original, second, third]);

    const body = await (await detail()).json();

    expect(mockListFamily).toHaveBeenCalledWith(ROOT, [USER], expect.any(Number));
    expect(body.id).toBe(V2);
    expect(body.title).toBe("Launch video for Halden Cold Brew");
    expect(body.originalPrompt).toBe("Launch video for Halden Cold Brew. Warm and confident.");
    expect(body.versions).toEqual([
      expect.objectContaining({ id: ROOT, status: "completed", videoUrl: VIDEO }),
      expect.objectContaining({
        id: V2,
        status: "completed",
        videoUrl: V2_FILE,
        editFromId: ROOT,
        editMessage: "Make it shorter and punchier",
      }),
      expect.objectContaining({
        id: V3,
        status: "processing",
        editFromId: V2,
        editMessage: "Add a clear call to action at the end",
      }),
    ]);
    expect(body.versions[0]).not.toHaveProperty("editMessage");
    expect(body.versions[2]).not.toHaveProperty("videoUrl");
  });

  it("looks the chain up by the video's own id when it is the first version", async () => {
    mockFindRow.mockResolvedValue(original);
    mockListFamily.mockResolvedValue([original, second]);

    const body = await (await detail()).json();

    expect(mockListFamily).toHaveBeenCalledWith(ROOT, [USER], expect.any(Number));
    expect(body.versions.map((v: { id: string }) => v.id)).toEqual([ROOT, V2]);
  });

  it("still opens the video when the history cannot be read", async () => {
    mockFindRow.mockResolvedValue(second);
    mockListFamily.mockRejectedValue(new Error("db hiccup"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await detail();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions).toEqual([expect.objectContaining({ id: V2 })]);
    expect(body.originalPrompt).toBe("A punchier launch video for Halden Cold Brew.");
    warn.mockRestore();
  });
});

describe("the library and the detail page read the same source", () => {
  it("list the same finished video with the same file; the library hides an expired one", async () => {
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
    expect(await (await detail()).json()).toEqual(expect.objectContaining({ status: "expired" }));
  });
});
