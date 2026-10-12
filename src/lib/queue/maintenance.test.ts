import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockRunCleanup, mockReconcile, mockFindPublished, activeJobIds, fakeQueue } = vi.hoisted(() => ({
  mockRunCleanup: vi.fn(),
  mockFindPublished: vi.fn(),
  mockReconcile: vi.fn(),
  activeJobIds: new Set<string>(["job-rendering"]),
  fakeQueue: { name: "fake-queue" },
}));

vi.mock("@/lib/storage/cleanup", () => ({ runCleanup: mockRunCleanup }));
vi.mock("@/lib/jobs/reconcile", () => ({ reconcileOpenVideoJobs: mockReconcile }));
vi.mock("@/lib/storage/publish", () => ({ findPublishedVideoForJob: mockFindPublished }));
vi.mock("@/lib/queue/videoQueue", () => ({
  getActiveJobIds: () => activeJobIds,
  getVideoQueue: () => fakeQueue,
  getVideoQueueName: () => "video-generation",
}));

const { getMaintenanceIntervalMs, runMaintenance, startMaintenanceLoop, stopMaintenanceLoop } = await import(
  "./maintenance"
);

const EMPTY_CLEANUP = { videosDeleted: 0, uploadsDeleted: 0, tempImagesDeleted: 0, errors: [] };
const EMPTY_SUMMARY = {
  checked: 0,
  completed: 0,
  failed: 0,
  started: 0,
  recovered: 0,
  lost: 0,
  live: 0,
  unresolved: 0,
  errors: 0,
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => { });
  mockRunCleanup.mockReset();
  mockRunCleanup.mockResolvedValue(EMPTY_CLEANUP);
  mockReconcile.mockReset();
  mockReconcile.mockResolvedValue(EMPTY_SUMMARY);
});

afterEach(() => {
  stopMaintenanceLoop();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("runMaintenance", () => {
  it("sweeps around the jobs that are rendering, then reconciles this worker's queue", async () => {
    await runMaintenance();

    expect(mockRunCleanup).toHaveBeenCalledWith({ skipJobIds: activeJobIds });
    expect(mockReconcile).toHaveBeenCalledWith({
      queues: [{ name: "video-generation", queue: fakeQueue }],
      findPublishedVideo: mockFindPublished,
    });
  });

  it("joins a run that is already in progress instead of starting a second one", async () => {
    let finishCleanup: () => void = () => { };
    mockRunCleanup.mockImplementationOnce(
      () => new Promise((resolve) => { finishCleanup = () => resolve(EMPTY_CLEANUP); }),
    );

    const first = runMaintenance();
    const second = runMaintenance();
    finishCleanup();
    await Promise.all([first, second]);

    expect(mockRunCleanup).toHaveBeenCalledTimes(1);
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });

  it("still reconciles when the sweep throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    mockRunCleanup.mockRejectedValue(new Error("blob list failed"));

    await expect(runMaintenance()).resolves.toBeUndefined();

    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });
});

describe("startMaintenanceLoop", () => {
  it("runs once at start, then on every interval until stopped", async () => {
    vi.useFakeTimers();

    startMaintenanceLoop();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockRunCleanup).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(getMaintenanceIntervalMs());
    expect(mockRunCleanup).toHaveBeenCalledTimes(2);

    stopMaintenanceLoop();
    await vi.advanceTimersByTimeAsync(getMaintenanceIntervalMs() * 3);
    expect(mockRunCleanup).toHaveBeenCalledTimes(2);
  });

  it("starts only one loop per process", async () => {
    vi.useFakeTimers();

    startMaintenanceLoop();
    startMaintenanceLoop();
    await vi.advanceTimersByTimeAsync(getMaintenanceIntervalMs());

    expect(mockRunCleanup).toHaveBeenCalledTimes(2);
  });
});

describe("getMaintenanceIntervalMs", () => {
  it("defaults to an hour and follows CLEANUP_INTERVAL_HOURS, never below a minute", () => {
    expect(getMaintenanceIntervalMs()).toBe(60 * 60 * 1000);
    vi.stubEnv("CLEANUP_INTERVAL_HOURS", "6");
    expect(getMaintenanceIntervalMs()).toBe(6 * 60 * 60 * 1000);
    vi.stubEnv("CLEANUP_INTERVAL_HOURS", "0.001");
    expect(getMaintenanceIntervalMs()).toBe(60 * 1000);
    vi.stubEnv("CLEANUP_INTERVAL_HOURS", "soon");
    expect(getMaintenanceIntervalMs()).toBe(60 * 60 * 1000);
  });
});
