import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { fakeRedis } from "@/test/fakeRedis";

const { mockAdd, blobs, mockPut, mockDel } = vi.hoisted(() => {
  const blobs = new Map<string, Buffer>();
  return {
    mockAdd: vi.fn(),
    blobs,
    mockPut: vi.fn(async (pathname: string, body: Buffer) => {
      const url = `https://cutline-test.public.blob.vercel-storage.com/${pathname}`;
      blobs.set(url, Buffer.from(body));
      return { url, pathname };
    }),
    mockDel: vi.fn(async (urls: string | string[]) => {
      for (const url of Array.isArray(urls) ? urls : [urls]) blobs.delete(url);
    }),
  };
});

vi.mock("@vercel/blob", () => ({ put: mockPut, del: mockDel }));

vi.mock("@/lib/queue/videoQueue", () => ({
  getVideoQueue: () => ({ add: mockAdd }),
  startVideoWorker: vi.fn(() => ({})),
  scheduleCleanupJob: vi.fn(async () => { }),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIdentifier: () => "upload-test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true }),
  getForwardedClientIp: () => null,
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => ({ user: { id: "upload-test-user" } })),
    },
  },
}));

vi.mock("@/lib/api-keys/service", () => ({
  validateApiKeyAndGetUserId: vi.fn(async () => null),
}));

vi.mock("@/lib/usage", () => ({
  incrementApiCallsThisMonth: vi.fn(async () => { }),
  getVideosCompletedThisMonth: vi.fn(async () => 0),
}));

vi.mock("@/lib/redis/managedRedis", async () => (await import("@/test/fakeRedis")).managedRedisMock);

vi.mock("@/lib/users/planService", () => ({
  getUserPlan: vi.fn(async () => ({
    id: "professional",
    videosPerMonth: null,
  })),
}));

vi.mock("@/lib/regen/remixFromJob", () => ({
  mergeRemixFromJob: vi.fn(async (body: Record<string, unknown>) => ({
    ok: true,
    merged: body,
    remixFromJobId: undefined,
  })),
}));

import { POST as uploadRoute } from "./route";
import { GET as assetRoute } from "@/app/api/assets/[assetId]/route";
import { POST as generateRoute } from "@/app/api/generate/route";
import { AssetUnavailableError, materializeJobAssets } from "@/lib/assets/materialize";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";
import type { VideoJobData } from "@/lib/queue/videoQueue";

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("cutline-upload-fixture"),
]);
const JOB_ID = "job-upload-1";
const PROMPT = "A thirty second explainer about our new coffee grinder.";

const pngFile = (name = "product.png") => new File([PNG_BYTES], name, { type: "image/png" });

async function upload(field: string, files: File[]) {
  const form = new FormData();
  for (const file of files) form.append(field, file);
  const res = await uploadRoute(
    new Request("http://localhost/api/assets/upload", { method: "POST", body: form })
  );
  return { status: res.status, body: await res.json() };
}

async function generate(body: Record<string, unknown>) {
  const res = await generateRoute(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return { status: res.status, body: await res.json() };
}

const queuedPayload = () => mockAdd.mock.calls.at(-1)?.[1] as VideoJobData;

let tmpRoot: string;
let cwdSpy: MockInstance<() => string>;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

function useHost(name: string): string {
  const dir = path.join(tmpRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  cwdSpy.mockReturnValue(dir);
  return dir;
}

function useBlobStorage(enabled: boolean) {
  if (enabled) process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
  else delete process.env.BLOB_READ_WRITE_TOKEN;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cutline-upload-"));
  cwdSpy = vi.spyOn(process, "cwd");
  fakeRedis.store.clear();
  blobs.clear();
  mockAdd.mockReset();
  mockAdd.mockResolvedValue({ id: JOB_ID });
  mockPut.mockClear();
  mockDel.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      const bytes = blobs.get(url);
      return bytes ? new Response(new Uint8Array(bytes)) : new Response("missing", { status: 404 });
    })
  );
});

afterEach(() => {
  cwdSpy.mockRestore();
  vi.unstubAllGlobals();
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("upload → enqueue → worker", () => {
  it("Blob mode: the worker loads the upload from the URL in the job, with nothing on the app host's disk", async () => {
    useBlobStorage(true);
    const appDir = useHost("app");

    const up = await upload("productPhotos", [pngFile()]);
    expect(up.status).toBe(200);
    expect(up.body.assetIds).toHaveLength(1);
    const [assetId] = up.body.assetIds as string[];
    expect(fs.existsSync(path.join(appDir, "uploads"))).toBe(false);

    const gen = await generate({ input: PROMPT, durationSeconds: 30, assetIds: [assetId] });
    expect(gen.status).toBe(200);
    const payload = queuedPayload();
    expect(payload.assetIds).toEqual([assetId]);
    expect(payload.assets).toEqual([
      expect.objectContaining({
        id: assetId,
        type: "productPhoto",
        storage: "blob",
        url: expect.stringMatching(/^https:\/\//),
      }),
    ]);

    const workerDir = useHost("worker");
    fakeRedis.store.clear();

    const resolved = await materializeJobAssets(JOB_ID, payload);
    const asset = resolved.get(assetId);
    expect(asset?.filePath.startsWith(path.join(workerDir, "public", "temp", JOB_ID))).toBe(true);
    expect(fs.readFileSync(asset!.filePath).equals(PNG_BYTES)).toBe(true);
  });

  it("local mode: on a single host the worker reads the upload from the shared disk", async () => {
    useBlobStorage(false);
    const hostDir = useHost("single-host");

    const up = await upload("productPhotos", [pngFile()]);
    expect(up.status).toBe(200);
    const [assetId] = up.body.assetIds as string[];
    expect(mockPut).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(hostDir, "uploads", "_registry.json"))).toBe(true);

    const gen = await generate({ input: PROMPT, durationSeconds: 30, assetIds: [assetId] });
    expect(gen.status).toBe(200);
    expect(queuedPayload().assets).toEqual([
      expect.objectContaining({ id: assetId, storage: "local" }),
    ]);

    const resolved = await materializeJobAssets(JOB_ID, queuedPayload());
    const asset = resolved.get(assetId);
    expect(asset?.filePath).toBe(path.join(hostDir, "uploads", `${assetId}.png`));
    expect(fs.readFileSync(asset!.filePath).equals(PNG_BYTES)).toBe(true);
  });

  it("a job queued before this change (assetIds only) still resolves from the upload record", async () => {
    useBlobStorage(false);
    useHost("single-host");

    const up = await upload("productPhotos", [pngFile()]);
    const [assetId] = up.body.assetIds as string[];

    const resolved = await materializeJobAssets("job-legacy", { assetIds: [assetId] });
    expect(fs.readFileSync(resolved.get(assetId)!.filePath).equals(PNG_BYTES)).toBe(true);
  });

  it("an uploaded avatar travels the same path", async () => {
    useBlobStorage(true);
    useHost("app");

    const up = await upload("referenceImages", [pngFile("face.png")]);
    const [assetId] = up.body.assetIds as string[];

    const gen = await generate({
      input: PROMPT,
      durationSeconds: 30,
      mode: "talking_object",
      talkingObjectStyle: "real",
      talkingRealMode: "studio",
      avatar: { mode: "upload", uploadAssetId: assetId },
    });
    expect(gen.status).toBe(200);
    expect(queuedPayload().assets).toEqual([
      expect.objectContaining({ id: assetId, type: "referenceImage", storage: "blob" }),
    ]);

    useHost("worker");
    fakeRedis.store.clear();
    const resolved = await materializeJobAssets(JOB_ID, queuedPayload());
    expect(fs.readFileSync(resolved.get(assetId)!.filePath).equals(PNG_BYTES)).toBe(true);
  });
});

describe("failures are reported, not skipped", () => {
  it("rejects an unknown or expired asset id before anything is queued", async () => {
    useBlobStorage(true);
    useHost("app");

    const gen = await generate({
      input: PROMPT,
      durationSeconds: 30,
      assetIds: ["3f2504e0-4f89-41d3-9a0c-0305e82c3301"],
    });

    expect(gen.status).toBe(400);
    expect(gen.body.error).toBe("Your uploaded files are no longer available. Please upload them again.");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects a non-avatar upload used as the avatar before anything is queued", async () => {
    useBlobStorage(true);
    useHost("app");
    const up = await upload("productPhotos", [pngFile()]);
    const [assetId] = up.body.assetIds as string[];

    const gen = await generate({
      input: PROMPT,
      durationSeconds: 30,
      mode: "talking_object",
      talkingObjectStyle: "real",
      talkingRealMode: "studio",
      avatar: { mode: "upload", uploadAssetId: assetId },
    });

    expect(gen.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("fails the job with a reason the user sees when the worker cannot fetch an upload", async () => {
    useBlobStorage(true);
    useHost("app");
    const up = await upload("productPhotos", [pngFile()]);
    const [assetId] = up.body.assetIds as string[];
    await generate({ input: PROMPT, durationSeconds: 30, assetIds: [assetId] });
    blobs.clear();

    useHost("worker");
    const err = await materializeJobAssets(JOB_ID, queuedPayload()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AssetUnavailableError);
    const message = (err as Error).message;
    expect(message).not.toMatch(/https?:|\d/);
    expect(getUserFriendlyErrorMessage(message)).toBe(message);
  });

  it("runPipeline fails before any provider call when an upload is unavailable", async () => {
    useBlobStorage(true);
    useHost("app");
    const up = await upload("productPhotos", [pngFile()]);
    const [assetId] = up.body.assetIds as string[];
    await generate({ input: PROMPT, durationSeconds: 30, assetIds: [assetId] });
    blobs.clear();

    useHost("worker");
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockClear();

    await expect(runPipeline({ ...queuedPayload(), jobId: JOB_ID })).rejects.toBeInstanceOf(
      AssetUnavailableError
    );
    const fetched = fetchMock.mock.calls.map(([input]) => String(input));
    expect(fetched.length).toBeGreaterThan(0);
    expect(fetched.every((url) => url.startsWith("https://cutline-test.public.blob.vercel-storage.com/"))).toBe(true);
  });

  it("stores nothing when one file in the request fails validation", async () => {
    useBlobStorage(false);
    const hostDir = useHost("single-host");
    const corrupt = new File([Buffer.from("not really a png")], "broken.png", { type: "image/png" });

    const up = await upload("productPhotos", [pngFile(), corrupt]);

    expect(up.status).toBe(400);
    expect(fs.existsSync(path.join(hostDir, "uploads"))).toBe(false);
  });

  it("returns an error and keeps nothing when storage fails partway through a request", async () => {
    useBlobStorage(true);
    useHost("app");
    const realPut = mockPut.getMockImplementation()!;
    mockPut.mockImplementationOnce(realPut).mockRejectedValueOnce(new Error("blob store unavailable"));

    const up = await upload("productPhotos", [pngFile("a.png"), pngFile("b.png")]);

    expect(up.status).toBe(503);
    expect(up.body.error).toBe("Upload failed. Please try again.");
    expect(up.body.assetIds).toBeUndefined();
    expect(blobs.size).toBe(0);
    expect([...fakeRedis.store.keys()].some((key) => key.startsWith("cutline:asset:"))).toBe(false);
  });
});

describe("GET /api/assets/[assetId]", () => {
  it("redirects the owner to the stored file in Blob mode", async () => {
    useBlobStorage(true);
    useHost("app");
    const up = await upload("productPhotos", [pngFile()]);
    const [assetId] = up.body.assetIds as string[];

    const res = await assetRoute(new Request(`http://localhost/api/assets/${assetId}`), {
      params: Promise.resolve({ assetId }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^https:\/\/cutline-test\.public\.blob\.vercel-storage\.com\/uploads\//);
  });
});
