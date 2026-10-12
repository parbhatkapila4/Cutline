import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

type Processor = (job: unknown) => Promise<unknown>;
type Handler = (...args: unknown[]) => unknown;

const {
  captured,
  queueApi,
  calls,
  mockRunPipeline,
  mockPublish,
  mockIsCancelled,
  mockMarkProcessing,
  mockMarkCompleted,
  mockMarkFailed,
} = vi.hoisted(() => ({
  captured: { processor: null as Processor | null, handlers: {} as Record<string, Handler> },
  queueApi: {
    getRepeatableJobs: vi.fn(),
    removeRepeatableByKey: vi.fn(),
    getJobs: vi.fn(),
  },
  calls: [] as string[],
  mockRunPipeline: vi.fn(),
  mockPublish: vi.fn(),
  mockIsCancelled: vi.fn(),
  mockMarkProcessing: vi.fn(),
  mockMarkCompleted: vi.fn(),
  mockMarkFailed: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Queue: class {
    constructor() {
      Object.assign(this, queueApi);
    }
  },
  Worker: class {
    constructor(_name: string, processor: Processor) {
      captured.processor = processor;
    }
    on(event: string, handler: Handler) {
      captured.handlers[event] = handler;
      return this;
    }
  },
}));

vi.mock("@/lib/redis/managedRedis", () => ({
  createManagedRedis: () => ({}),
  FAIL_FAST_REDIS_OPTIONS: {},
}));

vi.mock("./cancelCheck", () => ({
  CANCELLED_JOBS_KEY: "cutline:job:cancelled",
  isJobCancelled: mockIsCancelled,
}));

vi.mock("@/lib/pipeline/orchestrator", () => ({ runPipeline: mockRunPipeline }));
vi.mock("@/lib/storage/publish", () => ({ publishRenderedVideo: mockPublish }));
vi.mock("@/lib/webhook/notify", () => ({ notifyWebhook: vi.fn() }));
vi.mock("@/lib/telemetry/renderEvents", () => ({ recordRenderEvent: vi.fn() }));
vi.mock("@/lib/utils/pipelineLogger", () => ({ logPipelineEvent: vi.fn() }));

vi.mock("@/lib/jobs/videoJobService", () => ({
  markVideoJobProcessing: mockMarkProcessing,
  markVideoJobCompleted: mockMarkCompleted,
  markVideoJobFailed: mockMarkFailed,
}));

const { getActiveJobIds, removeLegacyCleanupJobs, startVideoWorker } = await import("./videoQueue");

const JOB_ID = "job-record-1";
const blobFor = (local: string) =>
  `https://store.public.blob.vercel-storage.com/videos/${local.split("/").pop()}`;

const videoJob = (overrides: Record<string, unknown> = {}) => ({
  id: JOB_ID,
  name: "video",
  data: { input: "A short explainer about cold brew coffee.", clientId: "user-1", mode: "slideshow" },
  ...overrides,
});

const processor = () => {
  if (!captured.processor) throw new Error("worker was not started");
  return captured.processor;
};

beforeAll(() => {
  startVideoWorker();
});

beforeEach(() => {
  calls.length = 0;
  mockIsCancelled.mockReset();
  mockIsCancelled.mockResolvedValue(false);
  mockRunPipeline.mockReset();
  mockRunPipeline.mockImplementation(async () => {
    calls.push(`pipeline active=${getActiveJobIds().has(JOB_ID)}`);
    return {
      videoPath: "/temp/job-record-1.mp4",
      variations: [{ videoUrl: "/temp/job-record-1.mp4" }, { videoUrl: "/temp/job-record-1-2.mp4" }],
    };
  });
  mockPublish.mockReset();
  mockPublish.mockImplementation(async (local: string) => {
    calls.push(`publish ${local}`);
    return blobFor(local);
  });
  mockMarkProcessing.mockReset();
  mockMarkProcessing.mockImplementation(async () => {
    calls.push("row processing");
    return true;
  });
  mockMarkCompleted.mockReset();
  mockMarkCompleted.mockImplementation(async () => {
    calls.push("row completed");
    return true;
  });
  mockMarkFailed.mockReset();
  mockMarkFailed.mockResolvedValue(true);
  for (const fn of Object.values(queueApi)) fn.mockReset();
});

describe("the worker writes the job's row as it goes", () => {
  it("marks the row processing when the job starts and completed once the video is published", async () => {
    const result = await processor()(videoJob());

    expect(calls).toEqual([
      "row processing",
      "pipeline active=true",
      "publish /temp/job-record-1.mp4",
      "publish /temp/job-record-1-2.mp4",
      "row completed",
    ]);
    const published = {
      videoPath: blobFor("/temp/job-record-1.mp4"),
      variations: [
        { videoUrl: blobFor("/temp/job-record-1.mp4") },
        { videoUrl: blobFor("/temp/job-record-1-2.mp4") },
      ],
    };
    expect(mockMarkProcessing).toHaveBeenCalledWith(JOB_ID);
    expect(mockMarkCompleted).toHaveBeenCalledWith(JOB_ID, { finalUrl: published.videoPath, result: published });
    expect(result).toEqual(published);
    expect(getActiveJobIds().has(JOB_ID)).toBe(false);
  });

  it("still returns the video when the completed write keeps failing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    vi.useFakeTimers();
    try {
      mockMarkCompleted.mockRejectedValue(new Error("fetch failed"));

      const run = processor()(videoJob());
      await vi.runAllTimersAsync();

      expect(await run).toEqual(expect.objectContaining({ videoPath: blobFor("/temp/job-record-1.mp4") }));
      expect(mockMarkCompleted).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a completed write that fails once, whatever the error says", async () => {
    vi.useFakeTimers();
    try {
      mockMarkCompleted.mockRejectedValueOnce(new Error("fetch failed"));

      const run = processor()(videoJob());
      await vi.runAllTimersAsync();
      await run;

      expect(mockMarkCompleted).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not mark a cancelled job as processing", async () => {
    mockIsCancelled.mockResolvedValue(true);

    await expect(processor()(videoJob())).rejects.toThrow("Job cancelled");

    expect(mockMarkProcessing).not.toHaveBeenCalled();
    expect(mockRunPipeline).not.toHaveBeenCalled();
  });

  it("forgets the job as active when the pipeline throws", async () => {
    mockRunPipeline.mockRejectedValue(new Error("render failed"));

    await expect(processor()(videoJob())).rejects.toThrow("render failed");

    expect(getActiveJobIds().has(JOB_ID)).toBe(false);
    expect(mockMarkCompleted).not.toHaveBeenCalled();
  });

  it("records the failure reason exactly as the queue holds it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    const reason = "Veo request failed:\n  quota exceeded for project";

    captured.handlers.failed(videoJob({ failedReason: reason }), new Error(reason));

    await vi.waitFor(() => expect(mockMarkFailed).toHaveBeenCalledWith(JOB_ID, reason));
  });

  it("treats a leftover cleanup job as a no-op", async () => {
    const result = await processor()({ id: "cleanup-1", name: "cleanup", data: {} });

    expect(result).toEqual({ videoPath: "" });
    expect(mockRunPipeline).not.toHaveBeenCalled();
    expect(mockMarkProcessing).not.toHaveBeenCalled();
  });
});

describe("removeLegacyCleanupJobs", () => {
  it("removes the old repeatable schedule and any cleanup jobs left in the queue, and nothing else", async () => {
    queueApi.getRepeatableJobs.mockResolvedValue([
      { name: "cleanup", key: "repeat:cleanup" },
      { name: "video", key: "repeat:video" },
    ]);
    queueApi.removeRepeatableByKey.mockResolvedValue(true);
    const leftover = { name: "cleanup", remove: vi.fn(async () => { }) };
    const render = { name: "video", remove: vi.fn(async () => { }) };
    queueApi.getJobs.mockResolvedValue([leftover, render]);

    const removed = await removeLegacyCleanupJobs();

    expect(removed).toBe(2);
    expect(queueApi.removeRepeatableByKey).toHaveBeenCalledTimes(1);
    expect(queueApi.removeRepeatableByKey).toHaveBeenCalledWith("repeat:cleanup");
    expect(leftover.remove).toHaveBeenCalled();
    expect(render.remove).not.toHaveBeenCalled();
  });
});
