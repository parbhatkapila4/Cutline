import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { PLAN_CONFIGS } from "@/lib/plans";
import { fakeRedis } from "@/test/fakeRedis";
import {
  getCinematicSecondsUsed,
  getSpendUsd,
  monthlyBudgetUsd,
  recordSpendUsd,
} from "@/lib/cost/budget";
import { getVideosUsedThisMonth } from "@/lib/usage";

const {
  mockGetJob,
  mockAdd,
  mockInterpretEdit,
  mockGetUserPlan,
  mockCreateVideoJob,
  mockFindRow,
  mockDeleteOpenRow,
  mockResolveAssets,
} = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
  mockAdd: vi.fn(),
  mockInterpretEdit: vi.fn(),
  mockGetUserPlan: vi.fn(),
  mockCreateVideoJob: vi.fn<(insert: Record<string, unknown>) => Promise<{ id: string }>>(
    async () => ({ id: "row-1" }),
  ),
  mockFindRow: vi.fn(),
  mockDeleteOpenRow: vi.fn(async () => true),
  mockResolveAssets: vi.fn(),
}));

vi.mock("@/lib/assets/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/assets/storage")>()),
  resolveAssetRecords: mockResolveAssets,
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ getJob: mockGetJob, add: mockAdd }),
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "edit-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "edit-user" } })) } },
}));

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: mockGetUserPlan,
}));

vi.mock("@/lib/edit/interpreter", () => ({
  interpretEdit: mockInterpretEdit,
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  createVideoJob: mockCreateVideoJob,
  findVideoJobForOwners: mockFindRow,
  deleteOpenVideoJob: mockDeleteOpenRow,
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

const USER = "edit-user";
const JOB_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const SOURCE_INPUT = "A short explainer about cold brew coffee.";

const completedJob = (data: Record<string, unknown>) => ({
  name: "video",
  data: { clientId: USER, input: SOURCE_INPUT, ...data },
  getState: async () => "completed",
});

const completedRow = (jobData: Record<string, unknown> | null) => ({
  id: "source-row",
  owner_type: "user",
  owner_id: USER,
  prompt: SOURCE_INPUT,
  status: "completed",
  preview_url: null,
  final_url: "https://store.public.blob.vercel-storage.com/videos/source.mp4",
  created_at: new Date("2026-10-01T00:00:00Z"),
  queue_job_id: JOB_ID,
  job_data: jobData === null ? null : { clientId: USER, input: SOURCE_INPUT, ...jobData },
  result: null,
  error: null,
  queue_name: "video-generation",
  started_at: null,
  finished_at: new Date("2026-10-01T00:05:00Z"),
});

const useSource = (jobData: Record<string, unknown>) => {
  mockFindRow.mockResolvedValue(completedRow(jobData));
};

const edit = () =>
  POST(
    new Request(`http://localhost/api/dashboard/videos/${JOB_ID}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Make it punchier." }),
    }),
    { params: Promise.resolve({ jobId: JOB_ID }) },
  );

beforeEach(() => {
  fakeRedis.store.clear();
  mockGetJob.mockReset();
  mockAdd.mockReset();
  mockAdd.mockResolvedValue({ id: "edited-job-1" });
  mockInterpretEdit.mockReset();
  mockInterpretEdit.mockResolvedValue("A punchier explainer about cold brew coffee.");
  mockGetUserPlan.mockReset();
  mockGetUserPlan.mockResolvedValue(PLAN_CONFIGS.professional);
  mockCreateVideoJob.mockReset();
  mockCreateVideoJob.mockResolvedValue({ id: "row-1" });
  mockFindRow.mockReset();
  mockFindRow.mockResolvedValue(null);
  mockDeleteOpenRow.mockClear();
  mockResolveAssets.mockReset();
  mockResolveAssets.mockResolvedValue({ found: [], missing: [] });
});

describe("POST /api/dashboard/videos/[jobId]/edit - admission", () => {
  it("refuses a user over their spend cap", async () => {
    const budget = monthlyBudgetUsd("professional");
    await recordSpendUsd(USER, budget);
    useSource({ mode: "slideshow", durationSeconds: 30 });

    const res = await edit();

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("MONTHLY_LIMIT_REACHED");
    expect(body.details?.allowanceUsedPercent).toBe(100);
    expect(mockInterpretEdit).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getSpendUsd(USER)).toBe(budget);
  });

  it("reserves cinematic seconds for a cinematic edit", async () => {
    useSource({ mode: "talking_object", durationSeconds: 30 });

    const res = await edit();

    expect(res.status).toBe(200);
    expect(mockAdd.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({
        mode: "talking_object",
        reservedCinematicSeconds: 32,
        reservedCinematicSplit: { fromMonthly: 32, fromTopup: 0 },
      }),
    );
    expect(await getCinematicSecondsUsed(USER)).toBe(32);
  });

  it("gives the reservation back when the edit cannot be interpreted", async () => {
    useSource({ mode: "talking_object", durationSeconds: 30 });
    mockInterpretEdit.mockRejectedValue(new Error("model unavailable"));

    const res = await edit();

    expect(res.status).toBe(500);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
    expect(await getSpendUsd(USER)).toBe(0);
  });
});

describe("POST /api/dashboard/videos/[jobId]/edit - the video_jobs row", () => {
  it("writes a row for the edited job and queues under that id", async () => {
    useSource({ mode: "slideshow", durationSeconds: 30 });

    const res = await edit();

    expect(res.status).toBe(200);
    expect(mockCreateVideoJob).toHaveBeenCalledTimes(1);
    const addCall = mockAdd.mock.calls.at(-1)!;
    const queuedWithId = (addCall[2] as { jobId: string }).jobId;
    expect(mockCreateVideoJob.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        owner_type: "user",
        owner_id: USER,
        prompt: "A punchier explainer about cold brew coffee.",
        status: "queued",
        queue_job_id: queuedWithId,
        queue_name: expect.any(String),
        job_data: expect.objectContaining({
          input: "A punchier explainer about cold brew coffee.",
          mode: "slideshow",
          durationSeconds: 30,
        }),
      }),
    );
  });

  it("fails the request and queues nothing if the row write throws", async () => {
    useSource({ mode: "talking_object", durationSeconds: 30 });
    mockCreateVideoJob.mockRejectedValueOnce(new Error("db down"));

    const res = await edit();

    expect(res.status).toBe(500);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });

  it("removes the row it wrote when the queue add fails", async () => {
    useSource({ mode: "slideshow", durationSeconds: 30 });
    mockAdd.mockRejectedValueOnce(new Error("redis unavailable"));

    const res = await edit();

    expect(res.status).toBe(500);
    const insertedId = (mockCreateVideoJob.mock.calls[0][0] as { queue_job_id: string }).queue_job_id;
    expect(mockDeleteOpenRow).toHaveBeenCalledWith(insertedId);
  });
});

describe("POST /api/dashboard/videos/[jobId]/edit - where the source comes from", () => {
  it("edits a finished video whose queue job has already been evicted", async () => {
    useSource({ mode: "slideshow", durationSeconds: 45, aspectRatio: "9:16" });
    mockGetJob.mockResolvedValue(undefined);

    const res = await edit();

    expect(res.status).toBe(200);
    expect(mockGetJob).not.toHaveBeenCalled();
    expect(mockAdd.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ durationSeconds: 45, aspectRatio: "9:16", clientId: USER }),
    );
  });

  it("falls back to the queue job for a row written before job data was stored", async () => {
    mockFindRow.mockResolvedValue(completedRow(null));
    mockGetJob.mockResolvedValue(completedJob({ mode: "slideshow", durationSeconds: 30 }));

    const res = await edit();

    expect(res.status).toBe(200);
    expect(mockGetJob).toHaveBeenCalledWith(JOB_ID);
  });

  it("returns 404 for an old row whose queue job is gone", async () => {
    mockFindRow.mockResolvedValue(completedRow(null));
    mockGetJob.mockResolvedValue(undefined);

    const res = await edit();

    expect(res.status).toBe(404);
    expect(mockAdd).not.toHaveBeenCalled();
  });
});

describe("POST /api/dashboard/videos/[jobId]/edit - uploaded files", () => {
  const ASSET_ID = "7d444840-9dc0-41a6-8e6c-8b2b8f6b1a10";
  const record = (url: string) => ({
    id: ASSET_ID,
    type: "productImage",
    path: `uploads/${ASSET_ID}.png`,
    mimeType: "image/png",
    size: 10,
    originalName: "mug.png",
    uploadedAt: "2026-10-01T00:00:00.000Z",
    storage: "blob",
    url,
  });

  it("refuses the edit before reserving anything once the uploads have been deleted", async () => {
    useSource({
      mode: "talking_object",
      durationSeconds: 30,
      assetIds: [ASSET_ID],
      assets: [record("https://store.public.blob.vercel-storage.com/uploads/old.png")],
    });
    mockResolveAssets.mockResolvedValue({ found: [], missing: [ASSET_ID] });

    const res = await edit();

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error:
        "This video was made with files you uploaded, and those files have been deleted " +
        "(uploads are kept for 24 hours), so it can't be edited. " +
        "To change it, create a new video and upload the files again.",
      code: "UPLOADS_DELETED",
    });
    expect(mockResolveAssets).toHaveBeenCalledWith([ASSET_ID]);
    expect(mockInterpretEdit).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
    expect(await getSpendUsd(USER)).toBe(0);
    expect(await getVideosUsedThisMonth(USER)).toBe(0);
  });

  it("returns 503 and reserves nothing when the upload records cannot be read", async () => {
    useSource({ mode: "talking_object", durationSeconds: 30, assetIds: [ASSET_ID] });
    mockResolveAssets.mockRejectedValue(new Error("redis unavailable"));

    const res = await edit();

    expect(res.status).toBe(503);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });

  it("queues the records it just read, not the copies stored with the old job", async () => {
    const fresh = record("https://store.public.blob.vercel-storage.com/uploads/current.png");
    useSource({
      mode: "slideshow",
      durationSeconds: 30,
      assetIds: [ASSET_ID],
      assets: [record("https://store.public.blob.vercel-storage.com/uploads/old.png")],
    });
    mockResolveAssets.mockResolvedValue({ found: [fresh], missing: [] });

    const res = await edit();

    expect(res.status).toBe(200);
    expect(mockAdd.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ assetIds: [ASSET_ID], assets: [fresh] }),
    );
  });
});

describe("POST /api/dashboard/videos/[jobId]/edit - what the edited job carries over", () => {
  const carried = {
    mode: "talking_object",
    durationSeconds: 20,
    aspectRatio: "9:16",
    platform: "tiktok",
    captions: "off",
    textModel: "model-x",
    brandColors: { primary: "#112233" },
    ttsVoiceId: "voice-9",
    avatar: { mode: "preset", presetId: "anna" },
    talkingObjectStyle: "real",
    talkingRealMode: "studio",
    variationCount: 2,
    placeholders: { brand: "Acme" },
    brandBrain: { tone: "warm" },
    scriptFidelity: "strict",
    strictScript: "Cold brew is coffee steeped cold for twelve hours.",
    locale: "de-DE",
    characterLockId: "char-1",
    qualityGateMode: "warn",
    seriesId: "series-7",
    renderMode: "final",
    userId: USER,
  };
  const dropped = {
    requestId: "req-old",
    callbackUrl: "https://hooks.example.com/cutline",
    previewJobId: "preview-1",
    regenFromJobId: "regen-1",
    regenerateShotIds: ["shot-1"],
    remixFromJobId: "remix-1",
    stockImagesOnly: true,
    spendIdentifier: "someone-else",
    reservedSpendUsd: 9,
    reservedCinematicSeconds: 99,
    reservedCinematicSplit: { fromMonthly: 99, fromTopup: 0 },
    reservedVideoMonth: "2020-01",
  };

  it("carries every setting except the ones that would undo the edit or belong to the old request", async () => {
    useSource({ ...carried, ...dropped });

    const res = await edit();

    expect(res.status).toBe(200);
    const payload = mockAdd.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        ...carried,
        input: "A punchier explainer about cold brew coffee.",
        clientId: USER,
      }),
    );
    for (const key of ["requestId", "callbackUrl", "previewJobId", "regenFromJobId", "regenerateShotIds",
      "remixFromJobId", "stockImagesOnly", "spendIdentifier"]) {
      expect(payload).not.toHaveProperty(key);
    }
    expect(payload.reservedSpendUsd).not.toBe(9);
    expect(payload.reservedCinematicSeconds).not.toBe(99);
    expect(payload.reservedVideoMonth).not.toBe("2020-01");
  });

  it("checks an uploaded avatar too, and refuses the edit once it is gone", async () => {
    const AVATAR_ID = "4c3b2a19-0f8e-4d7c-b6a5-948372615041";
    useSource({ mode: "talking_object", durationSeconds: 20, avatar: { mode: "upload", uploadAssetId: AVATAR_ID } });
    mockResolveAssets.mockResolvedValue({ found: [], missing: [AVATAR_ID] });

    const res = await edit();

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("UPLOADS_DELETED");
    expect(mockResolveAssets).toHaveBeenCalledWith([AVATAR_ID]);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("counts the edit as a video, and gives it back when the edit cannot start", async () => {
    useSource({ mode: "slideshow", durationSeconds: 30 });

    expect((await edit()).status).toBe(200);
    expect(await getVideosUsedThisMonth(USER)).toBe(1);

    mockInterpretEdit.mockRejectedValueOnce(new Error("model unavailable"));
    expect((await edit()).status).toBe(500);
    expect(await getVideosUsedThisMonth(USER)).toBe(1);
  });
});
