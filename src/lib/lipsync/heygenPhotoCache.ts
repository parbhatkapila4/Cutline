import crypto from "crypto";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(CACHE_DIR, "heygen-photo-cache.json");

type PhotoCacheEntry = {
  talkingPhotoId: string;
  createdAt: string;
  lastUsedAt?: string;
  sourceHint?: string;
};

export type CachedAvatarRecord = PhotoCacheEntry;

type PhotoCache = Record<string, PhotoCacheEntry>;

function hashImage(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readCache(): PhotoCache {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PhotoCache;
    }
    return {};
  } catch {
    return {};
  }
}

function writeCache(cache: PhotoCache): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = `${CACHE_FILE}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf-8");
    fs.renameSync(tmp, CACHE_FILE);
  } catch (err) {
    console.warn(
      "[heygen] failed to write photo cache:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

export function getCachedTalkingPhotoId(imageBuffer: Buffer): string | null {
  const hash = hashImage(imageBuffer);
  const cache = readCache();
  const entry = cache[hash];
  if (!entry) return null;
  cache[hash] = { ...entry, lastUsedAt: new Date().toISOString() };
  writeCache(cache);
  return entry.talkingPhotoId;
}

export function getAllCachedTalkingPhotoIds(): Map<string, CachedAvatarRecord> {
  const cache = readCache();
  const out = new Map<string, CachedAvatarRecord>();
  for (const entry of Object.values(cache)) {
    if (entry.talkingPhotoId) out.set(entry.talkingPhotoId, entry);
  }
  return out;
}

export function removeCachedByTalkingPhotoId(talkingPhotoId: string): void {
  if (!talkingPhotoId.trim()) return;
  const cache = readCache();
  let dirty = false;
  for (const [hash, entry] of Object.entries(cache)) {
    if (entry.talkingPhotoId === talkingPhotoId) {
      delete cache[hash];
      dirty = true;
    }
  }
  if (dirty) writeCache(cache);
}

export function cacheTalkingPhotoId(
  imageBuffer: Buffer,
  talkingPhotoId: string,
  sourceHint?: string
): void {
  if (!talkingPhotoId || !talkingPhotoId.trim()) return;
  const hash = hashImage(imageBuffer);
  const cache = readCache();
  cache[hash] = {
    talkingPhotoId: talkingPhotoId.trim(),
    createdAt: new Date().toISOString(),
    ...(sourceHint ? { sourceHint } : {}),
  };
  writeCache(cache);
}

export function invalidateTalkingPhotoId(imageBuffer: Buffer): void {
  const hash = hashImage(imageBuffer);
  const cache = readCache();
  if (cache[hash]) {
    delete cache[hash];
    writeCache(cache);
  }
}
