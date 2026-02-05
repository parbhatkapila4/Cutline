/**
 * POST /api/cleanup — manually trigger storage cleanup.
 * When CLEANUP_SECRET is set, require header X-Cleanup-Secret to match.
 * Useful for testing or external cron; primary cleanup runs via worker (BullMQ repeatable job).
 */

import { NextResponse } from "next/server";
import { runCleanup } from "@/lib/storage/cleanup";

export async function POST(request: Request) {
  const secret = process.env.CLEANUP_SECRET;
  if (secret && secret.length > 0) {
    const headerSecret = request.headers.get("X-Cleanup-Secret");
    if (headerSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runCleanup();
    return NextResponse.json({
      ok: true,
      videosDeleted: result.videosDeleted,
      uploadsDeleted: result.uploadsDeleted,
      tempImagesDeleted: result.tempImagesDeleted,
      errors: result.errors,
    });
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/cleanup", e);
    return NextResponse.json(
      { error: sanitizeErrorMessage(e) },
      { status: 500 }
    );
  }
}
