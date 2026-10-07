import { describe, it, expect, vi, beforeEach } from "vitest";
import { purgeUserVideo } from "./purgeUserVideo";

const { mockGetJob, mockCancelJob, mockFindRow, mockDeleteRows, mockDeleteBlob, mockDbConfigured } =
  vi.hoisted(() => ({
    mockGetJob: vi.fn(),
    mockCancelJob: vi.fn(),
    mockFindRow: vi.fn(),
    mockDeleteRows: vi.fn(),
    mockDeleteBlob: vi.fn(),
    mockDbConfigured: vi.fn(() => true),
  }));

vi.mock("fs", () => ({ default: { existsSync: () => false } }));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ getJob: mockGetJob }),
  cancelJob: mockCancelJob,
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseConfigured: mockDbConfigured,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  findVideoJobForOwners: mockFindRow,
  deleteVideoJobRelatedDbRows: mockDeleteRows,
}));

vi.mock("@/lib/preview/artifacts", () => ({
  deletePreviewArtifactsFromRedis: vi.fn(async () => { }),
}));

vi.mock("@/lib/regen/snapshotStore", () => ({
  deleteRegenSnapshot: vi.fn(async () => { }),
}));

vi.mock("@/lib/storage/cleanup", () => ({
  cleanupJobArtifacts: vi.fn(async () => { }),
}));

vi.mock("@/lib/storage/publish", () => ({
  deletePublishedBlob: mockDeleteBlob,
}));

const USER = "user-a";
const OTHER_USER = "user-b";
const JOB_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "22222222-2222-4222-8222-222222222222";
const BLOB = `https://store.public.blob.vercel-storage.com/videos/${JOB_ID}.mp4`;
const VARIATION_BLOB = `https://store.public.blob.vercel-storage.com/videos/${JOB_ID}-v2.mp4`;

type Row = {
  id: string;
  queue_job_id: string | null;
  owner_id: string;
  status: string;
  final_url: string | null;
  preview_url: string | null;
};

let table: Row[] = [];

const matches = (row: Row, id: string, ownerIds: string[]) =>
  (row.queue_job_id === id || row.id === id) && ownerIds.includes(row.owner_id);

const videoRow = (overrides: Partial<Row> = {}): Row => ({
  id: ROW_ID,
  queue_job_id: JOB_ID,
  owner_id: USER,
  status: "completed",
  final_url: BLOB,
  preview_url: null,
  ...overrides,
});

const queueJob = (overrides: Record<string, unknown> = {}) => ({
  name: "video",
  data: { clientId: USER },
  returnvalue: { videoPath: BLOB },
  remove: vi.fn(async () => { }),
  ...overrides,
});

beforeEach(() => {
  table = [];
  mockDbConfigured.mockReset();
  mockDbConfigured.mockReturnValue(true);
  mockGetJob.mockReset();
  mockGetJob.mockResolvedValue(undefined);
  mockCancelJob.mockReset();
  mockCancelJob.mockResolvedValue({ ok: true });
  mockDeleteBlob.mockReset();
  mockDeleteBlob.mockResolvedValue(undefined);
  mockFindRow.mockReset();
  mockFindRow.mockImplementation(
    async (id: string, ownerIds: string[]) => table.find((row) => matches(row, id, ownerIds)) ?? null,
  );
  mockDeleteRows.mockReset();
  mockDeleteRows.mockImplementation(async (id: string, ownerIds: string[]) => {
    table = table.filter((row) => !matches(row, id, ownerIds));
  });
});

describe("purgeUserVideo - a row with no BullMQ job behind it", () => {
  it("deletes a listed row whose job has left the queue", async () => {
    table = [videoRow()];

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(table).toEqual([]);
    expect(mockDeleteBlob.mock.calls).toEqual([[BLOB]]);
  });

  it("deletes an expired row without calling the blob store", async () => {
    table = [videoRow({ final_url: null })];

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(table).toEqual([]);
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });

  it("deletes a row that never finished and has no job left", async () => {
    table = [videoRow({ status: "queued", final_url: null })];

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(table).toEqual([]);
  });
});

describe("purgeUserVideo - ownership", () => {
  it("refuses a row that belongs to another account and leaves it in place", async () => {
    table = [videoRow({ owner_id: OTHER_USER })];

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: false, status: 404, error: "Video not found." });
    expect(table).toHaveLength(1);
    expect(mockDeleteRows).not.toHaveBeenCalled();
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });

  it("refuses a BullMQ job that belongs to another account", async () => {
    const job = queueJob({ data: { clientId: OTHER_USER } });
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: false, status: 404, error: "Video not found." });
    expect(job.remove).not.toHaveBeenCalled();
    expect(mockDeleteRows).not.toHaveBeenCalled();
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });

  it("refuses when the row is the caller's but the job under that id is not", async () => {
    table = [videoRow()];
    const job = queueJob({ data: { clientId: OTHER_USER } });
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: false, status: 404, error: "Video not found." });
    expect(job.remove).not.toHaveBeenCalled();
    expect(table).toHaveLength(1);
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });

  it("answers 401 and looks nothing up without a signed-in user", async () => {
    table = [videoRow()];

    const result = await purgeUserVideo(JOB_ID, []);

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(mockFindRow).not.toHaveBeenCalled();
    expect(mockGetJob).not.toHaveBeenCalled();
    expect(table).toHaveLength(1);
  });

  it("scopes both the lookup and the delete to the caller", async () => {
    table = [videoRow()];

    await purgeUserVideo(JOB_ID, [USER]);

    expect(mockFindRow).toHaveBeenCalledWith(JOB_ID, [USER]);
    expect(mockDeleteRows).toHaveBeenCalledWith(JOB_ID, [USER]);
  });
});

describe("purgeUserVideo - what gets removed", () => {
  it("removes the job, then the row, then each file once", async () => {
    table = [videoRow()];
    const job = queueJob({
      returnvalue: { videoPath: BLOB, variations: [{ videoUrl: BLOB }, { videoUrl: VARIATION_BLOB }] },
    });
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(table).toEqual([]);
    expect(mockDeleteBlob.mock.calls).toEqual([[BLOB], [VARIATION_BLOB]]);
    const removed = job.remove.mock.invocationCallOrder[0];
    const rowDeleted = mockDeleteRows.mock.invocationCallOrder[0];
    const blobDeleted = mockDeleteBlob.mock.invocationCallOrder[0];
    expect(removed).toBeLessThan(rowDeleted);
    expect(rowDeleted).toBeLessThan(blobDeleted);
  });

  it("still deletes a job that has no row", async () => {
    const job = queueJob();
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(job.remove).toHaveBeenCalledTimes(1);
    expect(mockDeleteBlob.mock.calls).toEqual([[BLOB]]);
  });

  it("finds the queue job through the row when addressed by row id", async () => {
    table = [videoRow()];
    const job = queueJob();
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(ROW_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(mockGetJob).toHaveBeenCalledWith(JOB_ID);
    expect(job.remove).toHaveBeenCalledTimes(1);
    expect(table).toEqual([]);
  });

  it("works from the queue alone when no database is configured", async () => {
    mockDbConfigured.mockReturnValue(false);
    const job = queueJob();
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toEqual({ ok: true });
    expect(mockFindRow).not.toHaveBeenCalled();
    expect(job.remove).toHaveBeenCalledTimes(1);
  });
});

describe("purgeUserVideo - failures", () => {
  it("keeps the file when the row cannot be deleted", async () => {
    table = [videoRow()];
    mockDeleteRows.mockRejectedValue(new Error("db down"));

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(table).toHaveLength(1);
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });

  it("cancels a render that is still running and keeps its row", async () => {
    table = [videoRow({ status: "queued", final_url: null })];
    const job = queueJob({
      returnvalue: undefined,
      remove: vi.fn(async () => {
        throw new Error(`Job ${JOB_ID} could not be removed because it is locked by another worker`);
      }),
    });
    mockGetJob.mockResolvedValue(job);

    const result = await purgeUserVideo(JOB_ID, [USER]);

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(mockCancelJob).toHaveBeenCalledWith(JOB_ID);
    expect(mockDeleteRows).not.toHaveBeenCalled();
    expect(table).toHaveLength(1);
  });
});
