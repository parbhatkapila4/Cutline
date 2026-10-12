import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetJob, mockFindRow } = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
  mockFindRow: vi.fn(),
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ getJob: mockGetJob }),
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  findVideoJobForOwners: mockFindRow,
}));

const { mergeRemixFromJob } = await import("./remixFromJob");

const USER = "remix-user";
const SOURCE = "6a1f0c9e-2b7d-4f3a-8e5c-0d9b8a7c6e5f";

const sourceSettings = {
  input: "A short explainer about cold brew coffee.",
  clientId: USER,
  durationSeconds: 45,
  mode: "talking_object",
  aspectRatio: "9:16",
  captions: "on",
  assetIds: ["asset-1"],
};

const remix = (body: Record<string, unknown>, caller: { userId?: string } = { userId: USER }) =>
  mergeRemixFromJob(
    { remixFromJobId: SOURCE, ...body },
    { userId: caller.userId, request: new Request("http://localhost/api/generate") },
  );

beforeEach(() => {
  mockGetJob.mockReset();
  mockGetJob.mockResolvedValue(undefined);
  mockFindRow.mockReset();
  mockFindRow.mockResolvedValue(null);
});

describe("mergeRemixFromJob - the source settings come from video_jobs", () => {
  it("remixes a finished video from its row after the queue has dropped the job", async () => {
    mockFindRow.mockResolvedValue({ queue_job_id: SOURCE, owner_id: USER, job_data: sourceSettings });

    const res = await remix({ input: "Make it about iced tea instead." });

    expect(res).toEqual({
      ok: true,
      remixFromJobId: SOURCE,
      merged: {
        input: "Make it about iced tea instead.",
        durationSeconds: 45,
        mode: "talking_object",
        aspectRatio: "9:16",
        captions: "on",
        assetIds: ["asset-1"],
      },
    });
    expect(mockFindRow).toHaveBeenCalledWith(SOURCE, [USER]);
    expect(mockGetJob).not.toHaveBeenCalled();
  });

  it("falls back to the queue for an older row that has no stored settings", async () => {
    mockFindRow.mockResolvedValue({ queue_job_id: SOURCE, owner_id: USER, job_data: null });
    mockGetJob.mockResolvedValue({ data: { ...sourceSettings, durationSeconds: 30 } });

    const res = await remix({});

    expect(res.ok).toBe(true);
    expect(res.ok && res.merged.durationSeconds).toBe(30);
  });

  it("refuses another user's video", async () => {
    mockGetJob.mockResolvedValue({ data: { ...sourceSettings, clientId: "someone-else" } });

    const res = await remix({});

    expect(res).toEqual({ ok: false, message: "Cannot remix this job (wrong account or session)." });
  });

  it("reports a source that is in neither the table nor the queue", async () => {
    expect(await remix({})).toEqual({ ok: false, message: "Source job not found." });
  });

  it("does not read the table without a signed-in user", async () => {
    mockGetJob.mockResolvedValue({ data: sourceSettings });

    const res = await remix({}, {});

    expect(mockFindRow).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: false, message: "Cannot remix this job (wrong account or session)." });
  });
});
