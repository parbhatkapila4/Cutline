import Redis from "ioredis";
import { createManagedRedis } from "@/lib/redis/managedRedis";
import fs from "fs";
import path from "path";
import type { Intent } from "@/lib/types/intent";
import type { NarrativePlan } from "@/lib/types/narrative";
import type { ShotList } from "@/lib/types/shots";
import type { Script } from "@/lib/types/script";
import type { SubtitleTrack } from "@/lib/types/subtitles";

const REDIS_KEY_PREFIX = "cutline:preview:";
const TTL_SECONDS = 86400;
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisClient = createManagedRedis(url, { maxRetriesPerRequest: null });
  }
  return redisClient;
}

export type PreviewArtifacts = {
  intent: Intent;
  narrative: NarrativePlan;
  shotList: ShotList;
  script: Script;
  subtitleTrack: SubtitleTrack;
};

export async function savePreviewArtifacts(
  jobId: string,
  data: PreviewArtifacts
): Promise<void> {
  const key = REDIS_KEY_PREFIX + jobId;
  const value = JSON.stringify(data);
  try {
    const redis = getRedis();
    await redis.setex(key, TTL_SECONDS, value);
    console.log("[preview] jobId=" + jobId + " artifacts saved to Redis");
  } catch (e) {
    console.error("[preview] jobId=" + jobId + " failed to save artifacts to Redis:", e);
    try {
      const cwd = process.cwd();
      const artifactsDir = path.join(cwd, "public", "temp", jobId);
      fs.mkdirSync(artifactsDir, { recursive: true });
      const filePath = path.join(artifactsDir, "preview-artifacts.json");
      fs.writeFileSync(filePath, value, "utf-8");
      console.log("[preview] jobId=" + jobId + " artifacts saved to file fallback");
    } catch (fileErr) {
      console.error("[preview] jobId=" + jobId + " failed to save artifacts to file:", fileErr);
    }
  }
}

export async function deletePreviewArtifactsFromRedis(previewJobId: string): Promise<void> {
  if (!previewJobId || typeof previewJobId !== "string") return;
  try {
    const redis = getRedis();
    await redis.del(REDIS_KEY_PREFIX + previewJobId);
  } catch (e) {
    console.warn(
      "[preview] deletePreviewArtifactsFromRedis failed jobId=" + previewJobId,
      e instanceof Error ? e.message : String(e)
    );
  }
}

export async function loadPreviewArtifacts(
  previewJobId: string
): Promise<PreviewArtifacts | null> {
  try {
    const redis = getRedis();
    const key = REDIS_KEY_PREFIX + previewJobId;
    const value = await redis.get(key);
    if (value) {
      const parsed = JSON.parse(value) as PreviewArtifacts;
      if (
        parsed?.intent &&
        parsed?.narrative &&
        parsed?.shotList &&
        parsed?.script &&
        parsed?.subtitleTrack
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[preview] jobId=" + previewJobId + " Redis load failed:", e);
  }

  try {
    const cwd = process.cwd();
    const filePath = path.join(cwd, "public", "temp", previewJobId, "preview-artifacts.json");
    if (fs.existsSync(filePath)) {
      const value = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(value) as PreviewArtifacts;
      if (
        parsed?.intent &&
        parsed?.narrative &&
        parsed?.shotList &&
        parsed?.script &&
        parsed?.subtitleTrack
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[preview] jobId=" + previewJobId + " file load failed:", e);
  }

  return null;
}
