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

const events: string[] = [];

const pathnameOf = (url: string) => new URL(url).pathname.replace(/^\//, "");

vi.mock("@vercel/blob", () => ({
  list: async (options?: { prefix?: string }) => ({
    blobs: blobState.blobs
      .map((b) => ({ ...b, pathname: pathnameOf(b.url) }))
      .filter((b) => !options?.prefix || b.pathname.startsWith(options.prefix)),
    hasMore: false,
    cursor: undefined,
  }),
  del: async (urls: string | string[]) => {
    const list = Array.isArray(urls) ? urls : [urls];
    blobState.deleted.push(...list);
    events.push(...list.map((url) => `del ${url}`));
  },
  put: async () => {
    throw new Error("put() should not be reached by these tests");
  },
}));

type Take = { url: string; queueJobId: string | null };

const dbState = {
  planByUrl: new Map<string, string>(),
  planByJob: new Map<string, string>(),
  lookedUp: [] as Take[],
  planLookupCalls: 0,
  cleared: [] as string[],
  clearError: null as Error | null,
};

vi.mock("@/lib/jobs/videoJobService", () => ({
  getPlanIdsForTakes: async (takes: Take[]) => {
    dbState.planLookupCalls += 1;
    dbState.lookedUp.push(...takes);
    const out = new Map<string, string>();
    for (const take of takes) {
      const plan = dbState.planByUrl.get(take.url) ?? (take.queueJobId ? dbState.planByJob.get(take.queueJobId) : undefined);
      if (plan) out.set(take.url, plan);
    }
    return out;
  },
  clearFinalUrls: async (urls: string[]) => {
    if (dbState.clearError) throw dbState.clearError;
    dbState.cleared.push(...urls);
    events.push(...urls.map((url) => `clear ${url}`));
    return urls.length;
  },
}));

const { cleanupExpiredBlobs, cleanupExpiredUploadBlobs, findPublishedVideoForJob, publishRenderedVideo } =
  await import("@/lib/storage/publish");
const { cleanupExpiredTempDirs, getVideoRetentionOverrideHours, runCleanup } = await import(
  "@/lib/storage/cleanup"
);
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
  dbState.planByJob = new Map();
  dbState.lookedUp = [];
  dbState.planLookupCalls = 0;
  dbState.cleared = [];
  dbState.clearError = null;
  events.length = 0;
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

  it("keeps a paid user's extra takes as long as the main one, not on the free schedule", async () => {
    const jobId = "3f2b8c1e-7d4a-4e2b-9c1f-0a5d6e7f8a9b";
    const take = (name: string) => `https://blob.example.com/videos/${name}`;
    const aged = (url: string, hours: number): FakeBlob => ({ url, uploadedAt: new Date(Date.now() - hours * HOUR_MS) });
    blobState.blobs = [
      aged(take(`${jobId}-v1.mp4`), FREE_VIDEO_RETENTION_HOURS + 6),
      aged(take(`${jobId}-v2.mp4`), FREE_VIDEO_RETENTION_HOURS + 6),
      aged(take(`${jobId}-v3.mp4`), FREE_VIDEO_RETENTION_HOURS + 6),
    ];
    dbState.planByUrl.set(take(`${jobId}-v1.mp4`), "professional");
    dbState.planByJob.set(jobId, "professional");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(0);
    expect(blobState.deleted).toEqual([]);
  });

  it("still deletes every take together once the paid window passes", async () => {
    const jobId = "3f2b8c1e-7d4a-4e2b-9c1f-0a5d6e7f8a9b";
    const urls = ["-v1", "-v2"].map((suffix) => `https://blob.example.com/videos/${jobId}${suffix}.mp4`);
    blobState.blobs = urls.map((url) => ({ url, uploadedAt: new Date(Date.now() - (PAID_VIDEO_RETENTION_HOURS + 1) * HOUR_MS) }));
    dbState.planByJob.set(jobId, "enterprise");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(2);
    expect(blobState.deleted.sort()).toEqual([...urls].sort());
  });

  it("reads each take's job from its file name", async () => {
    const names = ["job-a.mp4", "job-a-v2.mp4", "job-a-v12.mp4", "job-a-preview.mp4", "job-a-v2-preview.mp4", "odd.webm"];
    blobState.blobs = names.map((name) => ({
      url: `https://blob.example.com/videos/${name}`,
      uploadedAt: new Date(Date.now() - (FREE_VIDEO_RETENTION_HOURS + 1) * HOUR_MS),
    }));

    await cleanupExpiredBlobs({ overrideHours: null });

    expect(dbState.lookedUp.map((t) => t.queueJobId)).toEqual(["job-a", "job-a", "job-a", "job-a", "job-a", null]);
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

describe("cleanupExpiredBlobs: the row is cleared before the blob is deleted", () => {
  const blobUrl = "https://blob.example.com/videos/job-9.mp4";

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    blobState.blobs = [
      { url: blobUrl, uploadedAt: new Date(Date.now() - (FREE_VIDEO_RETENTION_HOURS + 6) * HOUR_MS) },
    ];
  });

  it("clears final_url first, then deletes the blob", async () => {
    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res.deleted).toBe(1);
    expect(events).toEqual([`clear ${blobUrl}`, `del ${blobUrl}`]);
  });

  it("keeps the blob when the row cannot be cleared, so no row is left pointing at a deleted file", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
    dbState.clearError = new Error("db down");

    const res = await cleanupExpiredBlobs({ overrideHours: null });

    expect(res).toEqual({ deleted: 0, errors: 1 });
    expect(blobState.deleted).toEqual([]);
  });
});

describe("cleanupExpiredUploadBlobs: uploads older than the window are deleted", () => {
  const upload = (name: string, hours: number): FakeBlob => ({
    url: `https://blob.example.com/uploads/${name}`,
    uploadedAt: new Date(Date.now() - hours * HOUR_MS),
  });

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  });

  it("deletes an upload past the window and keeps a newer one", async () => {
    blobState.blobs = [upload("old.png", 25), upload("new.png", 23)];

    const res = await cleanupExpiredUploadBlobs(24);

    expect(res).toEqual({ deleted: 1, errors: 0 });
    expect(blobState.deleted).toEqual(["https://blob.example.com/uploads/old.png"]);
  });

  it("never touches a rendered video", async () => {
    blobState.blobs = [
      { url: "https://blob.example.com/videos/job-1.mp4", uploadedAt: new Date(Date.now() - 48 * HOUR_MS) },
    ];

    const res = await cleanupExpiredUploadBlobs(24);

    expect(res.deleted).toBe(0);
    expect(blobState.deleted).toEqual([]);
  });

  it("keeps every upload when the window is 0", async () => {
    blobState.blobs = [upload("old.png", 1000)];

    const res = await cleanupExpiredUploadBlobs(0);

    expect(res.deleted).toBe(0);
    expect(blobState.deleted).toEqual([]);
  });

  it("does nothing without a Blob token", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    blobState.blobs = [upload("old.png", 48)];

    const res = await cleanupExpiredUploadBlobs(24);

    expect(res).toEqual({ deleted: 0, errors: 0 });
  });
});

describe("runCleanup in a scratch directory", () => {
  let tmpRoot: string;
  let originalCwd: string;

  const ageBy = (target: string, hours: number) => {
    const t = (Date.now() - hours * HOUR_MS) / 1000;
    fs.utimesSync(target, t, t);
  };

  const enterTmpRoot = () => {
    process.chdir(tmpRoot);
    const cwd = fs.realpathSync(process.cwd());
    if (!cwd.startsWith(fs.realpathSync(os.tmpdir()))) {
      throw new Error(`refusing to run cleanup outside tmpdir (cwd=${cwd})`);
    }
  };

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

  it("deletes Blob uploads older than 24 hours by default", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    blobState.blobs = [
      { url: "https://blob.example.com/uploads/old.png", uploadedAt: new Date(Date.now() - 25 * HOUR_MS) },
      { url: "https://blob.example.com/uploads/new.png", uploadedAt: new Date(Date.now() - 23 * HOUR_MS) },
      { url: "https://blob.example.com/videos/recent.mp4", uploadedAt: new Date(Date.now() - 2 * HOUR_MS) },
    ];
    enterTmpRoot();

    const result = await runCleanup();

    expect(result.uploadsDeleted).toBe(1);
    expect(blobState.deleted).toEqual(["https://blob.example.com/uploads/old.png"]);
  });

  it("keeps an expired local render when its row cannot be cleared", async () => {
    const filePath = path.join(tmpRoot, "public", "temp", "job-local-3.mp4");
    fs.writeFileSync(filePath, "not really an mp4");
    ageBy(filePath, 48);
    dbState.clearError = new Error("db down");
    enterTmpRoot();

    const result = await runCleanup();

    expect(result.videosDeleted).toBe(0);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("db down")]));
  });

  it("leaves the working folder of a job that is still rendering", async () => {
    const active = path.join(tmpRoot, "public", "temp", "job-active");
    const finished = path.join(tmpRoot, "public", "temp", "job-finished");
    for (const dir of [active, finished]) {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "frame.png"), "x");
      ageBy(dir, 2);
    }
    enterTmpRoot();

    const result = await runCleanup({ skipJobIds: new Set(["job-active"]) });

    expect(result.tempImagesDeleted).toBe(1);
    expect(fs.existsSync(active)).toBe(true);
    expect(fs.existsSync(finished)).toBe(false);
  });

  it("cleanupExpiredTempDirs also leaves a job that is still rendering", async () => {
    const active = path.join(tmpRoot, "public", "temp", "job-active");
    const finished = path.join(tmpRoot, "public", "temp", "job-finished");
    for (const dir of [active, finished]) {
      fs.mkdirSync(dir);
      ageBy(dir, 5);
    }
    enterTmpRoot();

    const result = await cleanupExpiredTempDirs({ olderThanHours: 1, skipJobIds: new Set(["job-active"]) });

    expect(result).toEqual({ deleted: 1, errors: 0 });
    expect(fs.existsSync(active)).toBe(true);
    expect(fs.existsSync(finished)).toBe(false);
  });
});

describe("findPublishedVideoForJob: finds a finished video by the name the worker gave it", () => {
  const JOB = "5e0c3a2b-8f1d-4b6a-9c7e-1a2b3c4d5e6f";
  const OTHER = "5e0c3a2b-8f1d-4b6a-9c7e-ffffffffffff";
  const at = (name: string): FakeBlob => ({
    url: `https://blob.example.com/videos/${name}`,
    uploadedAt: new Date(),
  });

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  });

  it("returns the single render", async () => {
    blobState.blobs = [at(`${JOB}.mp4`), at(`${OTHER}.mp4`)];

    expect(await findPublishedVideoForJob(JOB)).toEqual({
      videoPath: `https://blob.example.com/videos/${JOB}.mp4`,
    });
  });

  it("returns variations in order, with the first as the main video", async () => {
    blobState.blobs = [at(`${JOB}-v2.mp4`), at(`${JOB}-v1.mp4`)];

    expect(await findPublishedVideoForJob(JOB)).toEqual({
      videoPath: `https://blob.example.com/videos/${JOB}-v1.mp4`,
      variations: [
        { videoUrl: `https://blob.example.com/videos/${JOB}-v1.mp4` },
        { videoUrl: `https://blob.example.com/videos/${JOB}-v2.mp4` },
      ],
    });
  });

  it("marks a preview render as a preview", async () => {
    blobState.blobs = [at(`${JOB}-preview.mp4`)];

    expect(await findPublishedVideoForJob(JOB)).toEqual({
      videoPath: `https://blob.example.com/videos/${JOB}-preview.mp4`,
      isPreview: true,
    });
  });

  it("returns null when nothing was published for the job, or Blob is not configured", async () => {
    blobState.blobs = [at(`${OTHER}.mp4`)];
    expect(await findPublishedVideoForJob(JOB)).toBeNull();

    delete process.env.BLOB_READ_WRITE_TOKEN;
    blobState.blobs = [at(`${JOB}.mp4`)];
    expect(await findPublishedVideoForJob(JOB)).toBeNull();
  });
});
