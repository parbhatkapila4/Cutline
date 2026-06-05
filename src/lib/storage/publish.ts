import fs from "fs";
import path from "path";

const BLOB_PREFIX = "videos";

export function isBlobConfigured(): boolean {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  return typeof t === "string" && t.trim().length > 0;
}

export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function localPathForPublicUrl(publicUrl: string): string | null {
  if (!publicUrl.startsWith("/")) return null;
  const rel = publicUrl.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", rel);
}

export async function publishRenderedVideo(videoUrl: string, jobId: string): Promise<string> {
  if (!videoUrl || typeof videoUrl !== "string") return videoUrl;
  if (isAbsoluteUrl(videoUrl)) return videoUrl;
  if (!isBlobConfigured()) return videoUrl;

  const localPath = localPathForPublicUrl(videoUrl);
  if (!localPath || !fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
    console.error(`[blob] jobId=${jobId} cannot publish; file missing for ${videoUrl}`);
    return videoUrl;
  }

  try {
    const { put } = await import("@vercel/blob");
    const basename = path.basename(localPath);
    const body = fs.readFileSync(localPath);
    const blob = await put(`${BLOB_PREFIX}/${basename}`, body, {
      access: "public",
      contentType: "video/mp4",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  } catch (e) {
    console.error(
      `[blob] jobId=${jobId} upload failed for ${videoUrl}:`,
      e instanceof Error ? e.message : String(e)
    );
    return videoUrl;
  }
}

export async function deletePublishedBlob(url: string | undefined | null): Promise<void> {
  if (!url || typeof url !== "string" || !isAbsoluteUrl(url)) return;
  if (!isBlobConfigured()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (e) {
    console.warn(`[blob] delete failed for ${url}:`, e instanceof Error ? e.message : String(e));
  }
}

export async function cleanupExpiredBlobs(
  olderThanHours: number
): Promise<{ deleted: number; errors: number }> {
  if (!isBlobConfigured()) return { deleted: 0, errors: 0 };
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  const toDelete: string[] = [];
  let errors = 0;

  try {
    const { list, del } = await import("@vercel/blob");
    let cursor: string | undefined;
    do {
      const res = await list({ prefix: `${BLOB_PREFIX}/`, cursor, limit: 1000 });
      for (const b of res.blobs) {
        const uploadedAt =
          b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : new Date(b.uploadedAt).getTime();
        if (Number.isFinite(uploadedAt) && uploadedAt < cutoff) toDelete.push(b.url);
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);

    if (toDelete.length > 0) await del(toDelete);
    return { deleted: toDelete.length, errors };
  } catch (e) {
    errors += 1;
    console.warn("[blob] cleanupExpiredBlobs failed:", e instanceof Error ? e.message : String(e));
    return { deleted: 0, errors };
  }
}
