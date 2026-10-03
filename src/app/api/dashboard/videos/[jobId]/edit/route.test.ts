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

const { mockGetJob, mockAdd, mockInterpretEdit, mockGetUserPlan, mockCreateVideoJob } = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
  mockAdd: vi.fn(),
  mockInterpretEdit: vi.fn(),
  mockGetUserPlan: vi.fn(),
  mockCreateVideoJob: vi.fn<(insert: Record<string, unknown>) => Promise<{ id: string }>>(
    async () => ({ id: "row-1" }),
  ),
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
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

const USER = "edit-user";
const JOB_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const completedJob = (data: Record<string, unknown>) => ({
  name: "video",
  data: { clientId: USER, input: "A short explainer about cold brew coffee.", ...data },
  getState: async () => "completed",
});

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
});

describe("POST /api/dashboard/videos/[jobId]/edit - admission", () => {
  it("refuses a user over their spend cap", async () => {
    const budget = monthlyBudgetUsd("professional");
    await recordSpendUsd(USER, budget);
    mockGetJob.mockResolvedValue(completedJob({ mode: "slideshow", durationSeconds: 30 }));

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
    mockGetJob.mockResolvedValue(completedJob({ mode: "talking_object", durationSeconds: 30 }));

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
    mockGetJob.mockResolvedValue(completedJob({ mode: "talking_object", durationSeconds: 30 }));
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
    mockGetJob.mockResolvedValue(completedJob({ mode: "slideshow", durationSeconds: 30 }));

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
      }),
    );
  });

  it("fails the request and queues nothing if the row write throws", async () => {
    mockGetJob.mockResolvedValue(completedJob({ mode: "talking_object", durationSeconds: 30 }));
    mockCreateVideoJob.mockRejectedValueOnce(new Error("db down"));

    const res = await edit();

    expect(res.status).toBe(500);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(await getCinematicSecondsUsed(USER)).toBe(0);
  });
});
