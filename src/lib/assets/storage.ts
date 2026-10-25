import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import type { AssetMetadata, AssetStorage, AssetType } from "./types";
import { isBlobConfigured } from "@/lib/storage/publish";
import { getUploadRetentionHours } from "@/lib/storage/cleanup";
import {
  createManagedRedis,
  FAIL_FAST_REDIS_OPTIONS,
} from "@/lib/redis/managedRedis";
import { withRetry } from "@/lib/utils/retry";

const REGISTRY_FILENAME = "_registry.json";
const DEFAULT_UPLOAD_DIR = "uploads";
const BLOB_UPLOAD_PREFIX = "uploads";
const ASSET_RECORD_PREFIX = "cutline:asset:";
const ASSET_FETCH_TIMEOUT_MS = 60_000;
const ASSET_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redis = createManagedRedis(url, FAIL_FAST_REDIS_OPTIONS);
  }
  return redis;
}

export function getUploadStorage(): AssetStorage {
  return isBlobConfigured() ? "blob" : "local";
}

export function isAssetId(value: unknown): value is string {
  return typeof value === "string" && ASSET_ID_RE.test(value);
}

export function jobUploadIds(refs: {
  assetIds?: string[];
  avatar?: { mode?: string; uploadAssetId?: string };
}): string[] {
  const ids = [...(refs.assetIds ?? [])];
  if (refs.avatar?.mode === "upload" && refs.avatar.uploadAssetId) {
    ids.push(refs.avatar.uploadAssetId);
  }
  return [...new Set(ids)];
}

function getUploadDir(): string {
  return path.join(process.cwd(), DEFAULT_UPLOAD_DIR);
}

function getRegistryPath(): string {
  return path.join(getUploadDir(), REGISTRY_FILENAME);
}

function recordKey(assetId: string): string {
  return ASSET_RECORD_PREFIX + assetId;
}

type Registry = Record<string, AssetMetadata>;

function readRegistry(): Registry {
  const registryPath = getRegistryPath();
  try {
    const raw = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(raw) as Registry;
  } catch {
    return {};
  }
}

function writeRegistry(registry: Registry): void {
  const dir = getUploadDir();
  const registryPath = getRegistryPath();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 0), "utf-8");
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[mimeType] ?? "bin";
}

export async function storeAsset(
  buffer: Buffer,
  type: AssetType,
  originalFilename: string,
  mimeType: string,
  ownerId?: string,
): Promise<AssetMetadata> {
  const id = randomUUID();
  const filename = `${id}.${getExtension(mimeType)}`;
  const base = {
    id,
    type,
    originalFilename,
    mimeType,
    ...(ownerId && ownerId.trim() ? { ownerId } : {}),
  };

  if (getUploadStorage() === "blob") {
    const { put, del } = await import("@vercel/blob");
    const blob = await put(`${BLOB_UPLOAD_PREFIX}/${filename}`, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    const metadata: AssetMetadata = {
      ...base,
      path: blob.pathname,
      storage: "blob",
      url: blob.url,
    };
    try {
      const retentionHours = getUploadRetentionHours();
      if (retentionHours > 0) {
        await getRedis().set(
          recordKey(id),
          JSON.stringify(metadata),
          "EX",
          Math.ceil(retentionHours * 3600),
        );
      } else {
        await getRedis().set(recordKey(id), JSON.stringify(metadata));
      }
    } catch (e) {
      await del(blob.url).catch(() => {});
      throw e;
    }
    return metadata;
  }

  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);

  const metadata: AssetMetadata = {
    ...base,
    path: `${DEFAULT_UPLOAD_DIR}/${filename}`,
    storage: "local",
  };

  const registry = readRegistry();
  registry[id] = metadata;
  writeRegistry(registry);

  return metadata;
}

export async function getAssetMetadata(
  assetId: string,
): Promise<AssetMetadata | null> {
  if (!isAssetId(assetId)) return null;
  if (getUploadStorage() === "blob") {
    const raw = await getRedis().get(recordKey(assetId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AssetMetadata;
    } catch {
      return null;
    }
  }
  return readRegistry()[assetId] ?? null;
}

export async function resolveAssetRecords(
  assetIds: string[],
): Promise<{ found: AssetMetadata[]; missing: string[] }> {
  const found: AssetMetadata[] = [];
  const missing: string[] = [];
  for (const id of new Set(assetIds)) {
    const meta = await getAssetMetadata(id);
    const available =
      meta != null &&
      (meta.storage === "blob" || getLocalAssetPath(meta) != null);
    if (meta && available) found.push(meta);
    else missing.push(id);
  }
  return { found, missing };
}

export function getLocalAssetPath(meta: AssetMetadata): string | null {
  if (meta.storage === "blob") return null;
  const storageType = process.env.STORAGE_TYPE ?? "local";
  if (storageType !== "local") return null;
  const fullPath = path.join(getUploadDir(), path.basename(meta.path));
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

export async function fetchAssetBytes(
  meta: AssetMetadata,
): Promise<Buffer | null> {
  const url = meta.url;
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const bytes = await withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          ASSET_FETCH_TIMEOUT_MS,
        );
        try {
          let res: Response;
          try {
            res = await fetch(url, { signal: controller.signal });
          } catch (e) {
            throw new Error(
              `network error fetching asset: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
          if (!res.ok)
            throw new Error(`asset fetch failed with status ${res.status}`);
          return Buffer.from(await res.arrayBuffer());
        } finally {
          clearTimeout(timer);
        }
      },
      { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 4000 },
    );
    return bytes.length > 0 ? bytes : null;
  } catch (e) {
    console.error(
      `[assets] could not fetch asset=${meta.id}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

export async function deleteStoredAsset(meta: AssetMetadata): Promise<void> {
  try {
    if (meta.storage === "blob") {
      if (meta.url) {
        const { del } = await import("@vercel/blob");
        await del(meta.url);
      }
      await getRedis().del(recordKey(meta.id));
      return;
    }
    const filePath = getLocalAssetPath(meta);
    if (filePath) fs.unlinkSync(filePath);
    const registry = readRegistry();
    if (registry[meta.id]) {
      delete registry[meta.id];
      writeRegistry(registry);
    }
  } catch (e) {
    console.warn(
      `[assets] could not delete asset=${meta.id}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export function cleanupOldUploads(): void {}
