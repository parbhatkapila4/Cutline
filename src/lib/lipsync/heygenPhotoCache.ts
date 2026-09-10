import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Redis } from "ioredis";
import { createManagedRedis } from "@/lib/redis/managedRedis";

const CACHE_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(CACHE_DIR, "heygen-photo-cache.json");
const REDIS_KEY = "cutline:heygen:photo-cache";

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

let redisClient: Redis | null = null;
let redisUnavailable = false;
let warnedFileFallback = false;

function warnFileFallback(reason: string): void {
  if (warnedFileFallback) return;
  warnedFileFallback = true;
  console.error(
    "\n" +
    "==============================================================\n" +
    "[heygen] PHOTO-AVATAR CACHE IS RUNNING ON LOCAL DISK, NOT REDIS\n" +
    `[heygen] reason: ${reason}\n` +
    `[heygen] file:   ${CACHE_FILE}\n` +
    "[heygen] This file does NOT survive a container restart. Every restart\n" +
    "[heygen] empties the cache while the avatars persist at HeyGen, which\n" +
    "[heygen] re-creates the orphaned-avatar quota leak this cache exists to\n" +
    "[heygen] prevent. Set REDIS_URL on the worker to fix this.\n" +
    "==============================================================\n"
  );
}

function markRedisUnavailable(reason: string): void {
  redisUnavailable = true;
  redisClient = null;
  warnFileFallback(reason);
}

async function seedFromFileIfEmpty(client: Redis): Promise<void> {
  try {
    const existing = await client.hlen(REDIS_KEY);
    if (existing > 0) return;
    const fileCache = readFileCache();
    const entries = Object.entries(fileCache);
    if (entries.length === 0) return;
    const flat: string[] = [];
    for (const [hash, entry] of entries) {
      flat.push(hash, JSON.stringify(entry));
    }
    await client.hset(REDIS_KEY, ...flat);
    console.warn(
      `[heygen] seeded ${entries.length} photo-cache entr${entries.length === 1 ? "y" : "ies"} from ${CACHE_FILE} into Redis`
    );
  } catch (err) {
    console.warn(
      "[heygen] photo-cache seed from file failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function getRedis(): Promise<Redis | null> {
  if (redisUnavailable) return null;
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url || !url.trim()) {
    markRedisUnavailable("REDIS_URL is not set");
    return null;
  }

  try {
    const client = createManagedRedis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
    });
    await client.connect();
    redisClient = client;
    await seedFromFileIfEmpty(client);
    return client;
  } catch (err) {
    markRedisUnavailable(
      `Redis connection failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

function readFileCache(): PhotoCache {
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

function writeFileCache(cache: PhotoCache): void {
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

function parseEntry(raw: string | undefined | null): PhotoCacheEntry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PhotoCacheEntry).talkingPhotoId === "string"
    ) {
      return parsed as PhotoCacheEntry;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCachedTalkingPhotoId(
  imageBuffer: Buffer
): Promise<string | null> {
  const hash = hashImage(imageBuffer);
  const client = await getRedis();

  if (client) {
    try {
      const entry = parseEntry(await client.hget(REDIS_KEY, hash));
      if (!entry) return null;
      await client.hset(
        REDIS_KEY,
        hash,
        JSON.stringify({ ...entry, lastUsedAt: new Date().toISOString() })
      );
      return entry.talkingPhotoId;
    } catch (err) {
      markRedisUnavailable(
        `Redis read failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const cache = readFileCache();
  const entry = cache[hash];
  if (!entry) return null;
  cache[hash] = { ...entry, lastUsedAt: new Date().toISOString() };
  writeFileCache(cache);
  return entry.talkingPhotoId;
}

export async function getAllCachedTalkingPhotoIds(): Promise<
  Map<string, CachedAvatarRecord>
> {
  const out = new Map<string, CachedAvatarRecord>();
  const client = await getRedis();

  if (client) {
    try {
      const all = await client.hgetall(REDIS_KEY);
      for (const raw of Object.values(all)) {
        const entry = parseEntry(raw);
        if (entry?.talkingPhotoId) out.set(entry.talkingPhotoId, entry);
      }
      return out;
    } catch (err) {
      markRedisUnavailable(
        `Redis read failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  for (const entry of Object.values(readFileCache())) {
    if (entry.talkingPhotoId) out.set(entry.talkingPhotoId, entry);
  }
  return out;
}

export async function removeCachedByTalkingPhotoId(
  talkingPhotoId: string
): Promise<void> {
  if (!talkingPhotoId.trim()) return;
  const client = await getRedis();

  if (client) {
    try {
      const all = await client.hgetall(REDIS_KEY);
      const doomed: string[] = [];
      for (const [hash, raw] of Object.entries(all)) {
        const entry = parseEntry(raw);
        if (entry?.talkingPhotoId === talkingPhotoId) doomed.push(hash);
      }
      if (doomed.length > 0) await client.hdel(REDIS_KEY, ...doomed);
      return;
    } catch (err) {
      markRedisUnavailable(
        `Redis write failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const cache = readFileCache();
  let dirty = false;
  for (const [hash, entry] of Object.entries(cache)) {
    if (entry.talkingPhotoId === talkingPhotoId) {
      delete cache[hash];
      dirty = true;
    }
  }
  if (dirty) writeFileCache(cache);
}

export async function cacheTalkingPhotoId(
  imageBuffer: Buffer,
  talkingPhotoId: string,
  sourceHint?: string
): Promise<void> {
  if (!talkingPhotoId || !talkingPhotoId.trim()) return;
  const hash = hashImage(imageBuffer);
  const entry: PhotoCacheEntry = {
    talkingPhotoId: talkingPhotoId.trim(),
    createdAt: new Date().toISOString(),
    ...(sourceHint ? { sourceHint } : {}),
  };

  const client = await getRedis();
  if (client) {
    try {
      await client.hset(REDIS_KEY, hash, JSON.stringify(entry));
      return;
    } catch (err) {
      markRedisUnavailable(
        `Redis write failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const cache = readFileCache();
  cache[hash] = entry;
  writeFileCache(cache);
}

export async function invalidateTalkingPhotoId(
  imageBuffer: Buffer
): Promise<void> {
  const hash = hashImage(imageBuffer);
  const client = await getRedis();

  if (client) {
    try {
      await client.hdel(REDIS_KEY, hash);
      return;
    } catch (err) {
      markRedisUnavailable(
        `Redis write failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const cache = readFileCache();
  if (cache[hash]) {
    delete cache[hash];
    writeFileCache(cache);
  }
}
