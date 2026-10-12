import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { handleDownloadGet, handleJobGet } from "./handlers";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";
import { getSpendUsd } from "@/lib/cost/budget";
import { getUserFriendlyErrorMessage, mapFailedReasonToFailureCode } from "@/lib/utils/error";
import { getVideoQueueName } from "@/lib/queue/queueName";

const {
  mockAdd,
  mockGetJob,
  mockGetUserPlan,
  mockCreateVideoJob,
  mockFindRow,
  mockDeleteOpenRow,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockGetJob: vi.fn(),
  mockGetUserPlan: vi.fn(),
  mockCreateVideoJob: vi.fn<(insert: Record<string, unknown>) => Promise<{ id: string }>>(
    async () => ({ id: "row-1" }),
  ),
  mockFindRow: vi.fn(),
  mockDeleteOpenRow: vi.fn(async () => true),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd, getJob: mockGetJob }),
  getQueueWaitMetrics: vi.fn(async () => null),
  startVideoWorker: vi.fn(() => ({})),
  cancelJob: vi.fn(),
  listRecentJobs: vi.fn(async () => []),
}));

vi.mock("@/lib/queue/heartbeat", () => ({
  isWorkerAlive: vi.fn(async () => true),
  startWorkerHeartbeat: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "job-record-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
  getForwardedClientIp: () => null,
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  createVideoJob: mockCreateVideoJob,
  findVideoJobForOwners: mockFindRow,
  deleteOpenVideoJob: mockDeleteOpenRow,
  isTerminalVideoJobStatus: (status: string) => status === "completed" || status === "failed",
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "job-record-user" } })) } },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: mockGetUserPlan,
}));

vi.mock("@/lib/regen/remixFromJob", () => ({
  mergeRemixFromJob: vi.fn(async (body: Record<string, unknown>) => ({
    ok: true,
    merged: body,
    remixFromJobId: undefined,
  })),
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

const USER = "job-record-user";
const JOB_ID = "3c4b1a8e-5f0d-4c51-9a7e-2b6f2f7d9e10";
const VIDEO = "https://store.public.blob.vercel-storage.com/videos/job-record.mp4";
const SECOND_TAKE = "https://store.public.blob.vercel-storage.com/videos/job-record-2.mp4";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "row-1",
  owner_type: "user",
  owner_id: USER,
  prompt: "A short explainer about cold brew coffee.",
  status: "completed",
  preview_url: null,
  final_url: VIDEO,
  created_at: new Date("2026-10-01T00:00:00Z"),
  queue_job_id: JOB_ID,
  job_data: { input: "A short explainer about cold brew coffee.", clientId: USER, durationSeconds: 30 },
  result: { videoPath: VIDEO },
  error: null,
  queue_name: "video-generation",
  started_at: new Date("2026-10-01T00:01:00Z"),
  finished_at: new Date("2026-10-01T00:05:00Z"),
  ...overrides,
});

const queueJob = (state: string, overrides: Record<string, unknown> = {}) => ({
  id: JOB_ID,
  name: "video",
  data: { clientId: USER, input: "A short explainer about cold brew coffee." },
  getState: async () => state,
  ...overrides,
});

const status = () => handleJobGet(new Request(`http://localhost/api/generate/${JOB_ID}`), JOB_ID);

const download = (query = "") =>
  handleDownloadGet(new Request(`http://localhost/api/generate/${JOB_ID}/download${query}`), JOB_ID);

const generate = (headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        input: "A short explainer about cold brew coffee in one sentence.",
        mode: "slideshow",
        durationSeconds: 30,
      }),
    }),
  );

beforeEach(() => {
  fakeRedis.store.clear();
  mockAdd.mockReset();
  mockAdd.mockImplementation(async (_name: string, _data: unknown, opts: { jobId: string }) => ({ id: opts.jobId }));
  mockGetJob.mockReset();
  mockGetJob.mockResolvedValue(undefined);
  mockGetUserPlan.mockReset();
  mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);
  mockCreateVideoJob.mockReset();
  mockCreateVideoJob.mockResolvedValue({ id: "row-1" });
  mockFindRow.mockReset();
  mockFindRow.mockResolvedValue(null);
  mockDeleteOpenRow.mockClear();
});

describe("GET /api/generate/[jobId] - a finished job is answered from video_jobs", () => {
  it("answers a finished video from its row after the queue has dropped the job", async () => {
    mockFindRow.mockResolvedValue(
      row({
        result: {
          videoPath: VIDEO,
          message: "Rendered with stock footage.",
          cost: { llm: 0.01, tts: 0.02, video: 0, images: 0.03, total: 0.06 },
          qualityReport: { passed: true, score: 0.9, issues: [], extra: "dropped" },
        },
      }),
    );

    const res = await status();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "completed",
      videoUrl: VIDEO,
      message: "Rendered with stock footage.",
      cost: { llm: 0.01, tts: 0.02, video: 0, images: 0.03, total: 0.06 },
      qualityReport: { passed: true, score: 0.9, issues: [] },
    });
    expect(mockFindRow).toHaveBeenCalledWith(JOB_ID, [USER]);
  });

  it("returns every variation stored on the row", async () => {
    const variations = [{ videoUrl: VIDEO }, { videoUrl: SECOND_TAKE }];
    mockFindRow.mockResolvedValue(row({ result: { videoPath: VIDEO, variations } }));

    const body = await (await status()).json();

    expect(body.videoUrl).toBe(VIDEO);
    expect(body.variations).toEqual(variations);
  });

  it("reports a failed render with the message the queue would have produced", async () => {
    const reason = "ElevenLabs request failed with status 500";
    mockFindRow.mockResolvedValue(row({ status: "failed", final_url: null, result: null, error: reason }));

    const body = await (await status()).json();

    expect(body).toEqual({
      status: "failed",
      error: getUserFriendlyErrorMessage(reason),
      failureCode: mapFailedReasonToFailureCode(reason),
    });
  });

  it("falls back to the generic failure when the row has no reason, as for a lost job", async () => {
    mockFindRow.mockResolvedValue(row({ status: "failed", final_url: null, result: null, error: null }));

    const body = await (await status()).json();

    expect(body.status).toBe("failed");
    expect(body.error).toBe(getUserFriendlyErrorMessage("Job failed."));
  });

  it("reports a cancelled render as cancelled", async () => {
    mockFindRow.mockResolvedValue(row({ status: "failed", final_url: null, result: null, error: "Job cancelled" }));

    expect(await (await status()).json()).toEqual({ status: "cancelled" });
  });

  it("says the file was cleaned up once retention has removed it", async () => {
    mockFindRow.mockResolvedValue(row({ final_url: null }));

    const res = await status();

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("VIDEO_NOT_FOUND");
  });

  it("does not show a job the signed-in user does not own", async () => {
    const res = await status();

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("JOB_NOT_FOUND");
    expect(mockFindRow).toHaveBeenCalledWith(JOB_ID, [USER]);
  });

  it("prefers a completed row over a queue job that failed after the video was recorded", async () => {
    mockGetJob.mockResolvedValue(queueJob("failed", { failedReason: "job stalled more than allowable limit" }));
    mockFindRow.mockResolvedValue(row());

    const body = await (await status()).json();

    expect(body).toEqual(expect.objectContaining({ status: "completed", videoUrl: VIDEO }));
  });
});

describe("GET /api/generate/[jobId] - a running job is answered from the queue", () => {
  it("returns live progress without reading the row", async () => {
    mockGetJob.mockResolvedValue(
      queueJob("active", { progress: { stage: "rendering", detail: "Scene 3 of 6", startedAt: "2026-10-01T00:02:00Z" } }),
    );

    const body = await (await status()).json();

    expect(body).toEqual(
      expect.objectContaining({ status: "processing", stage: "rendering", stageDetail: "Scene 3 of 6", workerOnline: true }),
    );
    expect(mockFindRow).not.toHaveBeenCalled();
  });

  it("uses the queue's result while the row has not recorded the completion yet", async () => {
    mockGetJob.mockResolvedValue(queueJob("completed", { returnvalue: { videoPath: SECOND_TAKE } }));
    mockFindRow.mockResolvedValue(row({ status: "processing", final_url: null, result: null }));

    const body = await (await status()).json();

    expect(body).toEqual(expect.objectContaining({ status: "completed", videoUrl: SECOND_TAKE }));
  });

  it("still hides another user's queue job", async () => {
    mockGetJob.mockResolvedValue(queueJob("active", { data: { clientId: "someone-else" } }));

    const res = await status();

    expect(res.status).toBe(404);
    expect(mockFindRow).not.toHaveBeenCalled();
  });
});

describe("GET /api/generate/[jobId]/download - a finished job is served from video_jobs", () => {
  it("redirects to the stored file after the queue has dropped the job", async () => {
    mockFindRow.mockResolvedValue(row());

    const res = await download();

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(`${VIDEO}?download=1`);
  });

  it("picks the requested variation from the row", async () => {
    mockFindRow.mockResolvedValue(
      row({ result: { videoPath: VIDEO, variations: [{ videoUrl: VIDEO }, { videoUrl: SECOND_TAKE }] } }),
    );

    const res = await download("?variant=1");

    expect(res.headers.get("Location")).toBe(`${SECOND_TAKE}?download=1`);
  });

  it("returns 404 once retention has removed the file", async () => {
    mockFindRow.mockResolvedValue(row({ final_url: null }));

    const res = await download();

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("VIDEO_NOT_FOUND");
  });

  it("returns 404 for a job that is in neither the queue nor the table", async () => {
    const res = await download();

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("JOB_NOT_FOUND");
  });

  it("refuses a job that is still rendering", async () => {
    mockGetJob.mockResolvedValue(queueJob("active"));

    const res = await download();

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("JOB_NOT_READY");
    expect(mockFindRow).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate - the row is written once, with what it needs", () => {
  it("stores the job's settings and queue name on the row, under the id it queues", async () => {
    const res = await generate();

    expect(res.status).toBe(200);
    const { jobId } = await res.json();
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][2]).toEqual({ jobId });
    expect(mockCreateVideoJob).toHaveBeenCalledTimes(1);
    expect(mockCreateVideoJob.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        owner_id: USER,
        status: "queued",
        queue_job_id: jobId,
        queue_name: getVideoQueueName(),
        job_data: expect.objectContaining({ mode: "slideshow", durationSeconds: 30, clientId: USER }),
      }),
    );
  });

  it("removes its row and keeps no reservation when the job cannot be queued", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    mockAdd.mockRejectedValue(new Error("redis unavailable"));

    const res = await generate();

    expect(res.status).toBe(500);
    const written = mockCreateVideoJob.mock.calls[0][0] as { queue_job_id: string };
    expect(mockDeleteOpenRow).toHaveBeenCalledWith(written.queue_job_id);
    expect(await getSpendUsd(USER)).toBe(0);
  });

  it("writes one row for two requests that share an idempotency key", async () => {
    let finishFirstAdd: () => void = () => { };
    mockAdd.mockImplementationOnce(
      (_name: string, _data: unknown, opts: { jobId: string }) =>
        new Promise((resolve) => { finishFirstAdd = () => resolve({ id: opts.jobId }); }),
    );
    const key = { "x-idempotency-key": "job-record-replay" };

    const first = generate(key);
    await vi.waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    const second = generate(key);
    await new Promise((r) => setTimeout(r, 50));
    finishFirstAdd();
    const [firstRes, secondRes] = await Promise.all([first, second]);

    const firstId = (await firstRes.json()).jobId;
    expect((await secondRes.json()).jobId).toBe(firstId);
    expect(mockCreateVideoJob).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });
});
