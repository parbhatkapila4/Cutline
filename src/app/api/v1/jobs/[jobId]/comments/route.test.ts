import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const { mockGetSession, mockGetJob, mockSql } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetJob: vi.fn(),
  mockSql: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => true,
  getSql: () => mockSql,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ getJob: mockGetJob }),
  CLEANUP_JOB_NAME: "cleanup",
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "203.0.113.7",
}));

const OWNER = "comments-owner";
const JOB_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const jobOwnedBy = (clientId: string) => ({
  name: "video",
  data: { clientId, input: "A short explainer about cold brew coffee." },
});

const addComment = () =>
  POST(
    new Request(`http://localhost/api/v1/jobs/${JOB_ID}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Looks great, ship it." }),
    }),
    { params: Promise.resolve({ jobId: JOB_ID }) },
  );

const listComments = () =>
  GET(
    new Request(`http://localhost/api/v1/jobs/${JOB_ID}/comments`),
    { params: Promise.resolve({ jobId: JOB_ID }) },
  );

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetJob.mockReset();
  mockSql.mockReset();
  mockSql.mockResolvedValue([]);
});

describe("POST /api/v1/jobs/[jobId]/comments", () => {
  it("refuses an anonymous caller, even one on the network that created the job", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetJob.mockResolvedValue(jobOwnedBy("203.0.113.7"));

    const res = await addComment();

    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("refuses a signed-in caller who does not own the job", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    mockGetJob.mockResolvedValue(jobOwnedBy("someone-else"));

    const res = await addComment();

    expect(res.status).toBe(404);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("stamps the comment with the owner's id, never null", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    mockGetJob.mockResolvedValue(jobOwnedBy(OWNER));
    mockSql.mockResolvedValue([{ id: "c1", job_id: JOB_ID, user_id: OWNER, body: "Looks great, ship it." }]);

    const res = await addComment();

    expect(res.status).toBe(200);
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(mockSql.mock.calls[0].slice(1)).toEqual([JOB_ID, OWNER, "Looks great, ship it."]);
  });
});

describe("GET /api/v1/jobs/[jobId]/comments", () => {
  it("refuses an anonymous caller, so it never returns user_id", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetJob.mockResolvedValue(jobOwnedBy("203.0.113.7"));

    const res = await listComments();

    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("returns comments to the job's owner", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER } });
    mockGetJob.mockResolvedValue(jobOwnedBy(OWNER));
    mockSql.mockResolvedValue([{ id: "c1", job_id: JOB_ID, user_id: OWNER, body: "hi" }]);

    const res = await listComments();

    expect(res.status).toBe(200);
    expect((await res.json()).comments).toHaveLength(1);
  });
});
