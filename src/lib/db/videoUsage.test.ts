import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSql, mockGetSql, mockConfigured, mockFindJob } = vi.hoisted(() => {
  const mockSql = vi.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []);
  return {
    mockSql,
    mockGetSql: vi.fn(() => mockSql),
    mockConfigured: vi.fn(() => true),
    mockFindJob: vi.fn(),
  };
});

vi.mock("@/lib/db/client", () => ({ getSql: mockGetSql, isDatabaseConfigured: mockConfigured }));
vi.mock("@/lib/jobs/videoJobService", () => ({ findVideoJobForOwners: mockFindJob }));

import { recordVideoUsage, type RecordVideoUsageInput } from "./videoUsage";

const USER = "user-1";
const QUEUE_ID = "3c4b1a8e-5f0d-4c51-9a7e-2b6f2f7d9e10";
const ROW_ID = "8d2f6a1c-0b3e-4f7a-9c5d-1e2f3a4b5c6d";
const job = (overrides: Record<string, unknown> = {}) => ({
  id: ROW_ID,
  owner_type: "user",
  owner_id: USER,
  queue_job_id: QUEUE_ID,
  ...overrides,
});

const input = (overrides: Partial<RecordVideoUsageInput> = {}): RecordVideoUsageInput => ({
  jobId: QUEUE_ID,
  userId: USER,
  eventType: "download",
  ...overrides,
});

function insert() {
  expect(mockSql).toHaveBeenCalledTimes(1);
  const [strings, ...values] = mockSql.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
  return { text: strings.join("?"), values };
}

beforeEach(() => {
  mockSql.mockReset();
  mockSql.mockResolvedValue([]);
  mockGetSql.mockReset();
  mockGetSql.mockReturnValue(mockSql);
  mockConfigured.mockReset();
  mockConfigured.mockReturnValue(true);
  mockFindJob.mockReset();
  mockFindJob.mockResolvedValue(job());
  vi.spyOn(console, "warn").mockImplementation(() => { });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordVideoUsage - what gets written", () => {
  it("records an event for a job the user owns", async () => {
    expect(await recordVideoUsage(input({ eventType: "play_started", surface: "video_page" }))).toBe("recorded");

    const { text, values } = insert();
    expect(text).toContain("INSERT INTO video_usage_events");
    expect(values).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/), QUEUE_ID, USER, "play_started", "video_page"]);
  });

  it("stores no surface when the caller does not know the page", async () => {
    await recordVideoUsage(input());

    expect(insert().values.at(-1)).toBeNull();
  });

  it("writes only the five columns it was asked to, nothing about the request", async () => {
    await recordVideoUsage(input());

    expect(insert().text).toMatch(/\(id, job_id, user_id, event_type, surface\)\s+VALUES/);
  });

  it("gives every event its own id", async () => {
    await recordVideoUsage(input());
    await recordVideoUsage(input());

    const ids = mockSql.mock.calls.map((call) => call[1]);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("recordVideoUsage - the job must exist and belong to the user", () => {
  it("looks the job up for that one user, by whichever id it was given", async () => {
    await recordVideoUsage(input({ jobId: ROW_ID }));

    expect(mockFindJob).toHaveBeenCalledWith(ROW_ID, [USER]);
  });

  it("stores the id the rest of the app shows, whichever form the caller used", async () => {
    await recordVideoUsage(input({ jobId: ROW_ID }));

    expect(insert().values[1]).toBe(QUEUE_ID);
  });

  it("stores the row id for a job that never had a queue id", async () => {
    mockFindJob.mockResolvedValue(job({ queue_job_id: null }));

    await recordVideoUsage(input({ jobId: ROW_ID }));

    expect(insert().values[1]).toBe(ROW_ID);
  });

  it("writes nothing for a job that is not found for this user", async () => {
    mockFindJob.mockResolvedValue(null);

    expect(await recordVideoUsage(input())).toBe("not_found");
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("does not even look when an id is empty", async () => {
    expect(await recordVideoUsage(input({ jobId: "" }))).toBe("not_found");
    expect(await recordVideoUsage(input({ userId: "" }))).toBe("not_found");
    expect(mockFindJob).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("recordVideoUsage - only known events reach the table", () => {
  it("refuses an event type outside the three", async () => {
    expect(await recordVideoUsage(input({ eventType: "purchase" as never }))).toBe("failed");
    expect(mockFindJob).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("refuses a surface outside the three", async () => {
    expect(await recordVideoUsage(input({ surface: "homepage" as never }))).toBe("failed");
    expect(mockFindJob).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("recordVideoUsage - never throws into the caller", () => {
  it("does nothing when there is no database", async () => {
    mockConfigured.mockReturnValue(false);

    expect(await recordVideoUsage(input())).toBe("failed");
    expect(mockFindJob).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("swallows a failed lookup", async () => {
    mockFindJob.mockRejectedValue(new Error("connection reset"));

    await expect(recordVideoUsage(input())).resolves.toBe("failed");
    expect(console.warn).toHaveBeenCalled();
  });

  it("swallows a failed insert, such as the table not existing yet", async () => {
    mockSql.mockRejectedValue(new Error('relation "video_usage_events" does not exist'));

    await expect(recordVideoUsage(input())).resolves.toBe("failed");
    expect(console.warn).toHaveBeenCalled();
  });

  it("swallows a failure to open the database client", async () => {
    mockGetSql.mockImplementation(() => {
      throw new Error("DATABASE_URL is not set");
    });

    await expect(recordVideoUsage(input())).resolves.toBe("failed");
  });

  it("swallows a thrown non-Error", async () => {
    mockFindJob.mockRejectedValue("boom");

    await expect(recordVideoUsage(input())).resolves.toBe("failed");
  });
});
