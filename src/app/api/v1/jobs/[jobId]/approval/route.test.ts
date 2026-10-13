import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const { mockGetSession, mockGetJob, mockSql, mockFindRow } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetJob: vi.fn(),
  mockSql: vi.fn(),
  mockFindRow: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => true,
  getSql: () => mockSql,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/jobs/videoJobService", () => ({
  findVideoJobForOwners: mockFindRow,
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ getJob: mockGetJob }),
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "203.0.113.7",
}));

const OWNER = "approval-owner";
const JOB_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const jobOwnedBy = (ownerId: string) => {
  mockFindRow.mockImplementation(async (_jobId: string, owners: string[]) =>
    owners.includes(ownerId) ? { queue_job_id: JOB_ID, owner_id: ownerId, status: "completed" } : null,
  );
};

const approve = () =>
  POST(
    new Request(`http://localhost/api/v1/jobs/${JOB_ID}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    }),
    { params: Promise.resolve({ jobId: JOB_ID }) },
  );

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetJob.mockReset();
  mockFindRow.mockReset();
  mockFindRow.mockResolvedValue(null);
  mockSql.mockReset();
  mockSql.mockResolvedValue([]);
});

describe("POST /api/v1/jobs/[jobId]/approval", () => {
  it("refuses an anonymous caller, even one on the network that created the job", async () => {
    mockGetSession.mockResolvedValue(null);
    jobOwnedBy("203.0.113.7");

    const res = await approve();

    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("refuses a signed-in caller who does not own the job", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    jobOwnedBy("someone-else");

    const res = await approve();

    expect(res.status).toBe(404);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("refuses a job id that has no record", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    mockFindRow.mockResolvedValue(null);

    const res = await approve();

    expect(res.status).toBe(404);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("records the decision for the job's owner", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    jobOwnedBy(OWNER);

    const res = await approve();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ jobId: JOB_ID, status: "approved" });
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(mockSql.mock.calls[0].slice(1)).toEqual([JOB_ID, "approved", OWNER]);
    expect(mockFindRow).toHaveBeenCalledWith(JOB_ID, [OWNER]);
    expect(mockGetJob).not.toHaveBeenCalled();
  });
});

const readApproval = () =>
  GET(
    new Request(`http://localhost/api/v1/jobs/${JOB_ID}/approval`),
    { params: Promise.resolve({ jobId: JOB_ID }) },
  );

describe("GET /api/v1/jobs/[jobId]/approval", () => {
  it("refuses an anonymous caller, so it never returns actor_user_id", async () => {
    mockGetSession.mockResolvedValue(null);
    jobOwnedBy("203.0.113.7");

    const res = await readApproval();

    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("returns the approval to the job's owner", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    jobOwnedBy(OWNER);
    mockSql.mockResolvedValue([{ job_id: JOB_ID, status: "approved", actor_user_id: OWNER }]);

    const res = await readApproval();

    expect(res.status).toBe(200);
    expect((await res.json()).approval).toMatchObject({ job_id: JOB_ID });
  });
});
