import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const HOUR_MS = 60 * 60 * 1000;

type FakeBlob = { url: string; uploadedAt: Date };

const blobState = {
  blobs: [] as FakeBlob[],
  deleted: [] as string[],
};

vi.mock("@vercel/blob", () => ({
  list: async () => ({ blobs: blobState.blobs, hasMore: false, cursor: undefined }),
  del: async (urls: string | string[]) => {
    blobState.deleted.push(...(Array.isArray(urls) ? urls : [urls]));
  },
  put: async () => {
    throw new Error("put() should not be reached by these tests");
  },
}));

const dbState = {
  planByUrl: new Map<string, string>(),
  planLookupCalls: 0,
  cleared: [] as string[],
};

vi.mock("@/lib/jobs/videoJobService", () => ({
  getPlanIdsByFinalUrl: async (urls: string[]) => {
    dbState.planLookupCalls += 1;
    const out = new Map<string, string>();
    for (const url of urls) {
      const plan = dbState.planByUrl.get(url);
      if (plan) out.set(url, plan);
    }
    return out;
  },
  clearFinalUrls: async (urls: string[]) => {
    dbState.cleared.push(...urls);
    return urls.length;
  },
}));

const { cleanupExpiredBlobs, publishRenderedVideo } = await import("@/lib/storage/publish");
const { getVideoRetentionOverrideHours, runCleanup } = await import("@/lib/storage/cleanup");
const { FREE_VIDEO_RETENTION_HOURS, PAID_VIDEO_RETENTION_HOURS } = await import("@/lib/plans");

const ENV_KEYS = [
  "VIDEO_RETENTION_HOURS",
  "UPLOAD_RETENTION_HOURS",
  "BLOB_READ_WRITE_TOKEN",
  "CLEANUP_ENABLED",
] as const;

let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  blobState.blobs = [];
  blobState.deleted = [];
  dbState.planByUrl = new Map();
  dbState.planLookupCalls = 0;
  dbState.cleared = [];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
});

describe("retention parsing", () => {
  it("treats an unset variable as 'no override', so the plan windows apply", () => {
    expect(getVideoRetentionOverrideHours()).toBeNull();
    process.env.VIDEO_RETENTION_HOURS = "";
    expect(getVideoRetentionOverrideHours()).toBeNull();
  });

  it("honours 0 as 'disabled' instead of silently becoming 24", () => {
    process.env.VIDEO_RETENTION_HOURS = "0";
    expect(Number(process.env.VIDEO_RETENTION_HOURS) || 24).toBe(24);
    expect(getVideoRetentionOverrideHours()).toBe(0);
  });

  it("uses a valid value verbatim", () => {
    process.env.VIDEO_RETENTION_HOURS = "48";
    expect(getVideoRetentionOverrideHours()).toBe(48);
  });

  it("warns and falls back on an unparseable value rather than swallowing it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    process.env.VIDEO_RETENTION_HOURS = "twenty-four";
    expect(getVideoRetentionOverrideHours()).toBe(FREE_VIDEO_RETENTION_HOURS);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("VIDEO_RETENTION_HOURS");
  });

  it("warns and falls back on a negative value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    process.env.VIDEO_RETENTION_HOURS = "-5";
    expect(getVideoRetentionOverrideHours()).toBe(FREE_VIDEO_RETENTION_HOURS);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("cleanupExpiredBlobs: two-phase window selection", () => {
  const blobUrl = "https://blob.example.com/videos/job-1.mp4";
  const agedBlob = (hours: number): FakeBlob => ({
    url: blobUrl,
    uploadedAt: new Date(Date.now() - hours * HOUR_MS),
  });

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  });

  it("never even considers a blob younger than the shortest window", async () => {
    blobState.blobs = [agedBlob(FREE_VIDEO_RETENTION_HOURS - 12)];
    dbState.planByUrl.set(blobUrl, "free");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(0);
    expect(blobState.deleted).toEqual([]);
    expect(dbState.planLookupCalls).toBe(0);
  });

  it("deletes a blob past the free window when the owner is on Free", async () => {
    blobState.blobs = [agedBlob(FREE_VIDEO_RETENTION_HOURS + 6)];
    dbState.planByUrl.set(blobUrl, "free");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(1);
    expect(blobState.deleted).toEqual([blobUrl]);
    expect(dbState.cleared).toEqual([blobUrl]);
  });

  it("keeps the very same blob when the owner is on a paid plan", async () => {
    blobState.blobs = [agedBlob(FREE_VIDEO_RETENTION_HOURS + 6)];
    dbState.planByUrl.set(blobUrl, "professional");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(0);
    expect(blobState.deleted).toEqual([]);
    expect(dbState.cleared).toEqual([]);
    expect(dbState.planLookupCalls).toBe(1);
  });

  it("deletes a paid blob once it passes the 90-day window", async () => {
    blobState.blobs = [agedBlob(PAID_VIDEO_RETENTION_HOURS + 1)];
    dbState.planByUrl.set(blobUrl, "professional");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(1);
    expect(blobState.deleted).toEqual([blobUrl]);
  });

  it("gives an anonymous or unknown owner the free window", async () => {
    blobState.blobs = [agedBlob(FREE_VIDEO_RETENTION_HOURS + 6)];

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(1);
    expect(blobState.deleted).toEqual([blobUrl]);
  });

  it("gives an unrecognised plan string the free window", async () => {
    blobState.blobs = [agedBlob(FREE_VIDEO_RETENTION_HOURS + 6)];
    dbState.planByUrl.set(blobUrl, "platinum-deluxe");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(1);
  });

  it("sorts a mixed batch by each blob's own owner in one lookup", async () => {
    const freeUrl = "https://blob.example.com/videos/free-job.mp4";
    const paidUrl = "https://blob.example.com/videos/paid-job.mp4";
    const staleUrl = "https://blob.example.com/videos/stale-paid-job.mp4";
    blobState.blobs = [
      { url: freeUrl, uploadedAt: new Date(Date.now() - (FREE_VIDEO_RETENTION_HOURS + 1) * HOUR_MS) },
      { url: paidUrl, uploadedAt: new Date(Date.now() - (FREE_VIDEO_RETENTION_HOURS + 1) * HOUR_MS) },
      { url: staleUrl, uploadedAt: new Date(Date.now() - (PAID_VIDEO_RETENTION_HOURS + 1) * HOUR_MS) },
    ];
    dbState.planByUrl.set(freeUrl, "free");
    dbState.planByUrl.set(paidUrl, "enterprise");
    dbState.planByUrl.set(staleUrl, "enterprise");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(2);
    expect(blobState.deleted.sort()).toEqual([freeUrl, staleUrl].sort());
    expect(dbState.planLookupCalls).toBe(1);
  });

  it("skips the plan lookup entirely when VIDEO_RETENTION_HOURS is set", async () => {
    blobState.blobs = [agedBlob(2)];
    dbState.planByUrl.set(blobUrl, "enterprise");

    const res = await cleanupExpiredBlobs({ overrideHours: 1 });

    expect(res.deleted).toBe(1);
    expect(blobState.deleted).toEqual([blobUrl]);
    expect(dbState.planLookupCalls).toBe(0);
  });

  it("does nothing at all without a Blob token", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    blobState.blobs = [agedBlob(FREE_VIDEO_RETENTION_HOURS + 6)];

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res).toEqual({ deleted: 0, errors: 0 });
    expect(blobState.deleted).toEqual([]);
  });
});

describe("no-Blob-token path: local URL form matches what publish wrote", () => {
  let tmpRoot: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cutline-cleanup-"));
    fs.mkdirSync(path.join(tmpRoot, "public", "temp"), { recursive: true });
  });

  afterEach(() => {
    try {
      process.chdir(originalCwd);
    } catch {
    }
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
    }
  });

  it("emits exactly the /temp/<file>.mp4 string publishRenderedVideo returns, so clearFinalUrls matches the row", async () => {
    const jobId = "job-local-1";
    const filename = `${jobId}.mp4`;
    const filePath = path.join(tmpRoot, "public", "temp", filename);
    fs.writeFileSync(filePath, "not really an mp4");
    const old = (Date.now() - 48 * HOUR_MS) / 1000;
    fs.utimesSync(filePath, old, old);
    const publishedUrl = await publishRenderedVideo(`/temp/${filename}`, jobId);
    expect(publishedUrl).toBe(`/temp/${filename}`);
    process.chdir(tmpRoot);
    const cwd = fs.realpathSync(process.cwd());
    if (!cwd.startsWith(fs.realpathSync(os.tmpdir()))) {
      throw new Error(`refusing to run cleanup outside tmpdir (cwd=${cwd})`);
    }

    const result = await runCleanup();

    expect(result.videosDeleted).toBe(1);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(dbState.cleared).toEqual([publishedUrl]);
  });

  it("deletes nothing and clears nothing when VIDEO_RETENTION_HOURS is 0", async () => {
    const filename = "job-local-2.mp4";
    const filePath = path.join(tmpRoot, "public", "temp", filename);
    fs.writeFileSync(filePath, "not really an mp4");
    const old = (Date.now() - 48 * HOUR_MS) / 1000;
    fs.utimesSync(filePath, old, old);

    process.env.VIDEO_RETENTION_HOURS = "0";
    process.chdir(tmpRoot);
    const cwd = fs.realpathSync(process.cwd());
    if (!cwd.startsWith(fs.realpathSync(os.tmpdir()))) {
      throw new Error(`refusing to run cleanup outside tmpdir (cwd=${cwd})`);
    }

    const result = await runCleanup();

    expect(result.videosDeleted).toBe(0);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(dbState.cleared).toEqual([]);
  });
});
