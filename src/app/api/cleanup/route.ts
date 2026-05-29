import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runCleanup } from "@/lib/storage/cleanup";

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  if (bufA.length === 0) return true;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const secret = process.env.CLEANUP_SECRET;
  if (secret && secret.length > 0) {
    const headerSecret = request.headers.get("X-Cleanup-Secret") ?? "";
    if (!constantTimeEqual(headerSecret, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Fail closed in production: never expose the cleanup trigger without a
    // configured secret. (Dev keeps it open for local convenience.)
    return NextResponse.json(
      { error: "Cleanup endpoint is disabled: set CLEANUP_SECRET." },
      { status: 503 }
    );
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
