import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockListOpen, mockMarkProcessing, mockMarkCompleted, mockMarkFailed } = vi.hoisted(() => ({
  mockListOpen: vi.fn(),
  mockMarkProcessing: vi.fn(async () => true),
  mockMarkCompleted: vi.fn(async () => true),
  mockMarkFailed: vi.fn(async () => true),
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  listOpenVideoJobs: mockListOpen,
  markVideoJobProcessing: mockMarkProcessing,
  markVideoJobCompleted: mockMarkCompleted,
  markVideoJobFailed: mockMarkFailed,
}));

const { reconcileOpenVideoJobs, OPEN_JOB_GRACE_MINUTES } = await import("./reconcile");

const PROD = "video-generation";
const DEV = "video-generation-dev";

type FakeJob = { state: string; returnvalue?: unknown; failedReason?: string };

const openRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id: `row-${id}`,
  owner_type: "user",
  owner_id: "user-1",
  prompt: "A prompt",
  status: "processing",
  preview_url: null,
  final_url: null,
  created_at: new Date("2026-10-01T00:00:00Z"),
  queue_job_id: id,
  job_data: null,
  result: null,
  error: null,
  queue_name: PROD,
  started_at: null,
  finished_at: null,
  ...overrides,
});

const fakeQueue = (name: string, jobs: Record<string, FakeJob>) => {
  const getJob = vi.fn(async (id: string) => {
    const job = jobs[id];
    if (!job) return undefined;
    return {
      id,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      getState: async () => job.state,
    };
  });
  return { name, queue: { getJob } as never, getJob };
};

beforeEach(() => {
  mockListOpen.mockReset();
  mockMarkProcessing.mockClear();
  mockMarkCompleted.mockClear();
  mockMarkFailed.mockClear();
});

describe("reconcileOpenVideoJobs", () => {
  it("asks only for open rows past the grace period that belong to the queues it was given", async () => {
    mockListOpen.mockResolvedValue([]);

    await reconcileOpenVideoJobs({ queues: [fakeQueue(PROD, {})] });

    expect(mockListOpen).toHaveBeenCalledWith(
      expect.objectContaining({ olderThanMinutes: OPEN_JOB_GRACE_MINUTES, queueNames: [PROD] }),
    );
  });

  it("copies a finished job's outcome onto its row", async () => {
    const result = {
      videoPath: "https://store.public.blob.vercel-storage.com/videos/done.mp4",
      message: "Done",
    };
    mockListOpen.mockResolvedValue([openRow("done"), openRow("broke", { status: "queued" })]);
    const prod = fakeQueue(PROD, {
      done: { state: "completed", returnvalue: result },
      broke: { state: "failed", failedReason: "TTS provider returned 500" },
    });

    const summary = await reconcileOpenVideoJobs({ queues: [prod] });

    expect(mockMarkCompleted).toHaveBeenCalledWith("done", { finalUrl: result.videoPath, result });
    expect(mockMarkFailed).toHaveBeenCalledWith("broke", "TTS provider returned 500");
    expect(summary).toEqual(expect.objectContaining({ checked: 2, completed: 1, failed: 1 }));
  });

  it("moves a queued row to processing once the job is running, and leaves a waiting job alone", async () => {
    mockListOpen.mockResolvedValue([
      openRow("running", { status: "queued" }),
      openRow("waiting", { status: "queued" }),
    ]);
    const prod = fakeQueue(PROD, {
      running: { state: "active" },
      waiting: { state: "waiting" },
    });

    const summary = await reconcileOpenVideoJobs({ queues: [prod] });

    expect(mockMarkProcessing).toHaveBeenCalledTimes(1);
    expect(mockMarkProcessing).toHaveBeenCalledWith("running");
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(summary).toEqual(expect.objectContaining({ started: 1, live: 1 }));
  });

  it("fails a row whose job is gone from the queue that row was written for", async () => {
    mockListOpen.mockResolvedValue([openRow("orphan", { status: "queued" })]);

    const summary = await reconcileOpenVideoJobs({ queues: [fakeQueue(PROD, {})] });

    expect(mockMarkFailed).toHaveBeenCalledWith("orphan", null);
    expect(summary.lost).toBe(1);
  });

  it("only looks in the row's own queue, so a dev job never settles a prod row", async () => {
    mockListOpen.mockResolvedValue([openRow("prod-job")]);
    const prod = fakeQueue(PROD, {});
    const dev = fakeQueue(DEV, { "prod-job": { state: "completed", returnvalue: { videoPath: "x" } } });

    await reconcileOpenVideoJobs({ queues: [prod, dev] });

    expect(dev.getJob).not.toHaveBeenCalled();
    expect(mockMarkCompleted).not.toHaveBeenCalled();
    expect(mockMarkFailed).toHaveBeenCalledWith("prod-job", null);
  });

  it("leaves an old row with no queue name alone when its job is missing, unless told to fail it", async () => {
    mockListOpen.mockResolvedValue([openRow("legacy", { queue_name: null })]);
    const prod = fakeQueue(PROD, {});

    const routine = await reconcileOpenVideoJobs({ queues: [prod] });

    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(routine.unresolved).toBe(1);

    const oneOff = await reconcileOpenVideoJobs({ queues: [prod], failUnscopedMissing: true });

    expect(mockMarkFailed).toHaveBeenCalledWith("legacy", null);
    expect(oneOff.lost).toBe(1);
  });

  it("searches every queue it was given for an old row with no queue name", async () => {
    const result = { videoPath: "https://store.public.blob.vercel-storage.com/videos/legacy.mp4" };
    mockListOpen.mockResolvedValue([openRow("legacy", { queue_name: null })]);
    const prod = fakeQueue(PROD, {});
    const dev = fakeQueue(DEV, { legacy: { state: "completed", returnvalue: result } });

    const summary = await reconcileOpenVideoJobs({ queues: [prod, dev], failUnscopedMissing: true });

    expect(mockMarkCompleted).toHaveBeenCalledWith("legacy", { finalUrl: result.videoPath, result });
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(summary.completed).toBe(1);
  });

  it("writes nothing on a dry run but reports what it would change", async () => {
    mockListOpen.mockResolvedValue([openRow("done"), openRow("orphan")]);
    const prod = fakeQueue(PROD, { done: { state: "completed", returnvalue: { videoPath: "x" } } });

    const summary = await reconcileOpenVideoJobs({ queues: [prod], apply: false });

    expect(mockMarkCompleted).not.toHaveBeenCalled();
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(summary).toEqual(expect.objectContaining({ checked: 2, completed: 1, lost: 1 }));
  });

  it("marks a row completed when its job is gone but its video was published", async () => {
    const published = { videoPath: "https://store.public.blob.vercel-storage.com/videos/found.mp4" };
    const findPublishedVideo = vi.fn(async () => published);
    mockListOpen.mockResolvedValue([openRow("found")]);

    const summary = await reconcileOpenVideoJobs({ queues: [fakeQueue(PROD, {})], findPublishedVideo });

    expect(findPublishedVideo).toHaveBeenCalledWith("found");
    expect(mockMarkCompleted).toHaveBeenCalledWith("found", { finalUrl: published.videoPath, result: published });
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(summary).toEqual(expect.objectContaining({ recovered: 1, lost: 0 }));
  });

  it("marks the row failed when no published video turns up", async () => {
    mockListOpen.mockResolvedValue([openRow("nothing")]);

    const summary = await reconcileOpenVideoJobs({
      queues: [fakeQueue(PROD, {})],
      findPublishedVideo: async () => null,
    });

    expect(mockMarkFailed).toHaveBeenCalledWith("nothing", null);
    expect(summary).toEqual(expect.objectContaining({ recovered: 0, lost: 1 }));
  });

  it("leaves the row open when it cannot check for a published video", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    mockListOpen.mockResolvedValue([openRow("unknown")]);

    const summary = await reconcileOpenVideoJobs({
      queues: [fakeQueue(PROD, {})],
      findPublishedVideo: async () => {
        throw new Error("blob list failed");
      },
    });

    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(mockMarkCompleted).not.toHaveBeenCalled();
    expect(summary.errors).toBe(1);
  });

  it("does not look for a published video for an unscoped row it is leaving alone", async () => {
    const findPublishedVideo = vi.fn(async () => null);
    mockListOpen.mockResolvedValue([openRow("legacy", { queue_name: null })]);

    await reconcileOpenVideoJobs({ queues: [fakeQueue(PROD, {})], findPublishedVideo });

    expect(findPublishedVideo).not.toHaveBeenCalled();
  });

  it("keeps going past a row it cannot settle", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    mockListOpen.mockResolvedValue([openRow("first"), openRow("second")]);
    mockMarkFailed.mockRejectedValueOnce(new Error("db down"));

    const summary = await reconcileOpenVideoJobs({ queues: [fakeQueue(PROD, {})] });

    expect(mockMarkFailed).toHaveBeenCalledTimes(2);
    expect(summary).toEqual(expect.objectContaining({ errors: 1, lost: 1 }));
  });
});
