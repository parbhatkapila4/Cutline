import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * HeyGen accounts cap stored Photo Avatars per tier (3 on the lower tier).
 * Re-uploading the same preset image on every job burns through that quota in
 * a handful of runs, after which HeyGen returns 400 / code 401028.
 *
 * This cache maps sha256(image bytes) -> HeyGen `talking_photo_id` in a small
 * JSON file so each unique image is uploaded exactly once for the lifetime of
 * the HeyGen account.
 *
 * Limitations:
 * - Keyed by exact image bytes; a re-encoded copy of the same photo is a new
 *   entry. That matches HeyGen's own dedupe (none) and is intentional.
 * - Concurrent uploads of the same brand-new image can race and create two
 *   HeyGen avatars; the last writer wins in the cache and the other becomes
 *   an orphan in HeyGen. Acceptable at expected job volumes.
 * - If a cached avatar is deleted from the HeyGen dashboard, the next video
 *   creation using that ID will fail; call invalidateTalkingPhotoId() and
 *   re-upload.
 */

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
    // Cache writes are best-effort: a failure here just means the next job
    // re-uploads. Don't let it break the pipeline.
    console.warn(
      "[heygen] failed to write photo cache:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Returns a previously cached HeyGen talking_photo_id for the exact same image
 * bytes, or null if no cache hit. On a hit it bumps `lastUsedAt` so the auto-
 * cleanup path can do LRU eviction if all avatars are cached.
 */
export function getCachedTalkingPhotoId(imageBuffer: Buffer): string | null {
  const hash = hashImage(imageBuffer);
  const cache = readCache();
  const entry = cache[hash];
  if (!entry) return null;
  cache[hash] = { ...entry, lastUsedAt: new Date().toISOString() };
  writeCache(cache);
  return entry.talkingPhotoId;
}

/**
 * Returns a map of talking_photo_id -> cache entry for every cached avatar.
 * Used by the auto-cleanup path to tell orphans (HeyGen has them, cache does
 * not) apart from cached avatars (we know about them, safe to LRU-evict).
 */
export function getAllCachedTalkingPhotoIds(): Map<string, CachedAvatarRecord> {
  const cache = readCache();
  const out = new Map<string, CachedAvatarRecord>();
  for (const entry of Object.values(cache)) {
    if (entry.talkingPhotoId) out.set(entry.talkingPhotoId, entry);
  }
  return out;
}

/**
 * Removes any cache entry pointing at the given talking_photo_id. Called by
 * the auto-cleanup path right after a successful HeyGen delete so the cache
 * stays consistent with the account.
 */
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

/**
 * Persists the talking_photo_id returned by HeyGen for future jobs that use
 * this exact same image. `sourceHint` is stored for debugging only (filename
 * or URL) and is not used for lookup.
 */
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

/**
 * Removes a cached entry. Call this when HeyGen rejects a cached
 * talking_photo_id (e.g. the avatar was deleted from the dashboard) so the
 * next attempt re-uploads.
 */
export function invalidateTalkingPhotoId(imageBuffer: Buffer): void {
  const hash = hashImage(imageBuffer);
  const cache = readCache();
  if (cache[hash]) {
    delete cache[hash];
    writeCache(cache);
  }
}
