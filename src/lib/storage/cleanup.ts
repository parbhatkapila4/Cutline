import fs from "fs";
import path from "path";
import { cleanupExpiredBlobs } from "./publish";

const DEFAULT_VIDEO_RETENTION_HOURS = 24;
export function getTempDirForJob(jobId: string): string {
  const cwd = process.cwd();
  const tempRoot = process.env.TEMP_DIR
    ? path.resolve(cwd, process.env.TEMP_DIR)
    : path.join(cwd, "public", "temp");
  return path.join(tempRoot, jobId);
}

export async function cleanupJobArtifacts(jobId: string): Promise<void> {
  if (!jobId || typeof jobId !== "string") return;
  const dir = getTempDirForJob(jobId);
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    fs.rmSync(dir, { recursive: true });
  } catch (e) {
    console.warn("[cleanup] jobId=" + jobId + " cleanupJobArtifacts failed:", e instanceof Error ? e.message : String(e));
  }
}

export async function cleanupExpiredTempDirs(options: {
  olderThanHours: number;
  tempRoot?: string;
}): Promise<{ deleted: number; errors: number }> {
  const { olderThanHours, tempRoot: tempRootOpt } = options;
  const cwd = process.cwd();
  const tempRoot = tempRootOpt
    ? path.resolve(cwd, tempRootOpt)
    : path.join(cwd, "public", "temp");

  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  let deleted = 0;
  let errors = 0;

  try {
    if (!fs.existsSync(tempRoot) || !fs.statSync(tempRoot).isDirectory()) {
      return { deleted: 0, errors: 0 };
    }
    const entries = fs.readdirSync(tempRoot, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const fullPath = path.join(tempRoot, ent.name);
      const relative = path.relative(path.resolve(tempRoot), path.resolve(fullPath));
      if (relative.startsWith("..") || path.isAbsolute(relative)) continue;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          fs.rmSync(fullPath, { recursive: true });
          deleted += 1;
        }
      } catch (e) {
        errors += 1;
        console.warn("[cleanup] cleanupExpiredTempDirs failed for", fullPath, e instanceof Error ? e.message : String(e));
      }
    }
  } catch (e) {
    console.warn("[cleanup] cleanupExpiredTempDirs failed:", e instanceof Error ? e.message : String(e));
    errors += 1;
  }

  return { deleted, errors };
}
const DEFAULT_UPLOAD_RETENTION_HOURS = 24;
const TEMP_IMAGES_RETENTION_HOURS = 1;
const PUBLIC_TEMP_BASENAME = "temp";
const PUBLIC_OUTPUT_BASENAME = "output";
const DEFAULT_UPLOAD_DIR = "uploads";
const REGISTRY_FILENAME = "_registry.json";

export type CleanupResult = {
  videosDeleted: number;
  uploadsDeleted: number;
  tempImagesDeleted: number;
  errors: string[];
};

function resolveAllowedDir(cwd: string, dirBasename: string): string {
  const resolved = path.resolve(cwd, dirBasename);
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Cleanup: path escape disallowed: ${dirBasename}`);
  }
  return resolved;
}

function isUnderBase(base: string, target: string): boolean {
  const baseNorm = path.resolve(base);
  const targetNorm = path.resolve(target);
  const relative = path.relative(baseNorm, targetNorm);
  return relative !== ".." && !relative.startsWith(".." + path.sep);
}

function getVideoRetentionMs(): number {
  const hours = Number(process.env.VIDEO_RETENTION_HOURS) || DEFAULT_VIDEO_RETENTION_HOURS;
  return hours * 60 * 60 * 1000;
}

function getUploadRetentionMs(): number {
  const hours = Number(process.env.UPLOAD_RETENTION_HOURS) || DEFAULT_UPLOAD_RETENTION_HOURS;
  return hours * 60 * 60 * 1000;
}

function getTempImagesRetentionMs(): number {
  return TEMP_IMAGES_RETENTION_HOURS * 60 * 60 * 1000;
}

function isCleanupEnabled(): boolean {
  const v = process.env.CLEANUP_ENABLED;
  return v === undefined || v === "" || v.toLowerCase() === "true";
}

function safeDeleteFile(
  filePath: string,
  errors: string[],
  counter: { deleted: number }
): void {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      counter.deleted += 1;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`delete failed ${filePath}: ${msg}`);
  }
}

function safeDeleteDir(
  dirPath: string,
  errors: string[],
  counter: { deleted: number }
): void {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return;
    fs.rmSync(dirPath, { recursive: true });
    counter.deleted += 1;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`delete dir failed ${dirPath}: ${msg}`);
  }
}

function cleanRenderedVideos(cwd: string, errors: string[]): number {
  const retentionMs = getVideoRetentionMs();
  const cutoff = Date.now() - retentionMs;
  const counter = { deleted: 0 };

  for (const basename of [PUBLIC_TEMP_BASENAME, PUBLIC_OUTPUT_BASENAME]) {
    const dir = resolveAllowedDir(cwd, path.join("public", basename));
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".mp4")) continue;
      const fullPath = path.join(dir, ent.name);
      if (!isUnderBase(dir, fullPath)) continue;
      try {
        const mtime = fs.statSync(fullPath).mtimeMs;
        if (mtime < cutoff) safeDeleteFile(fullPath, errors, counter);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`stat failed ${fullPath}: ${msg}`);
      }
    }
  }
  return counter.deleted;
}

function cleanTempImageDirs(cwd: string, errors: string[]): number {
  const retentionMs = getTempImagesRetentionMs();
  const cutoff = Date.now() - retentionMs;
  const counter = { deleted: 0 };
  const dir = resolveAllowedDir(cwd, path.join("public", PUBLIC_TEMP_BASENAME));
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const fullPath = path.join(dir, ent.name);
    if (!isUnderBase(dir, fullPath)) continue;
    try {
      const mtime = fs.statSync(fullPath).mtimeMs;
      if (mtime < cutoff) safeDeleteDir(fullPath, errors, counter);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`stat failed ${fullPath}: ${msg}`);
    }
  }
  return counter.deleted;
}

function cleanUploads(cwd: string, errors: string[]): number {
  const uploadDirName = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;
  const dir = resolveAllowedDir(cwd, uploadDirName);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return 0;

  const retentionMs = getUploadRetentionMs();
  const cutoff = Date.now() - retentionMs;
  const counter = { deleted: 0 };

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const fullPath = path.join(dir, ent.name);
    if (!isUnderBase(dir, fullPath)) continue;
    if (ent.name === REGISTRY_FILENAME) continue;

    try {
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs >= cutoff) continue;

      if (stat.isFile()) {
        safeDeleteFile(fullPath, errors, counter);
      } else if (stat.isDirectory()) {
        safeDeleteDir(fullPath, errors, counter);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`upload cleanup ${fullPath}: ${msg}`);
    }
  }
  return counter.deleted;
}

export async function runCleanup(): Promise<CleanupResult> {
  const result: CleanupResult = {
    videosDeleted: 0,
    uploadsDeleted: 0,
    tempImagesDeleted: 0,
    errors: [],
  };

  if (!isCleanupEnabled()) {
    return result;
  }

  const cwd = process.cwd();

  try {
    result.videosDeleted = cleanRenderedVideos(cwd, result.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`rendered videos cleanup: ${msg}`);
  }

  try {
    const retentionHours =
      Number(process.env.VIDEO_RETENTION_HOURS) || DEFAULT_VIDEO_RETENTION_HOURS;
    const blobRes = await cleanupExpiredBlobs(retentionHours);
    result.videosDeleted += blobRes.deleted;
    if (blobRes.errors > 0) result.errors.push(`blob video cleanup: ${blobRes.errors} error(s)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`blob video cleanup: ${msg}`);
  }

  try {
    result.tempImagesDeleted = cleanTempImageDirs(cwd, result.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`temp images cleanup: ${msg}`);
  }

  try {
    result.uploadsDeleted = cleanUploads(cwd, result.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`uploads cleanup: ${msg}`);
  }

  return result;
}
