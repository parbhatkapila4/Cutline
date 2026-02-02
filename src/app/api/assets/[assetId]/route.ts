import { NextResponse } from "next/server";
import { getAssetFilePath, getAssetMetadata } from "@/lib/assets/storage";

/**
 * GET /api/assets/[assetId]
 * Serves the file for preview or rendering. Local storage only for now.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  if (!assetId) {
    return NextResponse.json({ error: "Missing assetId." }, { status: 400 });
  }

  const meta = getAssetMetadata(assetId);
  if (!meta) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const filePath = getAssetFilePath(assetId);
  if (!filePath) {
    return NextResponse.json(
      { error: "Asset file not found or storage not local." },
      { status: 404 }
    );
  }

  const { readFileSync } = await import("fs");
  let buffer: Buffer;
  try {
    buffer = readFileSync(filePath);
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("GET /api/assets/[assetId]", e);
    return NextResponse.json({ error: sanitizeErrorMessage(e) }, { status: 500 });
  }

  const headers = new Headers();
  headers.set("Content-Type", meta.mimeType);
  headers.set("Content-Disposition", `inline; filename="${meta.originalFilename}"`);

  return new NextResponse(buffer, {
    status: 200,
    headers,
  });
}
