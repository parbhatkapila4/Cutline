import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSql, mockConfigured } = vi.hoisted(() => ({
  mockSql: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []),
  mockConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/db/client", () => ({ getSql: () => mockSql, isDatabaseConfigured: mockConfigured }));

import { deleteVideoJobRelatedDbRows } from "./videoJobService";

const JOB = "3c4b1a8e-5f0d-4c51-9a7e-2b6f2f7d9e10";
const OWNERS = ["user-1", "anon-1"];

type Statement = { table: string | undefined; text: string; values: unknown[] };

function statements(): Statement[] {
  return mockSql.mock.calls.map((call) => {
    const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];
    const text = strings.join("?").replace(/\s+/g, " ").trim();
    return { table: /DELETE FROM (\w+)/.exec(text)?.[1], text, values };
  });
}

function failOn(table: string, message: string) {
  mockSql.mockImplementation(async (...args: unknown[]) => {
    const text = (args[0] as TemplateStringsArray).join("?");
    if (text.includes(`DELETE FROM ${table}`)) throw new Error(message);
    return [];
  });
}

beforeEach(() => {
  mockSql.mockReset();
  mockSql.mockResolvedValue([]);
  mockConfigured.mockReset();
  mockConfigured.mockReturnValue(true);
  vi.spyOn(console, "warn").mockImplementation(() => { });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteVideoJobRelatedDbRows - the video's usage events go with it", () => {
  it("deletes the usage events under the same id as the comments and approvals, and the video row last", async () => {
    await deleteVideoJobRelatedDbRows(JOB, OWNERS);

    const all = statements();
    const tables = all.map((s) => s.table);
    expect(tables).toEqual(expect.arrayContaining(["job_comments", "job_approvals", "video_usage_events"]));
    expect(tables.at(-1)).toBe("video_jobs");
    for (const table of ["job_comments", "job_approvals", "video_usage_events"]) {
      expect(all.find((s) => s.table === table)?.values).toEqual([JOB]);
    }
  });

  it("deletes by the video's id, never by user, so one video's delete cannot wipe a user's other events", async () => {
    await deleteVideoJobRelatedDbRows(JOB, OWNERS);

    const events = statements().find((s) => s.table === "video_usage_events");
    expect(events?.text).toBe("DELETE FROM video_usage_events WHERE job_id = ?");
  });

  it("still scopes the video row itself to the owner", async () => {
    await deleteVideoJobRelatedDbRows(JOB, OWNERS);

    const row = statements().find((s) => s.table === "video_jobs");
    expect(row?.values).toEqual([JOB, JOB, OWNERS]);
  });

  it("logs and carries on when the events delete fails, such as before the table exists", async () => {
    failOn("video_usage_events", 'relation "video_usage_events" does not exist');

    await expect(deleteVideoJobRelatedDbRows(JOB, OWNERS)).resolves.toBeUndefined();

    expect(statements().at(-1)?.table).toBe("video_jobs");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("video_usage_events"),
      expect.stringContaining("does not exist"),
    );
  });

  it("still reports a failure to delete the video row itself, which the caller turns into a 500", async () => {
    failOn("video_jobs", "connection reset");

    await expect(deleteVideoJobRelatedDbRows(JOB, OWNERS)).rejects.toThrow("connection reset");
  });

  it("does nothing without a database", async () => {
    mockConfigured.mockReturnValue(false);

    await deleteVideoJobRelatedDbRows(JOB, OWNERS);

    expect(mockSql).not.toHaveBeenCalled();
  });
});
