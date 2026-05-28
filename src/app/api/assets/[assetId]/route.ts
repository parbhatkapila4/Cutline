import { NextResponse } from "next/server";
import { getAssetFilePath, getAssetMetadata } from "@/lib/assets/storage";
import { requestOwnsResource } from "@/lib/jobs/jobOwnership";

export async function GET(
  request: Request,
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

  // Ownership: assets with a recorded owner are only served to that owner.
  // Assets without an ownerId are pre-fix uploads (they age out within
  // UPLOAD_RETENTION_HOURS) and remain accessible for backward compatibility.
  if (typeof meta.ownerId === "string" && meta.ownerId.trim() !== "") {
    const owns = await requestOwnsResource(request, meta.ownerId);
    if (!owns) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }
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

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers,
  });
}
